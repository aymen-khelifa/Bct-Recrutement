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
public class CvScorerProcessManager {
    @Value("${python.executable:}")
    private String pythonExecutableConfig;
    private static final Logger log = LoggerFactory.getLogger(CvScorerProcessManager.class);

    @Value("${cv.scorer.port:5001}")
    private int port;

    @Value("${cv.scorer.script:}")
    private String scriptOverride;

    @Value("${cv.scorer.model.dir:./models_v2}")
    private String modelDir;

    private Process process;
    private String  pythonCmd;

    // ── Démarrage ─────────────────────────────────────────────────────────────
    @PostConstruct
    public void start() {
        Thread t = new Thread(() -> {
            try {
                log.info("[CvML] ═══ Démarrage service ML v2 ═══");
                pythonCmd = detectPython();
                if (pythonCmd == null) { log.error("[CvML] Python introuvable"); return; }

                Path script = localiserScript();
                if (script == null) { log.error("[CvML] cv_ml_scorer_v2.py introuvable"); return; }

                installerDependances(script.getParent());
                lancerProcessus(script);
                attendreReady();
            } catch (Exception e) {
                log.error("[CvML] Erreur démarrage : {}", e.getMessage());
            }
        }, "cv-ml-starter");
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


    // ── Localiser cv_ml_scorer_v2.py ──────────────────────────────────────────
    private Path localiserScript() throws IOException {
        // Priorité 1 : chemin explicite
        if (scriptOverride != null && !scriptOverride.isBlank()) {
            Path p = Paths.get(scriptOverride);
            if (Files.exists(p)) return p;
        }

        // Priorité 2 : à côté du JAR
        Path devPath = Paths.get("src/main/resources/python/cv_scorer.py");
        if (Files.exists(devPath)) {
            log.info("[CvML] Script (dev) : {}", devPath.toAbsolutePath());
            return devPath;
        }

// Priorité 2b : à côté du JAR (mode production)
        Path local = Paths.get("./cv_scorer.py");
        if (Files.exists(local)) {
            log.info("[CvML] Script (jar) : {}", local.toAbsolutePath());
            return local;
        }

        // Priorité 3 : extraire depuis le JAR (src/main/resources/python/)
        Path dir    = Paths.get(System.getProperty("java.io.tmpdir"), "bct-cv-ml");
        Files.createDirectories(dir);
        Path script = dir.resolve("cv_scorer.py");

        try (InputStream is = getClass().getResourceAsStream("/python/cv_scorer.py")) {
            if (is == null) {
                log.error("[CvML] cv_scorer.py absent de src/main/resources/python/");
                return null;
            }
            Files.copy(is, script, StandardCopyOption.REPLACE_EXISTING);
            log.info("[CvML] Script extrait : {}", script.toAbsolutePath());
        }

        // Copier aussi cv_parser_nlp.py
        Path nlpScript = dir.resolve("cv_scorer_nlp.py");
        try (InputStream isParser = getClass().getResourceAsStream("/python/cv_scorer_nlp.py")) {
            if (isParser != null) {
                Files.copy(isParser, nlpScript, StandardCopyOption.REPLACE_EXISTING);
                log.info("[CvML] Trainer NLP extrait : {}", nlpScript.toAbsolutePath());
            } else {
                log.info("[CvML] cv_scorer_nlp.py absent — entraînement non lancé automatiquement");
            }
        }

        return script;
    }

    // ── Installer les dépendances Python ──────────────────────────────────────
    private void installerDependances(Path workDir) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
                pythonCmd, "-m", "pip", "install", "--quiet",
                "flask", "flask-cors", "pymupdf", "scikit-learn", "pandas", "numpy",
                "sentence-transformers", "nltk", "langdetect", "python-dotenv"
        );
        pb.directory(workDir.toFile());
        pb.redirectErrorStream(true);
        Process pip = pb.start();
        new Thread(() -> {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(pip.getInputStream()))) {
                String l;
                while ((l = br.readLine()) != null) log.debug("[pip] {}", l);
            } catch (IOException ignored) {}
        }).start();
        if (!pip.waitFor(10, TimeUnit.MINUTES)) pip.destroyForcibly();
        log.info("[CvML] Packages Python vérifiés");
    }

    // ── Lancer le processus Flask ──────────────────────────────────────────────
    private void lancerProcessus(Path script) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(
                pythonCmd, script.toAbsolutePath().toString(), "--serve"
        );
        pb.directory(script.getParent().toFile());
        pb.redirectErrorStream(true);
        pb.environment().put("CV_SCORER_PORT",   String.valueOf(port));
        pb.environment().put("PYTHONUNBUFFERED", "1");
        pb.environment().put("PYTHONIOENCODING", "utf-8");
        process = pb.start();

        // ── Thread lecture logs Python ──────────────────────────────
        new Thread(() -> {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String l;
                while ((l = br.readLine()) != null) log.info("[CvML-py] {}", l);
            } catch (IOException ignored) {}
        }, "cv-ml-log").start();

        log.info("[CvML] Processus lancé (PID {})", process.pid());
    }
    // ── Attendre que /health réponde ──────────────────────────────────────────
    private void attendreReady() throws InterruptedException {
        String url = "http://localhost:" + port + "/health";
        for (int i = 1; i <= 60; i++) {
            if (process != null && !process.isAlive()) {
                log.error("[CvML] Processus terminé (exit {})", process.exitValue());
                return;
            }
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(2000);
                c.setReadTimeout(2000);
                if (c.getResponseCode() == 200) {
                    log.info("[CvML] ✅ API ML prête sur le port {} !", port);
                    return;
                }
            } catch (Exception ignored) {}
            if (i % 6 == 0) log.info("[CvML] Attente {}s...", i * 5);
            Thread.sleep(5000);
        }
        log.warn("[CvML] Service indisponible après 5 min");
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