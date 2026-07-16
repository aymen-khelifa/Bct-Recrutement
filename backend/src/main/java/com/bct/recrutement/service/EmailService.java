package com.bct.recrutement.service;

import com.sendgrid.*;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Email;
import com.sendgrid.helpers.mail.objects.Personalization;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.mail.javamail.MimeMessageHelper;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtpEmail(String to, String code, int expiryMinutes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Code de vérification");

            String htmlContent = String.format("""
            <!DOCTYPE html><html lang="fr">
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

                <div style="background:#001b3d;padding:32px 40px;text-align:center;">
                  <p style="color:#a8c8ff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin:0 0 8px;">
                    Banque Centrale de Tunisie
                  </p>
                  <p style="color:#fff;font-size:20px;font-weight:900;margin:0;text-transform:uppercase;">
                    Code de vérification
                  </p>
                </div>

                <div style="padding:40px;">
                  <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 16px;">Bonjour,</p>
                  <p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 24px;">
                    Voici votre code de vérification à usage unique. Saisissez-le pour confirmer votre identité.
                  </p>

                  <div style="background:#f0f4fb;border-radius:10px;padding:24px;margin-bottom:24px;text-align:center;">
                    <p style="color:#003d7a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">
                      Votre code
                    </p>
                    <p style="color:#c8102e;font-size:34px;font-weight:900;letter-spacing:6px;margin:0;font-family:'Courier New',monospace;">
                      %s
                    </p>
                  </div>

                  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
                    <p style="color:#92400e;font-size:12px;font-weight:600;margin:0;">
                      ⏱ Ce code expire dans %d minutes. Ne le partagez avec personne.
                    </p>
                  </div>

                  <p style="color:#94a3b8;font-size:12px;margin:0;">
                    Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
                  </p>
                </div>

                <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                  <p style="color:#94a3b8;font-size:10px;margin:0;text-transform:uppercase;font-weight:700;">
                    © 2026 BCT Recrutement — Confidentiel
                  </p>
                </div>

              </div>
            </body></html>
            """, code, expiryMinutes);

            helper.setText(htmlContent, true); // true = HTML

            mailSender.send(message);

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de l'envoi de l'email OTP", e);
        }
    }
    @Async("emailExecutor")
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML
            helper.setFrom("tonemail@gmail.com");

            mailSender.send(message);
            System.out.println("Email envoyé à " + to);

        } catch (MessagingException e) {
            System.err.println("Erreur envoi email : " + e.getMessage());
        }
    }

    public void sendCandidatureEmail(String to, String name, String sujet, String statut) {
        if (statut.equalsIgnoreCase("ELIMINE_CV")) {
            sendHtmlEmail(to, "Résultat de votre candidature", getHtmlRejet(name, sujet));
        } else if (statut.equalsIgnoreCase("PRESELECTIONNE_CV")) {
            sendHtmlEmail(to, "Résultat de votre candidature", getHtmlAccept(name, sujet));
        } else {
            System.out.println("Statut inconnu pour " + to + ": " + statut);
        }
    }

    private String getHtmlRejet(String name, String sujet) {
        return """
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #FAFAFA; padding: 15px; text-align: center;">
              <img src="https://cdn.mcauto-images-production.sendgrid.net/d61661728ed8669a/9135001c-f774-4032-bae2-d511931a0a23/496x157.png" alt="BCT Logo" style="height: 60px;">
            </div>
            <hr style="border: none; border-top: 2px solid #003d7a; margin: 0;">
            <div style="padding: 20px;">
              <h2 style="color: #c8102e;">Résultat de votre candidature</h2>
              <p>Bonjour <strong>%s</strong>,</p>
              <p>Après étude attentive de votre dossier, nous regrettons de vous informer que votre candidature pour le sujet "<strong>%s</strong>" n’a pas été retenue.</p>
              <p>Nous vous encourageons à postuler à de futures opportunités.</p>
            </div>
            <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
              © 2026 Banque Centrale de Tunisie
            </div>
          </div>
        </body>
        </html>
        """.formatted(name, sujet);
    }

    private String getHtmlAccept(String name, String sujet) {
        return """
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
          <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden;">
            <div style="background-color:#FAFAFA; padding:15px; text-align:center;">
              <img src="https://res.cloudinary.com/dsd9trywp/image/upload/v1775425705/bct_xs29hz.png" alt="BCT Logo" width="180" style="display:block; margin:auto; border:0;">
            </div>
            <hr style="border: none; border-top: 2px solid #003d7a; margin: 0;">
            <div style="padding:25px;">
              <h2 style="color:#28a745;">Félicitations !</h2>
              <p>Bonjour <strong>%s</strong>,</p>
              <p>Nous avons le plaisir de vous informer que votre candidature pour le sujet "<strong>%s</strong>" a été présélectionnée avec succès.</p>
              <p style="color:#555;">Vous êtes invité à passer à la prochaine étape : <strong>le test technique (quiz)</strong>.</p>
              
              <p>Bonne chance pour la suite !</p>
            </div>
            <div style="background-color:#f1f1f1; padding:15px; text-align:center; font-size:12px; color:#666;">© 2026 Banque Centrale de Tunisie</div>
          </div>
        </body>
        </html>
        """.formatted(name, sujet);
    }
}