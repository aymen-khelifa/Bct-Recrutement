package com.bct.recrutement.service;

import com.bct.recrutement.entity.StatutSujet;
import com.bct.recrutement.entity.SujetStage;
import com.bct.recrutement.repository.SujetStageRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class CandidatureEmailService {

    private final EmailService emailService;
    @Autowired
    private CandidatureService candidatureService;
    @Autowired
    private FiltrageService filtrageService;
    private static final Logger log = LoggerFactory.getLogger(CandidatureService.class);
    @Autowired private SujetStageRepository sujetRepository;
    public CandidatureEmailService(EmailService emailService) {
        this.emailService = emailService;
    }

    public void sendEmailsForCandidatures(List<Map<String, Object>> candidatures) {
        for (Map<String, Object> cand : candidatures) {
            String email = (String) cand.get("candidatEmail");
            String status = (String) cand.get("statut");
            String nomCandidat = (String) cand.get("candidatNom");
            String nomSujet = (String) cand.get("sujetTitre");
            String role = (String)cand.get("role");
            Long id = (Long) cand.get("id");
            Boolean ismailcvenvoye = (Boolean)cand.get("ismailcvenvoye");
            if ("ROLE_RH".equals(role)) {
                continue;
            }


            // =============================
            // 📌 Email CV
            // =============================
            if (Boolean.FALSE.equals(ismailcvenvoye)) {

                if ("ELIMINE_CV".equals(status)) {
                    emailService.sendCandidatureEmail(email, nomCandidat, nomSujet, status);
                    candidatureService.updateemailcvenvoye(id);
                }

                else if ("PRESELECTIONNE_CV".equals(status)) {

                    emailService.sendCandidatureEmail(email, nomCandidat, nomSujet, status);

                    candidatureService.updateemailcvenvoye(id);
                }
            }
        }
    }

    @Scheduled(cron = "0 0 0 1 1 ?") // chaque 1 janvier à minuit
    @Transactional
    public void phase1() {

        log.info("🚀 Début batch global recrutement");

        try {
            // ─────────────────────────────
            // 1. ARCHIVER LES SUJETS
            // ─────────────────────────────
            List<SujetStage> sujets = sujetRepository.findAll();

            sujets.forEach(s -> s.setStatut(StatutSujet.ARCHIVE));
            sujetRepository.saveAll(sujets);

            log.info("✅ Sujets archivés : {}", sujets.size());

            // ─────────────────────────────
            // 2. FILTRAGE GLOBAL
            // ─────────────────────────────
            Map<String, Object> resultatFiltrage =
                    filtrageService.filtrerTousLesSujets();

            log.info("✅ Filtrage terminé"+ resultatFiltrage);

            // ─────────────────────────────
            // 3. ENVOI DES EMAILS
            // ─────────────────────────────
            List<Map<String, Object>> candidatures =
                    candidatureService.getAllCandidatures();

            sendEmailsForCandidatures(candidatures);
            log.info("📧 Emails envoyés");

            log.info("🎯 Batch terminé avec succès");

        } catch (Exception e) {
            log.error("❌ Erreur batch recrutement : {}", e.getMessage(), e);
        }
    }
}