package com.bct.recrutement.repository;

import com.bct.recrutement.entity.QuizSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QuizSessionRepository extends JpaRepository<QuizSession, Long> {

    /**
     * Récupère la session d'un candidat pour un quiz donné.
     * Utilisé pour :
     *   - Vérifier l'éligibilité (tentative unique)
     *   - Reprendre une session existante
     *   - Valider le délai lors de la soumission
     */
    Optional<QuizSession> findByUserIdAndQuizId(Long userId, Long quizId);

    /**
     * Vérifie si un candidat a déjà soumis un quiz.
     */
    boolean existsByUserIdAndQuizIdAndSubmittedTrue(Long userId, Long quizId);
}