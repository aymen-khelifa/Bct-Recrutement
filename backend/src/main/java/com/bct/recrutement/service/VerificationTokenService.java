package com.bct.recrutement.service;


import com.bct.recrutement.entity.User;
import com.bct.recrutement.entity.VerificationToken;
import com.bct.recrutement.repository.UserRepository;
import com.bct.recrutement.repository.VerificationTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class VerificationTokenService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private VerificationTokenRepository tokenRepository;

    @Autowired
    private EmailService emailService;

    @Value("${otp.expiration.minutes}")
    private int otpExpirationMinutes;

    @Value("${otp.max.attempts}")
    private int maxAttempts;

    @Value("${otp.block.minutes}")
    private int blockMinutes;

    private static final SecureRandom random = new SecureRandom();

    @Transactional
    public VerificationToken createToken(User user) {
        // Supprimer l'ancien token s'il existe (forcé en base)
        tokenRepository.deleteByUser(user);
        tokenRepository.flush(); // Force l'exécution immédiate de la suppression

        String code = String.format("%06d", random.nextInt(1000000));
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(otpExpirationMinutes);

        VerificationToken token = new VerificationToken(code, expiry, user);
        return tokenRepository.save(token);
    }

    @Transactional
    public void sendOtp(User user) {
        VerificationToken token = createToken(user);
        emailService.sendOtpEmail(user.getEmail(), token.getCode(), otpExpirationMinutes);
    }

    @Transactional
    public boolean verifyOtp(String email, String code) {
        Optional<User> userOpt = userRepository.findByEmail(email); // besoin d'injecter UserRepository
        if (userOpt.isEmpty()) {
            return false;
        }
        User user = userOpt.get();


        Optional<VerificationToken> tokenOpt = tokenRepository.findByUser(user);
        if (tokenOpt.isEmpty()) {
            return false;
        }

        VerificationToken token = tokenOpt.get();

        // Vérifier expiration
        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            // Token expiré, on le supprime
            tokenRepository.delete(token);
            throw new RuntimeException("Code expiré. Veuillez demander un nouveau code.");
        }
        // ✅ Vérifier code correct
        if (token.getCode().equals(code)) {

            // reset attempts
            user.setOtpAttempts(0);
            user.setOtpBlockedUntil(null);

            userRepository.save(user);

            // supprimer token après succès
            tokenRepository.delete(token);

            return true;
        }
        else {
            // Mauvais code : incrémenter tentatives
            int attempts = user.getOtpAttempts() + 1;
            user.setOtpAttempts(attempts);
            if (attempts >= maxAttempts) {
                user.setOtpBlockedUntil(LocalDateTime.now().plusMinutes(blockMinutes));
                user.setOtpAttempts(0); // remise à zéro après blocage
            }
            userRepository.save(user);
            return false;
        }
    }

    @Transactional
    public void resendOtp(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Utilisateur non trouvé");
        }
        User user = userOpt.get();
        if (user.isEnabled()) {
            throw new RuntimeException("Compte déjà activé");
        }
        // Vérifier si l'utilisateur est bloqué

        sendOtp(user);
    }

    // Pour le scheduler (suppression des tokens expirés)
    @Transactional
    public void deleteExpiredTokens() {
        tokenRepository.deleteByExpiryDateBefore(LocalDateTime.now());
    }


}