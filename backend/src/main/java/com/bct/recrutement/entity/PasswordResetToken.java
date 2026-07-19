package com.bct.recrutement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * Token de réinitialisation de mot de passe.
 * Expire après 15 minutes.
 */
@Entity
@Table(name = "password_reset_token")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean used = false;

    @PrePersist
    protected void onCreate() {
        this.expiresAt = LocalDateTime.now().plusMinutes(15);
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    // ── Getters / Setters ──────────────────────────────────────────────────
    public Long          getId()                       { return id; }
    public void          setId(Long id)                { this.id = id; }
    public String        getToken()                    { return token; }
    public void          setToken(String t)            { this.token = t; }
    public User          getUser()                     { return user; }
    public void          setUser(User u)               { this.user = u; }
    public LocalDateTime getExpiresAt()                { return expiresAt; }
    public void          setExpiresAt(LocalDateTime t) { this.expiresAt = t; }
    public boolean       isUsed()                      { return used; }
    public void          setUsed(boolean u)            { this.used = u; }
}