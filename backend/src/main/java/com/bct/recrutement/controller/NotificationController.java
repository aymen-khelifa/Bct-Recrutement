package com.bct.recrutement.controller;

import com.bct.recrutement.entity.Notification;
import com.bct.recrutement.entity.User;
import com.bct.recrutement.repository.UserRepository;
import com.bct.recrutement.service.NotificationService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService,
                                  UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository      = userRepository;
    }

    // Récupère l'ID du candidat connecté via le SecurityContext
    private Long getCurrentUserId() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + email));
    }

    // SSE — le frontend se connecte ici au chargement
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return notificationService.subscribe(getCurrentUserId());
    }

    // Liste toutes les notifs
    @GetMapping
    public List<Notification> getAll() {
        return notificationService.getAll(getCurrentUserId());
    }

    // Marquer toutes comme lues
    @PostMapping("/read-all")
    public ResponseEntity<Void> readAll() {
        notificationService.markAllRead(getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    // Marquer une seule
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> readOne(@PathVariable Long id) {
        notificationService.markRead(id);
        return ResponseEntity.ok().build();
    }
}