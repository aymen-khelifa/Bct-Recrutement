package com.bct.recrutement.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private boolean enabled = false;

    @Column(unique = true, nullable = true, name = "phone_number")
    @Size(min = 8, max = 8, message = "Phone number must be between 10 and 15 digits")
    @Pattern(regexp = "^(?:\\+216|0)?[0-9]{8}$", message = "Invalid phone number format")
    private String phoneNumber;

    @Column(name = "photo_url")
    private String photoUrl;

    // ── NOUVEAU : Public ID Cloudinary pour la photo (Signed URLs) ─────────
    @Column(name = "photo_public_id", length = 255)
    private String photoPublicId;

    @Enumerated(EnumType.STRING)
    private Role role = Role.ROLE_CANDIDAT;

    private int otpAttempts = 0;
    private LocalDateTime otpBlockedUntil;

    public User() {}

    public User(String name, String email, String password) {
        this.name     = name;
        this.email    = email;
        this.password = password;
    }

    public Long getId()                                  { return id; }
    public void setId(Long id)                           { this.id = id; }
    public String getName()                              { return name; }
    public void setName(String name)                     { this.name = name; }
    public String getEmail()                             { return email; }
    public void setEmail(String email)                   { this.email = email; }
    public String getPassword()                          { return password; }
    public void setPassword(String password)             { this.password = password; }
    public boolean isEnabled()                           { return enabled; }
    public void setEnabled(boolean enabled)              { this.enabled = enabled; }
    public Role getRole()                                { return role; }
    public void setRole(Role role)                       { this.role = role; }
    public int getOtpAttempts()                          { return otpAttempts; }
    public void setOtpAttempts(int otpAttempts)          { this.otpAttempts = otpAttempts; }
    public String getPhoneNumber()                       { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber)       { this.phoneNumber = phoneNumber; }
    public String getPhotoUrl()                          { return photoUrl; }
    public void setPhotoUrl(String url)                  { this.photoUrl = url; }
    public String getPhotoPublicId()                     { return photoPublicId; }
    public void setPhotoPublicId(String photoPublicId)   { this.photoPublicId = photoPublicId; }
    public LocalDateTime getCreatedAt()                  { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt)    { this.createdAt = createdAt; }
    public LocalDateTime getOtpBlockedUntil()            { return otpBlockedUntil; }
    public void setOtpBlockedUntil(LocalDateTime v)      { this.otpBlockedUntil = v; }
}