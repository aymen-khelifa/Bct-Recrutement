package com.bct.recrutement.service;

import com.bct.recrutement.entity.*;
import com.bct.recrutement.entity.Candidature.StatutCandidature;
import com.bct.recrutement.repository.CandidatureRepository;
import com.bct.recrutement.repository.EntretienRepository;
import com.bct.recrutement.repository.SujetStageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import org.springframework.http.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FiltrageService {

    private static final Logger log = LoggerFactory.getLogger(FiltrageService.class);
    @Autowired private EntretienRepository entretienRepository;
    @Autowired
    private CandidatureRepository candidatureRepository;
    @Autowired
    @Lazy
    private NotificationService notificationService;
    @Autowired
    private SujetStageRepository sujetStageRepository;

    @Autowired
    private EmailService emailService;

    // @Lazy pour éviter la dépendance circulaire
    @Autowired
    @Lazy
    private InterviewSchedulerService interviewSchedulerService;
    @Autowired private RestTemplate restTemplate;
    @Autowired private ObjectMapper objectMapper;
    @Value("${groq.api.key}")
    private String groqApiKey;

    // ─────────────────────────────────────────────────────────────────────────
    //  FILTRAGE CV — tous les sujets  (INCHANGÉ)
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> filtrerTousLesSujets() {
        log.info("🔍 Début filtrage global pour M={} stagiaires par sujet");

        List<SujetStage> sujets = sujetStageRepository.findAll();

        List<Map<String, Object>> resultatsSujets = new ArrayList<>();
        int totalSujetsFiltres = 0;
        int totalCandidaturesTraitees = 0;
        int totalPreselectionnes = 0;
        int totalElimines = 0;

        for (SujetStage sujet : sujets) {
            List<Candidature> candidatures = candidatureRepository
                    .findBySujetIdAndStatut(sujet.getId(), StatutCandidature.EN_COURS_EXAMEN)
                    .stream()
                    .filter(c -> c.getScoreAi() != null)
                    .collect(Collectors.toList());

            if (candidatures.isEmpty()) continue;

            Map<String, Object> resultatSujet = filtrerCandidatures(sujet.getId(), sujet.getNbStagiaires());

            Map<String, Object> sujetInfo = new LinkedHashMap<>();
            sujetInfo.put("sujetId",     sujet.getId());
            sujetInfo.put("sujetTitre",  sujet.getTitre());
            sujetInfo.put("sujetCode",   sujet.getCodeSujet());
            sujetInfo.put("departement", sujet.getDepartement());
            sujetInfo.putAll(resultatSujet);
            resultatsSujets.add(sujetInfo);

            totalSujetsFiltres++;
            totalCandidaturesTraitees += (int) resultatSujet.get("total");
            totalPreselectionnes      += ((Number) resultatSujet.get("preselectionnes")).intValue();
            totalElimines             += ((Number) resultatSujet.get("elimines")).intValue();
        }

        log.info("✅ Filtrage global terminé : {} sujets filtrés, {} candidatures traitées",
                totalSujetsFiltres, totalCandidaturesTraitees);

        return Map.of(
                "message",                   "Filtrage global effectué avec succès",
                "totalSujetsFiltres",        totalSujetsFiltres,
                "totalCandidaturesTraitees", totalCandidaturesTraitees,
                "totalPreselectionnes",      totalPreselectionnes,
                "totalElimines",             totalElimines,
                "detailsParSujet",           resultatsSujets
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FILTRAGE CV — un seul sujet  (INCHANGÉ)
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> filtrerCandidatures(Long sujetId, int nombreStagiaires) {
        log.info("🔍 Début filtrage pour sujet #{}, M={} stagiaires", sujetId, nombreStagiaires);

        List<Candidature> candidatures = candidatureRepository
                .findBySujetIdAndStatut(sujetId, StatutCandidature.EN_COURS_EXAMEN)
                .stream()
                .filter(c -> c.getScoreAi() != null)
                .collect(Collectors.toList());

        int N = candidatures.size();
        log.info("📊 N={} candidatures à filtrer", N);

        if (N == 0) {
            return Map.of("message","Aucune candidature à filtrer","total",0,"preselectionnes",0,"elimines",0);
        }

        int K1 = calculerK1(N, nombreStagiaires);
        candidatures.sort(Comparator.comparingInt(Candidature::getScoreAi).reversed());

        if (K1 >= N) {
            candidatures.forEach(c -> c.setStatut(StatutCandidature.PRESELECTIONNE_CV));
            candidatureRepository.saveAll(candidatures);
            return Map.of("message","Tous les candidats présélectionnés","total",N,
                    "preselectionnes",N,"elimines",0,"K1",K1);
        }

        int scoreSeuil = candidatures.get(K1 - 1).getScoreAi();
        log.info("🎯 Score seuil = {}", scoreSeuil);

        for (Candidature c : candidatures) {
            c.setStatut(c.getScoreAi() >= scoreSeuil
                    ? StatutCandidature.PRESELECTIONNE_CV
                    : StatutCandidature.ELIMINE_CV);
        }
        candidatureRepository.saveAll(candidatures);
// ── Notifications temps réel ──────────────────────────────────────────
        for (Candidature c : candidatures) {
            if (c.getStatut() == StatutCandidature.PRESELECTIONNE_CV) {
                notificationService.envoyer(
                        c.getCandidat().getId(),
                        "PRESELECTIONNE_CV",
                        "CV présélectionné !",
                        "Votre CV pour " + c.getSujet().getTitre() + " a été présélectionné. Le quiz technique est disponible."
                );
            } else if (c.getStatut() == StatutCandidature.ELIMINE_CV) {
                notificationService.envoyer(
                        c.getCandidat().getId(),
                        "ELIMINE_CV",
                        "Candidature non retenue",
                        "Votre candidature pour " + c.getSujet().getTitre() + " n'a pas été retenue après analyse du CV."
                );
            }
        }
        long totalPreselectionnes = candidatures.stream()
                .filter(c -> c.getStatut() == StatutCandidature.PRESELECTIONNE_CV).count();
        long totalElimines = candidatures.stream()
                .filter(c -> c.getStatut() == StatutCandidature.ELIMINE_CV).count();

        log.info("✅ Filtrage terminé : {} présélectionnés, {} éliminés", totalPreselectionnes, totalElimines);

        return Map.of("message","Filtrage effectué avec succès","total",N,"K1",K1,
                "scoreSeuil",scoreSeuil,"preselectionnes",totalPreselectionnes,"elimines",totalElimines);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FILTRAGE QUIZ — tous les sujets
    //  ✅ Emails envoyés automatiquement
    //  ✅ Planification des entretiens déclenchée automatiquement
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> filtrerQuizTousLesSujets() {
        log.info("🧪 Début filtrage QUIZ GLOBAL pour tous les sujets");

        List<SujetStage> sujets = sujetStageRepository.findAll();
        List<Map<String, Object>> resultatsSujets = new ArrayList<>();
        List<Long> sujetIds = new ArrayList<>();
        int totalSujetsFiltres = 0;
        int totalCandidaturesTraitees = 0;

        // ── 1. Filtrage quiz pour chaque sujet ───────────────────────────────
        for (SujetStage sujet : sujets) {
            List<Candidature> candidatures = candidatureRepository
                    .findBySujetIdAndStatut(sujet.getId(), StatutCandidature.PRESELECTIONNE_CV)
                    .stream()
                    .filter(c -> c.getScoreQuiz() != null)
                    .collect(Collectors.toList());

            if (candidatures.isEmpty()) continue;

            Map<String, Object> resultatSujet =
                    filtrerQuizCandidatures(sujet.getId(), sujet.getNbStagiaires());

            Map<String, Object> sujetInfo = new LinkedHashMap<>();
            sujetInfo.put("sujetId",     sujet.getId());
            sujetInfo.put("sujetTitre",  sujet.getTitre());
            sujetInfo.put("sujetCode",   sujet.getCodeSujet());
            sujetInfo.put("departement", sujet.getDepartement());
            sujetInfo.putAll(resultatSujet);
            resultatsSujets.add(sujetInfo);

            sujetIds.add(sujet.getId());
            totalSujetsFiltres++;
            totalCandidaturesTraitees += (int) resultatSujet.get("total");
        }

        // ── 2. Emails quiz (acceptés + éliminés) ────────────────────────────
        if (!sujetIds.isEmpty()) {
            log.info("📧 Envoi des emails quiz pour {} sujet(s)...", sujetIds.size());
            envoyerEmailsQuiz(sujetIds);
        }

        // ── 3. Planification automatique des entretiens via Groq ────────────
        log.info("📅 Lancement de la planification automatique des entretiens...");
        try {
            Map<String, Object> planifResult = interviewSchedulerService.planifierEntretiens(null);
            log.info("✅ Planification terminée : {}", planifResult.get("message"));
        } catch (Exception e) {
            log.error("❌ Erreur planification entretiens : {}", e.getMessage());
        }

        log.info("✅ Filtrage QUIZ global terminé : {} sujets filtrés, {} candidatures traitées",
                totalSujetsFiltres, totalCandidaturesTraitees);

        return Map.of(
                "message",                   "Filtrage quiz global effectué avec succès",
                "totalSujetsFiltres",        totalSujetsFiltres,
                "totalCandidaturesTraitees", totalCandidaturesTraitees,
                "detailsParSujet",           resultatsSujets
        );
    }


    @Transactional
    public Map<String, Object> filtrerQuizCandidatures(Long sujetId, int nombreStagiaires) {
        log.info("🧪 Début filtrage TEST TECHNIQUE (sur 50) pour sujet #{}, M={}", sujetId, nombreStagiaires);

        List<Candidature> candidatures = candidatureRepository
                .findBySujetIdAndStatut(sujetId, StatutCandidature.PRESELECTIONNE_CV)
                .stream()
                .filter(c -> c.getScoreQuiz() != null)
                .collect(Collectors.toList());

        int N1 = candidatures.size();
        log.info("📊 N1={} candidats après CV", N1);

        if (N1 == 0) {
            return Map.of("message","Aucune candidature à traiter","total",0);
        }

        int K2 = calculerK2(N1, nombreStagiaires);
        candidatures.sort(Comparator.comparingDouble(Candidature::getScoreQuiz).reversed());

        if (K2 >= N1) {
            candidatures.forEach(c -> c.setStatut(StatutCandidature.ACCEPTE_QUIZ));
            candidatureRepository.saveAll(candidatures);
            return Map.of("message","Tous les candidats passent au test","total",N1,
                    "retenus",N1,"elimines",0,"K2",K2);
        }

        double seuil = candidatures.get(K2 - 1).getScoreQuiz();
        log.info("🎯 Seuil technique (sur 50) = {}", seuil);

        for (Candidature c : candidatures) {
            c.setStatut(c.getScoreQuiz() >= seuil
                    ? StatutCandidature.ACCEPTE_QUIZ
                    : StatutCandidature.ELIMINE_QUIZ);
        }
        candidatureRepository.saveAll(candidatures);
        for (Candidature c : candidatures) {
            if (c.getStatut() == StatutCandidature.ACCEPTE_QUIZ) {
                notificationService.envoyer(
                        c.getCandidat().getId(),
                        "ACCEPTE_QUIZ",
                        "Quiz validé !",
                        "Votre quiz pour " + c.getSujet().getTitre() + " a été validé. Un entretien sera planifié prochainement."
                );
            } else if (c.getStatut() == StatutCandidature.ELIMINE_QUIZ) {
                notificationService.envoyer(
                        c.getCandidat().getId(),
                        "ELIMINE_QUIZ",
                        "Score insuffisant au quiz",
                        "Votre score au quiz pour " + c.getSujet().getTitre() + " n'a pas atteint le seuil requis."
                );
            }
        }

        long retenus  = candidatures.stream().filter(c -> c.getStatut() == StatutCandidature.ACCEPTE_QUIZ).count();
        long elimines = candidatures.stream().filter(c -> c.getStatut() == StatutCandidature.ELIMINE_QUIZ).count();

        log.info("✅ Test terminé : {} retenus, {} éliminés", retenus, elimines);

        return Map.of("message","Filtrage test technique (sur 50) effectué","total",N1,
                "K2",K2,"seuil",seuil,"retenus",retenus,"elimines",elimines);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EMAILS QUIZ — via EmailService
    // ─────────────────────────────────────────────────────────────────────────
    private void envoyerEmailsQuiz(List<Long> sujetIds) {
        for (Long sujetId : sujetIds) {

            List<Candidature> acceptes = candidatureRepository
                    .findBySujetIdAndStatut(sujetId, StatutCandidature.ACCEPTE_QUIZ)
                    .stream()
                    .filter(c -> c.getEmailQuizEnvoye() == null || !c.getEmailQuizEnvoye())
                    .collect(Collectors.toList());

            List<Candidature> elimines = candidatureRepository
                    .findBySujetIdAndStatut(sujetId, StatutCandidature.ELIMINE_QUIZ)
                    .stream()
                    .filter(c -> c.getEmailQuizEnvoye() == null || !c.getEmailQuizEnvoye())
                    .collect(Collectors.toList());

            log.info("[Email Quiz] Sujet #{} → {} accepté(s), {} éliminé(s)",
                    sujetId, acceptes.size(), elimines.size());



            for (Candidature c : elimines) {
                try {
                    emailService.sendHtmlEmail(
                            c.getCandidat().getEmail(),
                            "Résultats quiz technique — BCT Recrutement",
                            buildHtmlElimineQuiz(c.getCandidat().getName(),
                                    c.getSujet().getTitre(),
                                    c.getScoreQuiz())
                    );
                    c.setEmailQuizEnvoye(true);
                    candidatureRepository.save(c);
                    log.info("[Email Quiz] ❌ Éliminé → {}", c.getCandidat().getEmail());
                    Thread.sleep(500);
                } catch (Exception e) {
                    log.error("[Email Quiz] ❌ {} : {}", c.getCandidat().getEmail(), e.getMessage());
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HTML emails quiz
    // ─────────────────────────────────────────────────────────────────────────

    private String buildHtmlElimineQuiz(String nom, String sujet, Integer score) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
              <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #FAFAFA; padding: 15px; text-align: center;">
                  <img src="https://res.cloudinary.com/dsd9trywp/image/upload/v1775425705/bct_xs29hz.png" alt="BCT Logo" width="180" style="display:block; margin:auto; border:0;">
                </div>
                <hr style="border: none; border-top: 2px solid #003d7a; margin: 0;">
                <div style="padding: 25px;">
                  <h2 style="color: #c8102e;">Résultats du Quiz Technique</h2>
                  <p>Bonjour <strong>%s</strong>,</p>
                  <p>Nous vous remercions d'avoir participé au quiz technique pour le sujet <strong>"%s"</strong>.</p>
                  <p>Après analyse des résultats, nous avons le regret de vous informer que votre candidature n'a pas été retenue pour la suite du processus.</p>
                  <div style="background:#f8fafc; border-radius:8px; padding:16px; margin:20px 0; text-align:center; border:1px solid #e2e8f0;">
                    <p style="color:#64748b; font-size:12px; font-weight:700; text-transform:uppercase; margin:0 0 8px;">Votre score</p>
                    <p style="font-size:28px; font-weight:900; color:#1e293b; margin:0;">%s<span style="font-size:14px; color:#94a3b8;"> / 50</span></p>
                  </div>
                  <p>Nous vous encourageons à postuler lors de nos prochaines campagnes de recrutement.</p>
                </div>
                <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                  © 2026 Banque Centrale de Tunisie
                </div>
              </div>
            </body>
            </html>
            """.formatted(nom, sujet, score != null ? score : "N/A");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CALCULS K1 / K2  (INCHANGÉS)
    // ─────────────────────────────────────────────────────────────────────────
    private int calculerK1(int N, int M) {
        double ratio = (N <= 10) ? 0.7 : 0.5;
        int k1Calcule = (int) Math.round(ratio * N);
        int k1Final = Math.max(M + 2, k1Calcule);
        log.debug("Calcul K1 : N={}, M={}, ratio={}, k1Calcule={}, k1Final={}",
                N, M, ratio, k1Calcule, k1Final);
        return k1Final;
    }

    private int calculerK2(int N1, int M) {
        double ratio;
        if (N1 <= 2 * M) return N1;
        else if (N1 <= 10) ratio = 0.8;
        else ratio = 0.5;
        int k2Calcule = (int) Math.round(ratio * N1);
        int k2Final = Math.max(M + 1, k2Calcule);
        log.debug("Calcul K2 : N1={}, M={}, ratio={}, k2Calcule={}, k2Final={}",
                N1, M, ratio, k2Calcule, k2Final);
        return k2Final;
    }
    @Transactional
    public Map<String, Object> filtrerFinalTousLesSujets() {
        log.info("🏁 Début filtrage FINAL global pour tous les sujets");

        List<SujetStage> sujets = sujetStageRepository.findAll();
        List<Map<String, Object>> resultatsSujets = new ArrayList<>();
        List<Long> sujetIds = new ArrayList<>();
        int totalSujetsFiltres = 0;
        int totalTraitees = 0;

        for (SujetStage sujet : sujets) {
            // Candidats ayant un entretien planifié pour ce sujet
            List<Candidature> candidats = candidatureRepository
                    .findBySujetIdAndStatut(sujet.getId(), StatutCandidature.ENTRETIEN_PLANIFIE);

            if (candidats.isEmpty()) continue;

            Map<String, Object> res = filtrerFinalCandidatures(sujet.getId(), sujet.getNbStagiaires());

            Map<String, Object> info = new LinkedHashMap<>();
            info.put("sujetId",     sujet.getId());
            info.put("sujetTitre",  sujet.getTitre());
            info.put("sujetCode",   sujet.getCodeSujet());
            info.put("departement", sujet.getDepartement());
            info.putAll(res);
            resultatsSujets.add(info);

            sujetIds.add(sujet.getId());
            totalSujetsFiltres++;
            totalTraitees += (int) res.getOrDefault("total", 0);
        }

        // Emails (acceptés + refusés)
        if (!sujetIds.isEmpty()) {
            log.info("📧 Envoi des emails finaux pour {} sujet(s)...", sujetIds.size());
            envoyerEmailsFinal(sujetIds);
        }

        log.info("✅ Filtrage FINAL terminé : {} sujets, {} candidatures", totalSujetsFiltres, totalTraitees);

        return Map.of(
                "message",            "Filtrage final global effectué avec succès",
                "totalSujetsFiltres", totalSujetsFiltres,
                "totalTraitees",      totalTraitees,
                "detailsParSujet",    resultatsSujets
        );
    }



    @Transactional
    public Map<String, Object> filtrerFinalCandidatures(Long sujetId, int nombreStagiaires) {
        log.info("🏁 Filtrage FINAL sujet #{}, M={}", sujetId, nombreStagiaires);

        List<Candidature> candidats = candidatureRepository
                .findBySujetIdAndStatut(sujetId, StatutCandidature.ENTRETIEN_PLANIFIE);

        int N = candidats.size();
        if (N == 0) return Map.of("message", "Aucun candidat en entretien", "total", 0,
                "acceptes", 0, "refuses", 0);

        // ── Score combiné = CV (/100) + Quiz (/50) + Entretien (/10) ──
        Map<Long, Double> scoreCombine = new HashMap<>();
        Map<Long, Integer> noteEntretien = new HashMap<>();
        Map<Long, String>  notesRhMap    = new HashMap<>();

        for (Candidature c : candidats) {
            double cv   = c.getScoreAi()   != null ? c.getScoreAi()   : 0;
            double quiz = c.getScoreQuiz() != null ? c.getScoreQuiz() : 0;

            int    ent  = 0;
            String notesRh = "";
            var entOpt = entretienRepository.findByCandidatureId(c.getId());
            if (entOpt.isPresent()) {
                Entretien e = entOpt.get();
                ent     = e.getScoreEntretien() != null ? e.getScoreEntretien() : 0;
                notesRh = e.getNotesRh() != null ? e.getNotesRh() : "";
            }

            scoreCombine.put(c.getId(),  cv + quiz + ent);
            noteEntretien.put(c.getId(), ent);
            notesRhMap.put(c.getId(),    notesRh);
        }

        // ── Tri décroissant par score combiné, départage Groq sur égalité ──
        candidats.sort((a, b) -> {
            double sa = scoreCombine.get(a.getId());
            double sb = scoreCombine.get(b.getId());
            if (Double.compare(sb, sa) != 0) return Double.compare(sb, sa);
            // Égalité parfaite → Groq tranche via les notes RH
            return arbitrerEgalite(a, b, notesRhMap.get(a.getId()), notesRhMap.get(b.getId()));
        });

        // ── M meilleurs = ACCEPTE, le reste = REFUSE ──
        int M = Math.max(0, nombreStagiaires);
        List<Map<String, Object>> classement = new ArrayList<>();

        for (int i = 0; i < candidats.size(); i++) {
            Candidature c = candidats.get(i);
            boolean accepte = i < M;
            c.setStatut(accepte ? StatutCandidature.ACCEPTE : StatutCandidature.REFUSE);

            Map<String, Object> ligne = new LinkedHashMap<>();
            ligne.put("rang",          i + 1);
            ligne.put("candidatNom",   c.getCandidat().getName());
            ligne.put("scoreCv",       c.getScoreAi());
            ligne.put("scoreQuiz",     c.getScoreQuiz());
            ligne.put("scoreEntretien",noteEntretien.get(c.getId()));
            ligne.put("scoreCombine",  scoreCombine.get(c.getId()));
            ligne.put("decision",      accepte ? "ACCEPTE" : "REFUSE");
            classement.add(ligne);
        }
        candidatureRepository.saveAll(candidats);
        // ── Notifications temps réel ──────────────────────────────────────────
        for (Candidature c : candidats) {
            if (c.getStatut() == StatutCandidature.ACCEPTE) {
                notificationService.envoyer(
                        c.getCandidat().getId(),
                        "ACCEPTE",
                        "Félicitations — Candidature acceptée !",
                        "Votre candidature pour " + c.getSujet().getTitre() + " a été définitivement acceptée. Notre équipe RH vous contactera prochainement."
                );
            } else if (c.getStatut() == StatutCandidature.REFUSE) {
                notificationService.envoyer(
                        c.getCandidat().getId(),
                        "REFUSE",
                        "Résultat de votre candidature",
                        "Votre candidature pour " + c.getSujet().getTitre() + " n'a pas été retenue. Merci de votre intérêt pour la BCT."
                );
            }
        }

        long acceptes = candidats.stream().filter(c -> c.getStatut() == StatutCandidature.ACCEPTE).count();
        long refuses  = candidats.stream().filter(c -> c.getStatut() == StatutCandidature.REFUSE).count();

        log.info("✅ Sujet #{} : {} acceptés, {} refusés", sujetId, acceptes, refuses);

        return Map.of("message", "Filtrage final effectué", "total", N, "M", M,
                "acceptes", acceptes, "refuses", refuses, "classement", classement);
    }



    // Retour : négatif → a avant b ; positif → b avant a ; 0 → indéterminé
    @SuppressWarnings("unchecked")
    private int arbitrerEgalite(Candidature a, Candidature b, String notesA, String notesB) {
        // Si pas de notes des deux côtés → ordre stable (égalité neutre)
        if ((notesA == null || notesA.isBlank()) && (notesB == null || notesB.isBlank())) {
            return 0;
        }
        try {
            String prompt = String.format("""
                Tu es un membre du jury RH de la Banque Centrale de Tunisie.
                Deux candidats sont EX AEQUO sur leur score global (CV + quiz + entretien).
                Tu dois départager UNIQUEMENT à partir des remarques d'entretien du RH.
 
                Candidat A : %s
                Remarques RH sur A : "%s"
 
                Candidat B : %s
                Remarques RH sur B : "%s"
 
                Lequel a le meilleur potentiel pour le poste ?
                Réponds STRICTEMENT par un seul caractère : "A" ou "B". Aucun autre texte.
                """,
                    a.getCandidat().getName(), notesA == null ? "" : notesA,
                    b.getCandidat().getName(), notesB == null ? "" : notesB);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",       "llama-3.3-70b-versatile");
            body.put("max_tokens",  5);
            body.put("temperature", 0.0);
            body.put("messages", List.of(
                    Map.of("role", "system", "content",
                            "Tu réponds uniquement par 'A' ou 'B', sans aucun autre texte."),
                    Map.of("role", "user", "content", prompt)
            ));

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(groqApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> resp = restTemplate.exchange(
                    "https://api.groq.com/openai/v1/chat/completions",
                    HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

            if (resp.getBody() == null) return 0;
            List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.getBody().get("choices");
            if (choices == null || choices.isEmpty()) return 0;

            String content = ((Map<String, Object>) choices.get(0).get("message"))
                    .get("content").toString().trim().toUpperCase();

            if (content.startsWith("A")) { log.info("[Arbitrage Groq] A={} avant B={}", a.getCandidat().getName(), b.getCandidat().getName()); return -1; }
            if (content.startsWith("B")) { log.info("[Arbitrage Groq] B={} avant A={}", b.getCandidat().getName(), a.getCandidat().getName()); return  1; }
            return 0;

        } catch (Exception e) {
            log.error("[Arbitrage Groq] erreur : {} → égalité neutre", e.getMessage());
            return 0;
        }
    }


    private void envoyerEmailsFinal(List<Long> sujetIds) {
        for (Long sujetId : sujetIds) {

            List<Candidature> acceptes = candidatureRepository
                    .findBySujetIdAndStatut(sujetId, StatutCandidature.ACCEPTE)
                    .stream()
                    .filter(c -> c.getEmailFinalEnvoye() == null || !c.getEmailFinalEnvoye())
                    .collect(Collectors.toList());

            List<Candidature> refuses = candidatureRepository
                    .findBySujetIdAndStatut(sujetId, StatutCandidature.REFUSE)
                    .stream()
                    .filter(c -> c.getEmailFinalEnvoye() == null || !c.getEmailFinalEnvoye())
                    .collect(Collectors.toList());

            log.info("[Email Final] Sujet #{} → {} accepté(s), {} refusé(s)",
                    sujetId, acceptes.size(), refuses.size());

            for (Candidature c : acceptes) {
                try {
                    emailService.sendHtmlEmail(
                            c.getCandidat().getEmail(),
                            "Félicitations — Vous êtes retenu(e) | BCT Recrutement",
                            buildHtmlAccepteFinal(c.getCandidat().getName(), c.getSujet().getTitre()));
                    c.setEmailFinalEnvoye(true);
                    candidatureRepository.save(c);
                    log.info("[Email Final] ✅ Accepté → {}", c.getCandidat().getEmail());
                    Thread.sleep(500);
                } catch (Exception e) {
                    log.error("[Email Final] ❌ {} : {}", c.getCandidat().getEmail(), e.getMessage());
                }
            }

            for (Candidature c : refuses) {
                try {
                    emailService.sendHtmlEmail(
                            c.getCandidat().getEmail(),
                            "Résultats finaux — BCT Recrutement",
                            buildHtmlRefuseFinal(c.getCandidat().getName(), c.getSujet().getTitre()));
                    c.setEmailFinalEnvoye(true);
                    candidatureRepository.save(c);
                    log.info("[Email Final] ❌ Refusé → {}", c.getCandidat().getEmail());
                    Thread.sleep(500);
                } catch (Exception e) {
                    log.error("[Email Final] ❌ {} : {}", c.getCandidat().getEmail(), e.getMessage());
                }
            }
        }
    }



    private String buildHtmlAccepteFinal(String nom, String sujet) {
        return """
            <!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
              <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #FAFAFA; padding: 15px; text-align: center;">
                  <img src="https://res.cloudinary.com/dsd9trywp/image/upload/v1775425705/bct_xs29hz.png" alt="BCT Logo" width="180" style="display:block; margin:auto; border:0;">
                </div>
                <hr style="border: none; border-top: 2px solid #003d7a; margin: 0;">
                <div style="padding: 25px;">
                  <h2 style="color: #059669;">Félicitations !</h2>
                  <p>Bonjour <strong>%s</strong>,</p>
                  <p>Nous avons le plaisir de vous informer que votre candidature pour le stage <strong>"%s"</strong> a été <strong>retenue</strong> à l'issue de l'ensemble du processus de sélection (CV, quiz technique et entretien).</p>
                  <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:20px 0;">
                    <p style="color:#15803d; font-weight:700; margin:0;">Notre service RH vous contactera très prochainement pour les modalités d'intégration.</p>
                  </div>
                  <p>Nous vous félicitons chaleureusement et avons hâte de vous accueillir au sein de la Banque Centrale de Tunisie.</p>
                </div>
                <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                  © 2026 Banque Centrale de Tunisie
                </div>
              </div></body></html>
            """.formatted(nom, sujet);
    }

    private String buildHtmlRefuseFinal(String nom, String sujet) {
        return """
            <!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
              <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #FAFAFA; padding: 15px; text-align: center;">
                  <img src="https://res.cloudinary.com/dsd9trywp/image/upload/v1775425705/bct_xs29hz.png" alt="BCT Logo" width="180" style="display:block; margin:auto; border:0;">
                </div>
                <hr style="border: none; border-top: 2px solid #003d7a; margin: 0;">
                <div style="padding: 25px;">
                  <h2 style="color: #c8102e;">Résultats finaux du recrutement</h2>
                  <p>Bonjour <strong>%s</strong>,</p>
                  <p>Nous vous remercions sincèrement pour votre participation à l'ensemble du processus de recrutement pour le stage <strong>"%s"</strong>, ainsi que pour le temps consacré à l'entretien.</p>
                  <p>Après une évaluation attentive de toutes les étapes, nous avons le regret de vous informer que votre candidature n'a pas été retenue pour cette session.</p>
                  <p>Votre profil nous a néanmoins marqués, et nous vous encourageons vivement à postuler lors de nos prochaines campagnes.</p>
                  <p>Nous vous souhaitons une pleine réussite dans vos projets professionnels.</p>
                </div>
                <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                  © 2026 Banque Centrale de Tunisie
                </div>
              </div></body></html>
            """.formatted(nom, sujet);
    }

}