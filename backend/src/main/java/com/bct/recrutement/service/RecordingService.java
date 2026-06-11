package com.bct.recrutement.service;

import com.bct.recrutement.entity.Candidature;
import com.bct.recrutement.repository.CandidatureRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class RecordingService {

    private static final Logger log = LoggerFactory.getLogger(RecordingService.class);

    private final Cloudinary cloudinary;

    @Autowired
    private CandidatureRepository candidatureRepository;

    public RecordingService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}")    String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {

        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key",    apiKey,
                "api_secret", apiSecret,
                "secure",     true
        ));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> uploadQuizRecording(
            MultipartFile file,
            Long userId,
            Long quizId,
            Long candidatureId) throws Exception {

        log.info("[Recording] Upload vidéo — user={} quiz={} candidature={} taille={}MB",
                userId, quizId, candidatureId,
                String.format("%.1f", file.getSize() / 1024.0 / 1024.0));

        // ── 1. Upload vers Cloudinary ──────────────────────────────────────
        String folder   = "bct-recrutement/quiz-recordings/" + quizId;
        String publicId = String.format("quiz_%d_user_%d_%d", quizId, userId, System.currentTimeMillis());

        Map<String, Object> params = ObjectUtils.asMap(
                "resource_type", "video",
                "folder",        folder,
                "public_id",     publicId,
                "overwrite",     true,
                "tags",          new String[]{"quiz", "bct", "candidat-" + userId, "quiz-" + quizId},
                "context",       String.format(
                        "user_id=%d|quiz_id=%d|candidature_id=%s|uploaded_at=%s",
                        userId, quizId, candidatureId, LocalDateTime.now())
        );

        Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), params);

        String url           = (String) result.get("secure_url");
        String cloudPublicId = (String) result.get("public_id");
        long   duration      = result.get("duration") != null
                ? ((Number) result.get("duration")).longValue() : 0;

        log.info("[Recording] ✅ Cloudinary OK — url={} durée={}s", url, duration);

        // ── 2. Sauvegarder dans Candidature en BDD ────────────────────────
        if (candidatureId != null) {
            candidatureRepository.findById(candidatureId).ifPresentOrElse(
                    candidature -> {
                        candidature.setRecordingUrl(url);
                        candidature.setRecordingPublicId(cloudPublicId);
                        candidature.setRecordingDurationSec(duration);
                        candidature.setRecordingUploadedAt(LocalDateTime.now());
                        candidatureRepository.save(candidature);
                        log.info("[Recording] ✅ URL sauvegardée en BDD — candidature={}", candidatureId);
                    },
                    () -> log.warn("[Recording] Candidature #{} introuvable — URL non sauvegardée", candidatureId)
            );
        } else {
            log.warn("[Recording] candidatureId null — URL non sauvegardée en BDD");
        }

        return Map.of(
                "url",      url,
                "publicId", cloudPublicId,
                "duration", duration,
                "format",   result.getOrDefault("format", "webm"),
                "bytes",    result.getOrDefault("bytes", 0)
        );
    }

    // ── Pour le controller GET RH ──────────────────────────────────────────
    public Map<String, Object> getRecordingInfo(Long candidatureId) {
        return candidatureRepository.findById(candidatureId)
                .map(c -> {
                    if (c.getRecordingUrl() == null)
                        return Map.<String, Object>of("hasRecording", false);
                    return Map.<String, Object>of(
                            "hasRecording",  true,
                            "url",           c.getRecordingUrl(),
                            "publicId",      c.getRecordingPublicId() != null ? c.getRecordingPublicId() : "",
                            "durationSec",   c.getRecordingDurationSec() != null ? c.getRecordingDurationSec() : 0,
                            "uploadedAt",    c.getRecordingUploadedAt() != null ? c.getRecordingUploadedAt().toString() : "",
                            "candidatureId", candidatureId
                    );
                })
                .orElse(Map.of("hasRecording", false, "error", "Candidature introuvable"));
    }
}