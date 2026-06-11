package com.bct.recrutement.repository;

import com.bct.recrutement.entity.FaceVerificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FaceVerificationLogRepository extends JpaRepository<FaceVerificationLog, Long> {
    List<FaceVerificationLog> findByCandidateIdOrderByVerifiedAtDesc(Long candidateId);
    List<FaceVerificationLog> findByCandidatureId(Long candidatureId);
    long countByCandidateIdAndSuccess(Long candidateId, Boolean success);
    @Query("""
        SELECT COUNT(f) FROM FaceVerificationLog f
        WHERE f.candidateId = :candidateId
          AND f.success = false
          AND f.verifiedAt >= :since
    """)
    int countFailedAttemptsSince(
            @Param("candidateId") Long candidateId,
            @Param("since") LocalDateTime since
    );

    /**
     * Récupère la dernière tentative (réussie ou non) d'un candidat.
     * Utile pour savoir si la session est bloquée.
     */
    @Query("""
        SELECT f FROM FaceVerificationLog f
        WHERE f.candidateId = :candidateId
        ORDER BY f.verifiedAt DESC
        LIMIT 1
    """)
    Optional<FaceVerificationLog> findLastAttempt(@Param("candidateId") Long candidateId);

    /**
     * Récupère la dernière tentative échouée pour calculer l'heure de déblocage.
     */
    @Query("""
        SELECT f FROM FaceVerificationLog f
        WHERE f.candidateId = :candidateId
          AND f.success = false
          AND f.verifiedAt >= :since
        ORDER BY f.verifiedAt DESC
        LIMIT 1
    """)
    Optional<FaceVerificationLog> findLastFailedAttemptSince(
            @Param("candidateId") Long candidateId,
            @Param("since")       LocalDateTime since
    );
}