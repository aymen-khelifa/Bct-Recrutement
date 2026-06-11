import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';

/**
 * FaceVerification.jsx — BCT Recrutement
 *
 * Props :
 *   candidateId  – Long  : ID du candidat (User.id)
 *   candidatureId – Long : ID de la candidature (pour le log)
 *   onVerified   – fn()  : callback si vérification réussie
 *   onDenied     – fn(reason) : callback si bloqué/refusé
 *   onClose      – fn()  : fermer le composant
 *
 * Flux :
 *   1. Démarrer la webcam
 *   2. Liveness check guidé (3 étapes visuelles)
 *   3. Countdown 3-2-1 → capture image
 *   4. GET /api/face/photo/{candidateId} → photo de profil base64
 *   5. POST /api/face/verify/{candidatureId} → Flask ArcFace
 *   6. Afficher résultat + feedback
 */

const STATES = {
  LOADING:   "loading",
  READY:     "ready",
  LIVENESS:  "liveness",
  CAPTURING: "capturing",
  VERIFYING: "verifying",
  SUCCESS:   "success",
  FAILED:    "failed",
  BLOCKED:   "blocked",
};

const LIVENESS_STEPS = [
  { icon: "👁️", text: "Clignez des yeux lentement" },
  { icon: "↩️", text: "Tournez légèrement la tête à gauche" },
  { icon: "😐", text: "Revenez face à la caméra" },
];

