package com.bct.recrutement.service;

import com.bct.recrutement.entity.*;
import com.bct.recrutement.repository.*;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class QuizService {

    // ── Cloudinary ────────────────────────────────────────────────────────────
    private final Cloudinary cloudinary;

    public QuizService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}")    String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key",    apiKey,
                "api_secret", apiSecret,
                "secure",     true
        ));
    }

    @Autowired private QuizRepository          quizRepository;
    @Autowired private QuestionRepository      questionRepository;
    @Autowired private UserResponseRepository  responseRepository;
    @Autowired private UserRepository          userRepository;
    @Autowired private QuizSessionRepository   sessionRepository;
    @Autowired private CandidatureRepository   candidatureRepository;

    private static final long DUREE_MAX_MINUTES = 30;
    private static final int  TOTAL_QUESTIONS   = 50;

    public Quiz getQuizBySujet(Long sujetId) {
        return quizRepository.findBySujetId(sujetId)
                .orElseThrow(() -> new RuntimeException("Quiz introuvable"));
    }

    public List<Question> getQuestions(Long quizId) {
        return questionRepository.findByQuizId(quizId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AJOUTER une question
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public Question addQuestion(Long quizId, Question newQuestion, MultipartFile image) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz introuvable"));

        long count = questionRepository.countByQuizId(quizId);
        if (count >= TOTAL_QUESTIONS)
            throw new RuntimeException("Le quiz contient déjà " + TOTAL_QUESTIONS + " questions.");

        if ((newQuestion.getTexte() == null || newQuestion.getTexte().isBlank()) && image == null)
            throw new RuntimeException("La question doit avoir un texte ou une image.");
        if (newQuestion.getOptions() == null || newQuestion.getOptions().size() != 3)
            throw new RuntimeException("La question doit avoir exactement 3 options.");
        long correctCount = newQuestion.getOptions().stream().filter(QuizOption::isCorrecte).count();
        if (correctCount != 1)
            throw new RuntimeException("Une seule option correcte est autorisée.");

        // ✅ Upload image vers Cloudinary
        if (image != null && !image.isEmpty()) {
            String imageUrl = uploadImageCloudinary(image, null);
            newQuestion.setImageUrl(imageUrl);
        }

        newQuestion.setQuiz(quiz);
        if (newQuestion.getDifficulte() == null) newQuestion.setDifficulte("Intermédiaire");
        for (QuizOption opt : newQuestion.getOptions()) opt.setQuestion(newQuestion);

        return questionRepository.save(newQuestion);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  MODIFIER une question
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public Question updateQuestion(Long questionId, Question updatedQuestion, MultipartFile image) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question introuvable"));

        if (updatedQuestion.getTexte() != null) question.setTexte(updatedQuestion.getTexte());
        if (updatedQuestion.getDifficulte() != null) question.setDifficulte(updatedQuestion.getDifficulte());

        // ✅ Nouvelle image → upload Cloudinary, supprimer l'ancienne
        if (image != null && !image.isEmpty()) {
            String imageUrl = uploadImageCloudinary(image, question.getImageUrl());
            question.setImageUrl(imageUrl);
        }

        // Supprimer image
        if (updatedQuestion.getImageUrl() != null && updatedQuestion.getImageUrl().equals("REMOVE")) {
            supprimerImage(question.getImageUrl());
            question.setImageUrl(null);
        }

        // Options
        if (updatedQuestion.getOptions() != null) {
            if (updatedQuestion.getOptions().size() != 3)
                throw new RuntimeException("Une question doit contenir exactement 3 options.");
            long c = updatedQuestion.getOptions().stream().filter(QuizOption::isCorrecte).count();
            if (c != 1) throw new RuntimeException("Une seule option correcte est autorisée.");

            List<QuizOption> existing = question.getOptions();
            for (QuizOption upd : updatedQuestion.getOptions()) {
                QuizOption opt = existing.stream()
                        .filter(o -> o.getId().equals(upd.getId())).findFirst()
                        .orElseThrow(() -> new RuntimeException("Option introuvable : " + upd.getId()));
                opt.setTexte(upd.getTexte());
                opt.setCorrecte(upd.isCorrecte());
            }
        }

        return questionRepository.save(question);
    }

    @Transactional
    public Question updateQuestion(Long questionId, Question updatedQuestion) {
        return updateQuestion(questionId, updatedQuestion, null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SUPPRIMER une question
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public void deleteQuestion(Long questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question introuvable"));

        long count = questionRepository.countByQuizId(question.getQuiz().getId());
        if (count <= 1)
            throw new RuntimeException("Impossible de supprimer la dernière question du quiz.");

        supprimerImage(question.getImageUrl());
        questionRepository.delete(question);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ✅ Upload image vers Cloudinary
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private String uploadImageCloudinary(MultipartFile file, String ancienneUrl) {
        try {
            // Supprimer l'ancienne image Cloudinary si elle existe
            if (ancienneUrl != null && !ancienneUrl.isBlank()) {
                supprimerImage(ancienneUrl);
            }

            String publicId = "bct-recrutement/quiz-images/q_" + System.currentTimeMillis();

            Map<String, Object> params = ObjectUtils.asMap(
                    "resource_type", "image",
                    "public_id",     publicId,
                    "overwrite",     true,
                    "tags",          new String[]{"quiz", "question", "bct"}
            );

            Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), params);
            String url = (String) result.get("secure_url");

            // Supprimer la signature s--xxx-- si présente
            return url != null ? url.replaceAll("/s--[^/]+--", "") : null;

        } catch (IOException e) {
            throw new RuntimeException("Erreur upload image Cloudinary : " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ✅ Supprimer image — Cloudinary ou fichier local (rétrocompat)
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private void supprimerImage(String chemin) {
        if (chemin == null || chemin.isBlank()) return;
        try {
            if (chemin.startsWith("http")) {
                // URL Cloudinary → extraire le public_id
                String clean = chemin.replaceAll("/s--[^/]+--", "");
                int uploadIdx = clean.indexOf("/upload/");
                if (uploadIdx != -1) {
                    String afterUpload = clean.substring(uploadIdx + 8);
                    afterUpload = afterUpload.replaceFirst("^v\\d+/", "");
                    int dotIdx = afterUpload.lastIndexOf('.');
                    String publicId = dotIdx > 0 ? afterUpload.substring(0, dotIdx) : afterUpload;
                    cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
                }
            } else {
                // Ancien fichier local (rétrocompatibilité)
                Files.deleteIfExists(Paths.get(chemin));
            }
        } catch (Exception ignored) {}
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SOUMETTRE quiz
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> submitQuiz(Long userId, Long quizId, Map<Long, Long> reponses) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        QuizSession session = sessionRepository.findByUserIdAndQuizId(userId, quizId)
                .orElseThrow(() -> new RuntimeException("Session introuvable. Veuillez démarrer le quiz d'abord."));

        if (session.isSubmitted())
            throw new RuntimeException("Ce quiz a déjà été soumis. Une seule tentative est autorisée.");

        long elapsedSeconds = ChronoUnit.SECONDS.between(session.getStartedAt(), LocalDateTime.now());
        if (elapsedSeconds > DUREE_MAX_MINUTES * 60) {
            session.setSubmitted(true);
            sessionRepository.save(session);
            throw new RuntimeException("Délai dépassé. Session expirée après " + DUREE_MAX_MINUTES + " minutes.");
        }

        List<Question> questions = questionRepository.findByQuizId(quizId);
        int correct = 0;
        int total   = questions.size();

        for (Question q : questions) {
            Long optionId = reponses.get(q.getId());
            QuizOption selected = null;
            if (optionId != null)
                selected = q.getOptions().stream().filter(o -> o.getId().equals(optionId)).findFirst().orElse(null);

            if (selected != null && selected.isCorrecte()) correct++;
            if (selected != null) {
                UserResponse ur = new UserResponse();
                ur.setCandidat(user); ur.setQuestion(q); ur.setSelectedOption(selected);
                responseRepository.save(ur);
            }
        }

        session.setSubmitted(true);
        session.setSubmittedAt(LocalDateTime.now());
        sessionRepository.save(session);

        int scoreSur50 = total > 0 ? (int) Math.round((double) correct / total * 50) : 0;
        int scorePct   = total > 0 ? (int) Math.round((double) correct / total * 100) : 0;
        String mention = getMention(scoreSur50);

        Quiz quiz    = quizRepository.findById(quizId).orElseThrow(() -> new RuntimeException("Quiz introuvable"));
        Long sujetId = quiz.getSujet().getId();
        candidatureRepository.findByCandidatIdAndSujetId(userId, sujetId).ifPresent(c -> {
            c.setScoreQuiz(scoreSur50);
            c.setMentionQuiz(mention);
            c.setQuizPasseLe(LocalDateTime.now());
            candidatureRepository.save(c);
        });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message",          "Réponses enregistrées avec succès");
        result.put("score",            scoreSur50);
        result.put("scorePourcentage", scorePct);
        result.put("mention",          mention);
        result.put("correctAnswers",   correct);
        result.put("totalQuestions",   total);
        result.put("answeredCount",    reponses.size());
        return result;
    }

    private String getMention(int s) {
        if (s >= 45) return "Excellent";
        if (s >= 40) return "Très bien";
        if (s >= 35) return "Bien";
        if (s >= 25) return "Passable";
        return "Insuffisant";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DÉMARRER quiz
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> startQuiz(Long userId, Long quizId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz introuvable"));

        Optional<QuizSession> existingSession = sessionRepository.findByUserIdAndQuizId(userId, quizId);
        if (existingSession.isPresent() && existingSession.get().isSubmitted())
            throw new RuntimeException("Vous avez déjà soumis ce quiz. Une seule tentative est autorisée.");

        QuizSession session;
        if (existingSession.isPresent()) {
            session = existingSession.get();
            long elapsed = ChronoUnit.MINUTES.between(session.getStartedAt(), LocalDateTime.now());
            if (elapsed >= DUREE_MAX_MINUTES) {
                session.setSubmitted(true);
                sessionRepository.save(session);
                throw new RuntimeException("Le délai de " + DUREE_MAX_MINUTES + " minutes est dépassé.");
            }
        } else {
            session = new QuizSession();
            session.setUser(user); session.setQuiz(quiz);
            session.setStartedAt(LocalDateTime.now()); session.setSubmitted(false);
            sessionRepository.save(session);
        }

        List<Question> questions = questionRepository.findByQuizId(quizId);
        Collections.shuffle(questions);

        List<Map<String, Object>> safeQuestions = questions.stream().map(q -> {
            Map<String, Object> qMap = new LinkedHashMap<>();
            qMap.put("id",       q.getId());
            qMap.put("texte",    q.getTexte());
            // ✅ Inclure l'imageUrl — URL Cloudinary directe
            qMap.put("imageUrl", q.getImageUrl());
            qMap.put("difficulte", q.getDifficulte());

            List<QuizOption> opts = new ArrayList<>(q.getOptions());
            Collections.shuffle(opts);
            List<Map<String, Object>> safeOptions = opts.stream().map(o -> {
                Map<String, Object> oMap = new LinkedHashMap<>();
                oMap.put("id",    o.getId());
                oMap.put("texte", o.getTexte());
                // NE PAS inclure "correcte"
                return oMap;
            }).toList();
            qMap.put("options", safeOptions);
            return qMap;
        }).toList();

        long elapsedSeconds   = ChronoUnit.SECONDS.between(session.getStartedAt(), LocalDateTime.now());
        long remainingSeconds = (DUREE_MAX_MINUTES * 60) - elapsedSeconds;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sessionId",        session.getId());
        result.put("startedAt",        session.getStartedAt().toString());
        result.put("remainingSeconds", Math.max(0, remainingSeconds));
        result.put("dureeMaxMinutes",  DUREE_MAX_MINUTES);
        result.put("questions",        safeQuestions);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ELIGIBILITÉ
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> checkEligibilite(Long userId, Long quizId) {
        Map<String, Object> result = new HashMap<>();
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz introuvable"));
        Long sujetId = quiz.getSujet().getId();

        Candidature candidature = candidatureRepository.findByCandidatIdAndSujetId(userId, sujetId).orElse(null);
        if (candidature == null) { result.put("eligible", false); result.put("reason", "Vous n'avez pas de candidature pour ce poste."); return result; }
        if (!Boolean.TRUE.equals(candidature.getEmailCvEnvoye())) { result.put("eligible", false); result.put("reason", "Vous n'avez pas encore été autorisé à passer ce quiz."); return result; }
        if (candidature.getStatut() != Candidature.StatutCandidature.PRESELECTIONNE_CV) { result.put("eligible", false); result.put("reason", "Votre candidature ne vous permet pas d'accéder au quiz. Statut : " + candidature.getStatut().name()); return result; }

        Optional<QuizSession> session = sessionRepository.findByUserIdAndQuizId(userId, quizId);
        if (session.isPresent() && session.get().isSubmitted()) {
            result.put("eligible", false);
            result.put("reason", "Vous avez déjà soumis ce quiz. Une seule tentative est autorisée.");
        } else {
            result.put("eligible", true);
            result.put("reason", "Vous pouvez passer ce quiz.");
            if (session.isPresent()) {
                long elapsed   = ChronoUnit.MINUTES.between(session.get().getStartedAt(), LocalDateTime.now());
                long remaining = DUREE_MAX_MINUTES - elapsed;
                result.put("alreadyStarted", true);
                result.put("remainingMinutes", Math.max(0, remaining));
                result.put("startedAt", session.get().getStartedAt().toString());
            } else { result.put("alreadyStarted", false); }
        }
        return result;
    }
}