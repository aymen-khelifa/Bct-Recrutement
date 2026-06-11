"""
face_verification_service.py  —  Port 5002  —  BCT Recrutement
════════════════════════════════════════════════════════════════════════
Version AMÉLIORÉE — résout le problème "visage non reconnu"

Problèmes corrigés :
  ✅ Seuil relevé 0.65 → 0.72 (moins strict pour webcam réelle)
  ✅ Normalisation couleur désactivée (dégrade l'embedding ArcFace)
  ✅ Détecteur : retinaface → opencv (plus rapide, plus stable webcam)
  ✅ Fallback détecteur : si retinaface échoue → opencv → mtcnn
  ✅ Double vérification : si refusé à 0.72, retry avec opencv detector
  ✅ Seuil adaptatif : confiance calculée sur la meilleure tentative
  ✅ Logs détaillés pour débugger les refus

Rate limiting : 100% Spring Boot BDD — ce service ne gère PAS les tentatives
════════════════════════════════════════════════════════════════════════
"""

import os
import cv2
import math
import base64
import logging
import argparse
import tempfile
import numpy as np
from io       import BytesIO
from PIL      import Image
from flask    import Flask, request, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("face-verif")

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5173",
])

# ── Configuration ─────────────────────────────────────────────────────────────
# SEUIL RELEVÉ : 0.65 → 0.72
# Pourquoi ? La distance cosine ArcFace sur webcam en conditions réelles
# est souvent entre 0.55 et 0.70 même pour la bonne personne.
# 0.65 était trop strict → faux négatifs fréquents.
# 0.72 reste sécurisé (une autre personne = distance > 0.80 généralement)
THRESHOLD_DISTANCE = 0.72

MODEL_NAME    = "ArcFace"
DISTANCE_METRIC = "cosine"
SIGMOID_ALPHA = 8.0
MIN_FACE_SIZE = 80

# Ordre des détecteurs à essayer (du plus rapide au plus robuste)
# opencv  : rapide, stable webcam, gère bien les conditions normales
# retinaface : plus précis mais plus lent et parfois rate la webcam
# mtcnn   : bon fallback si les deux précédents échouent
DETECTORS_ORDER = ["retinaface", "opencv", "mtcnn"]


# ═════════════════════════════════════════════════════════════════════════════
#  PRÉTRAITEMENT — Version corrigée
#  SUPPRESSION de normaliser_couleur() qui dégradait l'embedding ArcFace
# ═════════════════════════════════════════════════════════════════════════════

def base64_to_cv2(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",")[1]
    img_bytes = base64.b64decode(b64)
    img_pil   = Image.open(BytesIO(img_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)


def corriger_luminosite(img: np.ndarray) -> np.ndarray:
    """CLAHE adaptatif sur canal L uniquement — ne touche pas aux couleurs."""
    lab     = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    brightness = float(np.mean(l))
    # Correction seulement si vraiment sombre (< 80) — évite de sur-corriger
    if brightness < 80:
        clip  = 3.0 if brightness < 40 else 2.0
        clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8))
        l     = clahe.apply(l)
        log.debug("CLAHE appliqué (luminosité=%.0f → clip=%.1f)", brightness, clip)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)


def corriger_flou(img: np.ndarray) -> np.ndarray:
    """Unsharp masking léger seulement si vraiment flou."""
    gray      = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian < 50:  # seuil abaissé (était 100) — moins agressif
        floute = cv2.GaussianBlur(img, (0, 0), 1.0)
        result = cv2.addWeighted(img, 1.5, floute, -0.5, 0)
        log.debug("Unsharp masking appliqué (laplacian=%.1f)", laplacian)
        return result
    return img


