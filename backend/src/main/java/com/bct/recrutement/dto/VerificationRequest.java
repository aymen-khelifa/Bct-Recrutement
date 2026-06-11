package com.bct.recrutement.dto;


public class VerificationRequest {
    private String email;
    private String code;

    // Getters et Setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}