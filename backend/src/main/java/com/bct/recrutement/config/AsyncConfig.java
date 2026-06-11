package com.bct.recrutement.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AsyncConfig
 *
 * Active @Async (pour ScoringService) et @Scheduled (pour TokenCleanupService).
 *
 * ThreadPoolTaskExecutor :
 *   - corePoolSize=3   : 3 threads toujours actifs
 *   - maxPoolSize=10   : jusqu'à 10 threads en pic
 *   - queueCapacity=50 : 50 tâches en attente si tous les threads sont occupés
 *   - Nommés "scoring-X" pour faciliter le debug dans les logs
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

    @Bean(name = "scoringExecutor")
    public Executor scoringExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("scoring-");

        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);

        executor.initialize();
        return executor;
    }
    @Bean(name = "emailExecutor")
    public Executor emailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);  // nombre de threads actifs
        executor.setMaxPoolSize(20);   // maximum de threads
        executor.setQueueCapacity(50); // emails en attente si tous les threads sont occupés
        executor.setThreadNamePrefix("EmailThread-");
        executor.initialize();
        return executor;
    }
    @Bean(name = "quizGenerationExecutor")
    public Executor quizGenerationExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(2);
        exec.setMaxPoolSize(4);
        exec.setQueueCapacity(20);
        exec.setThreadNamePrefix("quiz-gen-");
        exec.initialize();
        return exec;
    }
}