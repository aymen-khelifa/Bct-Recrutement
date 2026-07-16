package com.bct.recrutement.controller;

import com.bct.recrutement.repository.CandidatureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * StatsController — version SANS DTO, utilise Map<String,Object> directement.
 * Fonctionnellement identique à la version avec DTO (même JSON en sortie),
 * juste moins de fichiers à maintenir.
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    @Autowired
    private CandidatureRepository candidatureRepository;

    @GetMapping("/candidatures-par-jour")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getCandidaturesParJour() {
        LocalDate depuis = LocalDate.now().minusDays(29);
        List<Object[]> raw = candidatureRepository.countParJourDepuis(depuis);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM");

        List<Map<String, Object>> result = raw.stream()
                .map(row -> {
                    LocalDate date  = (LocalDate) row[0];
                    Long      total = (Long) row[1];
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", date.format(fmt));
                    m.put("total", total);
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/top-sujets")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getTopSujets() {
        List<Object[]> raw = candidatureRepository.topSujetsByCandidatures();

        List<Map<String, Object>> result = raw.stream()
                .limit(6)
                .map(row -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("sujet", row[0]);
                    m.put("total", row[1]);
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}