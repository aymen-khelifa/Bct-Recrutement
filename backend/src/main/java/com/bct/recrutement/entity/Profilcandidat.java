package com.bct.recrutement.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "profil_candidats")
public class Profilcandidat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    private String specialite;
    private String cv;

    // ── NOUVEAU : Public ID Cloudinary pour le CV (Signed URLs) ───────────
    @Column(name = "cv_public_id", length = 255)
    private String cvPublicId;

    private String nationalite;
    private String cursusActuel;
    private String niveauInstructionActuel;
    private Float  moyDerAnnee;
    private Float  moyAvantDerAnnee;
    private LocalDate dateSoumission;

    @Enumerated(EnumType.STRING)
    private TypeDocumentIdentite typeDocumentIdentite;

    private String numeroDocument;
    private String universite;

    public enum TypeDocumentIdentite { CIN, PASSEPORT }

    public Profilcandidat() {}

    private Profilcandidat(Builder builder) {
        this.id                      = builder.id;
        this.user                    = builder.user;
        this.specialite              = builder.specialite;
        this.cv                      = builder.cv;
        this.cvPublicId              = builder.cvPublicId;
        this.nationalite             = builder.nationalite;
        this.cursusActuel            = builder.cursusActuel;
        this.niveauInstructionActuel = builder.niveauInstructionActuel;
        this.moyDerAnnee             = builder.moyDerAnnee;
        this.moyAvantDerAnnee        = builder.moyAvantDerAnnee;
        this.dateSoumission          = builder.dateSoumission;
        this.typeDocumentIdentite    = builder.typeDocumentIdentite;
        this.numeroDocument          = builder.numeroDocument;
        this.universite              = builder.universite;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private User user;
        private String specialite;
        private String cv;
        private String cvPublicId;
        private String nationalite;
        private String cursusActuel;
        private String niveauInstructionActuel;
        private Float  moyDerAnnee;
        private Float  moyAvantDerAnnee;
        private LocalDate dateSoumission;
        private TypeDocumentIdentite typeDocumentIdentite;
        private String numeroDocument;
        private String universite;

        public Builder id(Long id)                                  { this.id = id; return this; }
        public Builder user(User user)                              { this.user = user; return this; }
        public Builder specialite(String s)                         { this.specialite = s; return this; }
        public Builder cv(String cv)                                { this.cv = cv; return this; }
        public Builder cvPublicId(String v)                         { this.cvPublicId = v; return this; }
        public Builder nationalite(String n)                        { this.nationalite = n; return this; }
        public Builder cursusActuel(String c)                       { this.cursusActuel = c; return this; }
        public Builder niveauInstructionActuel(String n)            { this.niveauInstructionActuel = n; return this; }
        public Builder moyDerAnnee(Float m)                         { this.moyDerAnnee = m; return this; }
        public Builder moyAvantDerAnnee(Float m)                    { this.moyAvantDerAnnee = m; return this; }
        public Builder dateSoumission(LocalDate d)                  { this.dateSoumission = d; return this; }
        public Builder typeDocumentIdentite(TypeDocumentIdentite t) { this.typeDocumentIdentite = t; return this; }
        public Builder numeroDocument(String n)                     { this.numeroDocument = n; return this; }
        public Builder universite(String n)                         { this.universite = n; return this; }
        public Profilcandidat build()                               { return new Profilcandidat(this); }
    }

    public Long getId()                                         { return id; }
    public void setId(Long id)                                  { this.id = id; }
    public User getUser()                                       { return user; }
    public void setUser(User user)                              { this.user = user; }
    public String getSpecialite()                               { return specialite; }
    public void setSpecialite(String s)                         { this.specialite = s; }
    public String getCv()                                       { return cv; }
    public void setCv(String cv)                                { this.cv = cv; }
    public String getCvPublicId()                               { return cvPublicId; }
    public void setCvPublicId(String cvPublicId)                { this.cvPublicId = cvPublicId; }
    public String getNationalite()                              { return nationalite; }
    public void setNationalite(String n)                        { this.nationalite = n; }
    public String getCursusActuel()                             { return cursusActuel; }
    public void setCursusActuel(String c)                       { this.cursusActuel = c; }
    public String getNiveauInstructionActuel()                  { return niveauInstructionActuel; }
    public void setNiveauInstructionActuel(String n)            { this.niveauInstructionActuel = n; }
    public Float getMoyDerAnnee()                               { return moyDerAnnee; }
    public void setMoyDerAnnee(Float m)                         { this.moyDerAnnee = m; }
    public Float getMoyAvantDerAnnee()                          { return moyAvantDerAnnee; }
    public void setMoyAvantDerAnnee(Float m)                    { this.moyAvantDerAnnee = m; }
    public LocalDate getDateSoumission()                        { return dateSoumission; }
    public void setDateSoumission(LocalDate d)                  { this.dateSoumission = d; }
    public TypeDocumentIdentite getTypeDocumentIdentite()       { return typeDocumentIdentite; }
    public void setTypeDocumentIdentite(TypeDocumentIdentite t) { this.typeDocumentIdentite = t; }
    public String getNumeroDocument()                           { return numeroDocument; }
    public void setNumeroDocument(String n)                     { this.numeroDocument = n; }
    public String getUniversite()                               { return universite; }
    public void setUniversite(String u)                         { this.universite = u; }
}