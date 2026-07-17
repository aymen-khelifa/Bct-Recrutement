package com.bct.recrutement.service;

import com.bct.recrutement.entity.FaceVerificationLog;
import com.bct.recrutement.repository.FaceVerificationLogRepository;
import com.bct.recrutement.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * FaceVerificationService — BCT Recrutement
 * ══════════════════════════════════════════════════════════════════════
 * Rate limiting 100% côté Spring Boot + BDD (face_verification_logs) :
 *   - MAX 5 tentatives échouées dans une fenêtre de 30 min
 *   - Blocage persist même après logout (stocké en BDD, pas en mémoire)
 *   - Flask ne gère PLUS les tentatives → juste la vérif ArcFace pure
 *   - Reset RH possible via /api/face/reset/{candidateId}
 * ══════════════════════════════════════════════════════════════════════
 */
@Service
public class FaceVerificationService {

    private static final Logger log = LoggerFactory.getLogger(FaceVerificationService.class);

    // Fenêtre de blocage : 30 minutes
    private static final int  MAX_ATTEMPTS    = 5;
    private static final long BLOCK_WINDOW_MIN = 30L;

    @Value("${bct.ml.service.url:https://recrutement-ml-bbgrckete3cbg0an.francecentral-01.azurewebsites.net}")
    private String flaskUrl;

    @Autowired private RestTemplate                  restTemplate;
    @Autowired private FaceVerificationLogRepository logRepository;
    @Autowired private UserRepository                userRepository;
    @Autowired private ObjectMapper                  objectMapper;

