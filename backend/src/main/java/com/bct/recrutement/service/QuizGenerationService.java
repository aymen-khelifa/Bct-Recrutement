package com.bct.recrutement.service;

import com.bct.recrutement.entity.*;
import com.bct.recrutement.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import jakarta.transaction.Transactional;

import java.util.*;

@Service
public class QuizGenerationService {

    private static final Logger log = LoggerFactory.getLogger(QuizGenerationService.class);

    @Value("${quiz.generator.url:http://localhost:5000}")
    private String generatorUrl;

    @Autowired private QuizRepository                 quizRepository;
    @Autowired private QuestionRepository             questionRepository;
    @Autowired private SujetStageRepository           sujetRepository;
    @Autowired private QuizGenerationStatusRepository statusRepository;
    @Autowired private RestTemplate                   restTemplate;

    // ─────────────────────────────────────────────────────────────────────────
    //  Entrée principale — appelé depuis SujetStageService.createSujet()
    //  @Async → thread séparé, non bloquant pour le reste de l'application
    // ─────────────────────────────────────────────────────────────────────────
    @Async("quizGenerationExecutor")
    public void generateAsync(Long sujetId) {
        log.info("[QuizGen] ▶ Démarrage génération pour sujet {}", sujetId);
        try { Thread.sleep(1000); } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        QuizGenerationStatus status = statusRepository
                .findBySujetId(sujetId)
                .orElse(new QuizGenerationStatus());
        status.setSujetId(sujetId);
        status.setState(QuizGenerationStatus.State.RUNNING);
        status.setProgress(5);
        status.setMessage("Connexion au service HuggingFace (flan-t5-base)...");
        status.setErrorMessage(null);
        statusRepository.save(status);

        try {
            // ── 1. Charger SujetStage ─────────────────────────────────────
            SujetStage sujet = sujetRepository.findById(sujetId)
                    .orElseThrow(() -> new RuntimeException("Sujet introuvable : " + sujetId));

            updateStatus(status, 10, "Génération des 50 questions par l'IA...");

            // ── 2. Appeler Python /generate ───────────────────────────────
            List<Map<String, Object>> questionsData = callPythonService(sujet, status);

            if (questionsData == null || questionsData.isEmpty()) {
                throw new RuntimeException("Le service IA n'a retourné aucune question.");
            }

            updateStatus(status, 80, "Insertion en base (" + questionsData.size() + " questions)...");

            // ── 3. Créer/récupérer le Quiz lié au SujetStage ─────────────
            Quiz quiz = quizRepository.findBySujetId(sujetId).orElseGet(() -> {
                Quiz q = new Quiz();
                q.setSujet(sujet);        // Quiz.sujet = SujetStage
                q.setDureeMinutes(30);
                q.setActif(true);
                return quizRepository.save(q);
            });

            // Supprimer les anciennes questions (si régénération)
            questionRepository.deleteByQuizId(quiz.getId());

            // ── 4. Insérer Question + QuizOption en base ──────────────────
            int inserted = insertQuestions(quiz, questionsData, status);

            // ── 5. Succès ─────────────────────────────────────────────────
            status.setState(QuizGenerationStatus.State.DONE);
            status.setProgress(100);
            status.setMessage("✅ " + inserted + " questions insérées avec succès !");
            status.setQuizId(quiz.getId());
            statusRepository.save(status);

            log.info("[QuizGen] ✅ Sujet {} → {} questions (quizId={})",
                    sujetId, inserted, quiz.getId());

        } catch (Exception e) {
            log.error("[QuizGen] ❌ Sujet {} : {}", sujetId, e.getMessage(), e);
            status.setState(QuizGenerationStatus.State.ERROR);
            status.setProgress(0);
            status.setMessage("Erreur lors de la génération.");
            status.setErrorMessage(e.getMessage());
            statusRepository.save(status);
        }
    }

