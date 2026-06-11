package com.bct.recrutement.service;

import com.bct.recrutement.entity.*;
import com.bct.recrutement.entity.Candidature.StatutCandidature;
import com.bct.recrutement.repository.*;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CandidatureService {
    @Autowired private Profilcandidatrepository profilRepository;
    private static final int MAX_CANDIDATURES  = 3;
    private static final int MIN_LETTRE_LENGTH = 100;
    @Autowired
    private SujetStageRepository sujetRepository;
    @Autowired
    private QuizRepository quizRepository;

    @Autowired
    private QuizSessionRepository quizSessionRepository;
    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.FRENCH);
    @Autowired private EntretienRepository entretienRepository;
    @Autowired private CandidatureRepository    candidatureRepository;
    @Autowired private SujetStageRepository     sujetStageRepository;
    @Autowired private Profilcandidatrepository profilCandidatRepository;
    @Autowired private UserService              userService;
    @Autowired private ScoringService           scoringService;
    @Autowired private CvVectorClient    cvVectorClient;
    @Autowired private FicheIndexService ficheIndexService;
    // ─────────────────────────────────────────────────────────────────────────
    // RH — Liste toutes les candidatures
    // ─────────────────────────────────────────────────────────────────────────
    public List<Map<String, Object>> getAllCandidatures() {
        return candidatureRepository.findAll()
                .stream()
                .sorted((a, b) -> {
                    if (a.getDateDepot() == null) return 1;
                    if (b.getDateDepot() == null) return -1;
                    return b.getDateDepot().compareTo(a.getDateDepot()); // plus récent en premier
                })
                .map(this::toListItem)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RH — Détail complet d'une candidature (pour la modal)
    // Inclut : candidat + profil académique + sujet + score IA complet
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> getCandidatureDetail(Long id) {
        Candidature c = candidatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidature introuvable : " + id));

        Profilcandidat profil = profilCandidatRepository
                .findByUser(c.getCandidat())
                .orElse(null);
        Map<String, Object> details = buildDetails(c, profil);

        // ── Vérifier si une session quiz existe pour ce candidat ──────────────
        quizRepository.findBySujetId(c.getSujet().getId())
                .ifPresent(quiz ->
                        quizSessionRepository
                                .findByUserIdAndQuizId(c.getCandidat().getId(), quiz.getId())
                                .ifPresent(session -> {
                                    details.put("sessionSubmitted", session.isSubmitted());
                                    details.put("sessionStartedAt",
                                            session.getStartedAt() != null
                                                    ? session.getStartedAt().toString() : null);
                                })
                );

        // Si pas de session trouvée → false par défaut
        details.putIfAbsent("sessionSubmitted", false);
        details.putIfAbsent("sessionStartedAt", null);
        details.put("emailcvenvoye",   c.getEmailCvEnvoye());
        // ── Ajouter les champs quiz de la candidature ─────────────────────────
        details.put("scoreQuiz",   c.getScoreQuiz());
        details.put("mentionQuiz", c.getMentionQuiz());
        details.put("quizPasseLe", c.getQuizPasseLe() != null
                ? c.getQuizPasseLe().toString() : null);
        details.put("sujetId",     c.getSujet().getId());  // pour navigate quiz
        entretienRepository.findByCandidatureId(c.getId()).ifPresent(ent -> {
            details.put("roomToken",       ent.getRoomToken());
            details.put("entretienStatut", ent.getStatut());
            details.put("scoreEntretien",  ent.getScoreEntretien());   // ✅ note /10
            details.put("notesRh",         ent.getNotesRh() != null ? ent.getNotesRh() : ""); // ✅ remarques
            details.put("dateEntretien",   ent.getDateDebut()
                    .format(java.time.format.DateTimeFormatter.ofPattern(
                            "EEEE dd MMMM yyyy 'à' HH'h'mm", Locale.FRENCH)));
            details.put("entretienDebut",  ent.getDateDebut().toString());
            details.put("entretienFin",    ent.getDateFin().toString());
            details.put("entretienHeureDebut", ent.getDateDebut()
                    .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
            details.put("entretienHeureFin",   ent.getDateFin()
                    .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        });
        return details;
    }

    public List<Map<String, Object>> getCandidaturesBySujet(Long sujetId) {
        // Vérifier que le sujet existe (optionnel, mais plus propre)
        sujetStageRepository.findById(sujetId)
                .orElseThrow(() -> new RuntimeException("Sujet introuvable : " + sujetId));

        return candidatureRepository.findBySujetId(sujetId)
                .stream()
                .sorted((a, b) -> {
                    if (a.getDateDepot() == null) return 1;
                    if (b.getDateDepot() == null) return -1;
                    return b.getDateDepot().compareTo(a.getDateDepot());
                })
                .map(this::toListItem)  // réutilise le mapping existant (léger)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RH — Ancien endpoint détails (conservé pour compatibilité)
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> getCandidatureDetails(Long id) {
        return getCandidatureDetail(id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RH — Changer le statut d'une candidature
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> updateStatut(Long id, String statutStr) {
        Candidature c = candidatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidature introuvable"));
        try {
            c.setStatut(StatutCandidature.valueOf(statutStr));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Statut invalide : " + statutStr);
        }
        return toListItem(candidatureRepository.save(c));
    }
    public Map<String, Object> updateemailcvenvoye(Long id) {
        Candidature c = candidatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidature introuvable"));
        try {


            // Mise à jour de l'attribut à true
            c.setEmailCvEnvoye(true);

        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Statut invalide : " );
        }
        return toListItem(candidatureRepository.save(c));
    }
    // ─────────────────────────────────────────────────────────────────────────
    // CANDIDAT — Mes candidatures
    // ─────────────────────────────────────────────────────────────────────────
    public List<Map<String, Object>> getMesCandidatures(String email) {
        User candidat = userService.findByEmail(email);
        return candidatureRepository.findByCandidatOrderByDateDepotDesc(candidat)
                .stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CANDIDAT — Postuler à un sujet
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> postuler(String email, Long sujetId, String lettreMotivation) {
        User candidat = userService.findByEmail(email);

        if (lettreMotivation == null || lettreMotivation.isBlank())
            throw new RuntimeException("La lettre de motivation est obligatoire");
        if (lettreMotivation.trim().length() < MIN_LETTRE_LENGTH)
            throw new RuntimeException(
                    "La lettre de motivation doit contenir au moins " + MIN_LETTRE_LENGTH + " caractères");

        Profilcandidat profil = profilCandidatRepository.findByUser(candidat)
                .orElseThrow(() -> new RuntimeException(
                        "Vous devez compléter votre profil avant de postuler"));
        validerProfilComplet(profil);

        SujetStage sujet = sujetStageRepository.findById(sujetId)
                .orElseThrow(() -> new RuntimeException("Sujet introuvable"));
        if (!sujet.getNiveauEtudes().equals(profil.getNiveauInstructionActuel())) {
            throw new RuntimeException(
                    "Votre niveau d'instruction ne correspond pas au niveau requis pour ce sujet");
        }
        long nbCandidatures = candidatureRepository.countByCandidat(candidat);
        if (nbCandidatures >= MAX_CANDIDATURES)
            throw new RuntimeException(
                    "Vous avez atteint la limite de " + MAX_CANDIDATURES + " candidatures autorisées");

        candidatureRepository.findByCandidatIdAndSujetId(candidat.getId(), sujetId)
                .ifPresent(c -> { throw new RuntimeException("Vous avez déjà postulé à ce sujet"); });


        Candidature c = Candidature.builder()
                .candidat(candidat)
                .sujet(sujet)
                .statut(StatutCandidature.EN_COURS_EXAMEN)
                .dateDepot(LocalDate.now())
                .lettreMotivation(lettreMotivation.trim())
                .build();
        String cvUrl = profil.getCv();
        Candidature saved = candidatureRepository.save(c);
        scoringService.scorerCandidature(saved.getId()); // @Async → non bloquant
        if (cvUrl != null && !cvUrl.isBlank()) {
            String cleanUrl = cvUrl.replaceAll("/s--[^/]+--", "");
            cvVectorClient.indexerCv(
                    saved.getId(),
                    candidat.getName(),
                    sujet.getTitre(),
                    cleanUrl
            );
        }
        cvVectorClient.indexerFiche(
                saved.getId(),
                candidat.getName(),
                ficheIndexService.construireTexteFiche(saved, null)
        );
        return toMap(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS PRIVÉS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Ligne légère pour le tableau RH.
     * Inclut le score IA résumé (score + compatibilité).
     */
    private Map<String, Object> toListItem(Candidature c) {
        Map<String, Object> m = new LinkedHashMap<>();

        m.put("id",               c.getId());
        m.put("statut",           c.getStatut().name());
        m.put("statutLabel",      labelFromStatut(c.getStatut()));
        m.put("statutClass",      classFromStatut(c.getStatut()));
        m.put("dateDepot",        c.getDateDepot() != null
                ? c.getDateDepot().format(FMT) : null);
        m.put("lettreMotivation", c.getLettreMotivation());
        m.put("ismailcvenvoye", c.getEmailCvEnvoye());
        m.put("ismailquizenvoye", c.getEmailQuizEnvoye());
        m.put("ismailfinalenvoye", c.getEmailFinalEnvoye());

        // Candidat
        User u = c.getCandidat();
        m.put("candidatId",       u != null ? u.getId()       : null);
        m.put("candidatNom",      u != null ? u.getName()     : null);
        m.put("candidatEmail",    u != null ? u.getEmail()    : null);
        m.put("candidatPhoto",    u != null ? u.getPhotoUrl() : null);
        m.put("role",             u != null ? u.getRole().name() : null);

        // Sujet
        SujetStage s = c.getSujet();
        m.put("sujetId",          s != null ? s.getId()           : null);
        m.put("sujetTitre",       s != null ? s.getTitre()        : null);
        m.put("sujetDepartement", s != null ? s.getDepartement()  : null);
        m.put("sujetCode",        s != null ? s.getCodeSujet()    : null);

        // Profil (minimal pour la liste)
        if (u != null) {
            profilCandidatRepository.findByUser(u).ifPresent(p -> {
                m.put("specialite", p.getSpecialite());
                m.put("universite", p.getUniversite());
                m.put("cv",         p.getCv());
            });
        }

        // Score IA résumé (attributs directs maintenant)
        m.put("scoreAi",              c.getScoreAi());
        m.put("compatibilite",        c.getCompatibilite());
        m.put("scoreLettreMotivation", c.getScoreLettreMotivation());
        m.put("scoreQuiz", c.getScoreQuiz());
        entretienRepository.findByCandidatureId(c.getId()).ifPresent(ent -> {
            m.put("scoreEntretien", ent.getScoreEntretien());
            m.put("entretienStatut", ent.getStatut());
        });

        return m;
    }

    /**
     * Détail complet pour la modal RH.
     * Inclut : candidat + profil académique + sujet + scoreAi complet.
     */
    private Map<String, Object> buildDetails(Candidature c, Profilcandidat p) {

        // ── Sujet ─────────────────────────────────────────────────────────
        Map<String, Object> sujet = new LinkedHashMap<>();
        sujet.put("id",           c.getSujet().getId());
        sujet.put("codeSujet",    c.getSujet().getCodeSujet());
        sujet.put("titre",        c.getSujet().getTitre());
        sujet.put("departement",  c.getSujet().getDepartement());
        sujet.put("duree",        c.getSujet().getDuree());
        sujet.put("niveauEtudes", c.getSujet().getNiveauEtudes());
        sujet.put("specialite",   c.getSujet().getSpecialite());
        sujet.put("description",  c.getSujet().getDescription());
        sujet.put("competences",  c.getSujet().getCompetences());

        // ── Candidat ──────────────────────────────────────────────────────
        Map<String, Object> candidat = new LinkedHashMap<>();
        candidat.put("id",       c.getCandidat().getId());
        candidat.put("nom",      c.getCandidat().getName());
        candidat.put("email",    c.getCandidat().getEmail());
        candidat.put("photoUrl", c.getCandidat().getPhotoUrl());

        // ── Profil académique ─────────────────────────────────────────────
        Map<String, Object> profilMap = new LinkedHashMap<>();
        if (p != null) {
            profilMap.put("specialite",              p.getSpecialite());
            profilMap.put("nationalite",             p.getNationalite());
            profilMap.put("cursusActuel",            p.getCursusActuel());
            profilMap.put("niveauInstructionActuel", p.getNiveauInstructionActuel());
            profilMap.put("universite",              p.getUniversite());
            profilMap.put("moyDerAnnee",             p.getMoyDerAnnee());
            profilMap.put("moyAvantDerAnnee",        p.getMoyAvantDerAnnee());
            profilMap.put("dateSoumission",          p.getDateSoumission() != null
                    ? p.getDateSoumission().toString() : null);
            profilMap.put("numeroDocument",          p.getNumeroDocument());
            profilMap.put("cv",                      p.getCv());
            profilMap.put("typeDocumentIdentite",    p.getTypeDocumentIdentite() != null
                    ? p.getTypeDocumentIdentite().name() : null);
        } else {
            profilMap.put("message", "Profil non encore complété");
        }

        // ── Score IA complet (attributs directs maintenant) ───────────────
        Map<String, Object> scoreAiMap = null;
        if (c.getScoreAi() != null) {
            scoreAiMap = new LinkedHashMap<>();
            scoreAiMap.put("scoreAi",              c.getScoreAi());
            scoreAiMap.put("compatibilite",        c.getCompatibilite());
            scoreAiMap.put("rapport",              c.getRapport());
            scoreAiMap.put("calculeLe",            c.getCalculeLe() != null
                    ? c.getCalculeLe().toString() : null);
            scoreAiMap.put("detail",               parseDetailScores(c.getDetailScores()));
            scoreAiMap.put("scoreLettreMotivation", c.getScoreLettreMotivation());
        }

        // ── Résultat complet ──────────────────────────────────────────────
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id",               c.getId());
        result.put("statut",           c.getStatut().name());
        result.put("statutLabel",      labelFromStatut(c.getStatut()));
        result.put("statutClass",      classFromStatut(c.getStatut()));
        result.put("dateDepot",        c.getDateDepot() != null
                ? c.getDateDepot().format(FMT) : null);
        result.put("lettreMotivation", c.getLettreMotivation());
        result.put("sujet",            sujet);
        result.put("candidat",         candidat);
        result.put("profil",           profilMap);
        result.put("scoreAi",          scoreAiMap); // null si pas encore calculé
        result.put("sujetTitre",      c.getSujet().getTitre());
        result.put("sujetDepartement", c.getSujet().getDepartement());
        result.put("sujetId",          c.getSujet().getId());
        result.put("emailcv",          c.getEmailCvEnvoye());
        result.put("scoreQuiz",            c.getScoreQuiz());
        result.put("mentionQuiz",          c.getMentionQuiz());
        result.put("quizPasseLe",          c.getQuizPasseLe() != null
                ? c.getQuizPasseLe().toString() : null);

        result.put("recordingUrl",         c.getRecordingUrl());
        result.put("recordingDurationSec", c.getRecordingDurationSec());
        result.put("recordingUploadedAt",  c.getRecordingUploadedAt() != null
                ? c.getRecordingUploadedAt().toString() : null);
        return result;
    }

    /**
     * Mapper simple pour les candidatures du candidat connecté.
     */
    private Map<String, Object> toMap(Candidature c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",               c.getId());

        m.put("sujetId",          c.getSujet().getId());
        m.put("sujetTitre",       c.getSujet().getTitre());
        m.put("sujetDepartement", c.getSujet().getDepartement());
        m.put("statut",           c.getStatut().name());
        m.put("statutLabel",      labelFromStatut(c.getStatut()));
        m.put("statutClass",      classFromStatut(c.getStatut()));
        m.put("dateDepot",        c.getDateDepot() != null
                ? c.getDateDepot().format(FMT) : null);
        m.put("lettreMotivation", c.getLettreMotivation());

        // Score IA résumé visible par le candidat (attributs directs)
        m.put("scoreAi",              c.getScoreAi());
        m.put("compatibilite",        c.getCompatibilite());
        m.put("scoreLettreMotivation", c.getScoreLettreMotivation());

        return m;
    }

    // ── Validation profil complet avant candidature ───────────────────────
    private void validerProfilComplet(Profilcandidat p) {
        List<String> manquants = new ArrayList<>();
        if (isBlank(p.getSpecialite()))              manquants.add("Spécialité");
        if (isBlank(p.getNationalite()))             manquants.add("Nationalité");
        if (isBlank(p.getCursusActuel()))            manquants.add("Cursus actuel");
        if (isBlank(p.getNiveauInstructionActuel())) manquants.add("Niveau d'instruction");
        if (isBlank(p.getUniversite()))              manquants.add("Université");
        if (p.getMoyDerAnnee()     == null)          manquants.add("Moyenne dernière année");
        if (p.getMoyAvantDerAnnee()== null)          manquants.add("Moyenne avant-dernière année");
        if (p.getDateSoumission()  == null)          manquants.add("Date de soumission");
        if (p.getTypeDocumentIdentite() == null)     manquants.add("Type de document d'identité");
        if (isBlank(p.getNumeroDocument()))          manquants.add("Numéro de document");
        if (isBlank(p.getCv()))                      manquants.add("CV");
        if (!manquants.isEmpty())
            throw new RuntimeException("Profil incomplet. Champs manquants : "
                    + String.join(", ", manquants));
    }

    // ── Parse detailScores JSON → Map ─────────────────────────────────────
    private Map<String, Object> parseDetailScores(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(json, LinkedHashMap.class);
        } catch (Exception e) { return null; }
    }

    private boolean isBlank(String s) { return s == null || s.isBlank(); }

    // ── Labels ────────────────────────────────────────────────────────────
    private String labelFromStatut(StatutCandidature s) {
        return switch (s) {
            case EN_COURS_EXAMEN    -> "En cours d'examen";
            case PRESELECTIONNE_CV  -> "Présélectionné (CV)";
            case ELIMINE_CV         -> "Éliminé (CV)";
            case ELIMINE_QUIZ         -> "Éliminé (Quiz)";
            case ENTRETIEN_PLANIFIE -> "Entretien planifié";
            case ACCEPTE_QUIZ       -> "Accepté (phase quiz)";
            case ACCEPTE            -> "Accepté";
            case REFUSE             -> "Refusé";
        };
    }

    private String classFromStatut(StatutCandidature s) {
        return switch (s) {
            case ENTRETIEN_PLANIFIE, ACCEPTE, ACCEPTE_QUIZ,
                    PRESELECTIONNE_CV -> "db-status-green";
            case EN_COURS_EXAMEN                          -> "db-status-blue";
            case ELIMINE_CV,  REFUSE,ELIMINE_QUIZ       -> "db-status-gray";
        };
    }




}