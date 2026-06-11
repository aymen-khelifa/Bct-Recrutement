package com.bct.recrutement.controller;

import com.bct.recrutement.dto.*;
import com.bct.recrutement.entity.RefreshToken;
import com.bct.recrutement.entity.User;
import com.bct.recrutement.repository.UserRepository;
import com.bct.recrutement.service.PasswordResetService;
import com.bct.recrutement.service.RefreshTokenService;
import com.bct.recrutement.service.UserService;
import com.bct.recrutement.service.VerificationTokenService;
import com.bct.recrutement.config.JwtUtils;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    // ── Cloudinary ────────────────────────────────────────────────────────
    private final Cloudinary cloudinary;

    public AuthController(
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

    @Autowired private AuthenticationManager    authenticationManager;
    @Autowired private JwtUtils                 jwtUtils;
    @Autowired private UserService              userService;
    @Autowired private VerificationTokenService tokenService;
    @Autowired private RefreshTokenService      refreshTokenService;
    @Autowired private UserRepository           userRepository;
    @Autowired private PasswordResetService     passwordResetService;

    @Value("${server.ssl.enabled:false}")
    private boolean isSecure;

    @Value("${jwt.expiration.ms}")
    private long jwtExpirationMs;

    @Value("${jwt.refresh.expiration.ms}")
    private long refreshExpirationMs;

    // ── Helper cookie ─────────────────────────────────────────────────────
    private Cookie buildCookie(String name, String value, String path, int maxAgeSeconds) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(isSecure);
        cookie.setPath(path);
        cookie.setMaxAge(maxAgeSeconds);
        cookie.setAttribute("SameSite", "Lax");
        return cookie;
    }

    // ── Register ──────────────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegistrationRequest request) {
        try {
            userService.registerUser(request);
            return ResponseEntity.ok(new MessageResponse("Inscription réussie. Veuillez vérifier votre email pour le code OTP."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // ── Whoami ────────────────────────────────────────────────────────────
    @GetMapping("/whoami")
    public ResponseEntity<?> whoami() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).body("Non authentifié");
        }
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userService.findByEmail(email);
        return ResponseEntity.ok(userToMap(user, null));
    }

    // ── Verify OTP ────────────────────────────────────────────────────────
    @PostMapping("/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody VerificationRequest request) {
        try {
            boolean verified = tokenService.verifyOtp(request.getEmail(), request.getCode());
            if (verified) {
                userService.enableUser(request.getEmail());
                return ResponseEntity.ok(new MessageResponse("Compte activé avec succès !"));
            } else {
                return ResponseEntity.badRequest().body(new MessageResponse("Code incorrect."));
            }
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @GetMapping("/check-phone")
    public Map<String, Boolean> checkPhone(@RequestParam String phone,
                                           @RequestParam(required = false) Long userId) {
        Optional<User> existingUser = userRepository.findByPhoneNumber(phone);
        boolean exists = existingUser.isPresent() &&
                (userId == null || !existingUser.get().getId().equals(userId));
        return Map.of("exists", exists);
    }

    // ── Resend OTP ────────────────────────────────────────────────────────
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestParam String email) {
        try {
            tokenService.resendOtp(email);
            return ResponseEntity.ok(new MessageResponse("Un nouveau code a été envoyé."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // ── Login ─────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User user = userService.findByEmail(userDetails.getUsername());

            String accessToken        = jwtUtils.generateJwtToken(authentication);
            String refreshTokenString = jwtUtils.generateRefreshToken(user.getEmail());
            RefreshToken savedToken   = refreshTokenService.createRefreshToken(user, refreshTokenString);

            response.addCookie(buildCookie("accessToken",  accessToken,           "/",                 (int)(jwtExpirationMs  / 1000)));
            response.addCookie(buildCookie("refreshToken", savedToken.getToken(),  "/api/auth/refresh", (int)(refreshExpirationMs / 1000)));

            return ResponseEntity.ok(new JwtResponse(null, null, user.getId(), user.getEmail(), user.getRole().name()));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Erreur : " + e.getMessage()));
        }
    }

    // ── Refresh token ─────────────────────────────────────────────────────
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractCookieValue(request, "refreshToken");
        if (refreshToken == null)
            return ResponseEntity.status(401).body(new MessageResponse("Refresh token manquant"));

        try {
            RefreshToken tokenEntity = refreshTokenService.verifyRefreshToken(refreshToken);
            User user = tokenEntity.getUser();

            String newAccessToken = jwtUtils.generateAccessTokenFromUsername(user.getEmail(), user.getRole().name());

            refreshTokenService.revokeRefreshToken(user);
            String newRefreshTokenString = jwtUtils.generateRefreshToken(user.getEmail());
            RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user, newRefreshTokenString);

            response.addCookie(buildCookie("accessToken",  newAccessToken,            "/",                 (int)(jwtExpirationMs  / 1000)));
            response.addCookie(buildCookie("refreshToken", newRefreshToken.getToken(), "/api/auth/refresh", (int)(refreshExpirationMs / 1000)));

            return ResponseEntity.ok(new MessageResponse("Token rafraîchi avec succès"));

        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(new MessageResponse("Refresh token invalide : " + e.getMessage()));
        }
    }

    // ── Logout ────────────────────────────────────────────────────────────
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractCookieValue(request, "refreshToken");
        if (refreshToken != null) {
            try {
                RefreshToken tokenEntity = refreshTokenService.verifyRefreshToken(refreshToken);
                refreshTokenService.revokeRefreshToken(tokenEntity.getUser());
            } catch (Exception ignored) {}
        }
        response.addCookie(buildCookie("accessToken",  "", "/",                 0));
        response.addCookie(buildCookie("refreshToken", "", "/api/auth/refresh", 0));
        return ResponseEntity.ok(new MessageResponse("Déconnexion réussie"));
    }

    // ── Update profile ────────────────────────────────────────────────────
    @PatchMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateMe(
            @AuthenticationPrincipal UserDetails ud,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(value = "photo", required = false) MultipartFile photoFile) {
        try {
            User user = userRepository.findByEmail(ud.getUsername())
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

            if (name != null && !name.isBlank())
                user.setName(name.trim());

            if (phoneNumber != null && !phoneNumber.isBlank()) {
                String phone = phoneNumber.trim();
                Optional<User> existingUser = userRepository.findByPhoneNumber(phone);
                if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("message", "Ce numéro de téléphone est déjà utilisé"));
                }
                user.setPhoneNumber(phone);
            }

            // ── Upload photo vers Cloudinary → sauvegarde URL + publicId ──
            if (photoFile != null && !photoFile.isEmpty()) {
                String[] result = savePhoto(photoFile, user.getId());
                user.setPhotoUrl(result[0]);      // URL signée ou publique
                user.setPhotoPublicId(result[1]); // public_id pour Signed URLs
            }

            userRepository.save(user);
            return ResponseEntity.ok(userToMap(user, null));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Check enabled ─────────────────────────────────────────────────────
    @GetMapping("/check-enabled")
    public ResponseEntity<Map<String, Object>> checkEnabled(@RequestParam String email) {
        try {
            User user = userService.findByEmail(email);
            return ResponseEntity.ok(Map.of("exists", true, "enabled", user.isEnabled()));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("exists", false, "enabled", true));
        }
    }

    // ── Forgot password ───────────────────────────────────────────────────
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "L'adresse email est obligatoire."));
        try {
            passwordResetService.requestPasswordReset(email.trim().toLowerCase());
            return ResponseEntity.ok(Map.of("message", "Email de réinitialisation envoyé avec succès."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Validate reset token ──────────────────────────────────────────────
    @GetMapping("/reset-password/validate")
    public ResponseEntity<?> validateToken(@RequestParam String token) {
        try {
            passwordResetService.validateToken(token);
            return ResponseEntity.ok(Map.of("valid", true, "message", "Token valide."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", e.getMessage()));
        }
    }

    // ── Reset password ────────────────────────────────────────────────────
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token           = body.get("token");
        String newPassword     = body.get("newPassword");
        String confirmPassword = body.get("confirmPassword");

        if (token == null || token.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Token manquant."));
        if (newPassword == null || newPassword.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Le nouveau mot de passe est obligatoire."));
        if (!newPassword.equals(confirmPassword))
            return ResponseEntity.badRequest().body(Map.of("message", "Les mots de passe ne correspondent pas."));
        if (newPassword.length() < 8)
            return ResponseEntity.badRequest().body(Map.of("message", "Le mot de passe doit contenir au moins 8 caractères."));

        try {
            passwordResetService.resetPassword(token, newPassword);
            return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private String extractCookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null)
            for (Cookie c : cookies)
                if (name.equals(c.getName())) return c.getValue();
        return null;
    }

    private Map<String, Object> userToMap(User user, String token) {
        var map = new java.util.LinkedHashMap<String, Object>();
        map.put("id",          user.getId());
        map.put("name",        user.getName());
        map.put("email",       user.getEmail());
        map.put("phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : "");
        map.put("photoUrl",    user.getPhotoUrl()    != null ? user.getPhotoUrl()    : "");
        map.put("role",        user.getRole().name());
        map.put("createdAt",   user.getCreatedAt());
        if (token != null) map.put("token", token);
        return map;
    }

    // ── Upload photo → Cloudinary — retourne {url, publicId} ─────────────
    @SuppressWarnings("unchecked")
    private String[] savePhoto(MultipartFile file, Long userId) {
        try {
            String publicId = "bct-recrutement/photos/photo_" + userId + "_" + System.currentTimeMillis();

            Map<String, Object> params = ObjectUtils.asMap(
                    "resource_type",  "image",
                    "public_id",      publicId,
                    "overwrite",      true,
                    "transformation", new com.cloudinary.Transformation()
                            .width(400).height(400).crop("fill").gravity("face"),
                    "tags",           new String[]{"photo", "bct", "candidat-" + userId},
                    "context",        "user_id=" + userId + "|type=photo"
            );

            Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), params);
            String url      = (String) result.get("secure_url");
            String pubId    = (String) result.get("public_id");

            return new String[]{ url, pubId };

        } catch (IOException e) {
            throw new RuntimeException("Erreur upload photo Cloudinary : " + e.getMessage());
        }
    }
}