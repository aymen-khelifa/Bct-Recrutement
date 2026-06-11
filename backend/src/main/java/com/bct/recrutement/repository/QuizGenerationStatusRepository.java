package com.bct.recrutement.repository;

import com.bct.recrutement.entity.QuizGenerationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QuizGenerationStatusRepository extends JpaRepository<QuizGenerationStatus, Long> {

    Optional<QuizGenerationStatus> findBySujetId(Long sujetId);
}
