package com.bct.recrutement.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
public class UserResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "candidat_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User candidat;

    @ManyToOne
    @JoinColumn(name = "question_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Question question;

    @ManyToOne
    @JoinColumn(name = "option_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private QuizOption selectedOption;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getCandidat() {
        return candidat;
    }

    public void setCandidat(User candidat) {
        this.candidat = candidat;
    }

    public Question getQuestion() {
        return question;
    }

    public void setQuestion(Question question) {
        this.question = question;
    }

    public QuizOption getSelectedOption() {
        return selectedOption;
    }

    public void setSelectedOption(QuizOption selectedOption) {
        this.selectedOption = selectedOption;
    }
}
