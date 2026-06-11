package com.bct.recrutement.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "candidatures")
public class Candidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidat_id", nullable = false)
    private User candidat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sujet_id", nullable = false)
    private SujetStage sujet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutCandidature statut;

    @Column(name = "date_depot")
    private LocalDate dateDepot;

    // ── Lettre de motivation ───────────────────────────────────────────────
    @Column(nullable = false, columnDefinition = "TEXT", name = "lettre_motivation")
    private String lettreMotivation;

    // ── Attributs ScoreAi intégrés directement ─────────────────────────────
    // Note globale /100
    @Column(name = "score_ai")
    private Integer scoreAi;

    // "Élevée" / "Moyenne" / "Faible"
    @Column(name = "compatibilite")
    private String compatibilite;

    // Rapport textuel de Claude (points forts, lacunes, recommandation)
    @Column(name = "rapport", columnDefinition = "TEXT")
    private String rapport;

    // Date/heure du calcul
    @Column(name = "calcule_le")
    private LocalDateTime calculeLe;

    // Détail pondéré en JSON
    // Ex : {"competences":32,"academique":26,"experience":14,"motcles":6}
    @Column(name = "detail_scores", columnDefinition = "TEXT")
    private String detailScores;
    @Column(name = "cv_hash", length = 32)
    private String cvHash;
    // ── Score de la lettre de motivation (utilisé en cas d'égalité) ────────
    @Column(name = "score_lettre_motivation")
    private Integer scoreLettreMotivation;
    @Column(name = "score_quiz")
    private Integer scoreQuiz;

    // Mention du quiz (Excellent, Très bien, Bien, Passable, Insuffisant)
    @Column(name = "mention_quiz", length = 50)
    private String mentionQuiz;

    // Date du quiz
    @Column(name = "quiz_passe_le")
    private LocalDateTime quizPasseLe;
    @Column(nullable = false,name = "email_cv_envoye")
    private Boolean emailCvEnvoye = false;

    @Column(nullable = false,name = "email_quiz_envoye")
    private Boolean emailQuizEnvoye = false;

    @Column(nullable = false,name = "email_final_envoye")
    private Boolean emailFinalEnvoye = false;
    @Column(name = "recording_url", columnDefinition = "TEXT")
    private String recordingUrl;

    // ── NOUVEAU : Public ID Cloudinary (pour suppression future si nécessaire)
    @Column(name = "recording_public_id", length = 255)
    private String recordingPublicId;

    // ── NOUVEAU : Durée de la vidéo en secondes
    @Column(name = "recording_duration_sec")
    private Long recordingDurationSec;

    // ── NOUVEAU : Date/heure upload de la vidéo
    @Column(name = "recording_uploaded_at")
    private LocalDateTime recordingUploadedAt;
    public enum StatutCandidature {
        // Statuts initiaux
        EN_COURS_EXAMEN,           // Candidature déposée, en attente de scoring

        // Statuts après filtrage CV (Étape 1)
        PRESELECTIONNE_CV,         // Passé le premier filtre (top K1)
        ELIMINE_CV,                // Éliminé au premier filtre

        // Statuts après filtrage lettre (Étape 2 - si égalité de scores)


        // Statuts RH manuels
        ENTRETIEN_PLANIFIE,        // RH a planifié un entretien
        ACCEPTE_QUIZ,ELIMINE_QUIZ ,             // Accepté pour la phase quiz
        ACCEPTE,                   // Accepté définitivement
        REFUSE                     // Refusé par RH
    }

    // ── Constructeurs ──────────────────────────────────────────────────────
    public Candidature() {}

    private Candidature(Builder builder) {
        this.id                      = builder.id;
        this.candidat                = builder.candidat;
        this.sujet                   = builder.sujet;
        this.statut                  = builder.statut;
        this.dateDepot               = builder.dateDepot;
        this.lettreMotivation        = builder.lettreMotivation;
        this.scoreAi                 = builder.scoreAi;
        this.compatibilite           = builder.compatibilite;
        this.rapport                 = builder.rapport;
        this.calculeLe               = builder.calculeLe;
        this.detailScores            = builder.detailScores;
        this.emailCvEnvoye   = builder.emailCvEnvoye;
        this.emailQuizEnvoye   = builder.emailQuizEnvoye;
        this.emailFinalEnvoye   = builder.emailFinalEnvoye;
        this.scoreLettreMotivation   = builder.scoreLettreMotivation;
        this.mentionQuiz   = builder.mentionQuiz;
        this.scoreQuiz   = builder.scoreQuiz;
        this.quizPasseLe   = builder.quizPasseLe;
        this.cvHash   = builder.cvHash;
        this.recordingUrl            = builder.recordingUrl;
        this.recordingPublicId       = builder.recordingPublicId;
        this.recordingDurationSec    = builder.recordingDurationSec;
        this.recordingUploadedAt     = builder.recordingUploadedAt;

    }

    // ── Builder ────────────────────────────────────────────────────────────
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private User candidat;
        private SujetStage sujet;
        private StatutCandidature statut;
        private LocalDate dateDepot;
        private String lettreMotivation;
        private Integer scoreAi;
        private String compatibilite;
        private String rapport;
        private LocalDateTime calculeLe;
        private String detailScores;
        private Integer scoreLettreMotivation;
        private Boolean emailCvEnvoye;
        private Boolean emailQuizEnvoye;
        private Boolean emailFinalEnvoye;
        private String mentionQuiz;
        private Integer scoreQuiz;
        private LocalDateTime quizPasseLe;
        private String cvHash;
        private String recordingUrl;
        private String recordingPublicId;
        private Long   recordingDurationSec;
        private LocalDateTime recordingUploadedAt;
        public Builder id(Long id)                                  { this.id = id; return this; }
        public Builder candidat(User candidat)                      { this.candidat = candidat; return this; }
        public Builder sujet(SujetStage sujet)                      { this.sujet = sujet; return this; }
        public Builder statut(StatutCandidature statut)             { this.statut = statut; return this; }
        public Builder dateDepot(LocalDate dateDepot)               { this.dateDepot = dateDepot; return this; }
        public Builder lettreMotivation(String l)                   { this.lettreMotivation = l; return this; }
        public Builder scoreAi(Integer scoreAi)                     { this.scoreAi = scoreAi; return this; }
        public Builder compatibilite(String compatibilite)          { this.compatibilite = compatibilite; return this; }
        public Builder rapport(String rapport)                      { this.rapport = rapport; return this; }
        public Builder calculeLe(LocalDateTime calculeLe)           { this.calculeLe = calculeLe; return this; }
        public Builder detailScores(String detailScores)            { this.detailScores = detailScores; return this; }
        public Builder emailCvEnvoye(Boolean emailCvEnvoye)         { this.emailCvEnvoye = emailCvEnvoye; return this; }
        public Builder emailQuizEnvoye(Boolean emailQuizEnvoye)         { this.emailQuizEnvoye = emailQuizEnvoye; return this; }
        public Builder emailFinalEnvoye(Boolean emailFinalEnvoye)         { this.emailFinalEnvoye = emailFinalEnvoye; return this; }
        public Builder scoreLettreMotivation(Integer score)         { this.scoreLettreMotivation = score; return this; }
        public Builder mentionQuiz(String mentionQuiz)         { this.mentionQuiz = mentionQuiz; return this; }
        public Builder cvHash(String cvHash)         { this.cvHash = cvHash; return this; }
        public Builder scoreQuiz(Integer scoreQuiz)         { this.scoreQuiz = scoreQuiz; return this; }
        public Builder quizPasseLe(LocalDateTime quizPasseLe)         { this.quizPasseLe = quizPasseLe; return this; }

        public Builder recordingUrl(String recordingUrl)          { this.recordingUrl = recordingUrl; return this; }
        public Builder recordingPublicId(String v)                { this.recordingPublicId = v; return this; }
        public Builder recordingDurationSec(Long v)               { this.recordingDurationSec = v; return this; }
        public Builder recordingUploadedAt(LocalDateTime v)       { this.recordingUploadedAt = v; return this; }
        public Candidature build()                                { return new Candidature(this); }

    }

    // ── Getters & Setters ──────────────────────────────────────────────────
    public Long getId()                                     { return id; }
    public void setId(Long id)                              { this.id = id; }
    public String  getCvHash()                    { return cvHash; }
    public void    setCvHash(String h)            { this.cvHash = h; }
    public User getCandidat()                               { return candidat; }
    public void setCandidat(User candidat)                  { this.candidat = candidat; }

    public SujetStage getSujet()                            { return sujet; }
    public void setSujet(SujetStage sujet)                  { this.sujet = sujet; }

    public StatutCandidature getStatut()                    { return statut; }
    public void setStatut(StatutCandidature statut)         { this.statut = statut; }

    public LocalDate getDateDepot()                         { return dateDepot; }
    public void setDateDepot(LocalDate dateDepot)           { this.dateDepot = dateDepot; }

    public String getLettreMotivation()                     { return lettreMotivation; }
    public void setLettreMotivation(String l)               { this.lettreMotivation = l; }

    public Integer getScoreAi()                             { return scoreAi; }
    public void setScoreAi(Integer scoreAi)                 { this.scoreAi = scoreAi; }

    public String getCompatibilite()                        { return compatibilite; }
    public void setCompatibilite(String compatibilite)      { this.compatibilite = compatibilite; }

    public String getRapport()                              { return rapport; }
    public void setRapport(String rapport)                  { this.rapport = rapport; }

    public LocalDateTime getCalculeLe()                     { return calculeLe; }
    public void setCalculeLe(LocalDateTime calculeLe)       { this.calculeLe = calculeLe; }

    public String getDetailScores()                         { return detailScores; }
    public void setDetailScores(String detailScores)        { this.detailScores = detailScores; }

    public Integer getScoreLettreMotivation()               { return scoreLettreMotivation; }
    public void setScoreLettreMotivation(Integer score)     { this.scoreLettreMotivation = score; }
    public Boolean getEmailCvEnvoye() { return emailCvEnvoye; }
    public void setEmailCvEnvoye(Boolean emailCvEnvoye) { this.emailCvEnvoye = emailCvEnvoye; }

    public Boolean getEmailQuizEnvoye() { return emailQuizEnvoye; }
    public void setEmailQuizEnvoye(Boolean emailQuizEnvoye) { this.emailQuizEnvoye = emailQuizEnvoye; }

    public Boolean getEmailFinalEnvoye() { return emailFinalEnvoye; }
    public void setEmailFinalEnvoye(Boolean emailFinalEnvoye) { this.emailFinalEnvoye = emailFinalEnvoye; }
    public Integer getScoreQuiz()              { return scoreQuiz; }
    public void    setScoreQuiz(Integer v)     { this.scoreQuiz = v; }

    public String  getMentionQuiz()            { return mentionQuiz; }
    public void    setMentionQuiz(String v)    { this.mentionQuiz = v; }

    public LocalDateTime getQuizPasseLe()      { return quizPasseLe; }
    public void setQuizPasseLe(LocalDateTime v){ this.quizPasseLe = v; }
    public String getRecordingUrl()                         { return recordingUrl; }
    public void setRecordingUrl(String recordingUrl)        { this.recordingUrl = recordingUrl; }
    public String getRecordingPublicId()                    { return recordingPublicId; }
    public void setRecordingPublicId(String v)              { this.recordingPublicId = v; }
    public Long getRecordingDurationSec()                   { return recordingDurationSec; }
    public void setRecordingDurationSec(Long v)             { this.recordingDurationSec = v; }
    public LocalDateTime getRecordingUploadedAt()           { return recordingUploadedAt; }
    public void setRecordingUploadedAt(LocalDateTime v)     { this.recordingUploadedAt = v; }
}
