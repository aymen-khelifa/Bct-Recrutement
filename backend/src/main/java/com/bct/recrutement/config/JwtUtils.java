package com.bct.recrutement.config;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.*;
import com.nimbusds.jose.jwk.OctetSequenceKey;
import com.nimbusds.jwt.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;

/**
 * JwtUtils — JWT chiffré (JWE) avec AES-256-GCM
 *
 * Avant : JWT signé HS512 → payload lisible en base64
 *   eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGV4LmNvbSIsInJvbGUiOiJST0xFX1JIIn0...
 *
 * Après : JWE chiffré AES-256-GCM → payload totalement opaque
 *   eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0...[chiffré]...[tag]
 *
 * Algorithme :
 *   - alg : dir (clé directe AES-256)
 *   - enc : A256GCM (AES 256 bits en mode GCM)
 *
 * Dépendance Maven à ajouter dans pom.xml :
 *   <dependency>
 *     <groupId>com.nimbusds</groupId>
 *     <artifactId>nimbus-jose-jwt</artifactId>
 *     <version>9.37.3</version>
 *   </dependency>
 */
@Component
public class JwtUtils {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    // Doit faire exactement 32 caractères (256 bits) pour AES-256
    // ou on le dérive via SHA-256 si plus long
    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration.ms}")
    private long jwtExpirationMs;

    @Value("${jwt.refresh.expiration.ms}")
    private long refreshExpirationMs;

    // ── Clé AES-256 dérivée depuis jwt.secret ────────────────────────────────
    private SecretKey getEncryptionKey() throws Exception {
        // SHA-256 du secret → 32 bytes garantis quelle que soit la longueur du secret
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = digest.digest(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(keyBytes, "AES");
    }

    // ── Chiffrer un JWTClaimsSet → JWE compact ───────────────────────────────
    private String encrypt(JWTClaimsSet claims) {
        try {
            JWEHeader header = new JWEHeader(JWEAlgorithm.DIR, EncryptionMethod.A256GCM);
            EncryptedJWT jwt = new EncryptedJWT(header, claims);
            DirectEncrypter encrypter = new DirectEncrypter(getEncryptionKey().getEncoded());
            jwt.encrypt(encrypter);
            return jwt.serialize();
        } catch (Exception e) {
            logger.error("Erreur chiffrement JWT : {}", e.getMessage());
            throw new RuntimeException("Impossible de chiffrer le token", e);
        }
    }

    // ── Déchiffrer un JWE compact → JWTClaimsSet ─────────────────────────────
    private JWTClaimsSet decrypt(String token) throws Exception {
        EncryptedJWT jwt = EncryptedJWT.parse(token);
        DirectDecrypter decrypter = new DirectDecrypter(getEncryptionKey().getEncoded());
        jwt.decrypt(decrypter);
        return jwt.getJWTClaimsSet();
    }

    // ── generateJwtToken (depuis Authentication) ──────────────────────────────
    public String generateJwtToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        String role = userPrincipal.getAuthorities().iterator().next().getAuthority();

        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(userPrincipal.getUsername())
                    .claim("role", role)
                    .issueTime(new Date())
                    .expirationTime(new Date(System.currentTimeMillis() + jwtExpirationMs))
                    .build();
            return encrypt(claims);
        } catch (Exception e) {
            throw new RuntimeException("Erreur génération accessToken", e);
        }
    }

    // ── generateAccessTokenFromUsername (depuis username + role) ─────────────
    public String generateAccessTokenFromUsername(String username, String role) {
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(username)
                    .claim("role", role)
                    .issueTime(new Date())
                    .expirationTime(new Date(System.currentTimeMillis() + jwtExpirationMs))
                    .build();
            return encrypt(claims);
        } catch (Exception e) {
            throw new RuntimeException("Erreur génération accessToken", e);
        }
    }

    // ── generateRefreshToken ──────────────────────────────────────────────────
    public String generateRefreshToken(String username) {
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(username)
                    .issueTime(new Date())
                    .expirationTime(new Date(System.currentTimeMillis() + refreshExpirationMs))
                    .build();
            return encrypt(claims);
        } catch (Exception e) {
            throw new RuntimeException("Erreur génération refreshToken", e);
        }
    }

    // ── getUserNameFromJwtToken ───────────────────────────────────────────────
    public String getUserNameFromJwtToken(String token) {
        try {
            return decrypt(token).getSubject();
        } catch (Exception e) {
            logger.error("Impossible d'extraire le username du token : {}", e.getMessage());
            return null;
        }
    }

    // ── validateJwtToken ──────────────────────────────────────────────────────
    public boolean validateJwtToken(String token) {
        try {
            JWTClaimsSet claims = decrypt(token);
            // Vérifier l'expiration
            if (claims.getExpirationTime().before(new Date())) {
                logger.error("JWT token expiré");
                return false;
            }
            return true;
        } catch (Exception e) {
            logger.error("JWT token invalide : {}", e.getMessage());
            return false;
        }
    }
}