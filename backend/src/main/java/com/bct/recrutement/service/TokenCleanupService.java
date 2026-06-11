package com.bct.recrutement.service;

import com.bct.recrutement.repository.VerificationTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class TokenCleanupService {

    private static final Logger log = LoggerFactory.getLogger(TokenCleanupService.class);

    private final VerificationTokenRepository tokenRepository;

    // Constructeur explicite pour l'injection
    public TokenCleanupService(VerificationTokenRepository tokenRepository) {
        this.tokenRepository = tokenRepository;
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanExpiredTokens() {
        int deleted = tokenRepository.deleteByExpiryDateBefore(LocalDateTime.now());
        log.info("Nettoyage des tokens expirés : {} supprimés", deleted);
    }
}