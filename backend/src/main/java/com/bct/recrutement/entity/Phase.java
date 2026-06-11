package com.bct.recrutement.entity;

import jakarta.persistence.*;

/**
 * Entité singleton — il n'y a toujours qu'une seule ligne (id=1).
 * Représente la phase active du processus de recrutement.
 */
@Entity
@Table(name = "phase_recrutement")
public class Phase {

    @Id
    private Long id = 1L; // singleton

    /**
     * Valeurs possibles : DEBUT | CV | QUIZ | ENTRETIEN | TERMINE
     */
    @Column(nullable = false, length = 20)
    private String phaseActuelle = "DEBUT";

    public Long   getId()              { return id; }
    public void   setId(Long id)       { this.id = id; }
    public String getPhaseActuelle()   { return phaseActuelle; }
    public void   setPhaseActuelle(String p) { this.phaseActuelle = p; }
}