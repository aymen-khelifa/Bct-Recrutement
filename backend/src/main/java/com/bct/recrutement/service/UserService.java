package com.bct.recrutement.service;

import com.bct.recrutement.dto.RegistrationRequest;
import com.bct.recrutement.entity.Role;
import com.bct.recrutement.entity.User;
import com.bct.recrutement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private VerificationTokenService tokenService;

    @Transactional
    public User registerUser(RegistrationRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email déjà utilisé");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        user.setEnabled(false);
        user.setRole(Role.ROLE_CANDIDAT);

        user = userRepository.save(user);

        // Générer et envoyer OTP
        tokenService.sendOtp(user);

        return user;
    }

    @Transactional
    public User enableUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setEnabled(true);
        return userRepository.save(user);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Supprime un utilisateur et TOUTES ses dépendances manuellement
     * pour contourner les erreurs de clé étrangère MySQL.
     */
    @Transactional
    public void deleteUserSafely(Long userId) {
        if (!userRepository.existsById(userId)) {
            return;
        }

        // 1. Dépendances directes
        entityManager.createNativeQuery("DELETE FROM refresh_token WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM verification_tokens WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM password_reset_token WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM profil_candidats WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();

        // 2. Quiz et réponses
        entityManager.createNativeQuery("DELETE FROM quiz_session WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM user_response WHERE candidat_id = :id")
                .setParameter("id", userId).executeUpdate();

        // 3. Notifications
        entityManager.createNativeQuery("DELETE FROM notifications WHERE candidat_id = :id")
                .setParameter("id", userId).executeUpdate();

        // 4. Candidatures et entretiens liés
        entityManager.createNativeQuery("DELETE FROM entretiens WHERE candidature_id IN (SELECT id FROM candidatures WHERE candidat_id = :id)")
                .setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM candidatures WHERE candidat_id = :id")
                .setParameter("id", userId).executeUpdate();

        // 5. Suppression finale de l'utilisateur
        userRepository.deleteById(userId);
    }
}