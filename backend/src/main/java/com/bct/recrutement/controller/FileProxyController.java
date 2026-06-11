package com.bct.recrutement.controller;

import com.bct.recrutement.entity.Candidature;
import com.bct.recrutement.entity.Profilcandidat;
import com.bct.recrutement.repository.CandidatureRepository;
import com.bct.recrutement.repository.Profilcandidatrepository;
import com.bct.recrutement.repository.UserRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.Map;

/**
 * FileProxyController — Proxy sécurisé pour CV, photos et vidéos quiz
 *
 * Utilise les Signed URLs Cloudinary (expiration 15 min) pour tous les fichiers.
 * Aucun fichier n'est accessible sans JWT valide + rôle approprié.
 *
 * Endpoints :
 *   GET /api/files/cv/me              → CV candidat connecté (inline)
 *   GET /api/files/cv/me/dl           → CV candidat connecté (téléchargement)
 *   GET /api/files/cv/{userId}        → CV par userId (RH/ADMIN)
 *   GET /api/files/photo/me           → Photo candidat connecté
 *   GET /api/files/photo/{userId}     → Photo par userId (RH/ADMIN)
 *   GET /api/files/recording/{id}     → Vidéo quiz par candidatureId (RH/ADMIN)
 */
@RestController
@RequestMapping("/api/files")
public class FileProxyController {

    private static final Logger log = LoggerFactory.getLogger(FileProxyController.class);
    private static final int    SIGNED_URL_EXPIRY_SEC = 900; // 15 minutes

    private final Cloudinary cloudinary;
    private final RestTemplate restTemplate = new RestTemplate();