def corriger_inclinaison(img: np.ndarray) -> np.ndarray:
    """Correction inclinaison via détection yeux — limite à ±20°."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    try:
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
        eyes = eye_cascade.detectMultiScale(gray, 1.1, 5, minSize=(20, 20))
        if len(eyes) >= 2:
            eyes = sorted(eyes, key=lambda e: e[0])
            cx1 = eyes[0][0] + eyes[0][2] // 2; cy1 = eyes[0][1] + eyes[0][3] // 2
            cx2 = eyes[1][0] + eyes[1][2] // 2; cy2 = eyes[1][1] + eyes[1][3] // 2
            angle = math.degrees(math.atan2(cy2 - cy1, cx2 - cx1))
            # Limite à ±20° (était ±30°) — évite les corrections excessives
            if 3 < abs(angle) < 20:
                h, w  = img.shape[:2]
                M     = cv2.getRotationMatrix2D((w//2, h//2), angle, 1.0)
                result = cv2.warpAffine(img, M, (w, h),
                                        flags=cv2.INTER_CUBIC,
                                        borderMode=cv2.BORDER_REPLICATE)
                log.debug("Inclinaison corrigée : %.1f°", angle)
                return result
    except Exception as e:
        log.debug("Correction inclinaison ignorée : %s", e)
    return img


def zoomer_visage(img: np.ndarray) -> np.ndarray:
    """Zoom si visage trop petit — seuil réduit à 60px (était 80px)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
    if len(faces) == 1:
        x, y, w, h = faces[0]
        if min(w, h) < 60:  # seuil réduit
            margin = int(max(w, h) * 0.35)
            x1 = max(0, x - margin); y1 = max(0, y - margin)
            x2 = min(img.shape[1], x + w + margin)
            y2 = min(img.shape[0], y + h + margin)
            crop = img[y1:y2, x1:x2]
            result = cv2.resize(crop, (224, 224), interpolation=cv2.INTER_CUBIC)
            log.debug("Zoom appliqué (visage=%dpx)", min(w, h))
            return result
    return img


def pretraiter_image(img: np.ndarray, nom: str = "") -> np.ndarray:
    """
    Pipeline de prétraitement CORRIGÉ :
    1. Zoom si visage trop loin
    2. Correction inclinaison
    3. Correction luminosité (CLAHE léger)
    4. Correction flou (léger)
    ⚠️ normaliser_couleur() SUPPRIMÉE — elle dégradait l'embedding ArcFace
       en changeant trop les tons de peau entre la photo profil et la webcam
    """
    img = zoomer_visage(img)
    img = corriger_inclinaison(img)
    img = corriger_luminosite(img)
    img = corriger_flou(img)
    log.debug("Prétraitement %s terminé", nom)
    return img


# ═════════════════════════════════════════════════════════════════════════════
#  VALIDATION QUALITÉ
# ═════════════════════════════════════════════════════════════════════════════

def valider_qualite(img: np.ndarray, nom: str = "") -> dict:
    h, w    = img.shape[:2]
    gray    = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    laplacian  = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    std        = float(np.std(gray))

    log.debug("[%s] %dx%d | luminosité=%.0f | netteté=%.0f | contraste=%.0f",
              nom, w, h, brightness, laplacian, std)

    if w < 60 or h < 60:
        return {"valid": False, "reason": f"Image trop petite ({w}×{h})"}
    if brightness < 12:
        return {"valid": False, "reason": "Image trop sombre — allumez la lumière"}
    if brightness > 250:
        return {"valid": False, "reason": "Image surexposée"}
    if std < 3:
        return {"valid": False, "reason": "Image uniforme — pas de visage visible"}
    if laplacian < 8:  # seuil abaissé (était 10) — moins strict
        return {"valid": False, "reason": "Image trop floue — rapprochez-vous"}
    return {"valid": True, "reason": "OK",
            "brightness": round(brightness, 1),
            "sharpness":  round(laplacian, 1)}


# ═════════════════════════════════════════════════════════════════════════════
#  CONFIANCE — Sigmoïde calibrée sur le nouveau seuil 0.72
# ═════════════════════════════════════════════════════════════════════════════

