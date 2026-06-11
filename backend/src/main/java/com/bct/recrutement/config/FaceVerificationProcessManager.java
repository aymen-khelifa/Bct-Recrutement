/* package com.bct.recrutement.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.*;
import java.util.concurrent.TimeUnit;


@Component
public class FaceVerificationProcessManager {
    @Value("${python.executable:}")
    private String pythonExecutableConfig;

    private static final Logger log = LoggerFactory.getLogger(FaceVerificationProcessManager.class);

    @Value("${flask.face.service.port:5002}")
    private int port;

    @Value("${flask.face.script:}")
    private String scriptOverride;

    private Process process;
    private String  pythonCmd;

    // ── Démarrage ─────────────────────────────────────────────────────────────
    @PostConstruct
    public void start() {
        Thread t = new Thread(() -> {
            try {
                log.info("[FaceML] ═══ Démarrage service Face Recognition ═══");
                pythonCmd = detectPython();
                if (pythonCmd == null) { log.error("[FaceML] Python introuvable"); return; }

                Path script = localiserScript();
                if (script == null) { log.error("[FaceML] face_verification_service.py introuvable"); return; }

                installerDependances(script.getParent());
                lancerProcessus(script);
                attendreReady();
            } catch (Exception e) {
                log.error("[FaceML] Erreur démarrage : {}", e.getMessage());
            }
        }, "face-ml-starter");
        t.setDaemon(true);
        t.start();
    }

    // ── Arrêt propre ──────────────────────────────────────────────────────────
    @PreDestroy
    public void stop() {
        if (process != null && process.isAlive()) {
            process.destroy();
            try { process.waitFor(5, TimeUnit.SECONDS); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }
    }

    // ── Détecter Python ───────────────────────────────────────────────────────
    private String detectPython() {
        // 1. Si python.executable est défini (venv) → on l'utilise en priorité
        if (pythonExecutableConfig != null && !pythonExecutableConfig.isBlank()) {
            try {
                ProcessBuilder pb = new ProcessBuilder(pythonExecutableConfig, "--version");
                pb.redirectErrorStream(true);
                Process p = pb.start();
                String out = new String(p.getInputStream().readAllBytes()).trim();
                if (p.waitFor(5, TimeUnit.SECONDS) && out.startsWith("Python")) {
                    log.info("[Python venv] : '{}' → {}", pythonExecutableConfig, out);
                    return pythonExecutableConfig;
                }
            } catch (Exception e) {
                log.warn("[Python venv] '{}' inutilisable ({}), fallback auto-détection",
                        pythonExecutableConfig, e.getMessage());
            }
        }
        // 2. Fallback : auto-détection (comportement actuel)
        for (String cmd : new String[]{"python", "python3", "py"}) {
            try {
                ProcessBuilder pb = new ProcessBuilder(cmd, "--version");
                pb.redirectErrorStream(true);
                Process p = pb.start();
                String out = new String(p.getInputStream().readAllBytes()).trim();
                if (p.waitFor(5, TimeUnit.SECONDS) && out.startsWith("Python")) {
                    log.info("[Python] : '{}' → {}", cmd, out);
                    return cmd;
                }
            } catch (Exception ignored) {}
        }
        return null;
    }


    // ── Localiser le script ───────────────────────────────────────────────────
    private Path localiserScript() throws IOException {
        // Priorité 1 : chemin explicite dans application.properties
        if (scriptOverride != null && !scriptOverride.isBlank()) {
            Path p = Paths.get(scriptOverride);
            if (Files.exists(p)) {
                log.info("[FaceML] Script (override) : {}", p.toAbsolutePath());
                return p;
            }
        }

        // Priorité 2 : dossier python des resources (mode développement)
        Path devPath = Paths.get("src/main/resources/python/face_verification_service.py");
        if (Files.exists(devPath)) {
            log.info("[FaceML] Script (dev) : {}", devPath.toAbsolutePath());
            return devPath;
        }

        // Priorité 3 : extraire depuis le JAR vers tmp
        Path dir    = Paths.get(System.getProperty("java.io.tmpdir"), "bct-face-ml");
        Files.createDirectories(dir);
        Path script = dir.resolve("face_verification_service.py");

        try (InputStream is = getClass().getResourceAsStream("/python/face_verification_service.py")) {
            if (is == null) {
                log.error("[FaceML] face_verification_service.py absent de src/main/resources/python/");
                return null;
            }
            Files.copy(is, script, StandardCopyOption.REPLACE_EXISTING);
            log.info("[FaceML] Script extrait (tmp) : {}", script.toAbsolutePath());
            log.warn("[FaceML] ⚠️ Mode JAR — modèles DeepFace téléchargés au premier lancement");
        }

        return script;
    }

    // ── Installer les dépendances Python ──────────────────────────────────────
    private void installerDependances(Path workDir) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
                pythonCmd, "-m", "pip", "install", "--quiet",
                "flask", "flask-cors", "deepface", "opencv-python",
                "numpy", "Pillow", "tf-keras"
        );
        pb.directory(workDir.toFile());
        pb.redirectErrorStream(true);
        Process pip = pb.start();
        new Thread(() -> {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(pip.getInputStream()))) {
                String l;
                while ((l = br.readLine()) != null) log.debug("[face-pip] {}", l);
            } catch (IOException ignored) {}
        }).start();
        if (!pip.waitFor(15, TimeUnit.MINUTES)) pip.destroyForcibly();
        log.info("[FaceML] Packages Python vérifiés");
    }

    // ── Lancer le processus Flask ──────────────────────────────────────────────
    private void lancerProcessus(Path script) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(
                pythonCmd, script.toAbsolutePath().toString(), "--serve"
        );
        pb.directory(script.getParent().toFile());
        pb.redirectErrorStream(true);
        pb.environment().put("FACE_PORT",        String.valueOf(port));
        pb.environment().put("PYTHONUNBUFFERED", "1");
        pb.environment().put("PYTHONIOENCODING", "utf-8");

        process = pb.start();

        // Thread lecture logs Python
        new Thread(() -> {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String l;
                while ((l = br.readLine()) != null) log.info("[FaceML-py] {}", l);
            } catch (IOException ignored) {}
        }, "face-ml-log").start();

        log.info("[FaceML] Processus lancé (PID {})", process.pid());
    }

    // ── Attendre que /health réponde ──────────────────────────────────────────
    private void attendreReady() throws InterruptedException {
        String url = "http://localhost:" + port + "/health";
        for (int i = 1; i <= 60; i++) {
            if (process != null && !process.isAlive()) {
                log.error("[FaceML] Processus terminé (exit {})", process.exitValue());
                return;
            }
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(2000);
                c.setReadTimeout(2000);
                if (c.getResponseCode() == 200) {
                    // Lire la réponse pour confirmer le modèle
                    String body = new String(c.getInputStream().readAllBytes());
                    if (body.contains("ArcFace")) {
                        log.info("[FaceML] ✅ API Face Recognition prête — modèle ArcFace ✅");
                    } else {
                        log.info("[FaceML] ✅ API Face Recognition prête sur le port {} !", port);
                    }
                    return;
                }
            } catch (Exception ignored) {}
            if (i % 6 == 0) log.info("[FaceML] Attente {}s... (DeepFace télécharge les modèles)", i * 5);
            Thread.sleep(5000);
        }
        log.warn("[FaceML] Service indisponible après 5 min");
    }

    // ── Health check public ────────────────────────────────────────────────────
    public boolean isAvailable() {
        try {
            HttpURLConnection c = (HttpURLConnection)
                    new URL("http://localhost:" + port + "/health").openConnection();
            c.setConnectTimeout(1500);
            c.setReadTimeout(1500);
            return c.getResponseCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }
}*/