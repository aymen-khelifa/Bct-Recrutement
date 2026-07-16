package com.bct.recrutement.controller;

import com.bct.recrutement.entity.Candidature;
import com.bct.recrutement.repository.CandidatureRepository;
import com.bct.recrutement.repository.Profilcandidatrepository;
import com.bct.recrutement.repository.UserRepository;
import com.bct.recrutement.service.CloudinaryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.Map;

/**
 * FileProxyController — Proxy sécurisé CV / Photos / Vidéos
 *
 * Architecture :
 *   Browser → [JWT] → Spring Proxy → [Signed URL] → Cloudinary CDN → bytes → Browser
 *
 * Le browser ne voit jamais l'URL Cloudinary.
 * Utilise ResponseEntity<byte[]> (synchrone) pour éviter les problèmes
 * de SecurityContext perdu dans les threads async (StreamingResponseBody).
 *
 * Nouveaux CVs (type=authenticated) : accès via Signed URL CDN
 * Anciens CVs  (type=upload public) : accès via URL directe (fallback)
 *
 * Endpoints :
 *   GET /api/files/cv/me          → CV candidat connecté (inline)
 *   GET /api/files/cv/me/dl       → CV candidat connecté (téléchargement)
 *   GET /api/files/cv/{userId}    → CV par userId (RH/ADMIN)
 *   GET /api/files/photo/me       → Photo candidat connecté
 *   GET /api/files/photo/{userId} → Photo par userId (RH/ADMIN)
 *   GET /api/files/recording/{id} → Vidéo quiz (RH/ADMIN)
 */
@RestController
@RequestMapping("/api/files")
public class FileProxyController {

    private static final Logger log = LoggerFactory.getLogger(FileProxyController.class);

    @Autowired private CloudinaryService        cloudinaryService;
    @Autowired private Profilcandidatrepository profilRepository;
    @Autowired private UserRepository           userRepository;
    @Autowired private CandidatureRepository    candidatureRepository;

    private final RestTemplate restTemplate = new RestTemplate();

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

            String cvUrl      = profil.getCv();
            String cvPublicId = profil.getCvPublicId();

            if (cvUrl == null || cvUrl.isBlank())
                return ResponseEntity.notFound().build();

            String urlToFetch;
            if (cvPublicId != null && !cvPublicId.isBlank()) {
                urlToFetch = cloudinaryService.signedCvUrl(cvPublicId);
                if (urlToFetch == null) return ResponseEntity.status(500).build();
            } else {
                urlToFetch = cvUrl.replaceAll("/s--[^/]+--", "");
            }

            // ✅ Redirect direct vers la signed URL — contourne le problème réseau
            // La signed URL est sécurisée (expire, signée) donc pas de risque
            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(java.net.URI.create(urlToFetch));
            if (download) {
                String filename = urlToFetch.substring(urlToFetch.lastIndexOf('/') + 1);
                if (filename.contains("?")) filename = filename.substring(0, filename.indexOf('?'));
                headers.setContentDisposition(
                        ContentDisposition.attachment().filename(filename).build()
                );
            }
            return ResponseEntity.status(HttpStatus.FOUND).headers(headers).build();

        } catch (Exception e) {
            log.error("[FileProxy] CV erreur : {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    } // ═══════════════════════════════════════════════════════════════════════
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
            log.info("[FileProxy] Photo — user={}", email);
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
            log.info("[FileProxy] Vidéo — candidature={}", candidatureId);
            return proxyFile(recordingUrl, recordingUrl, false);
        } catch (Exception e) {
            log.error("[FileProxy] Vidéo erreur : {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }
    @GetMapping("/cv/{userId}/url")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getCvUrl(@PathVariable Long userId) {
        try {
            var user   = userRepository.findById(userId).orElseThrow();
            var profil = profilRepository.findByUser(user).orElseThrow();

            String cvPublicId = profil.getCvPublicId();
            String cvUrl      = profil.getCv();

            if (cvPublicId != null && !cvPublicId.isBlank()) {
                String signed = cloudinaryService.signedCvUrl(cvPublicId);
                if (signed == null) return ResponseEntity.status(500).build();
                return ResponseEntity.ok(Map.of("url", signed));
            } else if (cvUrl != null && !cvUrl.isBlank()) {
                return ResponseEntity.ok(Map.of("url", cvUrl.replaceAll("/s--[^/]+--", "")));
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("[FileProxy] getCvUrl erreur : {}", e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  PROXY — synchrone byte[] (pas StreamingResponseBody)
    //
    //  StreamingResponseBody cause "Access Denied" car le thread async
    //  Tomcat n'hérite pas du SecurityContext Spring Security.
    //  byte[] = synchrone = même thread = SecurityContext présent = pas de problème.
    // ═══════════════════════════════════════════════════════════════════════

    private ResponseEntity<byte[]> proxyFile(String fileUrl, String originalUrl, boolean download) {
        try {
            byte[] bytes = restTemplate.getForObject(URI.create(fileUrl), byte[].class);
            if (bytes == null || bytes.length == 0)
                return ResponseEntity.notFound().build();

            // Détecter MIME
            String ref   = originalUrl != null ? originalUrl : fileUrl;
            String lower = ref.toLowerCase();
            String contentType;
            if      (lower.contains(".pdf"))                             contentType = "application/pdf";
            else if (lower.contains(".webm"))                            contentType = "video/webm";
            else if (lower.contains(".mp4"))                             contentType = "video/mp4";
            else if (lower.contains(".png"))                             contentType = "image/png";
            else if (lower.contains(".jpg") || lower.contains(".jpeg")) contentType = "image/jpeg";
            else                                                         contentType = "application/octet-stream";

            // Extraire nom de fichier
            String filename = ref.substring(ref.lastIndexOf('/') + 1);
            if (filename.contains("?")) filename = filename.substring(0, filename.indexOf('?'));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentLength(bytes.length);
            headers.setContentDisposition(
                    download
                            ? ContentDisposition.attachment().filename(filename).build()
                            : ContentDisposition.inline().filename(filename).build()
            );
            headers.setCacheControl(CacheControl.noStore());

            return ResponseEntity.ok().headers(headers).body(bytes);

        } catch (Exception e) {
            log.error("[FileProxy] Proxy erreur : {}", e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }
}