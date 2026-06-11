// ═══════════════════════════════════════════════════════════════════════
//  QuizSession.java  –  entity/QuizSession.java
// ═══════════════════════════════════════════════════════════════════════
package com.bct.recrutement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Enregistre une session de quiz par candidat.
 * Garantit :
 *   - L'horodatage de début (startedAt) → validation du délai côté back
 *   - Le flag submitted → tentative unique
 */
@Entity
@Table(
        name = "quiz_session",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "quiz_id"})
)
public class QuizSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "submitted", nullable = false)
    private boolean submitted = false;

    // ── Getters / Setters ────────────────────────────────────────────────

    public Long getId()                        { return id; }
    public void setId(Long id)                 { this.id = id; }

    public User getUser()                      { return user; }
    public void setUser(User user)             { this.user = user; }

    public Quiz getQuiz()                      { return quiz; }
    public void setQuiz(Quiz quiz)             { this.quiz = quiz; }

    public LocalDateTime getStartedAt()        { return startedAt; }
    public void setStartedAt(LocalDateTime t)  { this.startedAt = t; }

    public LocalDateTime getSubmittedAt()      { return submittedAt; }
    public void setSubmittedAt(LocalDateTime t){ this.submittedAt = t; }

    public boolean isSubmitted()               { return submitted; }
    public void setSubmitted(boolean s)        { this.submitted = s; }
}


// ═══════════════════════════════════════════════════════════════════════
//  QuizSessionRepository.java  –  repository/QuizSessionRepository.java
// ═══════════════════════════════════════════════════════════════════════
//
// package com.bct.recrutement.repository;
//
// import com.bct.recrutement.entity.QuizSession;
// import org.springframework.data.jpa.repository.JpaRepository;
// import java.util.Optional;
//
// public interface QuizSessionRepository extends JpaRepository<QuizSession, Long> {
//
//     Optional<QuizSession> findByUserIdAndQuizId(Long userId, Long quizId);
// }