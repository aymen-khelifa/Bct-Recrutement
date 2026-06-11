package com.bct.recrutement.controller;

import com.bct.recrutement.service.RecordingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/recording")
public class RecordingController {

    private static final Logger log = LoggerFactory.getLogger(RecordingController.class);

    @Autowired
    private RecordingService recordingService;

    /**
     * POST /api/recording/upload
     * Reçoit le WebM → upload Cloudinary → sauvegarde URL dans candidatures
     */
    @PostMapping("/upload")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> uploadRecording(
            @RequestParam("video")                                     MultipartFile file,
            @RequestParam("userId")                                    Long userId,
            @RequestParam("quizId")                                    Long quizId,
            @RequestParam(value = "candidatureId", required = false)   Long candidatureId) {

        if (file.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Fichier vidéo vide"));

        if (file.getSize() > 500L * 1024 * 1024)
            return ResponseEntity.badRequest().body(Map.of("error", "Fichier trop volumineux (max 500MB)"));

        log.info("[Recording] Réception — user={} quiz={} candidature={} taille={}MB",
                userId, quizId, candidatureId,
                String.format("%.1f", file.getSize() / 1024.0 / 1024.0));

        try {
            Map<String, Object> result = recordingService.uploadQuizRecording(
                    file, userId, quizId, candidatureId
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("[Recording] Erreur : {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/recording/candidature/{id}
     * RH consulte la vidéo d'un candidat
     */
    @GetMapping("/candidature/{candidatureId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<?> getRecording(@PathVariable Long candidatureId) {
        return ResponseEntity.ok(recordingService.getRecordingInfo(candidatureId));
    }
}