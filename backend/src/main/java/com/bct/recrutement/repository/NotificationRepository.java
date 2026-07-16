package com.bct.recrutement.repository;

import com.bct.recrutement.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Toutes les notifs d'un candidat, les plus récentes en premier
    List<Notification> findByCandidatIdOrderByCreatedAtDesc(Long candidatId);

    // Marquer toutes comme lues
    @Modifying
    @Query("UPDATE Notification n SET n.lu = true WHERE n.candidatId = :candidatId")
    void markAllReadByCandidatId(Long candidatId);
}