    // ─────────────────────────────────────────────────────────────────────────
    //  VÉRIFICATION FACIALE PRINCIPALE — pré-quiz (5 tentatives / 30 min)
    //  Rate limiting basé sur face_verification_logs (BDD) → persist logout
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> verifierFace(
            Long   candidateId,
            Long   candidatureId,
            String webcamImageB64,
            String ipAddress) {

        // ── 1. Vérifier blocage depuis la BDD ─────────────────────────────
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(BLOCK_WINDOW_MIN);
        int failedCount = logRepository.countFailedAttemptsSince(candidateId, windowStart);

        log.info("[Face] Candidat #{} | tentatives échouées (30min) : {}/{}",
                candidateId, failedCount, MAX_ATTEMPTS);

        if (failedCount >= MAX_ATTEMPTS) {
            // Calculer le temps restant avant déblocage
            Optional<FaceVerificationLog> lastFailed =
                    logRepository.findLastFailedAttemptSince(candidateId, windowStart);

            long minutesRestantes = BLOCK_WINDOW_MIN;
            if (lastFailed.isPresent()) {
                LocalDateTime debloquageAt = lastFailed.get().getVerifiedAt()
                        .plusMinutes(BLOCK_WINDOW_MIN);
                minutesRestantes = ChronoUnit.MINUTES.between(LocalDateTime.now(), debloquageAt);
                minutesRestantes = Math.max(1, minutesRestantes);
            }

            log.warn("[Face] Candidat #{} BLOQUÉ — débloquage dans {}min", candidateId, minutesRestantes);

            // Sauvegarder cette tentative bloquée aussi
            sauvegarderLog(candidateId, candidatureId, 1.0, 0.0, false,
                    failedCount + 1, ipAddress, "Session bloquée");

            return Map.of(
                    "verified",           false,
                    "blocked",            true,
                    "attemptsLeft",       0,
                    "minutesRestantes",   minutesRestantes,
                    "error",              String.format(
                            "Session bloquée — %d tentatives épuisées. Réessayez dans %d min.",
                            MAX_ATTEMPTS, minutesRestantes)
            );
        }

        // ── 2. Récupérer photo profil ──────────────────────────────────────
        String profileImageB64 = getProfilePhotoBase64(candidateId);
        if (profileImageB64 == null) {
            return Map.of(
                    "verified",     false,
                    "error",        "Photo de profil introuvable. Complétez votre profil.",
                    "attemptsLeft", MAX_ATTEMPTS - failedCount,
                    "blocked",      false
            );
        }

        // ── 3. Appel Flask ArcFace (sans rate limiting côté Flask) ─────────
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("candidateId",  candidateId);
        requestBody.put("webcamImage",  webcamImageB64);
        requestBody.put("profileImage", profileImageB64);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> rawResponse = restTemplate.exchange(
                    flaskUrl + "/verify-face",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            Map<String, Object> flaskBody = parseJson(rawResponse.getBody());
            boolean verified   = Boolean.TRUE.equals(flaskBody.get("verified"));
            double  distance   = toDouble(flaskBody.get("distance"));
            double  confidence = toDouble(flaskBody.get("confidence"));

            // ── 4a. Succès → log success, attemptsLeft = MAX (reset logique) ─
            if (verified) {
                sauvegarderLog(candidateId, candidatureId, distance, confidence,
                        true, failedCount + 1, ipAddress, null);

                log.info("[Face] ✅ Candidat #{} vérifié | conf={}% | dist={}",
                        candidateId, Math.round(confidence), distance);

                // Calculer attemptsLeft APRÈS succès (remettre à MAX pour info)
                Map<String, Object> result = new HashMap<>(flaskBody);
                result.put("verified",     true);
                result.put("blocked",      false);
                result.put("attemptsLeft", MAX_ATTEMPTS); // succès → compteur réinitialisé logiquement
                return result;
            }

            // ── 4b. Échec → log failure, décrémenter attemptsLeft ────────────
            sauvegarderLog(candidateId, candidatureId, distance, confidence,
                    false, failedCount + 1, ipAddress, "Non reconnu");

            int newFailedCount = failedCount + 1;
            int attemptsLeft   = Math.max(0, MAX_ATTEMPTS - newFailedCount);
            boolean nowBlocked = newFailedCount >= MAX_ATTEMPTS;

            log.info("[Face] ❌ Candidat #{} refusé | conf={}% | dist={} | attemptsLeft={}",
                    candidateId, Math.round(confidence), distance, attemptsLeft);

            Map<String, Object> result = new HashMap<>(flaskBody);
            result.put("verified",     false);
            result.put("blocked",      nowBlocked);
            result.put("attemptsLeft", attemptsLeft);

            if (nowBlocked) {
                result.put("error", String.format(
                        "Session bloquée — %d tentatives épuisées. Réessayez dans %d min.",
                        MAX_ATTEMPTS, BLOCK_WINDOW_MIN));
                result.put("minutesRestantes", BLOCK_WINDOW_MIN);
            }

            return result;

        } catch (HttpClientErrorException e) {
            // Flask retourne 400 si pas de visage détecté
            String rawBody = e.getResponseBodyAsString();
            Map<String, Object> flaskBody = parseJson(rawBody);

            // On log quand même comme tentative échouée
            sauvegarderLog(candidateId, candidatureId,
                    toDouble(flaskBody.get("distance")),
                    0.0, false, failedCount + 1, ipAddress,
                    "Aucun visage détecté");

            int newFailedCount = failedCount + 1;
            int attemptsLeft   = Math.max(0, MAX_ATTEMPTS - newFailedCount);
            boolean nowBlocked = newFailedCount >= MAX_ATTEMPTS;

            Map<String, Object> result = new HashMap<>(flaskBody);
            result.put("verified",     false);
            result.put("blocked",      nowBlocked);
            result.put("attemptsLeft", attemptsLeft);
            return result;

        } catch (Exception e) {
            log.error("[Face] Erreur service facial : {}", e.getMessage());
            return Map.of(
                    "verified",     false,
                    "error",        "Service de vérification indisponible : " + e.getMessage(),
                    "attemptsLeft", MAX_ATTEMPTS - failedCount,
                    "blocked",      false
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  VÉRIFICATION DURANT LE QUIZ — face-api.js LOCAL côté React
    //  Cette méthode n'est plus appelée (remplacée par face-api.js)
    //  Gardée uniquement si tu veux un fallback serveur
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> verifierFaceQuizMonitoring(
            Long candidateId,
            Long candidatureId,
            String webcamImageB64,
            String ipAddress) {

        // Monitoring quiz → ne consomme PAS les tentatives pré-quiz
        // Ne fait PAS de rate limiting
        String profileImageB64 = getProfilePhotoBase64(candidateId);
        if (profileImageB64 == null) {
            return Map.of("verified", true, "confidence", 0.0,
                    "message", "Photo profil indisponible — non pénalisé");
        }

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("candidateId",  candidateId);
        requestBody.put("webcamImage",  webcamImageB64);
        requestBody.put("profileImage", profileImageB64);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<String> rawResponse = restTemplate.exchange(
                    flaskUrl + "/verify-face",
                    HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers),
                    String.class
            );
            Map<String, Object> body = parseJson(rawResponse.getBody());
            return Map.of(
                    "verified",   Boolean.TRUE.equals(body.get("verified")),
                    "confidence", toDouble(body.get("confidence")),
                    "distance",   toDouble(body.get("distance")),
                    "message",    Boolean.TRUE.equals(body.get("verified")) ? "OK" : "Visage non reconnu"
            );
        } catch (Exception e) {
            log.warn("[FaceQuiz] Erreur monitoring : {}", e.getMessage());
            return Map.of("verified", true, "confidence", 0.0, "message", "Erreur réseau — non pénalisé");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RESET TENTATIVES (RH admin)
    //  Supprime les logs d'échec des 30 dernières minutes pour ce candidat
    //  → logique : on ne supprime pas les logs (audit), mais on insère un log
    //    de type "reset" qui n'est pas compté comme échec
    //  Alternative simple : supprimer les logs récents (selon politique audit)
    // ─────────────────────────────────────────────────────────────────────────
    public void resetTentatives(Long candidateId) {
        // Approche : insérer 5 logs de succès fictifs pour "noyer" les échecs
        // → NON recommandé pour l'audit
        // Approche propre : supprimer les logs d'échec récents
        try {
            LocalDateTime windowStart = LocalDateTime.now().minusMinutes(BLOCK_WINDOW_MIN);
            // On utilise une requête native pour supprimer les échecs récents
            // Si tu veux garder l'audit complet, commenter la suppression
            // et décommenter la ligne restTemplate ci-dessous
            logRepository.findAll().stream()
                    .filter(l -> l.getCandidateId().equals(candidateId)
                            && Boolean.FALSE.equals(l.getSuccess())
                            && l.getVerifiedAt().isAfter(windowStart))
                    .forEach(l -> logRepository.deleteById(l.getId()));

            log.info("[Face] Tentatives réinitialisées en BDD : candidat #{}", candidateId);
        } catch (Exception e) {
            log.warn("[Face] Reset tentatives échoué : {}", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INFO BLOCAGE — retourne le statut actuel du candidat
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> getBlockStatus(Long candidateId) {
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(BLOCK_WINDOW_MIN);
        int failedCount = logRepository.countFailedAttemptsSince(candidateId, windowStart);
        int attemptsLeft = Math.max(0, MAX_ATTEMPTS - failedCount);
        boolean blocked  = failedCount >= MAX_ATTEMPTS;

        long minutesRestantes = 0;
        if (blocked) {
            Optional<FaceVerificationLog> lastFailed =
                    logRepository.findLastFailedAttemptSince(candidateId, windowStart);
            if (lastFailed.isPresent()) {
                LocalDateTime debloquageAt = lastFailed.get().getVerifiedAt()
                        .plusMinutes(BLOCK_WINDOW_MIN);
                minutesRestantes = ChronoUnit.MINUTES.between(LocalDateTime.now(), debloquageAt);
                minutesRestantes = Math.max(0, minutesRestantes);
            }
        }

        return Map.of(
                "candidateId",      candidateId,
                "failedAttempts",   failedCount,
                "attemptsLeft",     attemptsLeft,
                "blocked",          blocked,
                "minutesRestantes", minutesRestantes,
                "maxAttempts",      MAX_ATTEMPTS,
                "windowMinutes",    BLOCK_WINDOW_MIN
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Photo profil en base64
    // ─────────────────────────────────────────────────────────────────────────
    private String getProfilePhotoBase64(Long candidateId) {
        try {
            var userOpt = userRepository.findById(candidateId);
            if (userOpt.isEmpty()) { log.warn("[Face] User #{} introuvable", candidateId); return null; }
            var user = userOpt.get();
            String chemin = user.getPhotoUrl();
            if (chemin == null || chemin.isBlank()) { log.warn("[Face] Pas de photo pour #{}", candidateId); return null; }

            // ── Priorité 1 : déjà en base64 ───────────────────────────────
            if (chemin.startsWith("data:image")) return chemin;

            // ── Priorité 2 : URL HTTP/HTTPS (Cloudinary) ──────────────────
            // IMPORTANT : tester isBlank avant Paths.get() pour éviter
            // "Illegal char <:> at index 5: https://..." sur Windows
            if (chemin.startsWith("http://") || chemin.startsWith("https://")) {
                String cleanUrl = chemin.replaceAll("/s--[^/]+--", "");
                log.info("[Face] Téléchargement photo Cloudinary : {}", cleanUrl);
                try {
                    java.net.URL url = new java.net.URI(cleanUrl).toURL();
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(5000);  // 5s max pour établir la connexion
                    conn.setReadTimeout(8000);     // 8s max pour lire la réponse
                    conn.setRequestMethod("GET");

                    try (var in = conn.getInputStream()) {
                        byte[] bytes = in.readAllBytes();
                        String ext = cleanUrl.toLowerCase().endsWith(".png") ? "png" : "jpeg";
                        return "data:image/" + ext + ";base64," + Base64.getEncoder().encodeToString(bytes);
                    }
                } catch (java.net.SocketTimeoutException ex) {
                    log.warn("[Face] Timeout téléchargement photo : {} — {}", cleanUrl, ex.getMessage());
                    return null;
                } catch (Exception ex) {
                    log.warn("[Face] Impossible télécharger photo URL : {} — {}", cleanUrl, ex.getMessage());
                    return null;
                }
            }

            // ── Priorité 3 : chemin fichier local (ancien système) ─────────
            Path p = Paths.get(chemin);
            if (Files.exists(p)) {
                byte[] bytes = Files.readAllBytes(p);
                String ext = chemin.toLowerCase().endsWith(".png") ? "png" : "jpeg";
                return "data:image/" + ext + ";base64," + Base64.getEncoder().encodeToString(bytes);
            }

            log.warn("[Face] Photo introuvable : {}", chemin);
            return null;
        } catch (Exception e) {
            log.error("[Face] Erreur récupération photo : {}", e.getMessage());
            return null;
        }
    }

    public Map<String, String> getPhotoBase64PourReact(Long candidateId) {
        String b64 = getProfilePhotoBase64(candidateId);
        if (b64 == null) throw new RuntimeException("Photo introuvable pour candidat #" + candidateId);
        return Map.of("base64Image", b64);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Health check Flask
    // ─────────────────────────────────────────────────────────────────────────
    public boolean isAvailable() {
        try {
            ResponseEntity<Map> r = restTemplate.getForEntity(flaskUrl + "/health", Map.class);
            return r.getStatusCode().is2xxSuccessful()
                    && "ok".equals(r.getBody() != null ? r.getBody().get("status") : "");
        } catch (Exception e) { return false; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Sauvegarder log en BDD
    // ─────────────────────────────────────────────────────────────────────────
    private void sauvegarderLog(Long candidateId, Long candidatureId,
                                double distance, double confidence,
                                boolean success, int attemptNumber,
                                String ip, String errorMessage) {
        try {
            FaceVerificationLog fvl = new FaceVerificationLog();
            fvl.setCandidateId(candidateId);
            fvl.setCandidatureId(candidatureId);
            fvl.setDistance(distance);
            fvl.setConfidence(confidence);
            fvl.setSuccess(success);
            fvl.setAttemptNumber(attemptNumber);
            fvl.setIpAddress(ip);
            fvl.setErrorMessage(errorMessage);
            logRepository.save(fvl);
        } catch (Exception e) {
            log.warn("[Face] Erreur log BDD : {}", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) return new HashMap<>();
        try { return objectMapper.readValue(json, Map.class); }
        catch (Exception e) { log.warn("[Face] JSON parse error : {}", json); return new HashMap<>(); }
    }

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        try { return ((Number) v).doubleValue(); } catch (Exception e) { return 0.0; }
    }
}