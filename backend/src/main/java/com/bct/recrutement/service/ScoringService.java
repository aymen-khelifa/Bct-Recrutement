package com.bct.recrutement.service;

import com.bct.recrutement.entity.*;
import com.bct.recrutement.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

/**
 * ScoringService — CV scoring avec cache MD5
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Logique de cache :
 *
 *   cacheKey = MD5(pdf_bytes) + "|" + sujetId
 *
 *   ┌─ postuler() → scorerCandidature(id) ──── @Async ──────────────────┐
 *   │                                                                     │
 *   │  1. Lire le PDF du profil candidat                                  │
 *   │  2. Calculer MD5 du PDF                                             │
 *   │  3. Chercher cacheKey dans cv_score_cache                           │
 *   │     ├── TROUVÉ → copier le résultat en cache → sauvegarder         │
 *   │     │   (0 appel Python — résultat instantané)                      │
 *   │     └── PAS TROUVÉ → appeler Python ML → sauvegarder en cache      │
 *   │         (appel Python normal + mise en cache pour la prochaine fois) │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * Exemples :
 *   Candidat A postule sujet 1 → Python appelé → cache créé (key: "abc|1")
 *   Candidat A repostule sujet 1 → CACHE HIT → Python NON appelé ✅
 *   Candidat A postule sujet 2 → Python appelé (autre sujet) → cache créé (key: "abc|2")
 *   Candidat B (même CV que A) postule sujet 1 → CACHE HIT ✅
 */
@Service
public class ScoringService {

    private static final Logger log = LoggerFactory.getLogger(ScoringService.class);

    @Value("${bct.ml.service.url:https://recrutement-ml-bbgrckete3cbg0an.francecentral-01.azurewebsites.net}")
    private String scorerUrl;

    @PostConstruct
    private void validateScorerUrl() {
        if (scorerUrl == null || scorerUrl.isBlank()) {
            throw new IllegalStateException(
                "[ScoringService] BCT_ML_SERVICE_URL est absent ou vide.");
        }
        // Auto-corriger si le schéma https:// est absent (variable Azure mal configurée)
        if (!scorerUrl.startsWith("http://") && !scorerUrl.startsWith("https://")) {
            scorerUrl = "https://" + scorerUrl;
            log.warn("[ScoringService] Schéma manquant — URL corrigée en : {}", scorerUrl);
        }
        log.info("[ScoringService] ML URL configurée : {}", scorerUrl);
    }

    @Autowired private CandidatureRepository    candidatureRepository;
    @Autowired private Profilcandidatrepository profilCandidatRepository;
    @Autowired private CvScoreCacheRepository   cacheRepository;     // ← cache
    @Autowired private RestTemplate             restTemplate;
    @Autowired private ObjectMapper             objectMapper;
    @Autowired private CloudinaryService        cloudinaryService;

