package com.bct.recrutement.repository;

import com.bct.recrutement.entity.UserResponse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserResponseRepository extends JpaRepository<UserResponse, Long> {
    List<UserResponse> findByCandidatIdAndQuestionQuizId(Long userId, Long quizId);
}