const FaceVerification = ({
  candidateId,
  candidatureId,
  onVerified,
  onDenied,
  onClose,
}) => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [state,         setState]        = useState(STATES.LOADING);
  const [message,       setMessage]      = useState("Démarrage de la caméra...");
  const [attemptsLeft,  setAttempts]     = useState(3);
  const [countdown,     setCountdown]    = useState(null);
  const [livenessStep,  setLivenessStep] = useState(0);
  const [,    setConfidence]   = useState(null);

  // ── 1. Caméra ───────────────────────────────────────────────────────────────
  useEffect(() => {
    demarrerCamera();
    return () => arreterCamera();
  }, []);

  const demarrerCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setState(STATES.READY);
      setMessage("Caméra active. Cliquez sur Démarrer.");
    } catch {
      setState(STATES.FAILED);
      setMessage("❌ Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const arreterCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  // ── 2. Liveness check ────────────────────────────────────────────────────────
  const demarrerLiveness = useCallback(() => {
    setState(STATES.LIVENESS);
    setLivenessStep(0);
    setMessage(LIVENESS_STEPS[0].text);

    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step < LIVENESS_STEPS.length) {
        setLivenessStep(step);
        setMessage(LIVENESS_STEPS[step].text);
      } else {
        clearInterval(timer);
        demarrerCountdown();
      }
    }, 2000);
  }, []);

  // ── 3. Countdown → capture ───────────────────────────────────────────────────
  const demarrerCountdown = () => {
    setState(STATES.CAPTURING);
    let count = 3;
    setCountdown(count);
    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(timer);
        setCountdown(null);
        captureEtVerifier();
      }
    }, 1000);
  };

  // ── 4. Capture frame ─────────────────────────────────────────────────────────
  const capturerFrame = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  // ── 5. Récupérer photo de profil depuis Spring Boot ──────────────────────────
  // Utilise axios (comme le reste de l'app) → intercepteur JWT automatique
  /*const getPhotoProfilBase64 = async () => {
    const res = await axios.get(`/api/face/photo/${candidateId}`);
    return res.data.base64Image;
  };*/

  // ── 6. Envoyer à Spring Boot → Flask → DeepFace ──────────────────────────────
  const captureEtVerifier = async () => {
    setState(STATES.VERIFYING);
    setMessage("⏳ Analyse par intelligence artificielle...");

    try {
      const webcamImage = capturerFrame();
      if (!webcamImage) throw new Error("Capture webcam échouée");

      // Utilise axios → intercepteur JWT automatique
      let res;
      try {
        res = await axios.post(`/api/face/verify/${candidatureId}`, {
          candidateId,
          webcamImage,
          // profileImage récupéré côté Spring Boot depuis Profilcandidat
        });
      } catch (axiosErr) {
        // Gérer les erreurs HTTP (401, 429, etc.)
        const status = axiosErr.response?.status;
        const data   = axiosErr.response?.data || {};

        if (status === 429 || data.blocked) {
          setState(STATES.BLOCKED);
          setMessage("🚫 Session bloquée. Contactez l'équipe RH.");
          if (onDenied) onDenied("blocked");
          return;
        }

        const left = data.attemptsLeft ?? 0;
        setAttempts(left);
        if (left === 0) {
          setState(STATES.BLOCKED);
          setMessage("🚫 Nombre maximum de tentatives atteint.");
          if (onDenied) onDenied("max_attempts");
        } else {
          setState(STATES.FAILED);
          setMessage(
            data.error
              ? `❌ ${data.error} (${left} tentative${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""})`
              : `❌ Visage non reconnu. ${left} tentative${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}.`
          );
        }
        return;
      }

      const data = res.data;

      // ── Bloqué ──────────────────────────────────────────────────────────────
      if (data.blocked) {
        setState(STATES.BLOCKED);
        setMessage("🚫 Session bloquée. Contactez l'équipe RH.");
        if (onDenied) onDenied("blocked");
        return;
      }

      // ── Succès ───────────────────────────────────────────────────────────────
      if (data.verified) {
        setConfidence(data.confidence);
        setState(STATES.SUCCESS);
        setMessage(`✅ Identité vérifiée ! Confiance : ${data.confidence?.toFixed(1)}%`);
        setTimeout(() => {
          arreterCamera();
          if (onVerified) onVerified();
        }, 2000);
        return;
      }

      // ── Échec ────────────────────────────────────────────────────────────────
      const left = data.attemptsLeft ?? 0;
      setAttempts(left);

      if (left === 0) {
        setState(STATES.BLOCKED);
        setMessage("🚫 Nombre maximum de tentatives atteint.");
        if (onDenied) onDenied("max_attempts");
      } else {
        setState(STATES.FAILED);
        setMessage(
          data.error
            ? `❌ ${data.error} (${left} tentative${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""})`
            : `❌ Visage non reconnu. ${left} tentative${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}.`
        );
      }

    } catch (err) {
      setState(STATES.FAILED);
      setMessage(`❌ ${err.message || "Erreur réseau ou serveur."}`);
    }
  };

  // ── Couleur de la bordure selon l'état ───────────────────────────────────────
  const borderColor = {
    [STATES.SUCCESS]:   "#22c55e",
    [STATES.FAILED]:    "#ef4444",
    [STATES.BLOCKED]:   "#dc2626",
    [STATES.VERIFYING]: "#f59e0b",
    [STATES.LIVENESS]:  "#8b5cf6",
    [STATES.CAPTURING]: "#3b82f6",
  }[state] || "#334155";

  const peutReessayer = state === STATES.FAILED && attemptsLeft > 0;

  return (
    <>
      {/* Animation spinner */}
      <style>{`
        @keyframes bct-spin { to { transform: rotate(360deg); } }
        .bct-spinner { animation: bct-spin .8s linear infinite; }
      `}</style>

      {/* Overlay plein écran */}
      <div style={{
        position:"fixed", inset:0, background:"rgba(2,6,23,.92)",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex:9999, fontFamily:"'Public Sans',sans-serif", padding:"1rem",
      }}>
        <div style={{
          background:"#0f172a", borderRadius:"1rem", padding:"2rem",
          width:"100%", maxWidth:"480px",
          border:"1px solid #1e293b",
          boxShadow:"0 25px 50px rgba(0,0,0,.5)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:"1.25rem",
        }}>

          {/* Header */}
          <div style={{textAlign:"center"}}>
            <p style={{color:"#64748b", fontSize:".75rem", fontWeight:700,
                       textTransform:"uppercase", letterSpacing:".1em", margin:0}}>
              Banque Centrale de Tunisie
            </p>
            <h2 style={{color:"#f1f5f9", fontSize:"1.375rem", fontWeight:900,
                        margin:".375rem 0 .25rem"}}>
              Vérification d'Identité
            </h2>
            <p style={{color:"#64748b", fontSize:".8125rem", margin:0}}>
              Système sécurisé · ArcFace Deep Learning
            </p>
          </div>

          {/* Vidéo */}
          <div style={{
            position:"relative", width:"100%", borderRadius:".75rem",
            border:`3px solid ${borderColor}`, overflow:"hidden",
            background:"#000", transition:"border-color .3s",
          }}>
            <video ref={videoRef} autoPlay muted playsInline
              style={{width:"100%", display:"block"}} />
            <canvas ref={canvasRef} style={{display:"none"}} />

            {/* Countdown */}
            {countdown && (
              <div style={{
                position:"absolute", inset:0, display:"flex",
                alignItems:"center", justifyContent:"center",
                background:"rgba(0,0,0,.5)", fontSize:"5rem",
                fontWeight:900, color:"#fff",
              }}>
                {countdown}
              </div>
            )}

            {/* Liveness overlay */}
            {state === STATES.LIVENESS && (
              <div style={{
                position:"absolute", bottom:0, left:0, right:0,
                background:"rgba(139,92,246,.88)", padding:".875rem",
                textAlign:"center",
              }}>
                <p style={{color:"#fff", fontWeight:700, margin:"0 0 .5rem",
                            fontSize:".9375rem"}}>
                  {LIVENESS_STEPS[livenessStep]?.icon}{" "}
                  {LIVENESS_STEPS[livenessStep]?.text}
                </p>
                <div style={{display:"flex", justifyContent:"center", gap:"8px"}}>
                  {LIVENESS_STEPS.map((_, i) => (
                    <div key={i} style={{
                      width:10, height:10, borderRadius:"50%", transition:"all .3s",
                      background: i <= livenessStep ? "#fff" : "rgba(255,255,255,.3)",
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Succès overlay */}
            {state === STATES.SUCCESS && (
              <div style={{
                position:"absolute", inset:0, display:"flex",
                alignItems:"center", justifyContent:"center",
                background:"rgba(34,197,94,.15)", fontSize:"4rem",
              }}>
                ✅
              </div>
            )}

            {/* Bloqué overlay */}
            {state === STATES.BLOCKED && (
              <div style={{
                position:"absolute", inset:0, display:"flex",
                alignItems:"center", justifyContent:"center",
                background:"rgba(220,38,38,.15)", fontSize:"4rem",
              }}>
                🚫
              </div>
            )}
          </div>

          {/* Message */}
          <p style={{
            color: borderColor, fontWeight:600, textAlign:"center",
            fontSize:".9375rem", margin:0, lineHeight:1.5,
          }}>
            {message}
          </p>

          {/* Barre tentatives */}
          {attemptsLeft < 3 && ![STATES.SUCCESS, STATES.BLOCKED].includes(state) && (
            <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{
                  width:14, height:14, borderRadius:"50%",
                  background: i < attemptsLeft ? "#f59e0b" : "#1e293b",
                  transition:"all .3s",
                }} />
              ))}
              <span style={{color:"#94a3b8", fontSize:".8125rem"}}>
                {attemptsLeft} tentative{attemptsLeft > 1 ? "s" : ""} restante{attemptsLeft > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Bouton Démarrer */}
          {state === STATES.READY && (
            <button onClick={demarrerLiveness} style={{
              width:"100%", padding:".875rem", background:"#003d7a",
              color:"#fff", border:"none", borderRadius:".625rem",
              fontSize:"1rem", fontWeight:800, cursor:"pointer",
              fontFamily:"inherit",
            }}>
              🔍 Démarrer la vérification
            </button>
          )}

          {/* Bouton Réessayer */}
          {peutReessayer && (
            <button onClick={demarrerLiveness} style={{
              width:"100%", padding:".875rem", background:"#d97706",
              color:"#fff", border:"none", borderRadius:".625rem",
              fontSize:"1rem", fontWeight:800, cursor:"pointer",
              fontFamily:"inherit",
            }}>
              🔄 Réessayer ({attemptsLeft} restante{attemptsLeft > 1 ? "s" : ""})
            </button>
          )}

          {/* Spinner vérification */}
          {state === STATES.VERIFYING && (
            <div style={{display:"flex", alignItems:"center", gap:".75rem",
                          color:"#f59e0b", fontWeight:600}}>
              <div className="bct-spinner" style={{
                width:20, height:20,
                border:"3px solid #334155",
                borderTopColor:"#f59e0b",
                borderRadius:"50%",
              }} />
              Analyse en cours...
            </div>
          )}

          {/* Bouton Fermer */}
          {onClose && state !== STATES.VERIFYING && (
            <button onClick={() => { arreterCamera(); onClose(); }} style={{
              background:"none", border:"none", color:"#475569",
              fontSize:".8125rem", cursor:"pointer", fontFamily:"inherit",
              padding:".25rem",
            }}>
              Annuler et fermer
            </button>
          )}

          {/* Note sécurité */}
          <p style={{
            color:"#334155", fontSize:".75rem", textAlign:"center",
            margin:0, lineHeight:1.5,
          }}>
            🔒 Les données biométriques ne sont pas stockées ·
            Traitement local sécurisé
          </p>

        </div>
      </div>
    </>
  );
};

export default FaceVerification;