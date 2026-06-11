package com.bct.recrutement.repository;

import com.bct.recrutement.entity.Profilcandidat;
import com.bct.recrutement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface Profilcandidatrepository extends JpaRepository<Profilcandidat, Long> {

    // Trouver le profil d'un candidat via son User
    Optional<Profilcandidat> findByUser(User user);
    // Trouver par userId directement
    Optional<Profilcandidat> findByUserId(Long userId);

    // Vérifier si un profil existe déjà pour cet utilisateur
    boolean existsByUser(User user);
}