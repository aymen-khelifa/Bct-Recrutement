package com.bct.recrutement.controller;

import com.bct.recrutement.entity.User;
import com.bct.recrutement.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/candidat")
public class CandidatController {

    @Autowired
    private UserService userService;

    @GetMapping("/profile")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<User> getProfile() {
        // Récupérer l'email de l'utilisateur connecté
        String email = ((UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUsername();

        // Charger l'utilisateur depuis la base de données
        User user = userService.findByEmail(email);

        return ResponseEntity.ok(user);
    }
}