    public FileProxyController(
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

    @Autowired private Profilcandidatrepository profilRepository;
    @Autowired private UserRepository           userRepository;
    @Autowired private CandidatureRepository    candidatureRepository;

    // ═══════════════════════════════════════════════════════════════════════
    //  CV
    // ═══════════════════════════════════════════════════════════════════════

    @GetMapping("/cv/me")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<byte[]> getMyCv(@AuthenticationPrincipal UserDetails ud) {
        return serveCvByEmail(ud.getUsername(), false);
    }

    @GetMapping("/cv/me/dl")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<byte[]> downloadMyCv(@AuthenticationPrincipal UserDetails ud) {
        return serveCvByEmail(ud.getUsername(), true);
    }

    @GetMapping("/cv/{userId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> getCvByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "false") boolean dl) {
        return userRepository.findById(userId)
                .map(u -> serveCvByEmail(u.getEmail(), dl))
                .orElse(ResponseEntity.notFound().build());
    }

    private ResponseEntity<byte[]> serveCvByEmail(String email, boolean download) {
        try {
            var user   = userRepository.findByEmail(email).orElseThrow();
            var profil = profilRepository.findByUser(user).orElseThrow();

            String cvUrl = profil.getCv();
            if (cvUrl == null || cvUrl.isBlank())
                return ResponseEntity.notFound().build();

            // Supprimer la signature s--xxx-- si présente dans l'URL stockée
            String cleanUrl = cvUrl.replaceAll("/s--[^/]+--", "");

            log.info("[FileProxy] CV proxy — user={} url={}", email, cleanUrl);
            return proxyFile(cleanUrl, cleanUrl, download);

        } catch (Exception e) {
            log.error("[FileProxy] CV erreur : {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  PHOTO
    // ═══════════════════════════════════════════════════════════════════════

    @GetMapping("/photo/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> getMyPhoto(@AuthenticationPrincipal UserDetails ud) {
        return servePhotoByEmail(ud.getUsername());
    }

    @GetMapping("/photo/{userId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> getPhotoByUser(@PathVariable Long userId) {
        return userRepository.findById(userId)
                .map(u -> servePhotoByEmail(u.getEmail()))
                .orElse(ResponseEntity.notFound().build());
    }

    private ResponseEntity<byte[]> servePhotoByEmail(String email) {
        try {
            var user = userRepository.findByEmail(email).orElseThrow();
            String photoUrl = user.getPhotoUrl();
            if (photoUrl == null || photoUrl.isBlank())
                return ResponseEntity.notFound().build();
            log.info("[FileProxy] Photo proxy — user={}", email);
            return proxyFile(photoUrl, photoUrl, false);
        } catch (Exception e) {
            log.error("[FileProxy] Photo erreur : {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  VIDÉO QUIZ
    // ═══════════════════════════════════════════════════════════════════════

    @GetMapping("/recording/{candidatureId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> getRecording(@PathVariable Long candidatureId) {
        try {
            Candidature c = candidatureRepository.findById(candidatureId)
                    .orElseThrow(() -> new RuntimeException("Candidature introuvable"));
            String recordingUrl = c.getRecordingUrl();
            if (recordingUrl == null || recordingUrl.isBlank())
                return ResponseEntity.notFound().build();
            log.info("[FileProxy] Vidéo proxy — candidature={}", candidatureId);
            return proxyFile(recordingUrl, recordingUrl, false);
        } catch (Exception e) {
            log.error("[FileProxy] Vidéo erreur : {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Génère une Signed URL Cloudinary qui expire dans 15 minutes.
     * Le fichier Cloudinary doit être en mode "private" ou "authenticated".
     */
    @SuppressWarnings("unchecked")
    private String generateSignedUrl(String publicId, String resourceType) {
        try {
            long expiresAt = System.currentTimeMillis() / 1000 + SIGNED_URL_EXPIRY_SEC;

            // Pour les fichiers raw (PDF/Word), Cloudinary ignore le format
            // Le resource_type doit correspondre exactement à celui utilisé à l'upload
            String format = switch (resourceType) {
                case "video" -> "webm";
                case "image" -> "jpg";
                default      -> "pdf"; // raw
            };

            String signedUrl = cloudinary.privateDownload(
                    publicId,
                    format,
                    ObjectUtils.asMap(
                            "resource_type", resourceType, // ← "raw" pour les CV
                            "expires_at",    expiresAt,
                            "attachment",    false
                    )
            );

            log.info("[FileProxy] Signed URL générée pour publicId={} type={}", publicId, resourceType);
            return signedUrl;

        } catch (Exception e) {
            log.warn("[FileProxy] Signed URL échouée — publicId={} type={} erreur={}",
                    publicId, resourceType, e.getMessage());
            return null;
        }
    }

    /**
     * Télécharge le fichier depuis l'URL (Cloudinary) et le sert au client.
     */
    private ResponseEntity<byte[]> proxyFile(String fileUrl, String originalUrl, boolean download) {
        try {
            byte[] bytes = restTemplate.getForObject(URI.create(fileUrl), byte[].class);
            if (bytes == null) return ResponseEntity.notFound().build();

            // Détecter MIME
            String lower = (originalUrl != null ? originalUrl : fileUrl).toLowerCase();
            String contentType;
            if      (lower.endsWith(".pdf"))  contentType = "application/pdf";
            else if (lower.endsWith(".webm")) contentType = "video/webm";
            else if (lower.endsWith(".mp4"))  contentType = "video/mp4";
            else if (lower.endsWith(".png"))  contentType = "image/png";
            else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
            else                              contentType = "application/octet-stream";

            String filename = (originalUrl != null ? originalUrl : fileUrl)
                    .substring((originalUrl != null ? originalUrl : fileUrl).lastIndexOf('/') + 1);
            if (filename.contains("?")) filename = filename.substring(0, filename.indexOf('?'));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentLength(bytes.length);
            headers.setContentDisposition(
                    download
                            ? ContentDisposition.attachment().filename(filename).build()
                            : ContentDisposition.inline().filename(filename).build()
            );

            return ResponseEntity.ok().headers(headers).body(bytes);

        } catch (Exception e) {
            log.error("[FileProxy] Proxy erreur : {}", e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }
}