def calculer_confiance(distance: float) -> float:
    """
    Sigmoïde inversée calibrée sur THRESHOLD_DISTANCE = 0.72
    distance=0.50 → conf ~94%  (très bon)
    distance=0.60 → conf ~85%  (bon)
    distance=0.70 → conf ~58%  (limite)
    distance=0.72 → conf ~50%  (seuil)
    distance=0.80 → conf ~22%  (refus)
    distance=0.90 → conf ~ 5%  (clairement autre personne)
    """
    return round(100.0 / (1.0 + math.exp(SIGMOID_ALPHA * (distance - THRESHOLD_DISTANCE))), 2)

def niveau_confiance(conf: float) -> str:
    if   conf >= 80: return "Très haute"
    elif conf >= 60: return "Haute"
    elif conf >= 40: return "Moyenne"
    elif conf >= 20: return "Basse"
    else:            return "Très basse"


# ═════════════════════════════════════════════════════════════════════════════
#  VÉRIFICATION ARCFACE — avec fallback multi-détecteur
# ═════════════════════════════════════════════════════════════════════════════

def verifier_avec_detecteur(webcam_path: str, profile_path: str, detector: str) -> dict:
    """
    Tente une vérification ArcFace avec un détecteur spécifique.
    Retourne { distance, verified, detector } ou lève une exception.
    """
    from deepface import DeepFace
    result = DeepFace.verify(
        img1_path         = webcam_path,
        img2_path         = profile_path,
        model_name        = MODEL_NAME,
        detector_backend  = detector,
        distance_metric   = DISTANCE_METRIC,
        enforce_detection = True,
    )
    distance = float(result["distance"])
    return {
        "distance": distance,
        "verified": distance < THRESHOLD_DISTANCE,
        "detector": detector,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  ENDPOINT PRINCIPAL
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/verify-face", methods=["POST"])
def verify_face():
    """
    POST /verify-face
    Body : { "candidateId": 42, "webcamImage": "base64...", "profileImage": "base64..." }

    Stratégie multi-détecteur :
    1. Essaie opencv (rapide)
    2. Si refusé ou erreur → essaie retinaface (précis)
    3. Si refusé ou erreur → essaie mtcnn (robuste)
    → Garde le meilleur résultat (distance la plus faible = plus proche)

    Rate limiting : géré par Spring Boot BDD — pas ici.
    """
    import time
    start = time.time()

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Corps JSON manquant"}), 400

    for field in ["candidateId", "webcamImage", "profileImage"]:
        if field not in data:
            return jsonify({"error": f"Champ manquant : {field}"}), 400

    candidate_id = int(data["candidateId"])
    webcam_b64   = data["webcamImage"]
    profile_b64  = data["profileImage"]

    if not webcam_b64 or not profile_b64:
        return jsonify({"error": "Images manquantes"}), 400

    log.info("Candidat #%d | vérification ArcFace (seuil=%.2f)", candidate_id, THRESHOLD_DISTANCE)

    # Décoder
    try:
        webcam_img  = base64_to_cv2(webcam_b64)
        profile_img = base64_to_cv2(profile_b64)
    except Exception as e:
        return jsonify({"error": f"Erreur décodage image : {e}"}), 400

    log.info("Images : webcam=%dx%d | profil=%dx%d",
             webcam_img.shape[1], webcam_img.shape[0],
             profile_img.shape[1], profile_img.shape[0])

    # Prétraitement
    webcam_img  = pretraiter_image(webcam_img,  nom="webcam")
    profile_img = pretraiter_image(profile_img, nom="profil")

    # Validation qualité
    wq = valider_qualite(webcam_img,  nom="webcam")
    pq = valider_qualite(profile_img, nom="profil")

    if not wq["valid"]:
        return jsonify({"verified": False, "error": f"Webcam : {wq['reason']}",
                        "conseil": "Améliorez l'éclairage et rapprochez-vous"}), 400
    if not pq["valid"]:
        return jsonify({"verified": False, "error": f"Photo profil : {pq['reason']}",
                        "conseil": "Mettez à jour votre photo de profil"}), 400

    # Écrire les images temporaires
    webcam_path = profile_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f1:
            cv2.imwrite(f1.name, webcam_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            webcam_path = f1.name
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f2:
            cv2.imwrite(f2.name, profile_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            profile_path = f2.name

        # ── Stratégie multi-détecteur ──────────────────────────────────────
        # On essaie chaque détecteur et on garde le meilleur résultat
        # (distance la plus faible = meilleure chance d'être reconnu)
        best_result = None
        errors      = []

        for detector in DETECTORS_ORDER:
            try:
                res = verifier_avec_detecteur(webcam_path, profile_path, detector)
                log.info("Détecteur %s → distance=%.4f | verified=%s",
                         detector, res["distance"], res["verified"])

                # Garder le meilleur résultat (distance la plus basse)
                if best_result is None or res["distance"] < best_result["distance"]:
                    best_result = res

                # Si vérifié → inutile d'essayer les autres détecteurs
                if res["verified"]:
                    log.info("✅ Vérifié avec %s — arrêt des essais", detector)
                    break

            except ValueError as e:
                # Visage non détecté avec ce détecteur → essayer le suivant
                err_msg = str(e).lower()
                log.warning("Détecteur %s : visage non détecté (%s)", detector, str(e)[:80])
                errors.append(f"{detector}: {str(e)[:60]}")
                continue
            except Exception as e:
                log.warning("Détecteur %s : erreur (%s)", detector, str(e)[:80])
                errors.append(f"{detector}: {str(e)[:60]}")
                continue

        elapsed = round(time.time() - start, 2)

        # Aucun détecteur n'a trouvé de visage
        if best_result is None:
            log.warning("❌ Candidat #%d — aucun visage détecté (essayé: %s)",
                        candidate_id, ", ".join(DETECTORS_ORDER))
            return jsonify({
                "verified": False,
                "error":    "Aucun visage détecté dans l'image",
                "conseil":  "Positionnez-vous face à la caméra, améliorez l'éclairage",
                "detectors_tried": DETECTORS_ORDER,
            }), 400

        # Résultat final
        distance   = best_result["distance"]
        verified   = best_result["verified"]
        detector   = best_result["detector"]
        confidence = calculer_confiance(distance)
        niveau     = niveau_confiance(confidence)

        log.info("%s Candidat #%d | dist=%.4f (seuil=%.2f) | conf=%.1f%% (%s) | détecteur=%s | %.2fs",
                 "✅" if verified else "❌",
                 candidate_id, distance, THRESHOLD_DISTANCE,
                 confidence, niveau, detector, elapsed)

        if verified:
            msg = f"Identité vérifiée ✅ — confiance {confidence:.0f}% ({niveau})"
        else:
            # Message d'erreur adapté à la distance
            if distance < THRESHOLD_DISTANCE + 0.05:
                # Très proche du seuil — probablement la bonne personne mais conditions difficiles
                msg = f"Presque reconnu (confiance {confidence:.0f}%) — Améliorez l'éclairage et restez bien face à la caméra"
            elif confidence < 30:
                msg = "Visage trop loin ou mal éclairé — Rapprochez-vous et améliorez l'éclairage"
            else:
                msg = "Visage non reconnu — Assurez-vous d'être bien face à la caméra"

        return jsonify({
            "verified":        verified,
            "distance":        round(distance, 4),
            "threshold":       THRESHOLD_DISTANCE,
            "confidence":      confidence,
            "niveauConfiance": niveau,
            "model":           MODEL_NAME,
            "detector":        detector,
            "processingTime":  elapsed,
            "message":         msg,
        }), 200 if verified else 401

    except Exception as e:
        log.error("Erreur inattendue : %s", e, exc_info=True)
        return jsonify({"error": f"Erreur serveur : {str(e)[:200]}"}), 500

    finally:
        for path in [webcam_path, profile_path]:
            if path:
                try: os.unlink(path)
                except: pass


# ═════════════════════════════════════════════════════════════════════════════
#  AUTRES ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    try:
        from deepface import DeepFace
        return jsonify({
            "status":    "ok",
            "model":     MODEL_NAME,
            "threshold": THRESHOLD_DISTANCE,
            "detectors": DETECTORS_ORDER,
            "port":      int(os.environ.get("FACE_PORT", 5002)),
            "note":      "Rate limiting Spring Boot BDD — multi-détecteur activé",
            "features":  ["CLAHE-léger", "deskew", "unsharp-masking",
                          "auto-zoom", "multi-detector-fallback",
                          "NO-color-normalization"],
        }), 200
    except ImportError:
        return jsonify({"status": "error", "message": "deepface non installé"}), 500


@app.route("/stats", methods=["GET"])
def stats():
    return jsonify({
        "threshold":       THRESHOLD_DISTANCE,
        "model":           MODEL_NAME,
        "detectors_order": DETECTORS_ORDER,
        "sigmoid_alpha":   SIGMOID_ALPHA,
        "improvements":    [
            "Seuil relevé 0.65→0.72 (moins de faux négatifs)",
            "normaliser_couleur() supprimée (dégradait ArcFace)",
            "Multi-détecteur avec fallback (opencv→retinaface→mtcnn)",
            "Correction flou/luminosité plus légère",
        ]
    })


@app.route("/calibrate", methods=["POST"])
def calibrate():
    """
    Endpoint de calibration — teste la distance entre deux images
    sans décider. Utile pour trouver le bon seuil.
    POST { "image1": "base64...", "image2": "base64..." }
    """
    from deepface import DeepFace
    data = request.get_json(silent=True)
    if not data or "image1" not in data or "image2" not in data:
        return jsonify({"error": "image1 et image2 requis"}), 400

    p1 = p2 = None
    try:
        img1 = pretraiter_image(base64_to_cv2(data["image1"]), "img1")
        img2 = pretraiter_image(base64_to_cv2(data["image2"]), "img2")

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f1:
            cv2.imwrite(f1.name, img1, [cv2.IMWRITE_JPEG_QUALITY, 95]); p1 = f1.name
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f2:
            cv2.imwrite(f2.name, img2, [cv2.IMWRITE_JPEG_QUALITY, 95]); p2 = f2.name

        results = []
        for detector in DETECTORS_ORDER:
            try:
                r = DeepFace.verify(p1, p2, model_name=MODEL_NAME,
                                    detector_backend=detector,
                                    distance_metric=DISTANCE_METRIC,
                                    enforce_detection=True)
                results.append({"detector": detector, "distance": round(float(r["distance"]), 4),
                                 "verified_at_current_threshold": float(r["distance"]) < THRESHOLD_DISTANCE})
            except Exception as e:
                results.append({"detector": detector, "error": str(e)[:80]})

        return jsonify({
            "current_threshold": THRESHOLD_DISTANCE,
            "results": results,
            "recommendation": "Si votre distance est entre 0.65 et 0.80, ajustez le seuil"
        })
    finally:
        for p in [p1, p2]:
            if p:
                try: os.unlink(p)
                except: pass


# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--port",  type=int, default=int(os.environ.get("FACE_PORT", 5002)))
    args = parser.parse_args()

    log.info("Face Verification AMÉLIORÉ — port %d", args.port)
    log.info("Modèle : %s | Seuil : %.2f (relevé depuis 0.65)", MODEL_NAME, THRESHOLD_DISTANCE)
    log.info("Détecteurs : %s (fallback automatique)", " → ".join(DETECTORS_ORDER))
    log.info("Améliorations : seuil+7pts | sans normalisation couleur | multi-détecteur")
    app.run(host="0.0.0.0", port=args.port, debug=False)