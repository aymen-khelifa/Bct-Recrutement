package com.bct.recrutement.Task;

import com.bct.recrutement.service.VerificationTokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class TokenCleanupTask {

    @Autowired
    private VerificationTokenService tokenService;

    // Exécution toutes les heures
    @Scheduled(fixedRate = 3600000)
    public void cleanExpiredTokens() {
        tokenService.deleteExpiredTokens();
    }
}
