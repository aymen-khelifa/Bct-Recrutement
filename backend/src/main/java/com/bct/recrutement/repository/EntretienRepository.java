package com.bct.recrutement.repository;

import com.bct.recrutement.entity.Entretien;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EntretienRepository extends JpaRepository<Entretien, Long> {
    @Query("SELECT e FROM Entretien e WHERE e.dateDebut >= :debut AND e.dateDebut < :fin")
    List<Entretien> findByMois(LocalDateTime debut, LocalDateTime fin);
    List<Entretien> findByDateDebutBetween(LocalDateTime debut, LocalDateTime fin);
    Optional<Entretien> findByRoomToken(String roomToken);
    Optional<Entretien> findByCandidatureId(Long candidatureId);
}