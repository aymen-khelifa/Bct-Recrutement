package com.bct.recrutement.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class CvVectorClient {

    private static final Logger log = LoggerFactory.getLogger(CvVectorClient.class);

    @Autowired private RestTemplate restTemplate;
    @Autowired private ObjectMapper objectMapper;

    // URL du microservice Flask
    @Value("${flask.cv.url:http://localhost:5001}")
    private String flaskUrl;

    // ── Indexer le CONTENU d'un CV (async, à la postulation) ──────────────────
    @Async
    public void indexerCv(Long candidatureId, String candidatNom, String sujetTitre, String cvUrl) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("candidatureId", candidatureId);
            body.put("candidatNom",   candidatNom);
            body.put("sujetTitre",    sujetTitre);
            body.put("cvUrl",         cvUrl);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            restTemplate.postForEntity(flaskUrl + "/cv/index",
                    new HttpEntity<>(body, headers), Map.class);

            log.info("[CvVector] CV indexé pour candidature #{}", candidatureId);
        } catch (Exception e) {
            log.error("[CvVector] échec indexation CV #{} : {}", candidatureId, e.getMessage());
        }
    }

    // ── Indexer / mettre à jour UNE fiche candidat (async, upsert ciblé) ──────
    @Async
    public void indexerFiche(Long candidatureId, String candidatNom, String texteFiche) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("candidatureId", candidatureId);
            body.put("candidatNom",   candidatNom);
            body.put("texte",         texteFiche);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            restTemplate.postForEntity(flaskUrl + "/candidat/index",
                    new HttpEntity<>(body, headers), Map.class);

            log.info("[CvVector] fiche indexée pour candidature #{}", candidatureId);
        } catch (Exception e) {
            log.error("[CvVector] échec indexation fiche #{} : {}", candidatureId, e.getMessage());
        }
    }
    public boolean indexerCvSync(Long candidatureId, String candidatNom, String sujetTitre, String cvUrl) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("candidatureId", candidatureId);
            body.put("candidatNom",   candidatNom);
            body.put("sujetTitre",    sujetTitre);
            body.put("cvUrl",         cvUrl);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            restTemplate.postForEntity(flaskUrl + "/cv/index",
                    new HttpEntity<>(body, headers), Map.class);
            return true;
        } catch (Exception e) {
            log.error("[CvVector] échec indexation CV #{} : {}", candidatureId, e.getMessage());
            return false;
        }
    }

    // ── Indexer TOUTES les fiches en UN appel (batch, après filtrage) ─────────
    public void indexerFiches(List<Map<String, Object>> fiches) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("fiches", fiches);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            restTemplate.postForEntity(flaskUrl + "/candidat/index-batch",
                    new HttpEntity<>(body, headers), Map.class);

            log.info("[CvVector] {} fiches candidats indexées (batch)", fiches.size());
        } catch (Exception e) {
            log.error("[CvVector] échec indexation fiches batch : {}", e.getMessage());
        }
    }

    // ── Rechercher dans les CV + fiches (utilisé par le chatbot) ──────────────
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> rechercher(String query, int topK) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("query", query);
            body.put("top_k", topK);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    flaskUrl + "/cv/search",
                    new HttpEntity<>(body, headers), Map.class);

            if (resp.getBody() == null) return List.of();
            Object r = resp.getBody().get("resultats");
            return r instanceof List ? (List<Map<String, Object>>) r : List.of();

        } catch (Exception e) {
            log.error("[CvVector] échec recherche : {}", e.getMessage());
            return List.of();   // dégradation propre : le chatbot continue sans le vectoriel
        }
    }
}