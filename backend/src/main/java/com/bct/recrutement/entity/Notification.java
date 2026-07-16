package com.bct.recrutement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long candidatId;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private boolean lu = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // ── Getters ──────────────────────────────────────────────────────────
    public Long getId()            { return id; }
    public Long getCandidatId()    { return candidatId; }
    public String getTitre()       { return titre; }
    public String getMessage()     { return message; }
    public String getType()        { return type; }
    public boolean isLu()          { return lu; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    // ── Setters ──────────────────────────────────────────────────────────
    public void setId(Long id)              { this.id = id; }
    public void setCandidatId(Long candidatId) { this.candidatId = candidatId; }
    public void setTitre(String titre)      { this.titre = titre; }
    public void setMessage(String message)  { this.message = message; }
    public void setType(String type)        { this.type = type; }
    public void setLu(boolean lu)           { this.lu = lu; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}