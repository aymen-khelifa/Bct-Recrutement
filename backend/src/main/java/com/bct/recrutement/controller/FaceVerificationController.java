package com.bct.recrutement.controller;

import com.bct.recrutement.service.FaceVerificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * FaceVerificationController — BCT Recrutement
 * ══════════════════════════════════════════════════════════════════════
 * Rate limiting BDD uniquement :
 *   POST /api/face/verify/{candidatureId}  → pré-quiz ArcFace (5 tentatives / 30min BDD)
 *   GET  /api/face/status/{candidateId}    → statut blocage actuel (utile au chargement)
 *   POST /api/face/reset/{candidateId}     → reset RH (supprime logs échec récents)
 *   GET  /api/face/photo/{candidateId}     → photo profil base64
 *   GET  /api/face/health                  → health Flask
 *
 *   NOTE : /api/face/verify-quiz supprimé → remplacé par face-api.js LOCAL côté React
 * ══════════════════════════════════════════════════════════════════════
 */
@RestController
@RequestMapping("/api/face")
public class FaceVerificationController {

    @Autowired private FaceVerificationService faceService;

    // ── Vérification pré-quiz — rate limiting 100% BDD Spring Boot ───────────
    @PostMapping("/verify/{candidatureId}")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> verifierFace(
            @PathVariable Long candidatureId,
            @RequestBody  Map<String, Object> body,
            HttpServletRequest request) {

        Object cidObj = body.get("candidateId");
        if (cidObj == null)
            return ResponseEntity.badRequest().body(Map.of("error", "candidateId manquant"));

        Long   candidateId = Long.parseLong(cidObj.toString());
        String webcamImage = (String) body.get("webcamImage");
        String ip          = request.getRemoteAddr();

        if (webcamImage == null || webcamImage.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "webcamImage manquante"));

        Map<String, Object> result = faceService.verifierFace(
                candidateId, candidatureId, webcamImage, ip
        );

        boolean verified = Boolean.TRUE.equals(result.get("verified"));
        boolean blocked  = Boolean.TRUE.equals(result.get("blocked"));

        // 429 si bloqué, 401 si non reconnu, 200 si vérifié
        if (blocked)  return ResponseEntity.status(429).body(result);
        if (verified) return ResponseEntity.ok(result);
        return ResponseEntity.status(401).body(result);
    }

    // ── Statut de blocage — appelé au chargement de FaceCheckScreen ──────────
    // Permet d'afficher directement "session bloquée" sans attendre un clic
    @GetMapping("/status/{candidateId}")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> getBlockStatus(@PathVariable Long candidateId) {
        return ResponseEntity.ok(faceService.getBlockStatus(candidateId));
    }

    // ── Photo profil en base64 ────────────────────────────────────────────────
    @GetMapping("/photo/{candidateId}")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> getPhotoBase64(@PathVariable Long candidateId) {
        try {
            return ResponseEntity.ok(faceService.getPhotoBase64PourReact(candidateId));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Reset tentatives (RH) — supprime les logs d'échec des 30 dernières min
    @PostMapping("/reset/{candidateId}")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> resetTentatives(@PathVariable Long candidateId) {
        faceService.resetTentatives(candidateId);
        Map<String, Object> status = faceService.getBlockStatus(candidateId);
        return ResponseEntity.ok(Map.of(
                "message", "Tentatives réinitialisées pour candidat #" + candidateId,
                "status",  status
        ));
    }

    // ── Health Flask ──────────────────────────────────────────────────────────
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        boolean ok = faceService.isAvailable();
        return ok
                ? ResponseEntity.ok(Map.of("status", "ok", "deepface", true))
                : ResponseEntity.status(503).body(Map.of(
                "status",  "unavailable",
                "message", "Démarrez face_verification_service.py"));
    }
}