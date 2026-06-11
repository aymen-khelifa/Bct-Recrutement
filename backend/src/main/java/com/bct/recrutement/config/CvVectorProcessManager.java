/* package com.bct.recrutement.config;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Paths;


@Component
public class CvVectorProcessManager {

    private static final Logger log = LoggerFactory.getLogger(CvVectorProcessManager.class);
    private static final int    PORT          = 5003;
    private static final int    MAX_ATTEMPTS  = 30;   // 30 × 2 s = 60 s max
    private static final int    RETRY_DELAY   = 2000;

    @Value("${python.executable:python}")
    private String pythonExecutable;

    @Value("${python.scripts.dir:src/main/resources/python}")
    private String scriptsDir;

    private Process process;

    @EventListener(ApplicationReadyEvent.class)
    public void startService() {
        Thread t = new Thread(() -> {
            try {
                String scriptPath = Paths.get(scriptsDir, "cv_vector_service.py")
                        .toAbsolutePath().toString();

                ProcessBuilder pb = new ProcessBuilder(pythonExecutable, scriptPath);
                pb.environment().put("CV_VECTOR_PORT", String.valueOf(PORT));
                pb.redirectErrorStream(false);
                pb.directory(new File(scriptsDir).getAbsoluteFile());

                process = pb.start();
                log.info("[CvVector] Processus Python démarré (PID={})", process.pid());

                // Thread de log stdout
                Thread stdoutThread = new Thread(() -> {
                    try (BufferedReader r = new BufferedReader(
                            new InputStreamReader(process.getInputStream()))) {
                        String line;
                        while ((line = r.readLine()) != null) {
                            log.info("[cv-vector-log] [CvVector-py] {}", line);
                        }
                    } catch (IOException ignored) {}
                }, "cv-vector-log");
                stdoutThread.setDaemon(true);
                stdoutThread.start();

                // Thread de log stderr
                Thread stderrThread = new Thread(() -> {
                    try (BufferedReader r = new BufferedReader(
                            new InputStreamReader(process.getErrorStream()))) {
                        String line;
                        while ((line = r.readLine()) != null) {
                            log.info("[cv-vector-log] [CvVector-py] {}", line);
                        }
                    } catch (IOException ignored) {}
                }, "cv-vector-err");
                stderrThread.setDaemon(true);
                stderrThread.start();

                // Attendre que Flask réponde sur /health
                waitForReady();

            } catch (Exception e) {
                log.error("[CvVector] Impossible de démarrer cv_vector_service.py", e);
            }
        }, "cv-vector-starter");
        t.setDaemon(true);
        t.start();
    }

    private void waitForReady() throws InterruptedException {
        String healthUrl = "http://localhost:" + PORT + "/health";
        for (int i = 1; i <= MAX_ATTEMPTS; i++) {
            try {
                HttpURLConnection conn = (HttpURLConnection)
                        new URL(healthUrl).openConnection();
                conn.setConnectTimeout(1000);
                conn.setReadTimeout(1000);
                conn.setRequestMethod("GET");
                if (conn.getResponseCode() == 200) {
                    log.info("[cv-vector-starter] [CvVector] ✅ Service RAG prêt sur le port {} !", PORT);
                    return;
                }
            } catch (IOException ignored) {}
            Thread.sleep(RETRY_DELAY);
        }
        log.warn("[CvVector] ⚠️ Service non disponible après {}s", MAX_ATTEMPTS * RETRY_DELAY / 1000);
    }

    @PreDestroy
    public void stopService() {
        if (process != null && process.isAlive()) {
            process.destroy();
            log.info("[CvVector] Service arrêté");
        }
    }
}*/