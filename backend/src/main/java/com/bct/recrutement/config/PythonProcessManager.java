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
public class PythonProcessManager {
    @Value("${python.executable:}")
    private String pythonExecutableConfig;

    private static final Logger log = LoggerFactory.getLogger(PythonProcessManager.class);

    @Value("${quiz.generator.port:5000}")
    private int pythonPort;
    @Value("${groq.api.key:}")
    private String groqApiKey;
    private Process pythonProcess;
    private String  pythonCmd = "python"; // Windows 3.11 → "python"

    // ── Démarrage ─────────────────────────────────────────────────────────────
    @PostConstruct
    public void start() {
        Thread t = new Thread(() -> {
            try {
                log.info("[Python] ══ Initialisation du service quiz_generator ══");

                pythonCmd = detectPython();
                if (pythonCmd == null) {
                    log.error("[Python] ❌ Python introuvable. Vérifiez votre PATH.");
                    return;
                }

                Path script = extractScript();
                installDependencies(script.getParent());
                launchProcess(script);
                waitForReady();

            } catch (Exception e) {
                log.error("[Python] ❌ {}", e.getMessage(), e);
            }
        }, "python-starter");
        t.setDaemon(true);
        t.start();
    }

    // ── Arrêt ──────────────────────────────────────────────────────────────────
    @PreDestroy
    public void stop() {
        if (pythonProcess != null && pythonProcess.isAlive()) {
            log.info("[Python] Arrêt...");
            pythonProcess.destroy();
            try {
                if (!pythonProcess.waitFor(5, TimeUnit.SECONDS))
                    pythonProcess.destroyForcibly();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                pythonProcess.destroyForcibly();
            }
        }
    }

    // ── Détecter Python dans le PATH ──────────────────────────────────────────
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


    // ── Extraire le script depuis resources/python/ ───────────────────────────
    private Path extractScript() throws IOException {
        // Windows : C:\Users\MSI\AppData\Local\Temp\bct-quiz-gen\
        Path dir    = Path.of(System.getProperty("java.io.tmpdir"), "bct-quiz-gen");
        Files.createDirectories(dir);
        Path script = dir.resolve("quiz_generator_service.py");

        try (InputStream is = getClass().getResourceAsStream("/python/quiz_generator_service.py")) {
            if (is == null) throw new FileNotFoundException(
                    "Fichier introuvable : src/main/resources/python/quiz_generator_service.py"
            );
            Files.copy(is, script, StandardCopyOption.REPLACE_EXISTING);
        }

        log.info("[Python] Script extrait : {}", script.toAbsolutePath());
        return script;
    }

    // ── pip install ───────────────────────────────────────────────────────────
    private void installDependencies(Path workDir) throws Exception {
        log.info("[Python] pip install flask groq...");

        ProcessBuilder pb = new ProcessBuilder(
                pythonCmd, "-m", "pip", "install",
                "flask", "groq",          // ← seulement ces 2 packages
                "--quiet"
        );
        pb.directory(workDir.toFile());
        pb.redirectErrorStream(true);
        pb.environment().put("PYTHONIOENCODING", "utf-8");
        pb.environment().put("PYTHONUNBUFFERED", "1");

        Process pip = pb.start();

        new Thread(() -> {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(pip.getInputStream()))) {
                String l;
                while ((l = br.readLine()) != null)
                    if (!l.isBlank()) log.debug("[pip] {}", l);
            } catch (IOException ignored) {}
        }, "pip-log").start();

        if (!pip.waitFor(5, TimeUnit.MINUTES)) {
            pip.destroyForcibly();
            throw new RuntimeException("pip install timeout");
        }
        log.info("[Python] ✅ pip OK (exit={})", pip.exitValue());
    }

    // ── Lancer le processus Python ────────────────────────────────────────────
    private void launchProcess(Path script) throws IOException {
        log.info("[Python] Lancement sur le port {}...", pythonPort);

        ProcessBuilder pb = new ProcessBuilder(
                pythonCmd,
                script.toAbsolutePath().toString(),
                "--port", String.valueOf(pythonPort)
        );
        pb.directory(script.getParent().toFile());
        pb.redirectErrorStream(true);
        pb.environment().put("PYTHONUNBUFFERED",  "1");
        pb.environment().put("PYTHONIOENCODING",  "utf-8");
        pb.environment().put("GROQ_API_KEY",      groqApiKey); // ← ajouter

        pythonProcess = pb.start();

        new Thread(() -> {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(pythonProcess.getInputStream()))) {
                String l;
                while ((l = br.readLine()) != null)
                    log.info("[Python] {}", l);
            } catch (IOException ignored) {}
        }, "python-log").start();
    }

    // ── Attendre GET /health = 200 ────────────────────────────────────────────
    private void waitForReady() throws InterruptedException {
        String url = "http://localhost:" + pythonPort + "/health";
        log.info("[Python] En attente de {} ...", url);
        log.info("[Python] (Chargement de flan-t5-base : ~1-3 min au 1er lancement)");

        for (int i = 1; i <= 60; i++) {
            // Processus Python mort ?
            if (pythonProcess != null && !pythonProcess.isAlive()) {
                log.error("[Python] ❌ Processus Python terminé prématurément !");
                return;
            }

            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(2000);
                c.setReadTimeout(2000);
                if (c.getResponseCode() == 200) {
                    log.info("[Python] ✅ Service prêt sur le port {} !", pythonPort);
                    return;
                }
            } catch (Exception ignored) {}

            log.info("[Python] Attente {}/60 (5s)...", i);
            Thread.sleep(5000);
        }
        log.warn("[Python] ⚠️ Service indisponible après 5 min. Génération IA désactivée.");
    }

    // ── Health check (appelé par QuizGenerationService) ──────────────────────
    public boolean isAvailable() {
        try {
            HttpURLConnection c = (HttpURLConnection)
                    new URL("http://localhost:" + pythonPort + "/health").openConnection();
            c.setConnectTimeout(1000);
            c.setReadTimeout(1000);
            return c.getResponseCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }
}*/