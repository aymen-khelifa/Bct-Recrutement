package com.bct.recrutement.service;

import com.bct.recrutement.entity.PasswordResetToken;
import com.bct.recrutement.entity.User;
import com.bct.recrutement.repository.PasswordResetTokenRepository;
import com.bct.recrutement.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    // URL du frontend (configurable dans application.properties)
    // Ex : http://localhost:5173 en dev, https://bct.tn en prod
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Autowired private PasswordResetTokenRepository tokenRepository;
    @Autowired private UserRepository               userRepository;
    @Autowired private JavaMailSender               mailSender;
    @Autowired private PasswordEncoder              passwordEncoder;

    // ─────────────────────────────────────────────────────────────────────────
    //  1. Demande de réinitialisation — envoie un email avec le lien
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public void requestPasswordReset(String email) {
        // Toujours retourner un succès même si l'email n'existe pas
        // (sécurité : ne pas révéler si un email est enregistré)
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // ← Lever une exception au lieu de silencieusement ignorer
            throw new RuntimeException("Aucun compte n'est associé à cette adresse email.");
        }

        // Supprimer les anciens tokens pour cet utilisateur
        tokenRepository.deleteByUserId(user.getId());

        // Générer un token sécurisé unique
        String tokenValue = UUID.randomUUID().toString();

        PasswordResetToken token = new PasswordResetToken();
        token.setToken(tokenValue);
        token.setUser(user);
        tokenRepository.save(token);

        // Envoyer l'email
        try {
            sendResetEmail(user, tokenValue);
            log.info("[PasswordReset] Email envoyé à {}", email);
        } catch (Exception e) {
            log.error("[PasswordReset] Erreur envoi email à {} : {}", email, e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email. Réessayez plus tard.");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  2. Valider le token (appelé quand le candidat clique sur le lien)
    // ─────────────────────────────────────────────────────────────────────────
    public void validateToken(String tokenValue) {
        PasswordResetToken token = tokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new RuntimeException("Lien invalide ou expiré."));

        if (token.isUsed()) {
            throw new RuntimeException("Ce lien a déjà été utilisé.");
        }
        if (token.isExpired()) {
            throw new RuntimeException("Ce lien a expiré. Veuillez faire une nouvelle demande.");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  3. Réinitialiser le mot de passe
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public void resetPassword(String tokenValue, String newPassword) {
        PasswordResetToken token = tokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new RuntimeException("Lien invalide ou expiré."));

        if (token.isUsed()) {
            throw new RuntimeException("Ce lien a déjà été utilisé.");
        }
        if (token.isExpired()) {
            throw new RuntimeException("Ce lien a expiré. Veuillez faire une nouvelle demande.");
        }

        // Validation du mot de passe
        if (newPassword == null || newPassword.length() < 8) {
            throw new RuntimeException("Le mot de passe doit contenir au moins 8 caractères.");
        }

        // Mettre à jour le mot de passe
        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalider le token
        token.setUsed(true);
        tokenRepository.save(token);

        log.info("[PasswordReset] Mot de passe réinitialisé pour {}", user.getEmail());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Email HTML de réinitialisation
    // ─────────────────────────────────────────────────────────────────────────
    private void sendResetEmail(User user, String tokenValue) throws MessagingException {
        String resetLink = frontendUrl + "/reset-password?token=" + tokenValue;
        String userName  = user.getName() != null ? user.getName() : "Candidat";

        String html = """
            <!DOCTYPE html>
            <html lang="fr">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
                <!-- Header -->
                <div style="background:#003d7a;padding:32px 40px;text-align:center;">
                  <p style="color:#a8c8ff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;">Banque Centrale de Tunisie</p>
                  <p style="color:#fff;font-size:20px;font-weight:900;margin:0;text-transform:uppercase;letter-spacing:-0.02em;">Réinitialisation du mot de passe</p>
                </div>
                <!-- Body -->
                <div style="padding:40px;">
                  <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 12px;">Bonjour %s,</p>
                  <p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 28px;">
                    Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte sur la plateforme de recrutement de la Banque Centrale de Tunisie.
                  </p>
                  <!-- CTA Button -->
                  <div style="text-align:center;margin-bottom:28px;">
                    <a href="%s" style="display:inline-block;background:#003d7a;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.02em;">
                      Réinitialiser mon mot de passe →
                    </a>
                  </div>
                  <!-- Warning -->
                  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
                    <p style="color:#92400e;font-size:12px;font-weight:600;margin:0;">
                      ⏱ Ce lien expire dans <strong>15 minutes</strong>. Si vous n'avez pas fait cette demande, ignorez cet email — votre mot de passe reste inchangé.
                    </p>
                  </div>
                 
                </div>
                <!-- Footer -->
                <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                  <p style="color:#94a3b8;font-size:10px;margin:0;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">
                    © 2026 Banque Centrale de Tunisie — Plateforme de Recrutement
                  </p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(userName, resetLink, resetLink);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(user.getEmail());
        helper.setSubject("Réinitialisation de votre mot de passe — BCT Recrutement");
        helper.setText(html, true);
        helper.setFrom("no-reply@bct.tn");

        mailSender.send(message);
    }
}