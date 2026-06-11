package com.bct.recrutement.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Signaling WebRTC par salle (roomToken).
 * Chaque message reçu est retransmis à tous les autres participants de la salle.
 * Format JSON attendu :
 *   { "type": "offer"|"answer"|"ice-candidate"|"ready"|"bye", ...payload }
 */
@Component
public class SignalingHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SignalingHandler.class);

    // roomToken → liste de sessions connectées
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Connexion ────────────────────────────────────────────────────────────
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String roomToken = getRoomToken(session);
        rooms.computeIfAbsent(roomToken, k -> ConcurrentHashMap.newKeySet()).add(session);
        log.info("[WS] Connexion : session={} room={} ({})",
                session.getId(), roomToken, rooms.get(roomToken).size());

        // Informer les autres qu'un pair vient d'arriver
        broadcast(session, Map.of("type", "peer-joined", "peerId", session.getId()), roomToken);
    }

    // ── Message reçu → broadcast aux autres ─────────────────────────────────
    @Override
    protected void handleTextMessage(WebSocketSession sender, TextMessage message) {
        String roomToken = getRoomToken(sender);
        try {
            // Transmettre à tous les autres membres de la salle
            broadcast(sender, message.getPayload(), roomToken);
        } catch (Exception e) {
            log.error("[WS] Erreur broadcast: {}", e.getMessage());
        }
    }

    // ── Déconnexion ──────────────────────────────────────────────────────────
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roomToken = getRoomToken(session);
        Set<WebSocketSession> room = rooms.get(roomToken);
        if (room != null) {
            room.remove(session);
            if (room.isEmpty()) rooms.remove(roomToken);
        }
        log.info("[WS] Déconnexion : session={} room={}", session.getId(), roomToken);
        // Informer les autres que le pair est parti
        broadcast(session, Map.of("type", "peer-left", "peerId", session.getId()), roomToken);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable ex) {
        log.warn("[WS] Erreur transport session={}: {}", session.getId(), ex.getMessage());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private void broadcast(WebSocketSession sender, Object payload, String roomToken) {
        Set<WebSocketSession> room = rooms.get(roomToken);
        if (room == null) return;
        String json;
        try {
            json = payload instanceof String s ? s : objectMapper.writeValueAsString(payload);
        } catch (Exception e) { return; }

        for (WebSocketSession s : room) {
            if (!s.getId().equals(sender.getId()) && s.isOpen()) {
                try { s.sendMessage(new TextMessage(json)); }
                catch (IOException e) { log.warn("[WS] Envoi échoué session={}", s.getId()); }
            }
        }
    }

    private String getRoomToken(WebSocketSession session) {
        String path = Objects.requireNonNull(session.getUri()).getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }
}