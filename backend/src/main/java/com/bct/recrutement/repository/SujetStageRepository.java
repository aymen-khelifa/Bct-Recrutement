package com.bct.recrutement.repository;

import com.bct.recrutement.entity.SujetStage;
import com.bct.recrutement.entity.StatutSujet;
import com.bct.recrutement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SujetStageRepository extends JpaRepository<SujetStage, Long> {
    // Tous les sujets publiés (pour les candidats)
    List<SujetStage> findByStatut(StatutSujet statut);

    // Sujets créés par un RH spécifique
    List<SujetStage> findByCreateur(User createur);

    // Vérifier si un code sujet existe déjà
    boolean existsByCodeSujet(String codeSujet);
    @Query("""
        SELECT s FROM SujetStage s
        WHERE s.statut = 'PUBLIE'
          AND (
               LOWER(s.titre)       LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(s.departement) LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(s.specialite)  LIKE LOWER(CONCAT('%', :q, '%'))
          )
    """)
    List<SujetStage> searchPublies(@Param("q") String keyword);

    // Filtre par département
    List<SujetStage> findByDepartementAndStatut(String departement, StatutSujet statut);

    // Filtre par niveau d'études
    List<SujetStage> findByNiveauEtudesAndStatut(String niveauEtudes, StatutSujet statut);


    // Chercher par code
    Optional<SujetStage> findByCodeSujet(String codeSujet);
}