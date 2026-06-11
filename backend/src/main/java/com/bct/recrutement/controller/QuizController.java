package com.bct.recrutement.controller;

import com.bct.recrutement.entity.Question;
import com.bct.recrutement.entity.Quiz;
import com.bct.recrutement.service.QuizService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private static final Logger log = LoggerFactory.getLogger(QuizController.class);

    @Autowired private QuizService   quizService;
    @Autowired private ObjectMapper  objectMapper;

    @GetMapping("/sujet/{sujetId}")
    @PreAuthorize("hasRole('CANDIDAT') or hasRole('RH')")
    public ResponseEntity<?> getQuizBySujet(@PathVariable Long sujetId) {
        try {
            Quiz quiz = quizService.getQuizBySujet(sujetId);
            return ResponseEntity.ok(quiz);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{quizId}/questions-full")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> getQuestionsFull(@PathVariable Long quizId) {
        try {
            List<Question> questions = quizService.getQuestions(quizId);
            List<Map<String, Object>> full = questions.stream().map(q -> {
                Map<String, Object> qMap = new HashMap<>();
                qMap.put("id",         q.getId());
                qMap.put("texte",      q.getTexte());
                qMap.put("imageUrl",   q.getImageUrl());
                qMap.put("difficulte", q.getDifficulte());
                qMap.put("options", q.getOptions().stream().map(o -> {
                    Map<String, Object> oMap = new HashMap<>();
                    oMap.put("id",       o.getId());
                    oMap.put("texte",    o.getTexte());
                    oMap.put("correcte", o.isCorrecte());
                    return oMap;
                }).toList());
                return qMap;
            }).toList();
            return ResponseEntity.ok(full);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping(value = "/{quizId}/question", consumes = {"multipart/form-data", "application/json"})
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> addQuestion(
            @PathVariable Long quizId,
            @RequestPart("question") String questionJson,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            Question newQuestion = objectMapper.readValue(questionJson, Question.class);
            Question saved = quizService.addQuestion(quizId, newQuestion, image);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping(value = "/question/{id}", consumes = {"multipart/form-data", "application/json"})
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> updateQuestion(
            @PathVariable Long id,
            @RequestPart("question") String questionJson,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            Question updatedQuestion = objectMapper.readValue(questionJson, Question.class);
            Question updated = quizService.updateQuestion(id, updatedQuestion, image);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/question/{id}")
    @PreAuthorize("hasRole('RH')")
    public ResponseEntity<?> deleteQuestion(@PathVariable Long id) {
        try {
            quizService.deleteQuestion(id);
            return ResponseEntity.ok(Map.of("message", "Question supprimée avec succès."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{quizId}/start")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> startQuiz(
            @PathVariable Long quizId,
            @RequestBody Map<String, Object> body) {
        try {
            Long userId = Long.valueOf(body.get("userId").toString());
            Map<String, Object> sessionData = quizService.startQuiz(userId, quizId);
            return ResponseEntity.ok(sessionData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Submit normal ────────────────────────────────────────────────────────
    @PostMapping("/{quizId}/submit")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> submitQuiz(
            @PathVariable Long quizId,
            @RequestBody Map<String, Object> body) {
        try {
            Long userId = Long.valueOf(body.get("userId").toString());

            @SuppressWarnings("unchecked")
            Map<String, Object> rep = (Map<String, Object>) body.get("reponses");

            Map<Long, Long> reponses = new HashMap<>();
            if (rep != null) {
                for (Map.Entry<String, Object> entry : rep.entrySet()) {
                    try {
                        reponses.put(
                                Long.valueOf(entry.getKey()),
                                Long.valueOf(entry.getValue().toString())
                        );
                    } catch (NumberFormatException ignored) {}
                }
            }

            Map<String, Object> result = quizService.submitQuiz(userId, quizId, reponses);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Submit forcé — sendBeacon (refresh/fermeture/arrêt partage) ──────────
    // sendBeacon envoie Content-Type: text/plain → on accepte tout
    @PostMapping(value = "/{quizId}/submit-exit", consumes = {"application/json", "text/plain", "*/*"})
    public ResponseEntity<?> submitExit(
            @PathVariable Long quizId,
            @RequestBody(required = false) String rawBody) {
        try {
            if (rawBody == null || rawBody.isBlank()) return ResponseEntity.ok().build();

            @SuppressWarnings("unchecked")
            Map<String, Object> body = objectMapper.readValue(rawBody, Map.class);

            Long userId = Long.valueOf(body.get("userId").toString());
            log.info("[QuizController] submit-exit forcé — quiz={} user={}", quizId, userId);

            // Réponses vides → score 0
            quizService.submitQuiz(userId, quizId, new HashMap<>());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            // sendBeacon ignore les erreurs côté client
            log.warn("[QuizController] submit-exit erreur : {}", e.getMessage());
            return ResponseEntity.ok().build();
        }
    }

    // ── Log événements anti-triche ───────────────────────────────────────────
    @PostMapping("/{quizId}/event")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> logEvent(
            @PathVariable Long quizId,
            @RequestBody Map<String, Object> body) {
        try {
            log.info("[QuizEvent] quiz={} type={} user={} detail={}",
                    quizId, body.get("type"), body.get("userId"), body);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.ok().build();
        }
    }

    @GetMapping("/{quizId}/eligibilite")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<?> checkEligibilite(
            @PathVariable Long quizId,
            @RequestParam Long userId) {
        try {
            Map<String, Object> status = quizService.checkEligibilite(userId, quizId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}