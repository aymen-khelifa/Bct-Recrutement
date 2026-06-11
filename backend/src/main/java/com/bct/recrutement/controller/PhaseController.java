package com.bct.recrutement.controller;

import com.bct.recrutement.entity.Phase;
import com.bct.recrutement.repository.PhaseRepository;
import com.bct.recrutement.service.CandidatureService;
import com.bct.recrutement.service.FiltrageService;
import com.bct.recrutement.service.CandidatureEmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/phase")
public class PhaseController {

    @Autowired private PhaseRepository    phaseRepository;
    @Autowired private FiltrageService    filtrageService;
    @Autowired private CandidatureService candidatureService;
    @Autowired private CandidatureEmailService     emailServiceCv;

    // ── GET phase actuelle ────────────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> getPhase() {
        Phase phase = phaseRepository.findById(1L)
                .orElseGet(() -> {
                    Phase p = new Phase();
                    phaseRepository.save(p);
                    return p;
                });
        return ResponseEntity.ok(Map.of("phaseActuelle", phase.getPhaseActuelle()));
    }

    // ── POST déclencher une phase ─────────────────────────────────────────
    // body : {
    //   "phase":   "CV" | "QUIZ" | "ENTRETIEN" | "TERMINE",
    //   "advance": true | false   ← true = mettre à jour phaseActuelle en BDD
    // }
    @PostMapping("/declencher")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> declencherPhase(@RequestBody Map<String, Object> body) {
        String  nouvellePhase = (String)  body.get("phase");
        boolean advance       = Boolean.TRUE.equals(body.get("advance"));

        if (nouvellePhase == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Phase manquante"));

        try {
            // ── 1. Déclencher l'API métier selon la phase ─────────────────
            Map<String, Object> resultat = switch (nouvellePhase) {
                case "CV" -> {
                    Map<String, Object> filtrage = filtrageService.filtrerTousLesSujets();
                    List<Map<String, Object>> candidatures = candidatureService.getAllCandidatures();
                    emailServiceCv.sendEmailsForCandidatures(candidatures);
                    yield Map.of(
                            "message",       "Filtrage CV terminé — emails en cours d'envoi",
                            "filtrage",      filtrage,
                            "emailsEnvoyes", candidatures.size()
                    );
                }
                case "QUIZ" -> {
                    Map<String, Object> res = filtrageService.filtrerQuizTousLesSujets();
                    yield Map.of("message", "Filtrage Quiz terminé", "resultat", res);
                }
                case "ENTRETIEN" -> {
                    // À adapter selon ton service d'entretien
                    yield Map.of("message", "Phase Entretien déclenchée");
                }
                case "TERMINE" -> Map.of("message", "Recrutement clôturé");
                default -> throw new RuntimeException("Phase inconnue : " + nouvellePhase);
            };

            // ── 2. Mettre à jour la BDD seulement si advance=true ─────────
            // advance=false → re-déclenchement d'une phase déjà passée ou courante
            //                 → on ne recule pas le pipeline
            Phase phase = phaseRepository.findById(1L).orElseGet(Phase::new);
            phase.setId(1L);

            if (advance) {
                phase.setPhaseActuelle(nouvellePhase);
                phaseRepository.save(phase);
            }

            return ResponseEntity.ok(Map.of(
                    "phaseActuelle", phase.getPhaseActuelle(), // toujours la phase réelle en BDD
                    "phaseDeclenchee", nouvellePhase,
                    "advanced",  advance,
                    "resultat",  resultat
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Erreur : " + e.getMessage()));
        }
    }
    // ── POST reset pipeline → retour à DEBUT ─────────────────────────────
    @PostMapping("/reset")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> resetPhase() {
        Phase phase = phaseRepository.findById(1L).orElseGet(Phase::new);
        phase.setId(1L);
        phase.setPhaseActuelle("DEBUT");
        phaseRepository.save(phase);
        return ResponseEntity.ok(Map.of(
                "phaseActuelle", "DEBUT",
                "message", "Pipeline remis à zéro — nouveau cycle de recrutement démarré"
        ));
    }
}