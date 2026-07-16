package com.bct.recrutement.repository;

import com.bct.recrutement.entity.Candidature;
import com.bct.recrutement.entity.Candidature.StatutCandidature;
import com.bct.recrutement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CandidatureRepository extends JpaRepository<Candidature, Long> {

    // Trouver les candidatures d'un candidat
    List<Candidature> findByCandidatOrderByDateDepotDesc(User candidat);

    // Compter les candidatures d'un candidat
    long countByCandidat(User candidat);

    // Vérifier si une candidature existe pour un candidat et un sujet
    Optional<Candidature> findByCandidatIdAndSujetId(Long candidatId, Long sujetId);

    // ── Nouvelles méthodes pour le filtrage ────────────────────────────────

    /**
     * Trouver toutes les candidatures pour un sujet donné
     */
    List<Candidature> findBySujetId(Long sujetId);

    /**
     * Trouver les candidatures d'un sujet avec un statut donné
     */
    List<Candidature> findBySujetIdAndStatut(Long sujetId, StatutCandidature statut);

    /**
     * Trouver les candidatures présélectionnées pour un sujet
     * (PRESELECTIONNE_CV ou PRESELECTIONNE_LETTRE)
     */
    default List<Candidature> findPreselectionneesBySujetId(Long sujetId) {
        return findBySujetId(sujetId).stream()
                .filter(c -> c.getStatut() == StatutCandidature.PRESELECTIONNE_CV)
                .toList();
    }

    /**
     * Trouver les candidatures éliminées pour un sujet
     * (ELIMINE_CV ou ELIMINE_LETTRE)
     */
    default List<Candidature> findElimineesBySujetId(Long sujetId) {
        return findBySujetId(sujetId).stream()
                .filter(c -> c.getStatut() == StatutCandidature.ELIMINE_CV )
                .toList();
    }
    @Query("SELECT c.dateDepot, COUNT(c) FROM Candidature c " +
            "WHERE c.dateDepot >= :depuis " +
            "GROUP BY c.dateDepot " +
            "ORDER BY c.dateDepot ASC")
    List<Object[]> countParJourDepuis(@Param("depuis") LocalDate depuis);

    // Top sujets par nombre de candidatures
    // row[0] = String (titre sujet), row[1] = Long (count)
    @Query("SELECT c.sujet.titre, COUNT(c) FROM Candidature c " +
            "GROUP BY c.sujet.titre " +
            "ORDER BY COUNT(c) DESC")
    List<Object[]> topSujetsByCandidatures();
}