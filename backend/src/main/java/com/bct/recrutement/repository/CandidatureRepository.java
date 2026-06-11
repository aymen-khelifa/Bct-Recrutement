package com.bct.recrutement.repository;

import com.bct.recrutement.entity.Candidature;
import com.bct.recrutement.entity.Candidature.StatutCandidature;
import com.bct.recrutement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}