    // ─────────────────────────────────────────────────────────────────────────
    //  POINT D'ENTRÉE — @Async depuis postuler()
    // ─────────────────────────────────────────────────────────────────────────
    @Async("scoringExecutor")
    @Transactional
    public void scorerCandidature(Long candidatureId) {
        log.info("[Scoring] ── Candidature #{}", candidatureId);

        try {
            Candidature    candidature = candidatureRepository.findById(candidatureId)
                    .orElseThrow(() -> new RuntimeException("Candidature introuvable"));
            SujetStage     sujet  = candidature.getSujet();
            Profilcandidat profil = profilCandidatRepository
                    .findByUser(candidature.getCandidat()).orElse(null);

            // 1. Lire le PDF
            byte[] cvBytes = recupererCvPdf(profil);
            if (cvBytes == null || cvBytes.length == 0) {
                log.warn("[Scoring] Aucun CV PDF — scoring ignoré #{}", candidatureId);
                return;
            }

            // 2. Calculer le MD5 du PDF
            String cvHash    = md5(cvBytes);
            String cacheKey  = cvHash + "|" + sujet.getId();

            log.info("[Scoring] CV hash={} sujet={}", cvHash.substring(0, 8) + "...", sujet.getId());

            // 3. Chercher en cache
            Optional<CvScoreCache> cached = cacheRepository.findByCacheKey(cacheKey);

            Map<String, Object> scoreData;
            boolean cacheHit = false;

            if (cached.isPresent()) {
                // ══ CACHE HIT ══ Même CV + même sujet déjà scoré
                CvScoreCache entry = cached.get();
                entry.incrementHits();
                cacheRepository.save(entry);

                scoreData = cacheToMap(entry);
                cacheHit  = true;

                log.info("[Scoring] ✅ CACHE HIT #{} → score={}/100 (hits={})",
                        candidatureId, entry.getScoreAi(), entry.getHits());

            } else {
                // ══ CACHE MISS ══ Appeler Python ML
                log.info("[Scoring] Cache miss → appel Python ML...");

                String lettre = candidature.getLettreMotivation() != null
                        ? candidature.getLettreMotivation() : "";

                List<String> competences = sujet.getCompetences() != null
                        ? sujet.getCompetences() : List.of();

                scoreData = appelerPythonScorer(
                        cvBytes,
                        sujet.getTitre(),
                        orEmpty(sujet.getDescription()),
                        orEmpty(sujet.getNiveauEtudes()),
                        orEmpty(sujet.getSpecialite()),
                        competences,
                        lettre
                );

                if (scoreData == null) {
                    log.error("[Scoring] Réponse null Python — candidature #{}", candidatureId);
                    return;
                }

                // Mettre en cache pour les prochaines fois
                mettreEnCache(cacheKey, cvHash, sujet.getId(), scoreData);
                log.info("[Scoring] Cache créé : key={}", cacheKey);
            }

            // 4. Sauvegarder dans la Candidature
            sauvegarderScore(candidature, scoreData, cvHash, cacheHit);

            log.info("[Scoring] ✅ #{} scorée : {}/100 ({}) [{}]",
                    candidatureId,
                    scoreData.get("scoreTotal"),
                    scoreData.get("compatibilite"),
                    cacheHit ? "CACHE" : "ML");

        } catch (Exception e) {
            log.error("[Scoring] ❌ #{} : {}", candidatureId, e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  MD5 du contenu PDF
    // ─────────────────────────────────────────────────────────────────────────
    private String md5(byte[] data) {
        try {
            MessageDigest md  = MessageDigest.getInstance("MD5");
            byte[]        hash = md.digest(data);
            StringBuilder sb  = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();  // 32 chars hex
        } catch (Exception e) {
            // Fallback : hash simple basé sur la taille + quelques bytes
            return "fallback_" + data.length + "_" + Arrays.hashCode(
                    Arrays.copyOf(data, Math.min(data.length, 64))
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Lire le CV PDF depuis le profil candidat
    // ─────────────────────────────────────────────────────────────────────────
    // ── Remplacer recupererCvPdf() dans ScoringService.java ──────────────────────


    private byte[] recupererCvPdf(Profilcandidat profil) {
        if (profil == null) return null;

        String cvPublicId = profil.getCvPublicId();
        String cvUrl      = profil.getCv();

        if (cvUrl == null || cvUrl.isBlank()) {
            log.warn("[Scoring] Pas d'URL CV dans le profil");
            return null;
        }

        String urlToFetch;

        if (cvPublicId != null && !cvPublicId.isBlank()) {
            // ✅ Nouveau CV — type=authenticated → signed URL CDN
            urlToFetch = cloudinaryService.signedCvUrl(cvPublicId);
            if (urlToFetch == null) {
                log.error("[Scoring] Signed URL échouée — publicId={}", cvPublicId);
                return null;
            }
            log.info("[Scoring] CV via signed URL CDN — publicId={}", cvPublicId);
        } else {
            // Fallback anciens CVs type=upload (publics)
            urlToFetch = cvUrl.replaceAll("/s--[^/]+--", "");
            log.warn("[Scoring] CV fallback URL publique — {}", urlToFetch);
        }

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    urlToFetch, HttpMethod.GET,
                    new HttpEntity<>(new HttpHeaders()), byte[].class
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("[Scoring] CV téléchargé : {} bytes", response.getBody().length);
                return response.getBody();
            }
            log.warn("[Scoring] Téléchargement échoué : {}", response.getStatusCode());
            return null;
        } catch (Exception e) {
            log.error("[Scoring] Erreur téléchargement CV : {}", e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> appelerPythonScorer(
            byte[]       cvBytes,
            String       titreSujet,
            String       description,
            String       niveauRequis,
            String       specialite,
            List<String> competences,
            String       lettre) throws Exception {

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        ByteArrayResource cv = new ByteArrayResource(cvBytes) {
            @Override public String getFilename() { return "cv.pdf"; }
        };

        body.add("cv_file",      cv);
        body.add("titre_sujet",  titreSujet);
        body.add("description",  description);
        body.add("competences",  objectMapper.writeValueAsString(competences));
        body.add("niveau_requis",niveauRequis);
        body.add("specialite",   specialite);
        body.add("lettre",       lettre);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        log.info("[Scoring] POST {} /score | CV={}b | Poste={}",
                scorerUrl, cvBytes.length, titreSujet);

        ResponseEntity<Map> response = restTemplate.exchange(
                scorerUrl + "/score",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        return response.getBody();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Sauvegarder le résultat en cache
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private void mettreEnCache(String cacheKey, String cvHash,
                               Long sujetId, Map<String, Object> data) {
        try {
            // Détail scores normalisé
            Map<String, Object> detailRaw =
                    (Map<String, Object>) data.getOrDefault("detail", Map.of());
            Map<String, Object> detail = normaliserDetail(detailRaw, data);
            String detailJson = objectMapper.writeValueAsString(detail);

            // Rapport
            String rapport = construireRapport(data);

            // Statut ML
            String statutMl   = orEmpty((String) data.get("statut_ml"));
            double confianceMl = toDouble(data.get("confiance_ml"));

            CvScoreCache entry = new CvScoreCache();
            entry.setCacheKey(cacheKey);
            entry.setCvHash(cvHash);
            entry.setSujetId(sujetId);
            entry.setScoreAi(toInt(data.get("scoreTotal")));
            entry.setCompatibilite(orEmpty((String) data.get("compatibilite")));
            entry.setDetailScores(detailJson);
            entry.setRapport(rapport);
            entry.setStatutMl(statutMl.isBlank() ? null : statutMl);
            entry.setConfianceMl(confianceMl > 0 ? confianceMl : null);
            entry.setScoreLettreMotivation(toInt(data.get("scoreLettreMotivation")));

            cacheRepository.save(entry);

        } catch (Exception e) {
            log.warn("[Scoring] Erreur mise en cache : {}", e.getMessage());
            // Non bloquant : l'échec du cache ne doit pas bloquer le scoring
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Convertir une entrée cache en Map (même format que la réponse Python)
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private Map<String, Object> cacheToMap(CvScoreCache entry) throws Exception {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("scoreTotal",            entry.getScoreAi());
        m.put("compatibilite",         entry.getCompatibilite());
        m.put("statut_ml",    entry.getStatutMl()    != null ? entry.getStatutMl()    : "");
        m.put("confiance_ml", entry.getConfianceMl() != null ? entry.getConfianceMl() : 0.0);
        m.put("scoreLettreMotivation", entry.getScoreLettreMotivation() != null
                ? entry.getScoreLettreMotivation() : 0);
        m.put("recommandation",        recommandation(entry.getScoreAi()));

        // Reconstruire detailScores depuis le JSON stocké
        if (entry.getDetailScores() != null) {
            Map<String, Object> detail = objectMapper.readValue(
                    entry.getDetailScores(), LinkedHashMap.class);
            m.put("detail", detail);
        }

        // Rapport reconstruit
        Map<String, Object> rapportMap = new LinkedHashMap<>();
        rapportMap.put("resume", entry.getRapport() != null ? entry.getRapport().split("\n")[0] : "");
        m.put("rapport", rapportMap);

        return m;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Sauvegarder dans la Candidature + stocker le hash CV
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private void sauvegarderScore(Candidature candidature, Map<String, Object> data,
                                  String cvHash, boolean fromCache) throws Exception {

        int    score   = toInt(data.get("scoreTotal"));
        String compat  = orEmpty((String) data.get("compatibilite"));

        // Détail scores → format front {competences, academique, experience, motcles}
        Map<String, Object> detailRaw =
                (Map<String, Object>) data.getOrDefault("detail", Map.of());
        Map<String, Object> detail  = normaliserDetail(detailRaw, data);
        String              detailJson = objectMapper.writeValueAsString(detail);

        // Rapport enrichi avec les infos NLP (nom, email, compétences parsées)
        String rapport = construireRapportEnrichi(data);

        int scoreLM = toInt(data.get("scoreLettreMotivation"));

        // ── Mettre à jour la Candidature ──────────────────────────────────────
        candidature.setScoreAi(score);
        candidature.setCompatibilite(compat);
        candidature.setRapport(rapport);
        candidature.setDetailScores(detailJson);
        candidature.setCalculeLe(LocalDateTime.now());

        // Stocker le hash du CV dans la candidature (optionnel, utile pour debug)
        try { candidature.setCvHash(cvHash); }
        catch (Exception ignored) {}  // au cas où le champ n'est pas encore ajouté

        // Score lettre de motivation
        try { if (scoreLM > 0) candidature.setScoreLettreMotivation(scoreLM); }
        catch (Exception ignored) {}

        candidatureRepository.save(candidature);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Normaliser les détails scores → format attendu par le front
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private Map<String, Object> normaliserDetail(
            Map<String, Object> detailRaw,
            Map<String, Object> data) {

        Map<String, Object> d = new LinkedHashMap<>();
        d.put("semantique",  toDouble(detailRaw.get("semantique")));   // /35
        d.put("competences", toDouble(detailRaw.get("competences")));  // /25
        d.put("experience",  toDouble(detailRaw.get("experience")));   // /20
        d.put("formation",   toDouble(detailRaw.get("formation")));    // /10
        d.put("structure",   toDouble(detailRaw.get("structure")));    //  /5
        d.put("lettre",      toDouble(detailRaw.get("lettre")));       //  /5

        // bert_global (v2) ou motcles (v1) → toujours exposé comme "motcles"
        Object bertGlobal = detailRaw.get("bert_global");
        d.put("motcles", bertGlobal != null
                ? (int) Math.round(toDouble(bertGlobal))
                : toInt(detailRaw.get("motcles")));

        return d;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Construire rapport textuel depuis la réponse ML
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private String construireRapport(Map<String, Object> data) {
        StringBuilder sb = new StringBuilder();

        int    score  = toInt(data.get("scoreTotal"));
        String compat = orEmpty((String) data.get("compatibilite"));
        String reco   = orEmpty((String) data.get("recommandation"));

        sb.append("Score : ").append(score).append("/100 (").append(compat).append(")\n");
        sb.append("Recommandation : ").append(reco).append("\n");

        String statutMl = (String) data.get("statut_ml");
        if (statutMl != null && !statutMl.isBlank() && !statutMl.startsWith("N/A")) {
            sb.append("Statut ML : ").append(statutMl)
                    .append(String.format(" (%.1f%%)\n", toDouble(data.get("confiance_ml"))));
        }

        Map<String, Object> bert = (Map<String, Object>) data.get("bert_scores");
        if (bert != null)
            sb.append(String.format("Similarité BERT : %.1f%%\n",
                    toDouble(bert.get("global")) * 100));

        Map<String, Object> rapportMap = (Map<String, Object>) data.get("rapport");
        if (rapportMap != null) {
            List<String> forts   = (List<String>) rapportMap.getOrDefault("pts_forts",  List.of());
            List<String> faibles = (List<String>) rapportMap.getOrDefault("pts_faibles",List.of());
            if (!forts.isEmpty()) {
                sb.append("\nPOINTS FORTS :\n");
                forts.forEach(p -> sb.append("• ").append(p).append("\n"));
            }
            if (!faibles.isEmpty()) {
                sb.append("\nPOINTS FAIBLES :\n");
                faibles.forEach(p -> sb.append("• ").append(p).append("\n"));
            }
        }

        List<Map<String, Object>> shap =
                (List<Map<String, Object>>) data.getOrDefault("explicationShap", List.of());
        if (!shap.isEmpty()) {
            sb.append("\nEXPLICATION SHAP :\n");
            shap.stream().limit(5).forEach(s ->
                    sb.append(String.format("  %-35s : %+.2f\n",
                            s.get("feature"), toDouble(s.get("impact")))));
        }

        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Stats du cache — exposé via CandidatureController si besoin
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> getCacheStats() {
        return Map.of(
                "entrees",    cacheRepository.count(),
                "totalHits",  cacheRepository.totalHits(),
                "description","MD5(PDF) + sujetId → résultat scoring réutilisé"
        );
    }

    /**
     * Invalider le cache pour un sujet donné
     * (utile si les critères du sujet changent)
     */
    public int invaliderCacheSujet(Long sujetId) {
        List<CvScoreCache> entries = cacheRepository.findBySujetId(sujetId);
        cacheRepository.deleteAll(entries);
        log.info("[Cache] {} entrées invalidées pour sujet #{}", entries.size(), sujetId);
        return entries.size();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Rapport enrichi avec informations NLP (nom, email, compétences parsées)
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private String construireRapportEnrichi(Map<String, Object> data) {
        StringBuilder sb = new StringBuilder();

        int    score  = toInt(data.get("scoreTotal"));
        String compat = orEmpty((String) data.get("compatibilite"));
        String reco   = orEmpty((String) data.get("recommandation"));

        sb.append("Score : ").append(score).append("/100 (").append(compat).append(")\n");
        sb.append("Recommandation : ").append(reco).append("\n");

        // Statut ML + confiance
        String statutMl = (String) data.get("statut_ml");
        if (statutMl != null && !statutMl.isBlank() && !statutMl.startsWith("N/A")) {
            sb.append("Statut ML : ").append(statutMl)
                    .append(String.format(" (%.1f%%)\n", toDouble(data.get("confiance_ml"))));
        }

        // BERT similarities
        Map<String, Object> bert = (Map<String, Object>) data.get("bert_scores");
        if (bert != null)
            sb.append(String.format("Similarité BERT : %.1f%%\n",
                    toDouble(bert.get("global")) * 100));

        // Informations parsées par spaCy NER
        Map<String, Object> infos = (Map<String, Object>) data.get("informations");
        if (infos != null) {
            String nom   = orEmpty((String) infos.get("nom"));
            String email = orEmpty((String) infos.get("email"));
            String lang  = orEmpty((String) infos.get("langue"));
            if (!nom.isBlank())   sb.append("Candidat : ").append(nom).append("\n");
            if (!email.isBlank()) sb.append("Email : ").append(email).append("\n");
            if (!lang.isBlank())  sb.append("Langue CV : ").append(lang).append("\n");

            // Compétences présentes/manquantes
            List<String> presentes  = (List<String>) infos.getOrDefault("competencesPresentes",  List.of());
            List<String> manquantes = (List<String>) infos.getOrDefault("competencesManquantes", List.of());
            List<String> univ       = (List<String>) infos.getOrDefault("universites",           List.of());
            List<String> certifs    = (List<String>) infos.getOrDefault("certifications",        List.of());

            if (!presentes.isEmpty())
                sb.append("Compétences présentes : ").append(String.join(", ", presentes)).append("\n");
            if (!manquantes.isEmpty())
                sb.append("Compétences manquantes : ").append(String.join(", ", manquantes)).append("\n");
            if (!univ.isEmpty())
                sb.append("Universités (NER) : ").append(String.join(", ", univ)).append("\n");
            if (!certifs.isEmpty())
                sb.append("Certifications : ").append(String.join(", ", certifs)).append("\n");
        }

        // Points forts / faibles
        Map<String, Object> rapportMap = (Map<String, Object>) data.get("rapport");
        if (rapportMap != null) {
            List<String> forts   = (List<String>) rapportMap.getOrDefault("pts_forts",  List.of());
            List<String> faibles = (List<String>) rapportMap.getOrDefault("pts_faibles",List.of());
            if (!forts.isEmpty()) {
                sb.append("\nPOINTS FORTS :\n");
                forts.forEach(p -> sb.append("• ").append(p).append("\n"));
            }
            if (!faibles.isEmpty()) {
                sb.append("\nPOINTS FAIBLES :\n");
                faibles.forEach(p -> sb.append("• ").append(p).append("\n"));
            }
        }

        // Formule de calcul NLP (traçabilité)
        Map<String, Object> formule = (Map<String, Object>) data.get("formule");
        if (formule != null) {
            sb.append("\nFORMULE NLP+BERT :\n");
            sb.append("  ").append(formule.getOrDefault("calcul", "")).append("\n");
            sb.append("  Modèle : ").append(formule.getOrDefault("modele", "bert")).append("\n");
            // Détail BERT
            Map<String, Object> bertSc = (Map<String, Object>) data.get("bert_scores");
            if (bertSc != null) {
                sb.append(String.format("  BERT : titre=%.3f desc=%.3f comp=%.3f global=%.3f\n",
                        toDouble(bertSc.get("titre")), toDouble(bertSc.get("description")),
                        toDouble(bertSc.get("competences")), toDouble(bertSc.get("global"))));
            }
        }
        // Questions d'entretien si présentes
        Map<String, Object> rapportMap2 = (Map<String, Object>) data.get("rapport");
        if (rapportMap2 != null) {
            List<String> questions = (List<String>) rapportMap2.getOrDefault("questions_entretien", List.of());
            if (!questions.isEmpty()) {
                sb.append("\nQUESTIONS ENTRETIEN :\n");
                questions.stream().limit(3)
                        .forEach(q -> sb.append("  → ").append(q).append("\n"));
            }
        }

        return sb.toString();
    }

    // ── Health check ──────────────────────────────────────────────────────────
    public boolean isAvailable() {
        try {
            ResponseEntity<Map> r = restTemplate.getForEntity(scorerUrl + "/health", Map.class);
            return r.getStatusCode().is2xxSuccessful()
                    && "ok".equals(r.getBody() != null ? r.getBody().get("status") : "");
        } catch (Exception e) { return false; }
    }

    public Map<String, Object> getHealthInfo() {
        try {
            ResponseEntity<Map> r = restTemplate.getForEntity(scorerUrl + "/health", Map.class);
            if (r.getStatusCode().is2xxSuccessful() && r.getBody() != null) {
                // Ajouter les stats cache à la réponse health
                Map<String, Object> result = new LinkedHashMap<>(r.getBody());
                result.put("cache", getCacheStats());
                return result;
            }
        } catch (Exception ignored) {}
        return Map.of("status", "unavailable", "modeles_ml", false,
                "cache", Map.of("entrees", 0));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String orEmpty(String s) { return s != null ? s : ""; }

    private int toInt(Object v) {
        if (v == null) return 0;
        try { return ((Number) v).intValue(); }
        catch (Exception e) {
            try { return (int) Math.round(Double.parseDouble(v.toString())); }
            catch (Exception ex) { return 0; }
        }
    }

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        try { return ((Number) v).doubleValue(); }
        catch (Exception e) {
            try { return Double.parseDouble(v.toString()); }
            catch (Exception ex) { return 0.0; }
        }
    }

    private String recommandation(int score) {
        if (score >= 80) return "Candidat hautement recommandé — convoquer en priorité";
        if (score >= 65) return "Bon profil — présélection recommandée";
        if (score >= 50) return "Profil intéressant — à examiner";
        if (score >= 35) return "Profil partiellement adapté";
        return "Profil insuffisamment adapté";
    }
}