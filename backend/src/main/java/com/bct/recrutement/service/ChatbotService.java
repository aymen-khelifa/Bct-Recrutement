package com.bct.recrutement.service;

import com.bct.recrutement.entity.Candidature;
import com.bct.recrutement.entity.Candidature.StatutCandidature;
import com.bct.recrutement.entity.Entretien;
import com.bct.recrutement.entity.Role;
import com.bct.recrutement.entity.SujetStage;
import com.bct.recrutement.repository.CandidatureRepository;
import com.bct.recrutement.repository.EntretienRepository;
import com.bct.recrutement.repository.SujetStageRepository;
import com.bct.recrutement.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatbotService {

    private static final Logger log = LoggerFactory.getLogger(ChatbotService.class);

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Autowired private CandidatureRepository candidatureRepository;
    @Autowired private SujetStageRepository  sujetStageRepository;
    @Autowired private EntretienRepository   entretienRepository;
    @Autowired private UserRepository        userRepository;
    @Autowired private RestTemplate          restTemplate;
    @Autowired private ObjectMapper          objectMapper;
    @Autowired private CvVectorClient        cvVectorClient;

    // ─────────────────────────────────────────────────────────────────────────
    //  RÉPONDRE — snapshot SQL + recherche vectorielle + Groq
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public Map<String, Object> repondre(String question, List<Map<String, String>> historique) {

        // 1. Retrieval structuré (chiffres, classements)
        String snapshot = construireSnapshot();

        // 2. Retrieval vectoriel (fiches candidats + contenu des CV)
        List<Map<String, Object>> passages = cvVectorClient.rechercher(question, 5);
        StringBuilder cvBloc = new StringBuilder();
        if (passages != null && !passages.isEmpty()) {
            cvBloc.append("\n═══════ DONNÉES PERTINENTES (recherche sémantique) ═══════\n");
            for (Map<String, Object> p : passages) {
                String type = String.valueOf(p.getOrDefault("type", "cv"));
                if ("fiche".equals(type)) {
                    cvBloc.append("- [FICHE] ").append(p.getOrDefault("extrait", "")).append("\n");
                } else {
                    cvBloc.append(String.format("- [EXTRAIT CV de %s] : %s\n",
                            p.getOrDefault("candidatNom", "?"), p.getOrDefault("extrait", "")));
                }
            }
            cvBloc.append("══════════════════════════════════════════════════════════\n");
        }

        // 3. Prompt système
        String systemPrompt = """
            Tu es l'assistant analytique de la plateforme de recrutement de la Banque Centrale de Tunisie (BCT).
            Tu réponds aux questions du personnel RH et administrateur à partir des données ci-dessous.

            RÈGLES STRICTES :
            - Réponds en français, de façon concise et professionnelle.
            - Utilise EXCLUSIVEMENT les données fournies (SNAPSHOT + données sémantiques). N'invente aucun chiffre.
            - Pour les questions chiffrées (totaux, moyennes, classements), utilise le SNAPSHOT.
            - Pour une question sur un candidat précis (son score, son statut), utilise les [FICHE] de la recherche sémantique.
            - Pour le CONTENU des CV (compétences, technologies, expériences), utilise les [EXTRAIT CV]. Cite le nom du candidat.
            - Si l'information n'existe vraiment pas dans les données, dis : "Je n'ai pas cette information dans les données actuelles."
            - Ne réponds qu'aux questions liées au recrutement et aux données de la plateforme. Refuse poliment le hors-sujet.

            ═══════════ SNAPSHOT DES DONNÉES (temps réel) ═══════════
            %s
            ═════════════════════════════════════════════════════════
            %s
            """.formatted(snapshot, cvBloc.toString());

        // 4. Appel Groq
        try {
            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));

            if (historique != null) {
                int start = Math.max(0, historique.size() - 6);
                for (int i = start; i < historique.size(); i++) {
                    Map<String, String> m = historique.get(i);
                    String role = m.getOrDefault("role", "user");
                    String content = m.getOrDefault("content", "");
                    if (!content.isBlank())
                        messages.add(Map.of("role", role, "content", content));
                }
            }
            messages.add(Map.of("role", "user", "content", question));

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",       "llama-3.3-70b-versatile");
            body.put("max_tokens",  800);
            body.put("temperature", 0.2);
            body.put("messages",    messages);

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(groqApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> resp = restTemplate.exchange(
                    "https://api.groq.com/openai/v1/chat/completions",
                    HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

            if (resp.getBody() == null)
                return Map.of("reponse", "Désolé, je n'ai pas pu générer de réponse.");

            List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.getBody().get("choices");
            if (choices == null || choices.isEmpty())
                return Map.of("reponse", "Désolé, aucune réponse générée.");

            String content = ((Map<String, Object>) choices.get(0).get("message"))
                    .get("content").toString().trim();

            return Map.of("reponse", content);

        } catch (Exception e) {
            log.error("[Chatbot] Erreur Groq : {}", e.getMessage());
            return Map.of("reponse", "Une erreur est survenue lors de la génération de la réponse.");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SNAPSHOT SCALABLE — agrégats + classements (top listes) + listes ciblées
    // ─────────────────────────────────────────────────────────────────────────
    private String construireSnapshot() {
        StringBuilder sb = new StringBuilder();

        List<Candidature> toutes = candidatureRepository.findAll();
        List<SujetStage>  sujets = sujetStageRepository.findAll();
        List<Entretien>   entretiens = entretienRepository.findAll();

        Map<Long, Entretien> entParCand = new HashMap<>();
        for (Entretien e : entretiens)
            if (e.getCandidature() != null)
                entParCand.put(e.getCandidature().getId(), e);

        // ── Utilisateurs ──
        var users = userRepository.findAll();
        long nbRh       = users.stream().filter(u -> u.getRole() == Role.ROLE_RH).count();
        long nbCandidat = users.stream().filter(u -> u.getRole() == Role.ROLE_CANDIDAT).count();
        long nbAdmin    = users.stream().filter(u -> u.getRole() == Role.ROLE_ADMIN).count();
        sb.append("UTILISATEURS :\n");
        sb.append(String.format("- Total : %d (Admins: %d, RH: %d, Candidats: %d)\n\n",
                users.size(), nbAdmin, nbRh, nbCandidat));

        // ── Candidatures : agrégats ──
        sb.append("CANDIDATURES — STATISTIQUES GLOBALES :\n");
        sb.append(String.format("- Total candidatures : %d\n", toutes.size()));
        Map<StatutCandidature, Long> parStatut = toutes.stream()
                .collect(Collectors.groupingBy(Candidature::getStatut, Collectors.counting()));
        sb.append("- Répartition par statut :\n");
        for (StatutCandidature st : StatutCandidature.values())
            sb.append(String.format("    • %s : %d\n", st.name(), parStatut.getOrDefault(st, 0L)));

        var scoresCv = toutes.stream().filter(c -> c.getScoreAi() != null)
                .mapToInt(Candidature::getScoreAi).summaryStatistics();
        var scoresQuiz = toutes.stream().filter(c -> c.getScoreQuiz() != null)
                .mapToInt(Candidature::getScoreQuiz).summaryStatistics();
        if (scoresCv.getCount() > 0)
            sb.append(String.format("- Score IA CV (/100) : moyenne %.1f, min %d, max %d\n",
                    scoresCv.getAverage(), scoresCv.getMin(), scoresCv.getMax()));
        if (scoresQuiz.getCount() > 0)
            sb.append(String.format("- Score Quiz (/50) : moyenne %.1f, min %d, max %d\n",
                    scoresQuiz.getAverage(), scoresQuiz.getMin(), scoresQuiz.getMax()));
        sb.append("\n");

        // ── CLASSEMENTS (top listes) ──
        final int TOP = 20;

        sb.append("TOP ").append(TOP).append(" — MEILLEURS SCORES QUIZ (/50) :\n");
        toutes.stream()
                .filter(c -> c.getScoreQuiz() != null)
                .sorted(Comparator.comparingInt(Candidature::getScoreQuiz).reversed())
                .limit(TOP)
                .forEach(c -> sb.append(String.format("    • %s — %d/50 (sujet: %s, statut: %s)\n",
                        nomDe(c), c.getScoreQuiz(), sujetDe(c), c.getStatut().name())));
        sb.append("\n");

        sb.append("TOP ").append(TOP).append(" — MEILLEURS SCORES CV IA (/100) :\n");
        toutes.stream()
                .filter(c -> c.getScoreAi() != null)
                .sorted(Comparator.comparingInt(Candidature::getScoreAi).reversed())
                .limit(TOP)
                .forEach(c -> sb.append(String.format("    • %s — %d/100 (sujet: %s, statut: %s)\n",
                        nomDe(c), c.getScoreAi(), sujetDe(c), c.getStatut().name())));
        sb.append("\n");

        sb.append("TOP ").append(TOP).append(" — MEILLEURES NOTES D'ENTRETIEN (/10) :\n");
        toutes.stream()
                .filter(c -> {
                    var e = entParCand.get(c.getId());
                    return e != null && e.getScoreEntretien() != null;
                })
                .sorted((a, b) -> Integer.compare(
                        entParCand.get(b.getId()).getScoreEntretien(),
                        entParCand.get(a.getId()).getScoreEntretien()))
                .limit(TOP)
                .forEach(c -> sb.append(String.format("    • %s — %d/10 (sujet: %s)\n",
                        nomDe(c), entParCand.get(c.getId()).getScoreEntretien(), sujetDe(c))));
        sb.append("\n");

        // ── LISTES CIBLÉES par statut ──
        ajouterListeStatut(sb, toutes, StatutCandidature.ACCEPTE,            "CANDIDATS ACCEPTÉS");
        ajouterListeStatut(sb, toutes, StatutCandidature.REFUSE,             "CANDIDATS REFUSÉS");
        ajouterListeStatut(sb, toutes, StatutCandidature.ENTRETIEN_PLANIFIE, "CANDIDATS EN ENTRETIEN PLANIFIÉ");

        // ── Sujets ──
        sb.append("SUJETS DE STAGE :\n");
        sb.append(String.format("- Total sujets : %d\n", sujets.size()));
        for (SujetStage s : sujets) {
            long nbCand = toutes.stream()
                    .filter(c -> c.getSujet() != null && c.getSujet().getId().equals(s.getId()))
                    .count();
            sb.append(String.format("    • \"%s\" (code %s, dépt %s) — %d candidature(s), %d place(s)\n",
                    s.getTitre(),
                    s.getCodeSujet() != null ? s.getCodeSujet() : "?",
                    s.getDepartement() != null ? s.getDepartement() : "?",
                    nbCand, s.getNbStagiaires()));
        }
        sb.append("\n");

        // ── Entretiens : agrégats ──
        long planifies = entretiens.stream().filter(e -> "PLANIFIE".equals(e.getStatut())).count();
        long termines  = entretiens.stream().filter(e -> "TERMINE".equals(e.getStatut())).count();
        sb.append("ENTRETIENS :\n");
        sb.append(String.format("- Total : %d (Planifiés: %d, Terminés: %d)\n",
                entretiens.size(), planifies, termines));

        return sb.toString();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String nomDe(Candidature c) {
        return c.getCandidat() != null ? c.getCandidat().getName() : "?";
    }
    private String sujetDe(Candidature c) {
        return c.getSujet() != null ? c.getSujet().getTitre() : "?";
    }
    private void ajouterListeStatut(StringBuilder sb, List<Candidature> toutes,
                                    StatutCandidature statut, String titre) {
        List<Candidature> liste = toutes.stream()
                .filter(c -> c.getStatut() == statut)
                .collect(Collectors.toList());
        sb.append(titre).append(" (").append(liste.size()).append(") :\n");
        if (liste.isEmpty()) {
            sb.append("    (aucun)\n");
        } else {
            liste.stream().limit(40).forEach(c ->
                    sb.append(String.format("    • %s (sujet: %s)\n", nomDe(c), sujetDe(c))));
            if (liste.size() > 40)
                sb.append("    ... et ").append(liste.size() - 40).append(" autre(s).\n");
        }
        sb.append("\n");
    }
}