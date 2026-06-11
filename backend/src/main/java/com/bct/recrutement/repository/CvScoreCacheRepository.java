package com.bct.recrutement.repository;

import com.bct.recrutement.entity.CvScoreCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CvScoreCacheRepository extends JpaRepository<CvScoreCache, Long> {

    /** Lookup principal — O(1) grâce à l'index unique sur cache_key */
    Optional<CvScoreCache> findByCacheKey(String cacheKey);

    /** Tous les caches pour un sujet donné */
    List<CvScoreCache> findBySujetId(Long sujetId);

    /** Tous les caches pour un hash CV (même CV, sujets différents) */
    List<CvScoreCache> findByCvHash(String cvHash);

    /** Vérifier existence sans charger l'objet */
    boolean existsByCacheKey(String cacheKey);

    /** Nettoyage : supprimer les entrées plus vieilles que N jours */
    @Modifying
    @Transactional
    @Query("DELETE FROM CvScoreCache c WHERE c.calculeLe < :before")
    int deleteOlderThan(LocalDateTime before);

    /** Stats : nombre total d'entrées en cache */
    long count();

    /** Stats : total de hits (réutilisations) */
    @Query("SELECT COALESCE(SUM(c.hits), 0) FROM CvScoreCache c")
    long totalHits();
}