package com.bct.recrutement.controller;

import com.bct.recrutement.dto.MessageResponse;
import com.bct.recrutement.entity.SujetStage;
import com.bct.recrutement.service.SujetStageService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sujets")
public class SujetStageController {

    @Autowired
    private SujetStageService sujetStageService;

    // ════════════════════════════════════════════════════════════════
    //  ENDPOINTS RH
    // ════════════════════════════════════════════════════════════════

    // POST /api/sujets
    @PostMapping
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> createSujet(
            @Valid @RequestBody SujetStage sujet,@RequestParam(required = false, defaultValue = "ai") String quizMode,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // 1. Créer et committer le sujet
            SujetStage saved = sujetStageService.createSujet(sujet, userDetails.getUsername());

            // 2. Déclencher la génération APRÈS le commit (sujet visible en base)
            if (!"manuel".equalsIgnoreCase(quizMode)) {
                sujetStageService.triggerGeneration(saved.getId());
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // PUT /api/sujets/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> updateSujet(
            @PathVariable Long id,
            @Valid @RequestBody SujetStage sujet,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            return ResponseEntity.ok(sujetStageService.updateSujet(id, sujet, userDetails.getUsername()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // DELETE /api/sujets/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> deleteSujet(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            sujetStageService.deleteSujet(id, userDetails.getUsername());
            return ResponseEntity.ok(new MessageResponse("Sujet supprimé avec succès"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // PATCH /api/sujets/{id}/archiver
    @PatchMapping("/{id}/archiver")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> archiverSujet(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            return ResponseEntity.ok(sujetStageService.archiverSujet(id, userDetails.getUsername()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // PATCH /api/sujets/{id}/publier
    @PatchMapping("/{id}/publier")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> publierSujet(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            return ResponseEntity.ok(sujetStageService.publierSujet(id, userDetails.getUsername()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // GET /api/sujets/mes  → sujets créés par le RH connecté (publiés + archivés)
    @GetMapping("/mes")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<List<SujetStage>> getMesSujets(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(sujetStageService.getMySujets(userDetails.getUsername()));
    }

    // ════════════════════════════════════════════════════════════════
    //  ENDPOINTS COMMUNS  (CANDIDAT + RH)
    // ════════════════════════════════════════════════════════════════

    // GET /api/sujets                    → tous les sujets publiés
    // GET /api/sujets?search=python      → recherche live (Offres.jsx)
    // GET /api/sujets?departement=DSI    → filtre département
    // GET /api/sujets?niveau=Master      → filtre niveau
    @GetMapping
    @PreAuthorize("hasRole('CANDIDAT') or hasRole('RH')")
    public ResponseEntity<List<SujetStage>> getSujets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String departement,
            @RequestParam(required = false) String niveau) {

        // ✅ Tous les filtres combinés — plus de if/else if
        return ResponseEntity.ok(
                sujetStageService.filter(search, departement, niveau, false)
        );
    }

    // GET /api/sujets/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CANDIDAT') or hasRole('RH')")
    public ResponseEntity<?> getSujet(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(sujetStageService.getSujetById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<List<SujetStage>> getAllSujets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String departement,
            @RequestParam(required = false) String niveau) {

        return ResponseEntity.ok(
                sujetStageService.filter(search, departement, niveau, true)
        );
    }
}