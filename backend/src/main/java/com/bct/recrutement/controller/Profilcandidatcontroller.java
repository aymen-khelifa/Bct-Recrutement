package com.bct.recrutement.controller;

import com.bct.recrutement.service.Profilcandidatservice;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/profil")
public class Profilcandidatcontroller {

    @Autowired
    private Profilcandidatservice profilService;

    // ════════════════════════════════════════════════════════════════
    //  CANDIDAT
    // ════════════════════════════════════════════════════════════════

    // GET /api/profil/me → voir mon profil
    @GetMapping("/me")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> getMonProfil(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            return ResponseEntity.ok(profilService.getMonProfil(userDetails.getUsername()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // POST /api/profil/me (multipart/form-data)
    // Champs form : specialite, nationalite, cursusActuel,
    //               niveauInstructionActuel, moyDerAnnee, moyAvantDerAnnee,
    //               motivation, typeDocumentIdentite
    // Fichier     : cv (optionnel)
    @PostMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> saveMonProfil(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Map<String, Object> data,
            @RequestParam(value = "cvFile", required = false) MultipartFile cvFile) { // ← "cvFile"
        try {
            return ResponseEntity.ok(profilService.saveOrUpdate(userDetails.getUsername(), data, cvFile));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ════════════════════════════════════════════════════════════════
    //  RH
    // ════════════════════════════════════════════════════════════════

    // GET /api/profil/candidat/{userId} → voir le profil d'un candidat
    @GetMapping("/candidat/{userId}")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> getProfilByUserId(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(profilService.getProfilByUserId(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}