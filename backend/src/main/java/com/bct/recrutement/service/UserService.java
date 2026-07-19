package com.bct.recrutement.service;

import com.bct.recrutement.entity.Candidature;
import com.bct.recrutement.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Delete a user and ALL of their dependencies manually to bypass
     * existing foreign key constraints in the database that don't have ON DELETE CASCADE yet.
     */
    @Transactional
    public void deleteUserSafely(Long userId) {
        if (!userRepository.existsById(userId)) {
            return;
        }

        // 1. Delete tokens and profile (Direct User dependencies)
        entityManager.createNativeQuery("DELETE FROM refresh_token WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM verification_tokens WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM password_reset_token WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM profil_candidats WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();

        // 2. Delete quiz related dependencies
        entityManager.createNativeQuery("DELETE FROM quiz_session WHERE user_id = :id")
                .setParameter("id", userId).executeUpdate();
        
        // Note: Table name for UserResponse might be user_response by default
        entityManager.createNativeQuery("DELETE FROM user_response WHERE candidat_id = :id")
                .setParameter("id", userId).executeUpdate();

        // 3. Delete notifications
        entityManager.createNativeQuery("DELETE FROM notifications WHERE candidat_id = :id")
                .setParameter("id", userId).executeUpdate();

        // 4. Delete candidatures and their children (entretiens)
        entityManager.createNativeQuery("DELETE FROM entretiens WHERE candidature_id IN (SELECT id FROM candidatures WHERE candidat_id = :id)")
                .setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM candidatures WHERE candidat_id = :id")
                .setParameter("id", userId).executeUpdate();

        // 5. Finally, delete the User
        userRepository.deleteById(userId);
    }
}