package com.bct.recrutement.service;

import com.bct.recrutement.entity.RefreshToken;
import com.bct.recrutement.entity.User;
import com.bct.recrutement.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class RefreshTokenService {

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh.expiration.ms}")
    private long refreshExpirationMs;



    @Transactional
    public RefreshToken createRefreshToken(User user, String token) {
        // Supprimer l'ancien token
        refreshTokenRepository.deleteByUser(user);
        // Forcer l'exécution immédiate de la suppression
        refreshTokenRepository.flush();

        // Créer le nouveau token
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(token);
        refreshToken.setUser(user);
        refreshToken.setExpiryDate(LocalDateTime.now().plus(refreshExpirationMs, ChronoUnit.MILLIS));
        refreshToken.setRevoked(false);
        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyRefreshToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Refresh token non trouvé"));
        if (refreshToken.isRevoked() || refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Refresh token invalide ou expiré");
        }
        return refreshToken;
    }

    @Transactional
    public void revokeRefreshToken(User user) {
        refreshTokenRepository.deleteByUser(user); // ou marquer revoked = true
    }
}