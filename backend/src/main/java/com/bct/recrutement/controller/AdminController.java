
package com.bct.recrutement.controller;

import com.bct.recrutement.entity.Role;
import com.bct.recrutement.entity.User;
import com.bct.recrutement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.bct.recrutement.service.UserService;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired private UserRepository  userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UserService userService;

    // ── Liste de tous les utilisateurs ──────────────────────────────────────
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll()
                .stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .map(this::toMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    // ── Statistiques (pour le dashboard admin) ──────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<User> all = userRepository.findAll();
        long total     = all.size();
        long nbRh       = all.stream().filter(u -> u.getRole() == Role.ROLE_RH).count();
        long nbCandidat = all.stream().filter(u -> u.getRole() == Role.ROLE_CANDIDAT).count();
        long nbAdmin    = all.stream().filter(u -> u.getRole() == Role.ROLE_ADMIN).count();
        long nbActifs   = all.stream().filter(User::isEnabled).count();
        long nbBloques  = all.stream().filter(u -> !u.isEnabled()).count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total",     total);
        stats.put("rh",        nbRh);
        stats.put("candidats", nbCandidat);
        stats.put("admins",    nbAdmin);
        stats.put("actifs",    nbActifs);
        stats.put("bloques",   nbBloques);
        return ResponseEntity.ok(stats);
    }
    // ── Créer un compte RH ──────────────────────────────────────────────────
    @PostMapping("/users/rh")
    public ResponseEntity<?> createRh(@RequestBody Map<String, String> body) {
        String name     = body.get("name");
        String email    = body.get("email");
        String password = body.get("password");

        if (name == null || name.isBlank()
                || email == null || email.isBlank()
                || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tous les champs sont obligatoires."));
        }
        if (password.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le mot de passe doit contenir au moins 8 caractères."));
        }
        if (userRepository.findByEmail(email.trim().toLowerCase()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Cet email est déjà utilisé."));
        }

        User u = new User();
        u.setName(name.trim());
        u.setEmail(email.trim().toLowerCase());
        u.setPassword(passwordEncoder.encode(password));
        u.setRole(Role.ROLE_RH);
        u.setEnabled(true);                 // compte RH actif immédiatement
        u.setCreatedAt(LocalDateTime.now());
        userRepository.save(u);

        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(u));
    }

    // ── Activer / désactiver un utilisateur ─────────────────────────────────
    @PatchMapping("/users/{id}/toggle")
    public ResponseEntity<?> toggleEnabled(@PathVariable Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        u.setEnabled(!u.isEnabled());
        userRepository.save(u);
        return ResponseEntity.ok(toMap(u));
    }

    // ── Supprimer un utilisateur ────────────────────────────────────────────
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id))
            return ResponseEntity.notFound().build();
        userService.deleteUserSafely(id);
        return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé."));
    }

    // ── Helper ──────────────────────────────────────────────────────────────
    private Map<String, Object> toMap(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          u.getId());
        m.put("name",        u.getName());
        m.put("email",       u.getEmail());
        m.put("role",        u.getRole().name());
        m.put("enabled",     u.isEnabled());
        m.put("phoneNumber", u.getPhoneNumber() != null ? u.getPhoneNumber() : "");
        m.put("photoUrl",    u.getPhotoUrl()    != null ? u.getPhotoUrl()    : "");
        m.put("createdAt",   u.getCreatedAt()   != null ? u.getCreatedAt().toString() : null);
        return m;
    }
}