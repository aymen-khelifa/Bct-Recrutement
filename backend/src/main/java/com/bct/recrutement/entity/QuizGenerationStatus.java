package com.bct.recrutement.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "quiz_generation_status")
public class QuizGenerationStatus {

    public enum State { PENDING, RUNNING, DONE, ERROR }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sujet_id", nullable = false, unique = true)
    private Long sujetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private State state = State.PENDING;

    @Column(nullable = false)
    private int progress = 0;

    @Column(length = 512)
    private String message;

    @Column(name = "error_message", length = 1024)
    private String errorMessage;

    @Column(name = "quiz_id")
    private Long quizId;

    public Long   getId()                    { return id; }
    public void   setId(Long id)             { this.id = id; }
    public Long   getSujetId()               { return sujetId; }
    public void   setSujetId(Long v)         { this.sujetId = v; }
    public State  getState()                 { return state; }
    public void   setState(State v)          { this.state = v; }
    public int    getProgress()              { return progress; }
    public void   setProgress(int v)         { this.progress = v; }
    public String getMessage()               { return message; }
    public void   setMessage(String v)       { this.message = v; }
    public String getErrorMessage()          { return errorMessage; }
    public void   setErrorMessage(String v)  { this.errorMessage = v; }
    public Long   getQuizId()                { return quizId; }
    public void   setQuizId(Long v)          { this.quizId = v; }
}