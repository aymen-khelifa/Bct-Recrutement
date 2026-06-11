package com.bct.recrutement.controller;

import com.bct.recrutement.service.ChatbotService;
import com.bct.recrutement.service.FicheIndexService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
@PreAuthorize("hasRole('RH')")   // RH + ADMIN (hérité via la hiérarchie de rôles)
public class ChatbotController {

    @Autowired private ChatbotService     chatbotService;
    @Autowired private FicheIndexService  ficheIndexService;

    // ── Poser une question au chatbot ─────────────────────────────────────────
    @PostMapping("/ask")
    public ResponseEntity<?> ask(@RequestBody Map<String, Object> body) {
        String question = body.get("question") != null ? body.get("question").toString() : "";
        if (question.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Question vide"));

        @SuppressWarnings("unchecked")
        List<Map<String, String>> historique =
                body.get("historique") instanceof List
                        ? (List<Map<String, String>>) body.get("historique")
                        : List.of();

        return ResponseEntity.ok(chatbotService.repondre(question, historique));
    }

    // ── Réindexer toutes les fiches candidats dans le vector DB ───────────────
    @PostMapping("/reindex-fiches")
    public ResponseEntity<?> reindexFiches() {
        ficheIndexService.reindexerToutesLesFiches();
        return ResponseEntity.ok(Map.of("message", "Réindexation des fiches lancée"));
    }
    @PostMapping("/reindex-cv")
    public ResponseEntity<?> reindexCv() {
        try {
            ficheIndexService.reindexerTousLesCvDebug();   // synchrone → l'erreur remonte
            return ResponseEntity.ok(Map.of("message", "Réindexation des CV terminée"));
        } catch (Exception e) {
            e.printStackTrace();   // stacktrace dans la console
            return ResponseEntity.status(500).body(Map.of(
                    "message", "Erreur : " + e.getMessage(),
                    "type",    e.getClass().getSimpleName()
            ));
        }
    }
}