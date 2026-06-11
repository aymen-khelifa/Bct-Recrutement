package com.bct.recrutement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * CvScoreCache
 * ══════════════════════════════════════════════════════════════════
 * Stocke le résultat du scoring ML pour un couple (CV, sujet)
 * identifié par un hash MD5.
 *
 * Clé de cache = MD5(contenu PDF) + "|" + sujetId
 * → Même PDF pour un autre sujet = score différent → pas de collision
 *
 * Table : cv_score_cache
 *
 *  cv_hash      | sujet_id | score_ai | compatibilite | detail_scores | rapport | calcule_le
 *  abc123def456 |    12    |    78    |    Élevée     |  {...}        |  ...    | 2025-05-07
 */
@Entity
@Table(
        name = "cv_score_cache",
        indexes = {
                // Index sur la clé de cache pour lookup O(1)
                @Index(name = "idx_cache_key", columnList = "cache_key", unique = true)
        }
)
public class CvScoreCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Clé unique = MD5(pdf_bytes) + "|" + sujetId
     * Exemple : "a3f8c2d1e9b4...7f|42"
     */
    @Column(name = "cache_key", nullable = false, unique = true, length = 100)
    private String cacheKey;

    /** MD5 du contenu du PDF (32 chars hex) */
    @Column(name = "cv_hash", nullable = false, length = 32)
    private String cvHash;

    /** ID du sujet concerné */
    @Column(name = "sujet_id", nullable = false)
    private Long sujetId;

    /** Score /100 prédit par XGBoost */
    @Column(name = "score_ai")
    private Integer scoreAi;

    /** "Élevée" / "Moyenne" / "Faible" */
    @Column(name = "compatibilite", length = 20)
    private String compatibilite;

    /** JSON : {"competences":28,"academique":22,"experience":15,"motcles":8} */
    @Column(name = "detail_scores", columnDefinition = "TEXT")
    private String detailScores;

    /** Rapport textuel complet (points forts, faibles, SHAP) */
    @Column(name = "rapport", columnDefinition = "TEXT")
    private String rapport;

    /** Statut prédit par LightGBM */
    @Column(name = "statut_ml", length = 20)
    private String statutMl;

    /** Confiance LightGBM en % */
    @Column(name = "confiance_ml")
    private Double confianceMl;

    /** Score lettre de motivation /100 */
    @Column(name = "score_lettre_motivation")
    private Integer scoreLettreMotivation;

    /** Date du scoring initial */
    @Column(name = "calcule_le", nullable = false)
    private LocalDateTime calculeLe;

    /** Nombre de fois que ce cache a été réutilisé */
    @Column(name = "hits", nullable = false)
    private int hits = 0;

    /** Dernière fois que ce cache a été utilisé */
    @Column(name = "last_used")
    private LocalDateTime lastUsed;

    @PrePersist
    protected void onCreate() {
        this.calculeLe = LocalDateTime.now();
        this.lastUsed  = LocalDateTime.now();
    }

    // ── Getters / Setters ─────────────────────────────────────────────────────
    public Long          getId()                    { return id; }
    public String        getCacheKey()              { return cacheKey; }
    public void          setCacheKey(String k)      { this.cacheKey = k; }
    public String        getCvHash()                { return cvHash; }
    public void          setCvHash(String h)        { this.cvHash = h; }
    public Long          getSujetId()               { return sujetId; }
    public void          setSujetId(Long sid)       { this.sujetId = sid; }
    public Integer       getScoreAi()               { return scoreAi; }
    public void          setScoreAi(Integer s)      { this.scoreAi = s; }
    public String        getCompatibilite()         { return compatibilite; }
    public void          setCompatibilite(String c) { this.compatibilite = c; }
    public String        getDetailScores()          { return detailScores; }
    public void          setDetailScores(String d)  { this.detailScores = d; }
    public String        getRapport()               { return rapport; }
    public void          setRapport(String r)       { this.rapport = r; }
    public String        getStatutMl()              { return statutMl; }
    public void          setStatutMl(String s)      { this.statutMl = s; }
    public Double        getConfianceMl()           { return confianceMl; }
    public void          setConfianceMl(Double c)   { this.confianceMl = c; }
    public Integer       getScoreLettreMotivation() { return scoreLettreMotivation; }
    public void          setScoreLettreMotivation(Integer s) { this.scoreLettreMotivation = s; }
    public LocalDateTime getCalculeLe()             { return calculeLe; }
    public int           getHits()                  { return hits; }
    public void          incrementHits()            { this.hits++; this.lastUsed = LocalDateTime.now(); }
    public LocalDateTime getLastUsed()              { return lastUsed; }
}