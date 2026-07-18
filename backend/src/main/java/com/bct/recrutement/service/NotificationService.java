package com.bct.recrutement.service;

import com.bct.recrutement.entity.Notification;
import com.bct.recrutement.repository.NotificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.bct.recrutement.entity.User;
import com.bct.recrutement.repository.UserRepository;

@Service
@Slf4j
public class NotificationService {

    private final NotificationRepository repo;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public NotificationService(NotificationRepository repo, UserRepository userRepository, ObjectMapper objectMapper) {
        this.repo = repo;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Long getUserIdByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + email));
    }

    // Map userId → SseEmitter (un par candidat connecté)
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    // ── SSE : enregistrer le candidat ────────────────────────────────────
    public SseEmitter subscribe(Long candidatId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        emitter.onCompletion(() -> emitters.remove(candidatId));
        emitter.onTimeout(()    -> emitters.remove(candidatId));
        emitter.onError(e       -> emitters.remove(candidatId));

        emitters.put(candidatId, emitter);

        // Envoyer un heartbeat immédiat pour confirmer la connexion
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (Exception e) {
            emitters.remove(candidatId);
        }

        return emitter;
    }

    // ── Créer et envoyer une notification ────────────────────────────────
    @Transactional
    public void envoyer(Long candidatId, String type, String titre, String message) {

        // 1. Persister en base
        Notification notif = new Notification();
        notif.setCandidatId(candidatId);
        notif.setType(type);
        notif.setTitre(titre);
        notif.setMessage(message);
        notif.setLu(false);
        notif = repo.save(notif);

        // 2. Pousser en temps réel si le candidat est connecté
        SseEmitter emitter = emitters.get(candidatId);
        if (emitter != null) {
            try {
                String json = objectMapper.writeValueAsString(notif);
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(json));
            } catch (Exception e) {
                emitters.remove(candidatId);
            }
        }
    }

    // ── REST ─────────────────────────────────────────────────────────────
    public List<Notification> getAll(Long candidatId) {
        return repo.findByCandidatIdOrderByCreatedAtDesc(candidatId);
    }

    @Transactional
    public void markAllRead(Long candidatId) {
        repo.markAllReadByCandidatId(candidatId);
    }

    @Transactional
    public void markRead(Long notifId) {
        repo.findById(notifId).ifPresent(n -> {
            n.setLu(true);
            repo.save(n);
        });
    }
}