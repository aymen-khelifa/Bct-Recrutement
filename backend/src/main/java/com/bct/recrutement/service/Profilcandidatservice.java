package com.bct.recrutement.service;

import com.bct.recrutement.entity.Profilcandidat;
import com.bct.recrutement.entity.Profilcandidat.TypeDocumentIdentite;
import com.bct.recrutement.entity.User;
import com.bct.recrutement.repository.Profilcandidatrepository;
import com.bct.recrutement.repository.UserRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Map;

@Service
public class Profilcandidatservice {

    // ── Cloudinary ────────────────────────────────────────────────────────
    private final Cloudinary cloudinary;

    public Profilcandidatservice(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}")    String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {

        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key",    apiKey,
                "api_secret", apiSecret,
                "secure",     true
        ));
    }

    @Autowired private Profilcandidatrepository profilRepository;
    @Autowired private UserRepository           userRepository;
    @Autowired private UserService              userService;

    // ── Créer ou mettre à jour le profil ─────────────────────────────────
    @Transactional
    public Map<String, Object> saveOrUpdate(String email, Map<String, Object> data, MultipartFile cvFile) {
        User user = userService.findByEmail(email);

        Profilcandidat profil = profilRepository.findByUser(user)
                .orElse(Profilcandidat.builder().user(user).build());

        if (data.containsKey("universite"))              profil.setUniversite((String) data.get("universite"));
        if (data.containsKey("specialite"))              profil.setSpecialite((String) data.get("specialite"));
        if (data.containsKey("nationalite"))             profil.setNationalite((String) data.get("nationalite"));
        if (data.containsKey("cursusActuel"))            profil.setCursusActuel((String) data.get("cursusActuel"));
        if (data.containsKey("niveauInstructionActuel")) profil.setNiveauInstructionActuel((String) data.get("niveauInstructionActuel"));
        if (data.containsKey("numeroDocument"))          profil.setNumeroDocument((String) data.get("numeroDocument"));

        if (data.containsKey("moyDerAnnee"))
            profil.setMoyDerAnnee(Float.parseFloat(data.get("moyDerAnnee").toString()));
        if (data.containsKey("moyAvantDerAnnee"))
            profil.setMoyAvantDerAnnee(Float.parseFloat(data.get("moyAvantDerAnnee").toString()));

        profil.setDateSoumission(LocalDate.now());

        if (data.containsKey("typeDocumentIdentite"))
            profil.setTypeDocumentIdentite(
                    TypeDocumentIdentite.valueOf((String) data.get("typeDocumentIdentite"))
            );

        // ── Upload CV → Cloudinary (remplace l'ancien saveCvFile local) ───
        if (cvFile != null && !cvFile.isEmpty()) {
            String[] cvResult = uploadCvCloudinary(cvFile, user.getId());
            profil.setCv(cvResult[0]);          // URL Cloudinary
            profil.setCvPublicId(cvResult[1]);  // public_id pour Signed URLs
        }

        return toMap(profilRepository.save(profil));
    }

    // ── Upload CV vers Cloudinary ─────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private String[] uploadCvCloudinary(MultipartFile file, Long userId) {
        try {
            String originalName = file.getOriginalFilename();
            String ext = (originalName != null && originalName.contains("."))
                    ? originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase()
                    : "pdf";

            String resourceType = "raw"; // PDF et Word → raw
            // Extension dans le public_id → Cloudinary sert le bon type MIME
            String publicId = "bct-recrutement/cv/cv_" + userId + "_" + System.currentTimeMillis() + "." + ext;

            Map<String, Object> params = ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "public_id",     publicId,
                    "overwrite",     true,
                    "tags",          new String[]{"cv", "bct", "candidat-" + userId},
                    "context",       "user_id=" + userId + "|type=cv|uploaded_at=" + LocalDate.now()
            );

            Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), params);
            String url   = (String) result.get("secure_url");
            String pubId = (String) result.get("public_id");

            // Supprimer la signature s--xxx-- de l'URL avant de stocker
            // URL signée  : https://res.cloudinary.com/xxx/raw/upload/s--ABC123--/v123/folder/file.pdf
            // URL propre  : https://res.cloudinary.com/xxx/raw/upload/v123/folder/file.pdf
            url = url.replaceAll("/s--[^/]+--", "");

            return new String[]{ url, pubId };

        } catch (IOException e) {
            throw new RuntimeException("Erreur upload CV Cloudinary : " + e.getMessage());
        }
    }

    // ── Récupérer mon profil (CANDIDAT) ───────────────────────────────────
    public Map<String, Object> getMonProfil(String email) {
        User user = userService.findByEmail(email);
        Profilcandidat profil = profilRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Profil non trouvé. Veuillez compléter votre profil."));
        return toMap(profil);
    }

    // ── Récupérer le profil d'un candidat par userId (RH) ─────────────────
    public Map<String, Object> getProfilByUserId(Long userId) {
        Profilcandidat profil = profilRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profil introuvable pour l'utilisateur : " + userId));
        return toMap(profil);
    }

    // ── Mapper ────────────────────────────────────────────────────────────
    private Map<String, Object> toMap(Profilcandidat p) {
        return Map.ofEntries(
                Map.entry("id",                      p.getId()),
                Map.entry("userId",                  p.getUser().getId()),
                Map.entry("candidatNom",             p.getUser().getName()),
                Map.entry("candidatEmail",           p.getUser().getEmail()),
                Map.entry("specialite",              p.getSpecialite()              != null ? p.getSpecialite()              : ""),
                Map.entry("nationalite",             p.getNationalite()             != null ? p.getNationalite()             : ""),
                Map.entry("cursusActuel",            p.getCursusActuel()            != null ? p.getCursusActuel()            : ""),
                Map.entry("niveauInstructionActuel", p.getNiveauInstructionActuel() != null ? p.getNiveauInstructionActuel() : ""),
                Map.entry("moyDerAnnee",             p.getMoyDerAnnee()             != null ? p.getMoyDerAnnee()             : 0f),
                Map.entry("moyAvantDerAnnee",        p.getMoyAvantDerAnnee()        != null ? p.getMoyAvantDerAnnee()        : 0f),
                Map.entry("dateSoumission",          p.getDateSoumission()          != null ? p.getDateSoumission().toString() : ""),
                Map.entry("cv",                      p.getCv()                      != null ? p.getCv()                      : ""),
                Map.entry("typeDocumentIdentite",    p.getTypeDocumentIdentite()    != null ? p.getTypeDocumentIdentite().name() : ""),
                Map.entry("numeroDocument",          p.getNumeroDocument()          != null ? p.getNumeroDocument()          : ""),
                Map.entry("universite",              p.getUniversite()              != null ? p.getUniversite()              : "")
        );
    }
}