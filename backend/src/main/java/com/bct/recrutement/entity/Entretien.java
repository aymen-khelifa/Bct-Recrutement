package com.bct.recrutement.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "entretiens")
public class Entretien {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidature_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Candidature candidature;

    @Column(name = "date_debut", nullable = false)
    private LocalDateTime dateDebut;
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "date_fin", nullable = false)
    private LocalDateTime dateFin;

    // ✅ UUID unique → /entretien/{roomToken}
    @Column(name = "room_token", unique = true, nullable = false, length = 64)
    private String roomToken;

    @Column(name = "statut", length = 50)
    private String statut = "PLANIFIE";

    @Column(name = "notes_rh", columnDefinition = "TEXT")
    private String notesRh;

    @Column(name = "score_entretien")
    private Integer scoreEntretien;

    @Column(name = "cree_le")
    private LocalDateTime creeLe = LocalDateTime.now();

    // Getters/Setters
    public Long getId()                              { return id; }
    public Candidature getCandidature()              { return candidature; }
    public void setCandidature(Candidature c)        { this.candidature = c; }
    public LocalDateTime getDateDebut()              { return dateDebut; }
    public void setDateDebut(LocalDateTime d)        { this.dateDebut = d; }
    public LocalDateTime getDateFin()                { return dateFin; }
    public void setDateFin(LocalDateTime d)          { this.dateFin = d; }
    public String getRoomToken()                     { return roomToken; }
    public void setRoomToken(String t)               { this.roomToken = t; }
    public String getStatut()                        { return statut; }
    public void setStatut(String s)                  { this.statut = s; }
    public String getNotesRh()                       { return notesRh; }
    public void setNotesRh(String n)                 { this.notesRh = n; }
    public Integer getScoreEntretien()               { return scoreEntretien; }
    public void setScoreEntretien(Integer s)         { this.scoreEntretien = s; }
    public LocalDateTime getCreeLe()                 { return creeLe; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
}