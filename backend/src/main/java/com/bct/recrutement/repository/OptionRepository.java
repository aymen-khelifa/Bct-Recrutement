package com.bct.recrutement.repository;

import com.bct.recrutement.entity.QuizOption;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OptionRepository extends JpaRepository<QuizOption, Long> {
}