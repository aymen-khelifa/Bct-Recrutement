package com.bct.recrutement.controller;

import com.bct.recrutement.service.InterviewSchedulerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interviews")
public class InterviewSchedulerController {

    @Autowired
    private InterviewSchedulerService schedulerService;

    // ── Planifier via Groq IA ─────────────────────────────────────────────
    @PostMapping("/planifier")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> planifier(
            @RequestBody(required = false) Map<String, Object> body) {

        Long sujetId = null;
        if (body != null && body.get("sujetId") != null)
            sujetId = Long.parseLong(body.get("sujetId").toString());

        try {
            return ResponseEntity.ok(schedulerService.planifierEntretiens(sujetId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ── Calendrier mensuel ────────────────────────────────────────────────
    @GetMapping("/calendrier")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<List<Map<String, Object>>> getCalendrier(
            @RequestParam(defaultValue = "0") int annee,
            @RequestParam(defaultValue = "0") int mois) {

        if (annee == 0) annee = LocalDate.now().getYear();
        if (mois  == 0) mois  = LocalDate.now().getMonthValue();

        return ResponseEntity.ok(
                schedulerService.getEntretiensParMois(annee, mois));
    }

    // ── Entretiens du jour ────────────────────────────────────────────────
    @GetMapping("/aujourd-hui")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<List<Map<String, Object>>> getAujourdhui() {
        return ResponseEntity.ok(schedulerService.getEntretiensAujourdhui());
    }

    // ── Rejoindre la salle via roomToken (RH + CANDIDAT) ─────────────────
    @GetMapping("/room/{roomToken}")
    @PreAuthorize("hasRole('RH') or hasRole('CANDIDAT')")
    public ResponseEntity<?> getRoomInfo(
            @PathVariable String roomToken) {

        return schedulerService.getByRoomToken(roomToken)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Sauvegarder les notes RH ──────────────────────────────────────────
    @PatchMapping("/{id}/notes")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> saveNotes(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        return schedulerService.sauvegarderNotes(id, body.get("notes"))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Terminer l'entretien ──────────────────────────────────────────────
    @PatchMapping("/{id}/terminer")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> terminer(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {

        Integer scoreEntretien = null;
        String  notesRh = null;
        if (body != null) {
            if (body.get("scoreEntretien") != null)
                scoreEntretien = Integer.parseInt(body.get("scoreEntretien").toString());
            if (body.get("notesRh") != null)
                notesRh = body.get("notesRh").toString();
        }

        return schedulerService.terminerEntretien(id, scoreEntretien, notesRh)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    @PostMapping("/room/{roomToken}/demarrer")
    @PreAuthorize("hasRole('RH') or hasRole('CANDIDAT')")
    public ResponseEntity<?> demarrer(@PathVariable String roomToken) {
        return schedulerService.demarrerEntretien(roomToken)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> getDetailEntretien(@PathVariable Long id) {
        return schedulerService.getDetailEntretien(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/mes")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<List<Map<String, Object>>> getMesEntretiens(
            @RequestParam(defaultValue = "0") int annee,
            @RequestParam(defaultValue = "0") int mois,
            org.springframework.security.core.Authentication auth) {

        String email = auth.getName();
        if (annee == 0) annee = LocalDate.now().getYear();
        if (mois  == 0) mois  = LocalDate.now().getMonthValue();

        return ResponseEntity.ok(
                schedulerService.getEntretiensCandidatParMois(email, annee, mois));
    }
    @PatchMapping("/{id}/reprogrammer")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> reprogrammer(@PathVariable Long id,
                                          @RequestBody Map<String, String> body) {
        String dateDebut = body.get("dateDebut");
        if (dateDebut == null || dateDebut.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "dateDebut manquante"));

        return schedulerService.reprogrammerEntretien(id, dateDebut)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}