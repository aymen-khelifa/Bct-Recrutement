package com.bct.recrutement.service;

import com.bct.recrutement.entity.*;
import com.bct.recrutement.entity.Candidature.StatutCandidature;
import com.bct.recrutement.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hibernate.validator.internal.util.stereotypes.Lazy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.mail.internet.MimeMessage;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InterviewSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(InterviewSchedulerService.class);
    @Autowired
    @Lazy
    private NotificationService notificationService;
    // ✅ RÈGLES MODIFIÉES
    private static final int HEURE_DEBUT       = 9;   // 9h
    private static final int HEURE_FIN         = 17;  // 17h (5 PM)
    private static final int PAUSE_DEBUT       = 12;  // pause déjeuner 12h
    private static final int PAUSE_FIN         = 13;  // reprise 13h (1 PM)
    private static final int DUREE_MINUTES     = 15;  // entretien 15 min
    private static final int BATTEMENT_MINUTES = 15;  // 15 min entre 2 entretiens
    private static final int PAS_MINUTES       = DUREE_MINUTES + BATTEMENT_MINUTES; // 30 min
    private static final int JOURS_A_PLANIFIER = 5;


    @Value("${ml.router.url:http://localhost:5000}")
    private String mlRouterUrl;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    @Autowired private CandidatureRepository  candidatureRepository;
    @Autowired private EntretienRepository    entretienRepository;
    @Autowired private JavaMailSender         mailSender;
    @Autowired private RestTemplate           restTemplate;
    @Autowired private ObjectMapper           objectMapper;

    // ─────────────────────────────────────────────────────────────────────────
    //  PLANIFIER — tous les candidats ACCEPTE_QUIZ
    // ─────────────────────────────────────────────────────────────────────────
    public Map<String, Object> planifierEntretiens(Long sujetId) {

        List<Candidature> candidats = getCandidatsAccepteQuiz(sujetId);
        if (candidats.isEmpty()) {
            return Map.of(
                    "success",   false,
                    "message",   "Aucun candidat ACCEPTE_QUIZ trouvé.",
                    "planifies", 0
            );
        }

        log.info("[Scheduler] {} candidat(s) à planifier", candidats.size());

        List<Map<String, Object>> planning = genererPlanningAvecGroq(candidats);

        int planifies = 0;
        List<Map<String, Object>> resultats = new ArrayList<>();
        List<Map<String, Object>> erreurs   = new ArrayList<>();

        for (Map<String, Object> slot : planning) {
            try {
                Long candidatureId = Long.parseLong(slot.get("candidatureId").toString());
                Candidature c = candidatureRepository.findById(candidatureId).orElse(null);
                if (c == null) continue;

                LocalDateTime debut = parseDateTime(slot.get("debut").toString());
                LocalDateTime fin   = parseDateTime(slot.get("fin").toString());

                // Générer le room token unique
                String roomToken = UUID.randomUUID().toString()
                        .replace("-", "").substring(0, 20);

                // Créer l'entretien en BDD
                Entretien entretien = new Entretien();
                entretien.setCandidature(c);
                entretien.setDateDebut(debut);
                entretien.setDateFin(fin);
                entretien.setRoomToken(roomToken);
                entretien.setStatut("PLANIFIE");
                entretienRepository.save(entretien);

                // Mettre à jour le statut candidature
                c.setStatut(StatutCandidature.ENTRETIEN_PLANIFIE);
                candidatureRepository.save(c);
                DateTimeFormatter fmtNotif = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");
                notificationService.envoyer(
                        c.getCandidat().getId(),
                        "ENTRETIEN_PLANIFIE",
                        "Entretien planifié",
                        "Un entretien pour " + c.getSujet().getTitre() + " a été planifié le "
                                + debut.format(fmtNotif) + ". Vérifiez votre espace candidat."
                );

                // Email avec lien interne
                String lienEntretien = baseUrl + "/entretien/" + roomToken;
                envoyerEmailEntretien(c, debut, fin, lienEntretien, roomToken);

                planifies++;
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                resultats.add(Map.of(
                        "candidatureId", candidatureId,
                        "candidatNom",   c.getCandidat().getName(),
                        "sujetTitre",    c.getSujet().getTitre(),
                        "debut",         debut.format(fmt),
                        "fin",           fin.format(fmt),
                        "roomToken",     roomToken,
                        "lien",          lienEntretien
                ));

                log.info("[Scheduler] ✅ {} → {} | room={}", c.getCandidat().getName(),
                        debut.format(fmt), roomToken);

            } catch (Exception e) {
                log.error("[Scheduler] ❌ slot {}: {}", slot, e.getMessage());
                erreurs.add(Map.of("slot", slot.toString(), "erreur", e.getMessage()));
            }
        }

        return Map.of(
                "success",   true,
                "message",   planifies + " entretien(s) planifié(s) sur " + candidats.size() + " candidat(s).",
                "planifies", planifies,
                "total",     candidats.size(),
                "planning",  resultats,
                "erreurs",   erreurs
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CALENDRIER — entretiens d'un mois
    // ─────────────────────────────────────────────────────────────────────────
    public List<Map<String, Object>> getEntretiensParMois(int annee, int mois) {
        LocalDateTime debut = LocalDate.of(annee, mois, 1).atStartOfDay();
        LocalDateTime fin   = debut.plusMonths(1);
        return entretienRepository.findByMois(debut, fin)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getEntretiensAujourdhui() {
        LocalDateTime debut = LocalDate.now().atStartOfDay();
        LocalDateTime fin   = debut.plusDays(1);
        return entretienRepository.findByDateDebutBetween(debut, fin)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ROOM — rejoindre via token
    // ─────────────────────────────────────────────────────────────────────────
    public Optional<Map<String, Object>> getByRoomToken(String roomToken) {
        return entretienRepository.findByRoomToken(roomToken)
                .map(this::toMapFull);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  NOTES — sauvegarder
    // ─────────────────────────────────────────────────────────────────────────
    public Optional<Map<String, Object>> sauvegarderNotes(Long id, String notes) {
        return entretienRepository.findById(id).map(e -> {
            e.setNotesRh(notes);
            return toMap(entretienRepository.save(e));
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TERMINER — clore l'entretien
    // ─────────────────────────────────────────────────────────────────────────
    public Optional<Map<String, Object>> terminerEntretien(Long id, Integer scoreEntretien, String notesRh) {
        return entretienRepository.findById(id).map(e -> {
            e.setStatut("TERMINE");
            if (scoreEntretien != null) e.setScoreEntretien(scoreEntretien);
            if (notesRh != null)        e.setNotesRh(notesRh);

            return toMap(entretienRepository.save(e));
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  toMap — version légère pour le calendrier
    // ─────────────────────────────────────────────────────────────────────────
    private Map<String, Object> toMap(Entretien e) {
        Candidature c = e.getCandidature();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("HH:mm");
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            e.getId());
        m.put("roomToken",     e.getRoomToken());
        m.put("candidatNom",   c.getCandidat().getName());
        m.put("candidatEmail", c.getCandidat().getEmail());
        m.put("sujetTitre",    c.getSujet().getTitre());
        m.put("sujetDept",     c.getSujet().getDepartement() != null
                ? c.getSujet().getDepartement() : "");
        m.put("dateDebut",     e.getDateDebut().toString());
        m.put("dateFin",       e.getDateFin().toString());
        m.put("heureDebut",    e.getDateDebut().format(fmt));
        m.put("heureFin",      e.getDateFin().format(fmt));
        m.put("jour",          e.getDateDebut().getDayOfMonth());
        m.put("mois",          e.getDateDebut().getMonthValue());
        m.put("annee",         e.getDateDebut().getYear());
        m.put("statut",        e.getStatut());
        return m;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  toMapFull — version complète pour la salle d'entretien
    // ─────────────────────────────────────────────────────────────────────────
    private Map<String, Object> toMapFull(Entretien e) {
        Candidature c = e.getCandidature();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("HH:mm");
        Map<String, Object> m = new LinkedHashMap<>(toMap(e));
        m.put("notesRh",       e.getNotesRh() != null ? e.getNotesRh() : "");
        m.put("scoreEntretien",e.getScoreEntretien());
        m.put("scoreQuiz",     c.getScoreQuiz() != null ? c.getScoreQuiz() : 0);
        m.put("scoreAi",       c.getScoreAi()   != null ? c.getScoreAi()   : 0);
        m.put("candidatPhoto", c.getCandidat().getPhotoUrl() != null
                ? c.getCandidat().getPhotoUrl() : "");
        m.put("startedAt", e.getStartedAt() != null ? e.getStartedAt().toString() : null);
        m.put("candidatureId", c.getId());
        // CV depuis le profil
        try {
            var profil = c.getSujet(); // placeholder — adapter selon ta structure
            m.put("cvUrl", "");
        } catch (Exception ex) { m.put("cvUrl", ""); }
        return m;
    }
    public Optional<Map<String, Object>> getDetailEntretien(Long id) {
        return entretienRepository.findById(id).map(e -> {
            Candidature c = e.getCandidature();
            User cand = c.getCandidat();
            SujetStage s = c.getSujet();

            DateTimeFormatter dFmt = DateTimeFormatter.ofPattern(
                    "EEEE dd MMMM yyyy 'à' HH'h'mm", Locale.FRENCH);
            DateTimeFormatter hFmt = DateTimeFormatter.ofPattern("HH:mm");

            Map<String, Object> m = new LinkedHashMap<>();

            // Entretien
            m.put("id",             e.getId());
            m.put("statut",         e.getStatut());
            m.put("roomToken",      e.getRoomToken());
            m.put("scoreEntretien", e.getScoreEntretien());
            m.put("notesRh",        e.getNotesRh() != null ? e.getNotesRh() : "");
            m.put("dateComplete",   e.getDateDebut().format(dFmt));
            m.put("heureDebut",     e.getDateDebut().format(hFmt));
            m.put("heureFin",       e.getDateFin().format(hFmt));

            // Candidat
            m.put("candidatNom",    cand.getName());
            m.put("candidatEmail",  cand.getEmail());
            m.put("candidatPhoto",  cand.getPhotoUrl() != null ? cand.getPhotoUrl() : "");

            // Sujet de stage
            m.put("sujetTitre",       s.getTitre());
            m.put("sujetCode",        s.getCodeSujet());
            m.put("sujetDepartement", s.getDepartement());
            m.put("sujetDuree",       s.getDuree());
            m.put("sujetNiveau",      s.getNiveauEtudes());
            m.put("sujetSpecialite",  s.getSpecialite());
            m.put("sujetDescription", s.getDescription());

            // Candidature
            m.put("candidatureId",     c.getId());
            m.put("candidatureStatut", c.getStatut().name());
            m.put("dateDepot",         c.getDateDepot() != null ? c.getDateDepot().toString() : null);
            m.put("lettreMotivation",  c.getLettreMotivation());
            m.put("scoreQuiz",         c.getScoreQuiz());
            m.put("mentionQuiz",       c.getMentionQuiz());
            m.put("scoreAi",           c.getScoreAi());
            m.put("compatibilite",     c.getCompatibilite());

            return m;
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  GROQ — générer le planning  ✅ avec pause déjeuner + battement
    // ─────────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> genererPlanningAvecGroq(List<Candidature> candidats) {

        StringBuilder sb = new StringBuilder();
        for (Candidature c : candidats) {
            sb.append(String.format(
                    "- candidatureId:%d | candidat:\"%s\" | sujet:\"%s\" | scoreQuiz:%s\n",
                    c.getId(), c.getCandidat().getName(), c.getSujet().getTitre(),
                    c.getScoreQuiz() != null ? c.getScoreQuiz() + "/50" : "N/A"
            ));
        }

        List<String> jours = new ArrayList<>();
        LocalDate d = LocalDate.now().plusDays(1);
        while (jours.size() < JOURS_A_PLANIFIER) {
            if (d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY)
                jours.add(d.format(DateTimeFormatter.ISO_LOCAL_DATE));
            d = d.plusDays(1);
        }

        List<String> creneauxValides = genererCreneauxValides();

        Set<LocalDateTime> occupes = getCreneauxOccupes();
        String occupesStr = occupes.isEmpty()
                ? "Aucun"
                : occupes.stream()
                .sorted()
                .map(dt -> dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                .collect(Collectors.joining(", "));

        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("heureDebut",        HEURE_DEBUT);
            body.put("heureFin",          HEURE_FIN);
            body.put("pauseDebut",        PAUSE_DEBUT);
            body.put("pauseFin",          PAUSE_FIN);
            body.put("dureeMinutes",      DUREE_MINUTES);
            body.put("battementMinutes",  BATTEMENT_MINUTES);
            body.put("creneauxValides",   creneauxValides);
            body.put("occupesStr",        occupesStr);
            body.put("jours",             jours);
            body.put("candidatsStr",      sb.toString());
            body.put("nbCandidats",       candidats.size());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> resp = restTemplate.exchange(
                    mlRouterUrl + "/schedule",
                    HttpMethod.POST, new HttpEntity<>(body, headers), Map.class
            );

            if (resp.getBody() == null || resp.getBody().get("planning") == null) {
                log.warn("[Scheduler] Réponse ml_router vide — fallback");
                return genererPlanningFallback(candidats);
            }

            List<Map<String, Object>> result =
                    (List<Map<String, Object>>) resp.getBody().get("planning");

            if (result.isEmpty() || !validerPlanning(result)) {
                log.warn("[Scheduler] Planning ml_router invalide (règles/collisions/vide) — fallback");
                return genererPlanningFallback(candidats);
            }

            log.info("[Scheduler] ml_router → {} créneaux générés (validés)", result.size());
            return result;

        } catch (Exception e) {
            log.error("[Scheduler] ml_router erreur: {} — fallback activé", e.getMessage());
            return genererPlanningFallback(candidats);
        }
    }  // ─────────────────────────────────────────────────────────────────────────
    //  ✅ Générer les créneaux horaires valides (hors pause déjeuner)
    // ─────────────────────────────────────────────────────────────────────────
    private List<String> genererCreneauxValides() {
        List<String> creneaux = new ArrayList<>();
        int h = HEURE_DEBUT, m = 0;
        while (h < HEURE_FIN) {
            if (h >= PAUSE_DEBUT && h < PAUSE_FIN) { h = PAUSE_FIN; m = 0; continue; }
            creneaux.add(String.format("%02d:%02d", h, m));
            m += PAS_MINUTES;
            if (m >= 60) { h += 1; m -= 60; }
        }
        return creneaux;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ✅ Valider : horaires + pause déjeuner + PAS de collision avec existants
    // ─────────────────────────────────────────────────────────────────────────
    private boolean validerPlanning(List<Map<String, Object>> planning) {
        try {
            Set<LocalDateTime> occupes = getCreneauxOccupes();
            Set<LocalDateTime> dejaVus = new HashSet<>();

            for (Map<String, Object> slot : planning) {
                LocalDateTime debut = parseDateTime(slot.get("debut").toString());
                int h = debut.getHour();
                if (h < HEURE_DEBUT || h >= HEURE_FIN) return false;   // hors horaires
                if (h >= PAUSE_DEBUT && h < PAUSE_FIN)  return false;   // pause déjeuner

                // ✅ Collision avec un entretien déjà en BDD
                if (occupes.contains(debut)) return false;
                // ✅ Collision interne (deux candidats au même créneau dans ce batch)
                if (!dejaVus.add(debut)) return false;
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ✅ Charger les créneaux déjà occupés (entretiens existants en BDD)
    // ─────────────────────────────────────────────────────────────────────────
    private Set<LocalDateTime> getCreneauxOccupes() {
        LocalDateTime debut = LocalDate.now().atStartOfDay();
        LocalDateTime fin   = debut.plusDays(JOURS_A_PLANIFIER + 10L);
        return entretienRepository.findByDateDebutBetween(debut, fin)
                .stream()
                .filter(e -> !"ANNULE".equals(e.getStatut()))
                .map(Entretien::getDateDebut)
                .collect(Collectors.toSet());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FALLBACK — planning manuel  ✅ vérifie dispo + pause déjeuner + battement
    // ─────────────────────────────────────────────────────────────────────────
    private List<Map<String, Object>> genererPlanningFallback(List<Candidature> candidats) {
        log.info("[Scheduler] Fallback planning manuel (vérif disponibilité)");
        List<Map<String, Object>> plan = new ArrayList<>();

        // ✅ Créneaux déjà pris en BDD
        Set<LocalDateTime> occupes = getCreneauxOccupes();
        log.info("[Scheduler] {} créneau(x) déjà occupé(s) en BDD", occupes.size());

        LocalDate jour = LocalDate.now().plusDays(1);
        int h = HEURE_DEBUT, m = 0;

        for (Candidature c : candidats) {

            // Trouver le prochain créneau libre
            LocalDateTime debut = trouverProchainCreneauLibre(jour, h, m, occupes);

            jour = debut.toLocalDate();
            h    = debut.getHour();
            m    = debut.getMinute();

            LocalDateTime fin = debut.plusMinutes(DUREE_MINUTES);

            plan.add(Map.of(
                    "candidatureId", c.getId(),
                    "debut", debut.toString(),
                    "fin",   fin.toString()
            ));

            // ✅ Réserver ce créneau pour les candidats suivants
            occupes.add(debut);

            // Avancer de 30 min (15 entretien + 15 battement)
            m += PAS_MINUTES;
            if (m >= 60) { h += 1; m -= 60; }
        }
        return plan;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ✅ Trouver le prochain créneau libre (saute occupés / pause / week-ends)
    // ─────────────────────────────────────────────────────────────────────────
    private LocalDateTime trouverProchainCreneauLibre(LocalDate jour, int h, int m,
                                                      Set<LocalDateTime> occupes) {
        for (int i = 0; i < 300; i++) {

            // Sauter les week-ends
            while (jour.getDayOfWeek() == DayOfWeek.SATURDAY ||
                    jour.getDayOfWeek() == DayOfWeek.SUNDAY) {
                jour = jour.plusDays(1);
                h = HEURE_DEBUT; m = 0;
            }

            // Sauter la pause déjeuner (12h → 13h)
            if (h >= PAUSE_DEBUT && h < PAUSE_FIN) { h = PAUSE_FIN; m = 0; }

            // Journée terminée → jour suivant
            if (h >= HEURE_FIN) {
                jour = jour.plusDays(1);
                h = HEURE_DEBUT; m = 0;
                continue;
            }

            LocalDateTime candidat = jour.atTime(h, m);

            // ✅ Créneau libre → on le prend
            if (!occupes.contains(candidat)) return candidat;

            // Sinon avancer de 30 min
            m += PAS_MINUTES;
            if (m >= 60) { h += 1; m -= 60; }
        }
        return jour.atTime(HEURE_DEBUT, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EMAIL — convocation candidat
    // ─────────────────────────────────────────────────────────────────────────
    private void envoyerEmailEntretien(Candidature c, LocalDateTime debut,
                                       LocalDateTime fin, String lien, String roomToken) {
        try {
            String debutFmt = debut.format(
                    DateTimeFormatter.ofPattern("EEEE dd MMMM yyyy 'à' HH'h'mm", Locale.FRENCH));
            String heureFin = fin.format(DateTimeFormatter.ofPattern("HH'h'mm"));

            String html = """
                <!DOCTYPE html><html lang="fr">
                <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
                  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
                    <div style="background:#001b3d;padding:32px 40px;text-align:center;">
                      <p style="color:#a8c8ff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin:0 0 8px;">Banque Centrale de Tunisie</p>
                      <p style="color:#fff;font-size:20px;font-weight:900;margin:0;text-transform:uppercase;">Convocation à l'entretien</p>
                    </div>
                    <div style="padding:40px;">
                      <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 16px;">Bonjour %s,</p>
                      <p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 24px;">
                        Félicitations pour votre résultat au quiz technique. Vous êtes convoqué(e) à un entretien en ligne pour le poste de <strong>%s</strong>.
                      </p>
                      <div style="background:#f0f4fb;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                        <p style="color:#003d7a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">Détails de l'entretien</p>
                        <p style="color:#0f172a;font-size:14px;font-weight:600;margin:0 0 8px;">📅 %s</p>
                        <p style="color:#0f172a;font-size:14px;margin:0 0 8px;">⏱ Durée : 15 minutes (jusqu'à %s)</p>
                        <p style="color:#0f172a;font-size:14px;margin:0;">💻 Format : Entretien en ligne </p>
                      
                      </div>
                      
                      
                      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
                        <p style="color:#92400e;font-size:12px;font-weight:600;margin:0;">
                          ⚠️ Connectez-vous 5 minutes avant. Vérifiez votre caméra et microphone.
                        </p>
                      </div>
                      <p style="color:#94a3b8;font-size:12px;">Questions : <a href="mailto:rh@bct.tn" style="color:#003d7a;">rh@bct.tn</a></p>
                    </div>
                    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                      <p style="color:#94a3b8;font-size:10px;margin:0;text-transform:uppercase;font-weight:700;">© 2025 BCT Recrutement — Confidentiel</p>
                    </div>
                  </div>
                </body></html>
                """.formatted(
                    c.getCandidat().getName(),
                    c.getSujet().getTitre(),
                    debutFmt, heureFin,
                    lien, roomToken
            );

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setTo(c.getCandidat().getEmail());
            helper.setSubject("Convocation entretien — " + c.getSujet().getTitre() + " | BCT");
            helper.setText(html, true);
            helper.setFrom("no-reply@bct.tn");
            mailSender.send(msg);
            log.info("[Scheduler] Email → {}", c.getCandidat().getEmail());

        } catch (Exception e) {
            log.error("[Scheduler] Email error: {}", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────────────
    private List<Candidature> getCandidatsAccepteQuiz(Long sujetId) {
        List<Candidature> all = sujetId != null
                ? candidatureRepository.findBySujetId(sujetId)
                : candidatureRepository.findAll();
        return all.stream()
                .filter(c -> c.getStatut() == StatutCandidature.ACCEPTE_QUIZ)
                .sorted(Comparator.comparingInt((Candidature c) ->
                        c.getScoreQuiz() != null ? c.getScoreQuiz() : 0).reversed())
                .collect(Collectors.toList());
    }

    private LocalDateTime parseDateTime(String s) {
        try { return OffsetDateTime.parse(s).toLocalDateTime(); }
        catch (Exception e) {
            try { return LocalDateTime.parse(s); }
            catch (Exception e2) { return LocalDateTime.now().plusHours(1); }
        }
    }

    public List<Map<String, Object>> getEntretiensCandidatParMois(String email, int annee, int mois) {
        LocalDateTime debut = LocalDate.of(annee, mois, 1).atStartOfDay();
        LocalDateTime fin   = debut.plusMonths(1);
        return entretienRepository.findByMois(debut, fin).stream()
                .filter(e -> e.getCandidature().getCandidat().getEmail().equals(email))
                .map(this::toMap)
                .collect(Collectors.toList());
    }
    public Optional<Map<String, Object>> demarrerEntretien(String roomToken) {
        return entretienRepository.findByRoomToken(roomToken).map(e -> {
            // ✅ On ne fixe l'heure de début QUE si elle n'existe pas encore
            if (e.getStartedAt() == null) {
                e.setStartedAt(LocalDateTime.now());
                if ("PLANIFIE".equals(e.getStatut())) {
                    e.setStatut("EN_COURS");
                }
                entretienRepository.save(e);
            }
            return toMapFull(e);
        });
    }
    public Optional<Map<String, Object>> reprogrammerEntretien(Long id, String nouvelleDateDebutIso) {
        return entretienRepository.findById(id).map(e -> {
            // Parse la nouvelle date/heure de début (format ISO local : 2026-06-12T09:30)
            LocalDateTime debut = parseDateTime(nouvelleDateDebutIso);
            LocalDateTime fin   = debut.plusMinutes(DUREE_MINUTES);

            e.setDateDebut(debut);
            e.setDateFin(fin);

            // Si l'entretien était déjà démarré/terminé, on le remet à PLANIFIE
            // et on efface l'heure de démarrage (le compte à rebours repartira proprement)
            e.setStatut("PLANIFIE");
            e.setStartedAt(null);

            entretienRepository.save(e);
            DateTimeFormatter fmtNotif = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");
            notificationService.envoyer(
                    e.getCandidature().getCandidat().getId(),
                    "ENTRETIEN_REPROG",
                    "Entretien reprogrammé",
                    "Votre entretien pour " + e.getCandidature().getSujet().getTitre()
                            + " a été reprogrammé au " + debut.format(fmtNotif) + "."
            );

            // Email de reprogrammation
            envoyerEmailReprogrammation(e.getCandidature(), debut, fin);

            return toMapFull(e);
        });
    }

    // ── Email de reprogrammation ──────────────────────────────────────────────
    private void envoyerEmailReprogrammation(Candidature c, LocalDateTime debut, LocalDateTime fin) {
        try {
            String debutFmt = debut.format(
                    DateTimeFormatter.ofPattern("EEEE dd MMMM yyyy 'à' HH'h'mm", Locale.FRENCH));
            String heureFin = fin.format(DateTimeFormatter.ofPattern("HH'h'mm"));

            String html = """
                <!DOCTYPE html><html lang="fr">
                <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
                  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
                    <div style="background:#001b3d;padding:32px 40px;text-align:center;">
                      <p style="color:#a8c8ff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin:0 0 8px;">Banque Centrale de Tunisie</p>
                      <p style="color:#fff;font-size:20px;font-weight:900;margin:0;text-transform:uppercase;">Entretien reprogrammé</p>
                    </div>
                    <div style="padding:40px;">
                      <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 16px;">Bonjour %s,</p>
                      <p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 24px;">
                        Nous vous informons que votre entretien pour le poste de <strong>%s</strong> a été <strong>reprogrammé</strong>. Voici les nouveaux horaires :
                      </p>
                      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                        <p style="color:#b45309;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">Nouvel horaire</p>
                        <p style="color:#0f172a;font-size:14px;font-weight:600;margin:0 0 8px;">📅 %s</p>
                        <p style="color:#0f172a;font-size:14px;margin:0 0 8px;">⏱ Durée : 15 minutes (jusqu'à %s)</p>
                        <p style="color:#0f172a;font-size:14px;margin:0;">💻 Format : Entretien en ligne</p>
                        <div style="text-align:center;margin-top:20px;">
                          <a href="http://localhost:5173/" style="background:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Se connecter</a>
                        </div>
                      </div>
                      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
                        <p style="color:#92400e;font-size:12px;font-weight:600;margin:0;">⚠️ Merci de bien noter ce nouvel horaire. Connectez-vous 5 minutes avant.</p>
                      </div>
                      <p style="color:#94a3b8;font-size:12px;">Questions : <a href="mailto:rh@bct.tn" style="color:#003d7a;">rh@bct.tn</a></p>
                    </div>
                    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                      <p style="color:#94a3b8;font-size:10px;margin:0;text-transform:uppercase;font-weight:700;">© 2026 BCT Recrutement — Confidentiel</p>
                    </div>
                  </div>
                </body></html>
                """.formatted(
                    c.getCandidat().getName(),
                    c.getSujet().getTitre(),
                    debutFmt, heureFin);

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setTo(c.getCandidat().getEmail());
            helper.setSubject("Entretien reprogrammé — " + c.getSujet().getTitre() + " | BCT");
            helper.setText(html, true);
            helper.setFrom("no-reply@bct.tn");
            mailSender.send(msg);
            log.info("[Reprogrammation] Email → {}", c.getCandidat().getEmail());

        } catch (Exception ex) {
            log.error("[Reprogrammation] Email error: {}", ex.getMessage());
        }
    }
}