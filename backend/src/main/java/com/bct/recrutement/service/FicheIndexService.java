package com.bct.recrutement.service;

import com.bct.recrutement.entity.Candidature;
import com.bct.recrutement.entity.Entretien;
import com.bct.recrutement.repository.CandidatureRepository;
import com.bct.recrutement.repository.EntretienRepository;
import com.bct.recrutement.repository.Profilcandidatrepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class FicheIndexService {

    @Autowired private CandidatureRepository    candidatureRepository;
    @Autowired private EntretienRepository      entretienRepository;
    @Autowired private CvVectorClient           cvVectorClient;
    @Autowired private Profilcandidatrepository profilRepository;

    // ── Réindexe TOUTES les fiches candidats (batch, 1 appel HTTP) ────────────
    @Async
    public void reindexerToutesLesFiches() {
        List<Candidature> toutes = candidatureRepository.findAll();

        Map<Long, Entretien> entParCand = new HashMap<>();
        for (Entretien e : entretienRepository.findAll())
            if (e.getCandidature() != null)
                entParCand.put(e.getCandidature().getId(), e);

        List<Map<String, Object>> fiches = new ArrayList<>();
        for (Candidature c : toutes) {
            String nom = c.getCandidat() != null ? c.getCandidat().getName() : "?";

            Map<String, Object> f = new LinkedHashMap<>();
            f.put("candidatureId", c.getId());
            f.put("candidatNom",   nom);
            f.put("texte",         construireTexteFiche(c, entParCand.get(c.getId())));
            fiches.add(f);
        }

        cvVectorClient.indexerFiches(fiches);
    }

    // ── Réindexe TOUS les CV existants (async, en arrière-plan) ───────────────
    @Async
    public void reindexerTousLesCv() {
        reindexerTousLesCvDebug();
    }

    // ── Version DEBUG (synchrone, affiche tout dans la console) ───────────────
    public void reindexerTousLesCvDebug() {
        List<Candidature> toutes = candidatureRepository.findAll();
        System.out.println("[DEBUG CV] " + toutes.size() + " candidatures trouvées");

        int ok = 0, skip = 0;
        for (Candidature c : toutes) {
            if (c.getCandidat() == null) {
                System.out.println("[DEBUG CV] #" + c.getId() + " : pas de candidat");
                skip++; continue;
            }

            String cvUrl = profilRepository.findByUser(c.getCandidat())
                    .map(p -> p.getCv())
                    .orElse(null);

            if (cvUrl == null || cvUrl.isBlank()) {
                System.out.println("[DEBUG CV] #" + c.getId() + " (" + c.getCandidat().getName() + ") : pas de CV");
                skip++; continue;
            }

            // URL publique (raw/upload) → on l'utilise telle quelle.
            // (le nettoyage /s--xxx-- ne change rien ici, mais on le garde par sécurité)
            String cleanUrl = cvUrl.replaceAll("/s--[^/]+--", "");

            System.out.println("[DEBUG CV] #" + c.getId() + " (" + c.getCandidat().getName() + ") → " + cleanUrl);

            boolean done = cvVectorClient.indexerCvSync(
                    c.getId(),
                    c.getCandidat().getName(),
                    c.getSujet() != null ? c.getSujet().getTitre() : "?",
                    cleanUrl
            );
            if (done) { ok++; System.out.println("[DEBUG CV]   ✅ indexé"); }
            else      { skip++; System.out.println("[DEBUG CV]   ❌ échec"); }

            try { Thread.sleep(150); } catch (InterruptedException ignored) {}
        }
        System.out.println("[DEBUG CV] TERMINÉ : " + ok + " indexés, " + skip + " ignorés");
    }

    // ── Construit le texte structuré d'une fiche (ce qui sera embeddé) ────────
    //    PUBLIC pour pouvoir l'appeler depuis CandidatureService (postulation)
    public String construireTexteFiche(Candidature c, Entretien e) {
        String nom   = c.getCandidat() != null ? c.getCandidat().getName()  : "?";
        String email = c.getCandidat() != null ? c.getCandidat().getEmail() : "?";
        String sujet = c.getSujet() != null ? c.getSujet().getTitre() : "?";
        String cv    = c.getScoreAi()   != null ? c.getScoreAi() + "/100" : "non évalué";
        String quiz  = c.getScoreQuiz() != null ? c.getScoreQuiz() + "/50" : "non évalué";

        String noteEnt = "non évalué";
        String notesRh = "aucune";
        if (e != null) {
            if (e.getScoreEntretien() != null) noteEnt = e.getScoreEntretien() + "/10";
            if (e.getNotesRh() != null && !e.getNotesRh().isBlank())
                notesRh = e.getNotesRh().replaceAll("\\s+", " ").trim();
        }

        String statut = c.getStatut() != null ? c.getStatut().name() : "INCONNU";

        return String.format(
                "FICHE CANDIDAT. Nom: %s. Email: %s. Sujet de stage visé: %s. " +
                        "Score CV (IA): %s. Score quiz technique: %s. Note d'entretien: %s. " +
                        "Statut actuel: %s. Remarques du RH lors de l'entretien: %s.",
                nom, email, sujet, cv, quiz, noteEnt, statut, notesRh);
    }
}