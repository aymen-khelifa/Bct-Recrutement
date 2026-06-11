package com.bct.recrutement.controller;

import com.bct.recrutement.service.CandidatureEmailService;
import com.bct.recrutement.service.CandidatureService;
import com.bct.recrutement.service.FiltrageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidatures")
public class Candidaturecontroller {

    @Autowired
    private CandidatureService candidatureService;

    @Autowired
    private FiltrageService filtrageService;

    @Autowired
    private  CandidatureEmailService emailServicecv;
    private String getEmailConnecte() {
        return ((UserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal())
                .getUsername();
    }

    // ── RH : toutes les candidatures (liste) ─────────────────────────────
    @GetMapping
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<List<Map<String, Object>>> getAllCandidatures() {
        return ResponseEntity.ok(candidatureService.getAllCandidatures());
    }

    // ── RH : détail complet d'une candidature (pour la modal) ────────────
    // Inclut : candidat + profil + sujet + score IA complet (detail, rapport)
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> getCandidatureDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(candidatureService.getCandidatureDetail(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
    @GetMapping("/sujet/{sujetId}")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<List<Map<String, Object>>> getCandidaturesBySujet(@PathVariable Long sujetId) {
        return ResponseEntity.ok(candidatureService.getCandidaturesBySujet(sujetId));
    }
    // ── RH : ancien endpoint /details (conservé pour compatibilité) ───────
    @GetMapping("/{id}/details")
    @PreAuthorize("hasRole('CANDIDAT') or hasRole('RH')")
    public ResponseEntity<?> getCandidatureDetails(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(candidatureService.getCandidatureDetails(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── CANDIDAT : mes candidatures ───────────────────────────────────────
    @GetMapping("/mes")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<List<Map<String, Object>>> getMesCandidatures() {
        return ResponseEntity.ok(candidatureService.getMesCandidatures(getEmailConnecte()));
    }

    // ── CANDIDAT : postuler ───────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> postuler(@RequestBody Map<String, Object> body) {
        try {
            Long   sujetId = Long.valueOf(body.get("sujetId").toString());
            String lettre  = (String) body.get("lettreMotivation");
            return ResponseEntity.ok(
                    candidatureService.postuler(getEmailConnecte(), sujetId, lettre));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── RH : changer le statut ────────────────────────────────────────────
    @PatchMapping("/{id}/statut")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> updateStatut(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(candidatureService.updateStatut(id, body.get("statut")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }


    @PostMapping("/filtrer")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> filtrerCandidatures(@RequestBody Map<String, Object> body) {
        try {
            Long sujetId = Long.valueOf(body.get("sujetId").toString());
            int nombreStagiaires = Integer.parseInt(body.get("nombreStagiaires").toString());

            if (nombreStagiaires < 1) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Le nombre de stagiaires doit être >= 1"));
            }

            Map<String, Object> resultat = filtrageService.filtrerCandidatures(sujetId, nombreStagiaires);
            return ResponseEntity.ok(resultat);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }


    @PostMapping("/filtrer/tous")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> filtrerTousLesSujets() {
        try {


            Map<String, Object> resultat = filtrageService.filtrerTousLesSujets();
            return ResponseEntity.ok(resultat);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }




    @GetMapping("/send-all-emails_cv")
    @PreAuthorize("hasRole('RH')")
    public String sendAllEmails() {
        List<Map<String, Object>> candidatures = candidatureService.getAllCandidatures();

        // Envoyer les emails selon le statut
        emailServicecv.sendEmailsForCandidatures(candidatures);
        return "Emails en cours d'envoi...";
    }


    @PostMapping("/filtrer-et-envoyer")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> filtrerEtEnvoyer() {
        try {
            // ── 1. Filtrage global ─────────────────────────────
            Map<String, Object> resultatFiltrage = filtrageService.filtrerTousLesSujets();

            // ── 2. Récupérer toutes les candidatures après filtrage ──
            List<Map<String, Object>> candidatures = candidatureService.getAllCandidatures();

            // ── 3. Envoyer les emails selon le statut ───────────────
            emailServicecv.sendEmailsForCandidatures(candidatures);

            // ── 4. Retourner le résultat au front ─────────────────
            return ResponseEntity.ok(Map.of(
                    "message", "Filtrage terminé et emails en cours d'envoi",
                    "filtrage", resultatFiltrage,
                    "emailsEnvoyes", candidatures.size() // info sommaire
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Erreur : " + e.getMessage()));
        }
    }
    @PostMapping("/quiz/global")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<Map<String, Object>> filtrerQuizGlobal() {

        Map<String, Object> result = filtrageService
                .filtrerQuizTousLesSujets();

        return ResponseEntity.ok(result);
    }
    @PostMapping("/final/global")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<Map<String, Object>> filtrerFinalGlobal() {
        return ResponseEntity.ok(filtrageService.filtrerFinalTousLesSujets());
    }
}