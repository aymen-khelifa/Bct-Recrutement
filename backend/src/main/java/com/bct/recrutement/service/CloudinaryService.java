package com.bct.recrutement.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CloudinaryService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryService.class);

    private final Cloudinary cloudinary;

    public CloudinaryService(
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

    /**
     * Génère une Signed delivery URL via CDN (res.cloudinary.com) pour un fichier
     * uploadé en type=authenticated.
     *
     * URL générée : https://res.cloudinary.com/{cloud}/raw/authenticated/s--{sig}--/{publicId}
     *
     * - type=authenticated : fichier inaccessible sans signature valide
     * - CDN (res.cloudinary.com) : accessible même derrière des pare-feux réseau
     * - Signature calculée côté serveur avec l'API secret → jamais exposée
     *
     * Note : l'URL n'expire pas, mais la sécurité est assurée par :
     *   1. type=authenticated → 401 sans signature
     *   2. Proxy Spring → le browser ne voit jamais l'URL Cloudinary
     *   3. JWT Spring Security → accès refusé sans token valide
     */
    public String signedCvUrl(String publicId) {
        if (publicId == null || publicId.isBlank()) return null;
        try {
            String url = cloudinary.url()
                    .resourceType("raw")
                    .type("authenticated")   // ← correspond au type d'upload
                    .signed(true)            // ← ajoute s--signature-- dans l'URL CDN
                    .generate(publicId);

            log.info("[Cloudinary] Signed URL OK — publicId={}", publicId);
            return url;

        } catch (Exception e) {
            log.error("[Cloudinary] Signed URL KO — {} : {}", publicId, e.getMessage());
            return null;
        }
    }

    public Cloudinary getCloudinary() {
        return cloudinary;
    }
}