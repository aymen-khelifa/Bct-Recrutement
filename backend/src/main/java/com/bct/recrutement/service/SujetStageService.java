package com.bct.recrutement.service;

import com.bct.recrutement.entity.QuizGenerationStatus;
import com.bct.recrutement.entity.StatutSujet;
import com.bct.recrutement.entity.SujetStage;
import com.bct.recrutement.entity.User;
import com.bct.recrutement.repository.QuizGenerationStatusRepository;
import com.bct.recrutement.repository.SujetStageRepository;
import com.bct.recrutement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SujetStageService {

    @Autowired
    private SujetStageRepository sujetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QuizGenerationService quizGenerationService;

    @Autowired
    private QuizGenerationStatusRepository quizGenerationStatusRepository;

    // ─────────────────────────────────────────────────────────────────────────
    //  Créer un sujet → déclenche automatiquement la génération du quiz IA
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public SujetStage createSujet(SujetStage sujet, String emailRH) {
        if (sujetRepository.existsByCodeSujet(sujet.getCodeSujet())) {
            throw new RuntimeException("Ce code sujet existe déjà : " + sujet.getCodeSujet());
        }
        User createur = userRepository.findByEmail(emailRH)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé : " + emailRH));

        sujet.setCodeSujet(sujet.getCodeSujet().toUpperCase().trim());
        sujet.setStatut(StatutSujet.PUBLIE);
        sujet.setCreateur(createur);
        if (sujet.getCompetences() == null) sujet.setCompetences(List.of());

        return sujetRepository.save(sujet);
    }


    public void triggerGeneration(Long sujetId) {
        quizGenerationService.generateAsync(sujetId);
    }
    @Transactional
    public SujetStage updateSujet(Long id, SujetStage request, String emailRH) {
        SujetStage sujet = sujetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sujet non trouvé : " + id));

        if (!sujet.getCreateur().getEmail().equals(emailRH)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à modifier ce sujet");
        }

        // Vérifier unicité du code si changé
        if (!sujet.getCodeSujet().equals(request.getCodeSujet().toUpperCase().trim())
                && sujetRepository.existsByCodeSujet(request.getCodeSujet().toUpperCase().trim())) {
            throw new RuntimeException("Ce code sujet existe déjà : " + request.getCodeSujet());
        }

        sujet.setCodeSujet(request.getCodeSujet().toUpperCase().trim());
        sujet.setTitre(request.getTitre());
        sujet.setDepartement(request.getDepartement());
        sujet.setDuree(request.getDuree());
        sujet.setNbStagiaires(request.getNbStagiaires());
        sujet.setNiveauEtudes(request.getNiveauEtudes());
        sujet.setSpecialite(request.getSpecialite());
        sujet.setDescription(request.getDescription());
        sujet.setCompetences(request.getCompetences() != null ? request.getCompetences() : List.of());

        return sujetRepository.save(sujet);
    }


    public List<SujetStage> getAllPublished() {
        return sujetRepository.findByStatut(StatutSujet.PUBLIE);
    }
    public List<SujetStage> getAllSujets() {
        return sujetRepository.findAll();
    }
    public List<SujetStage> getMySujets(String emailRH) {
        User createur = userRepository.findByEmail(emailRH)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return sujetRepository.findByCreateur(createur);
    }

    public SujetStage getSujetById(Long id) {
        return sujetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sujet non trouvé : " + id));
    }

    @Transactional
    public void deleteSujet(Long id, String emailRH) {
        SujetStage sujet = sujetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sujet non trouvé : " + id));
        if (!sujet.getCreateur().getEmail().equals(emailRH)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à supprimer ce sujet");
        }
        sujetRepository.delete(sujet);
    }

    @Transactional
    public SujetStage archiverSujet(Long id, String emailRH) {
        SujetStage sujet = sujetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sujet non trouvé : " + id));
        if (!sujet.getCreateur().getEmail().equals(emailRH)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à modifier ce sujet");
        }
        sujet.setStatut(StatutSujet.ARCHIVE);
        return sujetRepository.save(sujet);
    }
    @Scheduled(cron = "0 0 0 1 1 ?")
    @Transactional
    public List<SujetStage> archiverTousSujetsGlobal() {

        List<SujetStage> tousLesSujets = sujetRepository.findAll();


        tousLesSujets.forEach(sujet -> sujet.setStatut(StatutSujet.ARCHIVE));


        return sujetRepository.saveAll(tousLesSujets);
    }
    @Transactional
    public SujetStage publierSujet(Long id, String emailRH) {
        SujetStage sujet = sujetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sujet non trouvé : " + id));
        if (!sujet.getCreateur().getEmail().equals(emailRH)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à modifier ce sujet");
        }
        sujet.setStatut(StatutSujet.PUBLIE);
        return sujetRepository.save(sujet);
    }
    // Recherche live (champ search Offres.jsx)
    public List<SujetStage> search(String keyword) {
        if (keyword == null || keyword.isBlank())
            return getAllPublished();
        return sujetRepository.searchPublies(keyword);
    }

    // Filtre par département
    public List<SujetStage> filterByDepartement(String departement) {
        return sujetRepository.findByDepartementAndStatut(departement, StatutSujet.PUBLIE);
    }

    // Filtre par niveau d'études
    public List<SujetStage> filterByNiveau(String niveau) {
        return sujetRepository.findByNiveauEtudesAndStatut(niveau, StatutSujet.PUBLIE);
    }
    public List<SujetStage> filter(String search, String departement, String niveau, boolean includeArchive) {
        List<SujetStage> results = includeArchive
                ? sujetRepository.findAll()
                : sujetRepository.findByStatut(StatutSujet.PUBLIE);

        // Filtre recherche texte
        if (search != null && !search.isBlank()) {
            String kw = search.toLowerCase();
            results = results.stream()
                    .filter(s ->
                            (s.getTitre()       != null && s.getTitre().toLowerCase().contains(kw)) ||
                                    (s.getDescription() != null && s.getDescription().toLowerCase().contains(kw)) ||
                                    (s.getCodeSujet()   != null && s.getCodeSujet().toLowerCase().contains(kw)) ||
                                    (s.getDepartement() != null && s.getDepartement().toLowerCase().contains(kw)) ||
                                    (s.getSpecialite()  != null && s.getSpecialite().toLowerCase().contains(kw))
                    )
                    .collect(java.util.stream.Collectors.toList());
        }

        // Filtre département
        if (departement != null && !departement.isBlank() && !departement.equals("Tous")) {
            results = results.stream()
                    .filter(s -> departement.equalsIgnoreCase(s.getDepartement()))
                    .collect(java.util.stream.Collectors.toList());
        }

        // Filtre niveau
        if (niveau != null && !niveau.isBlank() && !niveau.equals("Tous")) {
            results = results.stream()
                    .filter(s -> niveau.equalsIgnoreCase(s.getNiveauEtudes()))
                    .collect(java.util.stream.Collectors.toList());
        }

        return results;
    }
}