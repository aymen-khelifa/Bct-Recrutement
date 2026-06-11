package com.bct.recrutement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Log de chaque tentative de vérification faciale.
 * Table : face_verification_logs
 */
@Entity
@Table(name = "face_verification_logs")
public class FaceVerificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ID du candidat (User.id avec rôle CANDIDAT)
    @Column(name = "candidate_id", nullable = false)
    private Long candidateId;

    // ID de la candidature concernée (optionnel)
    @Column(name = "candidature_id")
    private Long candidatureId;

    @Column(name = "distance")
    private Double distance;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "success", nullable = false)
    private Boolean success;

    @Column(name = "attempt_number")
    private Integer attemptNumber;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "error_message", length = 255)
    private String errorMessage;

    @Column(name = "verified_at", nullable = false)
    private LocalDateTime verifiedAt;

    @PrePersist
    protected void onCreate() {
        this.verifiedAt = LocalDateTime.now();
    }

    // ── Getters / Setters ──────────────────────────────────────────────────
    public Long          getId()              { return id; }
    public Long          getCandidateId()     { return candidateId; }
    public void          setCandidateId(Long c){ this.candidateId = c; }
    public Long          getCandidatureId()   { return candidatureId; }
    public void          setCandidatureId(Long c){ this.candidatureId = c; }
    public Double        getDistance()        { return distance; }
    public void          setDistance(Double d){ this.distance = d; }
    public Double        getConfidence()      { return confidence; }
    public void          setConfidence(Double c){ this.confidence = c; }
    public Boolean       getSuccess()         { return success; }
    public void          setSuccess(Boolean s){ this.success = s; }
    public Integer       getAttemptNumber()   { return attemptNumber; }
    public void          setAttemptNumber(Integer a){ this.attemptNumber = a; }
    public String        getIpAddress()       { return ipAddress; }
    public void          setIpAddress(String ip){ this.ipAddress = ip; }
    public String        getErrorMessage()    { return errorMessage; }
    public void          setErrorMessage(String e){ this.errorMessage = e; }
    public LocalDateTime getVerifiedAt()      { return verifiedAt; }
}