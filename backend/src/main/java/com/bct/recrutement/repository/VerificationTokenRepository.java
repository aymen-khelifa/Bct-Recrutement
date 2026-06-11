package com.bct.recrutement.repository;

import com.bct.recrutement.entity.VerificationToken;
import com.bct.recrutement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Optional;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {
    Optional<VerificationToken> findByUser(User user);
    Optional<VerificationToken> findByCode(String code);
    int deleteByExpiryDateBefore(LocalDateTime now);
    void deleteByUser(User user);
}