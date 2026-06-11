package com.bct.recrutement.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sujets_stage")
public class SujetStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ex: "BC-24-001"
    @Column(nullable = false, unique = true, length = 30)
    @NotBlank(message = "Le code du sujet est obligatoire")
    private String codeSujet;

    @Column(nullable = false)
    @NotBlank(message = "Le titre est obligatoire")
    private String titre;

    @Column(nullable = false)
    @NotBlank(message = "Le département est obligatoire")
    private String departement;

    @Column(nullable = false)
    @NotBlank(message = "La durée est obligatoire")
    private String duree;

    @Column(nullable = false)
    @Min(value = 1, message = "Minimum 1 stagiaire")
    private int nbStagiaires;

    @Column(name = "date_limite")
    private LocalDate dateLimite;
    @Column(nullable = false)
    @NotBlank(message = "Le niveau d'études est obligatoire")
    private String niveauEtudes;

    @Column(nullable = false)
    @NotBlank(message = "La spécialité est obligatoire")
    private String specialite;

    @Column(nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "La description est obligatoire")
    private String description;

    // Compétences stockées en JSON (liste de strings)
    @ElementCollection
    @CollectionTable(name = "sujet_competences", joinColumns = @JoinColumn(name = "sujet_id"))
    @Column(name = "competence")
    private List<String> competences = new ArrayList<>();

    // Statut du sujet
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutSujet statut = StatutSujet.PUBLIE;

    // Lié au RH créateur
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "createur_id", nullable = false)
    @JsonIgnore
    private User createur;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ── Constructeurs ──────────────────────────────────────────────────────
    public SujetStage() {}

    // ── Getters & Setters ──────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCodeSujet() { return codeSujet; }
    public void setCodeSujet(String codeSujet) { this.codeSujet = codeSujet; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDepartement() { return departement; }
    public void setDepartement(String departement) { this.departement = departement; }

    public String getDuree() { return duree; }
    public void setDuree(String duree) { this.duree = duree; }

    public int getNbStagiaires() { return nbStagiaires; }
    public void setNbStagiaires(int nbStagiaires) { this.nbStagiaires = nbStagiaires; }

    public String getNiveauEtudes() { return niveauEtudes; }
    public void setNiveauEtudes(String niveauEtudes) { this.niveauEtudes = niveauEtudes; }

    public String getSpecialite() { return specialite; }
    public void setSpecialite(String specialite) { this.specialite = specialite; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getCompetences() { return competences; }
    public void setCompetences(List<String> competences) { this.competences = competences; }

    public StatutSujet getStatut() { return statut; }
    public void setStatut(StatutSujet statut) { this.statut = statut; }

    public User getCreateur() { return createur; }
    public void setCreateur(User createur) { this.createur = createur; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}