    @Async("quizGenerationExecutor")
    public void retryGeneration(Long sujetId) {
        generateAsync(sujetId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  POST http://localhost:5000/generate
    //  body  : { sujetId, titre, departement, specialite, description }
    //  retour: { questions: [{texte, difficulte, options:[{texte,correcte}]}] }
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> callPythonService(
            SujetStage sujet, QuizGenerationStatus status) {

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sujetId",     sujet.getId());
        body.put("titre",       sujet.getTitre());
        body.put("departement", nvl(sujet.getDepartement()));
        body.put("specialite",  nvl(sujet.getSpecialite()));
        body.put("description", nvl(sujet.getDescription()));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);

        updateStatus(status, 20, "Appel en cours vers flan-t5-base...");

        ResponseEntity<Map> resp;
        try {
            resp = restTemplate.postForEntity(generatorUrl + "/generate", req, Map.class);
        } catch (Exception e) {
            throw new RuntimeException(
                    "Service Python inaccessible sur " + generatorUrl + " : " + e.getMessage() +
                            "\nVérifiez que Python tourne (PowerShell : python quiz_generator_service.py --port 5000)"
            );
        }

        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
            throw new RuntimeException("Réponse invalide du service Python : " + resp.getStatusCode());
        }

        updateStatus(status, 70, "Parsing de la réponse IA...");

        Object raw = resp.getBody().get("questions");
        if (!(raw instanceof List)) {
            throw new RuntimeException("Champ 'questions' manquant dans la réponse Python.");
        }
        return (List<Map<String, Object>>) raw;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Insère les questions et leurs options dans les tables :
    //    question    (id, texte, difficulte, quiz_id)
    //    quiz_option (id, texte, correcte, question_id)
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private int insertQuestions(Quiz quiz,
                                List<Map<String, Object>> data,
                                QuizGenerationStatus status) {
        int inserted = 0;
        int total    = data.size();

        for (int i = 0; i < total; i++) {
            Map<String, Object> qData = data.get(i);
            try {
                // ── texte ─────────────────────────────────────────────────
                String texte = (String) qData.get("texte");
                if (texte == null || texte.isBlank()) continue;

                // ── difficulte ────────────────────────────────────────────
                String diff = (String) qData.getOrDefault("difficulte", "Intermédiaire");

                // ── options ───────────────────────────────────────────────
                Object rawOpts = qData.get("options");
                if (!(rawOpts instanceof List)) continue;
                List<Map<String, Object>> optsData = (List<Map<String, Object>>) rawOpts;
                if (optsData.size() != 3) continue;

                // Exactement 1 correcte
                long nbOk = optsData.stream()
                        .filter(o -> Boolean.TRUE.equals(o.get("correcte")))
                        .count();
                if (nbOk != 1) continue;

                // ── Créer Question ────────────────────────────────────────
                Question q = new Question();
                q.setTexte(texte);
                q.setDifficulte(diff);
                q.setQuiz(quiz);               // → quiz_id en base

                // ── Créer QuizOptions ─────────────────────────────────────
                List<QuizOption> opts = new ArrayList<>();
                for (Map<String, Object> oData : optsData) {
                    String oTexte = (String) oData.get("texte");
                    if (oTexte == null || oTexte.isBlank()) continue;

                    QuizOption opt = new QuizOption();
                    opt.setTexte(oTexte);
                    opt.setCorrecte(Boolean.TRUE.equals(oData.get("correcte")));
                    opt.setQuestion(q);        // → question_id en base
                    opts.add(opt);
                }

                if (opts.size() != 3) continue;
                q.setOptions(opts);

                // ── Sauvegarde (cascade → QuizOptions aussi) ─────────────
                questionRepository.save(q);
                inserted++;

                // Progression toutes les 10 questions
                if (i % 10 == 0) {
                    updateStatus(status,
                            80 + (int)((double) i / total * 18),
                            "Insertion " + (i + 1) + "/" + total + "...");
                }

            } catch (Exception e) {
                log.warn("[QuizGen] Q{} ignorée : {}", i + 1, e.getMessage());
            }
        }

        log.info("[QuizGen] {}/{} questions insérées en base.", inserted, total);
        return inserted;
    }

    private void updateStatus(QuizGenerationStatus s, int pct, String msg) {
        s.setProgress(pct);
        s.setMessage(msg);
        statusRepository.save(s);
    }

    private String nvl(String s) { return s != null ? s : ""; }
}