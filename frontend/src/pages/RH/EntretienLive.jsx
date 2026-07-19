import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════════════ */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
.el-page { font-family:'Public Sans',sans-serif; background:#f1f5f9; color:#0f172a; min-height:100vh; overflow-y:auto; }
.el-root { max-width:1400px; margin:0 auto; padding:0 0 2rem; display:flex; flex-direction:column; min-height:100vh; }
.el-root .ms { font-family:'Material Symbols Outlined'; font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; font-size:1.25rem; font-style:normal; line-height:1; }
.glass { background:rgba(255,255,255,.85); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:1px solid rgba(0,61,122,.1); }

.el-header { padding:1.25rem 2rem; display:flex; justify-content:space-between; align-items:center; background:#fff; border-bottom:1px solid #e2e8f0; position:sticky; top:0; z-index:30; flex-shrink:0; }
.el-header-left { display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap; }
.el-eyebrow { font-size:.5625rem; font-weight:900; text-transform:uppercase; letter-spacing:.14em; color:rgba(0,61,122,.6); margin-bottom:.25rem; }
.el-session-title { font-size:1.0625rem; font-weight:900; text-transform:uppercase; letter-spacing:-.02em; line-height:1; color:#003d7a; }
.el-sep { width:1px; height:2rem; background:#e2e8f0; }
.el-live-badge { display:flex; align-items:center; gap:.5rem; font-size:.75rem; font-weight:700; letter-spacing:.06em; color:#0f172a; }
.el-live-dot { width:.5rem; height:.5rem; border-radius:50%; background:#ef4444; animation:el-pulse 1.5s ease infinite; }
@keyframes el-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.el-timer { font-size:.9375rem; font-weight:800; font-variant-numeric:tabular-nums; letter-spacing:.04em; color:#003d7a; }
.el-role-badge { font-size:.5625rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:.25rem .625rem; border-radius:9999px; }
.el-role-badge.rh { background:rgba(0,61,122,.08); color:#003d7a; border:1px solid rgba(0,61,122,.2); }
.el-role-badge.candidat { background:rgba(5,150,105,.08); color:#059669; border:1px solid rgba(5,150,105,.2); }

.el-main { flex:1; display:flex; padding:1rem 2rem 0; gap:1.25rem; min-height:0; }
@media(max-width:900px){.el-main{flex-direction:column;padding:1rem 1rem 0;}}

/* VIDEO */
.el-video-area { flex:1; display:flex; flex-direction:column; min-height:400px; gap:.75rem; }
.el-video-wrap { width:100%; flex:1; border-radius:1.25rem; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 24px rgba(0,0,0,.08); position:relative; background:#e2e8f0; min-height:350px; }
.el-remote-video { width:100%; height:100%; object-fit:cover; display:block; border-radius:1.25rem; }
.el-cam-placeholder { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; min-height:350px; background:linear-gradient(135deg,#f8fafc,#e2e8f0); }
.el-avatar-big { width:8rem; height:8rem; border-radius:50%; background:rgba(0,61,122,.08); border:2px solid rgba(0,61,122,.15); display:flex; align-items:center; justify-content:center; font-size:2.5rem; font-weight:900; color:#003d7a; overflow:hidden; flex-shrink:0; }
.el-avatar-big img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
.el-placeholder-name { font-size:1.125rem; font-weight:700; color:#0f172a; }
.el-placeholder-sub { font-size:.75rem; color:#94a3b8; margin-top:.25rem; }
.el-conn-status { display:flex; align-items:center; gap:.5rem; font-size:.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; padding:.375rem .875rem; border-radius:.5rem; margin-top:.75rem; }
.el-conn-status.waiting { background:rgba(217,119,6,.1); color:#d97706; border:1px solid rgba(217,119,6,.25); }
.el-conn-status.connected { background:rgba(5,150,105,.1); color:#059669; border:1px solid rgba(5,150,105,.25); }
.el-conn-status.ms { font-size:.875rem; }

.el-pip { position:absolute; top:1.25rem; right:1.25rem; width:11rem; aspect-ratio:16/9; border-radius:.875rem; overflow:hidden; border:2px solid #fff; box-shadow:0 8px 24px rgba(0,0,0,.25); z-index:10; background:#cbd5e1; }
.el-pip video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); display:block; }
.el-pip-off { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#cbd5e1; }
.el-pip-label { position:absolute; bottom:.375rem; left:.5rem; display:flex; align-items:center; gap:.375rem; background:rgba(0,0,0,.6); backdrop-filter:blur(8px); padding:.2rem .5rem; border-radius:.25rem; font-size:.5625rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#fff; }
.el-pip-label .ms { font-size:.75rem; }
.el-speaker { position:absolute; bottom:1.25rem; left:1.25rem; display:flex; align-items:center; gap:.75rem; padding:.625rem 1rem; border-radius:.75rem; }
.el-bars { display:flex; align-items:flex-end; gap:2px; height:1rem; }
.el-bar { width:3px; background:#003d7a; border-radius:2px; animation:el-bar .8s ease infinite; }
.el-bar:nth-child(1){height:6px;animation-delay:0s}.el-bar:nth-child(2){height:14px;animation-delay:.1s}.el-bar:nth-child(3){height:10px;animation-delay:.2s}
@keyframes el-bar{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.7)}}

/* PANEL */
.el-panel { width:25rem; display:flex; flex-direction:column; gap:.75rem; }
@media(max-width:900px){.el-panel{width:100%;}}
.el-tabs { display:flex; padding:.25rem; border-radius:.75rem; flex-shrink:0; background:#fff; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.el-tab { flex:1; padding:.625rem; font-size:.5625rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; border:none; cursor:pointer; border-radius:.5rem; font-family:'Public Sans',sans-serif; transition:all .15s; color:#475569; background:transparent; }
.el-tab.active { background:#003d7a; color:#fff; }
.el-panel-content { flex:1; border-radius:1.25rem; padding:1.5rem; display:flex; flex-direction:column; gap:1.25rem; overflow-y:auto; min-height:300px; background:#fff; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.el-panel-content::-webkit-scrollbar{width:4px;} .el-panel-content::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px;}
.el-cand-row { display:flex; align-items:center; gap:1rem; }
.el-cand-photo { width:4rem; height:4rem; border-radius:.75rem; background:rgba(0,61,122,.08); border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; font-size:1.25rem; font-weight:900; color:#003d7a; flex-shrink:0; overflow:hidden; }
.el-cand-photo img { width:100%; height:100%; object-fit:cover; border-radius:.75rem; }
.el-cand-name { font-size:1.0625rem; font-weight:700; margin-bottom:.25rem; color:#003d7a; }
.el-cand-sub { font-size:.8125rem; color:#475569; }
.el-cand-dept { font-size:.5625rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:rgba(0,61,122,.6); margin-top:.25rem; }
.el-divider { height:1px; background:#e2e8f0; flex-shrink:0; }
.el-sec-lbl { font-size:.5625rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:rgba(71,85,105,.6); margin-bottom:.625rem; }
.el-scores-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
.el-score-box { background:#f8fafc; border:1px solid #e2e8f0; padding:1rem; border-radius:.875rem; }
.el-score-num { font-size:1.75rem; font-weight:900; line-height:1; }
.el-score-num.blue{color:#003d7a;} .el-score-num.green{color:#059669;}
.el-score-unit { font-size:.875rem; color:#94a3b8; margin-left:.25rem; }
.el-score-lbl { font-size:.5rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#475569; margin-top:.375rem; }
.el-ai-box { background:rgba(5,150,105,.05); border:1px solid rgba(5,150,105,.2); border-radius:.875rem; padding:1rem; }
.el-ai-hdr { display:flex; align-items:center; gap:.5rem; margin-bottom:.625rem; }
.el-ai-hdr .ms{font-size:1rem;color:#059669;}
.el-ai-lbl { font-size:.5625rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:#059669; }
.el-ai-txt { font-size:.75rem; color:#475569; line-height:1.65; font-style:italic; }
.el-horaire { background:rgba(0,61,122,.04); border-radius:.75rem; padding:.875rem 1rem; }
.el-horaire-lbl { font-size:.5625rem; font-weight:900; text-transform:uppercase; letter-spacing:.08em; color:rgba(71,85,105,.6); margin-bottom:.5rem; }
.el-horaire-val { font-size:.875rem; font-weight:700; color:#0f172a; }
.el-horaire-date { font-size:.6875rem; color:#94a3b8; margin-top:.25rem; }
.el-info-box { background:rgba(5,150,105,.05); border:1px solid rgba(5,150,105,.2); border-radius:.875rem; padding:1rem; }
.el-info-title { font-size:.5625rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:#059669; margin-bottom:.75rem; display:flex; align-items:center; gap:.375rem; }
.el-info-row { display:flex; align-items:flex-start; gap:.625rem; margin-bottom:.625rem; font-size:.8125rem; color:#0f172a; }
.el-info-row .ms { font-size:1rem; color:#059669; flex-shrink:0; }
.el-notes-lbl { font-size:.5625rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:rgba(71,85,105,.6); margin-bottom:.625rem; }
.el-notes-area { flex:1; width:100%; min-height:200px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:.875rem; padding:1rem; font-size:.875rem; color:#0f172a; font-family:'Public Sans',sans-serif; resize:none; outline:none; line-height:1.65; }
.el-notes-area::placeholder{color:#94a3b8;}
.el-notes-area:focus{border-color:#003d7a;box-shadow:0 0 0 2px rgba(0,61,122,.12);}
.el-save-btn { width:100%; padding:.75rem; background:#003d7a; border:1px solid #003d7a; color:#fff; font-size:.75rem; font-weight:700; border-radius:.625rem; cursor:pointer; font-family:'Public Sans',sans-serif; display:flex; align-items:center; justify-content:center; gap:.5rem; transition:all .15s; box-shadow:0 2px 8px rgba(0,61,122,.2); }
.el-save-btn:hover:not(:disabled){background:#134684;} .el-save-btn:disabled{opacity:.5;cursor:not-allowed;}
.el-save-btn .ms{font-size:.875rem;}

.el-toolbar { display:flex; justify-content:center; padding:1rem 2rem 1.5rem; flex-shrink:0; }
.el-toolbar-inner { display:flex; align-items:center; gap:1rem; padding:.75rem 1.5rem; border-radius:1.25rem; box-shadow:0 12px 40px rgba(0,0,0,.12); flex-wrap:wrap; justify-content:center; background:#fff; border:1px solid #e2e8f0; }
.el-tool-group { display:flex; align-items:center; gap:.5rem; padding-right:1rem; border-right:1px solid #e2e8f0; }
.el-tool-group:last-child{padding-right:0;border-right:none;}
.el-tool-btn { width:3rem; height:3rem; border-radius:.75rem; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; background:transparent; color:#475569; }
.el-tool-btn:hover{background:#f1f5f9;}
.el-tool-btn.off{background:rgba(239,68,68,.1);color:#ef4444;}
.el-tool-btn.off:hover{background:rgba(239,68,68,.18);}
.el-tool-btn .ms{font-size:1.375rem;}
.el-end-btn { display:flex; align-items:center; gap:.5rem; background:#ef4444; color:#fff; border:none; border-radius:.75rem; padding:0 1.5rem; height:3rem; font-size:.625rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; cursor:pointer; font-family:'Public Sans',sans-serif; transition:all .15s; white-space:nowrap; box-shadow:0 4px 12px rgba(239,68,68,.25); }
.el-end-btn:hover{background:#dc2626;transform:scale(1.02);}
.el-end-btn .ms{font-size:1rem;}

.el-confirm-overlay { position:fixed; inset:0; z-index:999; background:rgba(15,23,42,.5); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding:1rem; }
.el-confirm-modal { background:#fff; border:1px solid #e2e8f0; border-radius:1rem; padding:2rem; max-width:30rem; width:100%; box-shadow:0 25px 50px rgba(0,0,0,.2); max-height:90vh; overflow-y:auto; }
.el-confirm-modal h3{font-size:1.125rem;font-weight:700;margin-bottom:.5rem;color:#003d7a;}
.el-confirm-modal p{font-size:.875rem;color:#475569;line-height:1.65;margin-bottom:1.5rem;}
.el-confirm-btns{display:flex;gap:.75rem;justify-content:flex-end;}
.el-confirm-cancel{padding:.625rem 1.25rem;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:.5rem;color:#475569;font-size:.875rem;font-weight:600;cursor:pointer;font-family:'Public Sans',sans-serif;}
.el-confirm-ok{padding:.625rem 1.25rem;background:#ef4444;border:none;border-radius:.5rem;color:#fff;font-size:.875rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;}
.el-confirm-ok:disabled{opacity:.4;cursor:not-allowed;}

/* Modal fin entretien RH — note + notes */
.el-finish-label { font-size:.625rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:rgba(71,85,105,.7); margin-bottom:.625rem; display:block; }
.el-score-picker { display:flex; flex-wrap:wrap; gap:.375rem; margin-bottom:1.5rem; }
.el-score-pick-btn { width:2.5rem; height:2.5rem; border-radius:.625rem; border:1px solid #e2e8f0; background:#f8fafc; color:#0f172a; font-size:.9375rem; font-weight:800; cursor:pointer; font-family:'Public Sans',sans-serif; transition:all .15s; }
.el-score-pick-btn:hover { background:rgba(0,61,122,.08); border-color:#003d7a; }
.el-score-pick-btn.selected { background:#059669; border-color:#059669; color:#fff; transform:scale(1.08); box-shadow:0 4px 12px rgba(5,150,105,.3); }
.el-finish-textarea { width:100%; min-height:120px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:.75rem; padding:.875rem; font-size:.875rem; color:#0f172a; font-family:'Public Sans',sans-serif; resize:vertical; outline:none; line-height:1.6; margin-bottom:1.5rem; }
.el-finish-textarea::placeholder{color:#94a3b8;}
.el-finish-textarea:focus{border-color:#003d7a;box-shadow:0 0 0 2px rgba(0,61,122,.12);}
.el-confirm-ok.green{background:#059669;}
.el-confirm-ok.green:hover{background:#047857;}

@keyframes el-spin{to{transform:rotate(360deg)}}
.el-spin{animation:el-spin .8s linear infinite;}
.el-loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1rem;color:#475569;}
.el-error-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1rem;color:#475569;text-align:center;padding:2rem;}
.el-error-screen h2{font-size:1.5rem;font-weight:900;color:#003d7a;}
.el-toast{position:fixed;bottom:7rem;right:2rem;z-index:9999;background:#fff;border:1px solid #e2e8f0;color:#0f172a;padding:.875rem 1.25rem;border-radius:.75rem;display:flex;align-items:center;gap:.625rem;font-size:.8125rem;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.12);}
.el-toast.success .ms{color:#059669;} .el-toast.error .ms{color:#ef4444;}
`;

/* ── Compte à rebours basé sur startedAt (heure de 1er accès, résiste refresh) ── */
const DUREE_ENTRETIEN_MIN = 15; // durée d'un entretien
const ALERTE_AVANT_MIN = 2;  // alerte 2 min avant la fin

const useCountdownFromStart = (startedAtIso) => {
  // restant = secondes restantes avant la fin
  const [restant, setRestant] = useState(null); // null = pas encore démarré

  useEffect(() => {
    if (!startedAtIso) { //setRestant(null);
      return;
    }

    const startMs = new Date(startedAtIso).getTime();
    const dureeSec = DUREE_ENTRETIEN_MIN * 60;

    const tick = () => {
      const ecoule = Math.floor((Date.now() - startMs) / 1000);
      let reste = dureeSec - ecoule;
      if (reste < 0) reste = 0;                 // jamais négatif
      if (reste > dureeSec) reste = dureeSec;   // borne haute
      setRestant(reste);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtIso]);

  const p = n => String(n).padStart(2, '0');
  const val = restant == null ? DUREE_ENTRETIEN_MIN * 60 : restant;
  const m = Math.floor(val / 60);
  const s = val % 60;
  const label = `${p(m)}:${p(s)}`;
  const fini = restant != null && restant <= 0;

  return { restant, label, fini };
};

/* ── Config ICE ──────────────────────────────────────────────────────────── */
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */
const EntretienLive = () => {
  const { roomToken } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isRH = user?.role === 'ROLE_RH'
    || user?.authorities?.some(a => a.authority === 'ROLE_RH');

  const [entretien, setEntretien] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [notes, setNotes] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [started, setStarted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [toast, setToast] = useState(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);

  // ✅ Note de fin d'entretien (RH)
  const [scoreEntretien, setScoreEntretien] = useState(null); // /10
  const [notesFin, setNotesFin] = useState('');
  const [terminating, setTerminating] = useState(false);
  // ✅ Heure de début réelle (1er accès, depuis la BDD) pour le compte à rebours
  const [startedAt, setStartedAt] = useState(null);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const makingOfferRef = useRef(false);
  const camBusyRef = useRef(false); // ✅ évite double-clic caméra
  const alertedRef = useRef(false); // ✅ évite de notifier plusieurs fois
  // ✅ Compte à rebours 15:00 → 00:00 basé sur startedAt (résiste au refresh)
  const { restant, label: timerLabel, fini } = useCountdownFromStart(startedAt);

  const showToast = (msg, type = 'success', duration = 3500) => {
    setToast({ msg, type }); setTimeout(() => setToast(null), duration);
  };

  /* ── 1. Charger infos salle + démarrer le chrono (RH uniquement) ────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`/api/interviews/room/${roomToken}`);
        setEntretien(data);
        setNotes(data.notesRh || '');
        // ✅ Pré-remplir la note de fin avec les notes existantes
        setNotesFin(data.notesRh || '');
        if (data.scoreEntretien != null) setScoreEntretien(data.scoreEntretien);

        if (isRH) {
          // ✅ Seul le RH déclenche le chrono (fixe startedAt au 1er accès)
          try {
            const res = await axios.post(`/api/interviews/room/${roomToken}/demarrer`);
            setStartedAt(res.data?.startedAt || null);
          } catch {
            setStartedAt(data.startedAt || null);
          }
        } else {
          // ✅ Le candidat lit seulement startedAt (ne déclenche RIEN)
          setStartedAt(data.startedAt || null);
        }
      } catch (e) {
        setErreur(e.response?.status === 404 ? 'Salle introuvable.' : 'Erreur de connexion.');
      } finally { setLoading(false); }
    };
    load();
  }, [roomToken, isRH]);

  /* ── 2. Démarrer caméra locale ──────────────────────────────────────────── */
  useEffect(() => {
    if (loading || erreur) return;
    let cancelled = false;
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(() => { });
        }
      } catch (e) {
        console.warn('[EntretienLive] Caméra:', e.message);
      } finally {
        if (!cancelled) setStarted(true);
      }
    };
    startCam();
    return () => { cancelled = true; };
  }, [loading, erreur]);

  /* ── 3. WebRTC + WebSocket signaling ────────────────────────────────────── */
  useEffect(() => {
    if (!started || erreur) return;

    const isDev = import.meta.env.DEV;
    const wsUrl = isDev
      ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/signaling/${roomToken}`
      : `wss://recrutement-backend-a5g6cbfvbfcgh3g6.germanywestcentral-01.azurewebsites.net/ws/signaling/${roomToken}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const createPC = () => {
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t =>
          pc.addTrack(t, localStreamRef.current)
        );
      }

      pc.ontrack = (evt) => {
        const [stream] = evt.streams;
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => { });
        }
        setPeerConnected(true);
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ice-candidate', candidate }));
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('[WebRTC] Connection state:', state);
        if (state === 'disconnected' || state === 'failed') {
          setPeerConnected(false);
        }
      };

      return pc;
    };

    ws.onopen = () => {
      console.log('[WS] Connecté à la salle:', roomToken);
      createPC();
      ws.send(JSON.stringify({ type: 'ready' }));
    };

    ws.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data);
      const pc = pcRef.current;

      if (msg.type === 'peer-joined') {
        if (!pcRef.current) createPC();
        const pc2 = pcRef.current;
        try {
          makingOfferRef.current = true;
          const offer = await pc2.createOffer();
          await pc2.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: 'offer', sdp: pc2.localDescription }));
        } catch (e) { console.error('[WebRTC] createOffer:', e); }
        finally { makingOfferRef.current = false; }
        return;
      }

      if (!pc) return;

      if (msg.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription }));
        setPeerConnected(true);
      }

      if (msg.type === 'answer') {
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          setPeerConnected(true);
        }
      }

      if (msg.type === 'ice-candidate') {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); }
        catch (e) { console.warn('[WebRTC] addIceCandidate:', e); }
      }

      if (msg.type === 'peer-left') {
        setPeerConnected(false);
        setRemoteStream(null);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      }
    };

    ws.onerror = (e) => console.warn('[WS] Erreur:', e);
    ws.onclose = () => {
      console.log('[WS] Connexion fermée');
      setPeerConnected(false);
    };

    return () => {
      ws.close();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [started, erreur, roomToken]);

  /* ── Attacher remote stream au video element ─────────────────────────────── */
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => { });
    }
  }, [remoteStream]);

  /* ── ✅ Ré-attacher le flux local au PiP quand la caméra revient ─────────── */
  useEffect(() => {
    if (camOn && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => { });
    }
  }, [camOn]);

  /* ── ✅ Candidat : sonder startedAt tant que le RH n'a pas lancé le chrono ── */
  useEffect(() => {
    if (isRH) return;            // le RH déclenche lui-même
    if (startedAt) return;       // déjà démarré → plus besoin de sonder
    if (loading || erreur) return;

    const id = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/interviews/room/${roomToken}`);
        if (data?.startedAt) {
          setStartedAt(data.startedAt);
          clearInterval(id);
        }
      } catch { /* ignore */ }
    }, 5000); // toutes les 5 s

    return () => clearInterval(id);
  }, [isRH, startedAt, loading, erreur, roomToken]);

  /* ── ✅ Alerte 2 min avant la fin (RH uniquement) ────────────────────────── */
  useEffect(() => {
    if (!isRH) return;                 // notif réservée au RH
    if (restant == null) return;       // pas encore démarré
    if (alertedRef.current) return;    // déjà alerté

    const seuilAlerte = ALERTE_AVANT_MIN * 60; // 2 min = 120 s restantes

    if (restant > 0 && restant <= seuilAlerte) {
      alertedRef.current = true;
      showToast(`⏰ Plus que ${ALERTE_AVANT_MIN} minutes avant la fin de l'entretien`, 'error', 8000);
    }
  }, [restant, isRH]);

  /* ── Toggle mic ─────────────────────────────────────────────────────────── */
  const toggleMic = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(v => !v);
  }, []);

  /* ── ✅ Toggle cam — FIX : remplace le track via le sender (replaceTrack) ── */
  const toggleCam = useCallback(async () => {
    if (camBusyRef.current) return; // évite double-clic rapide
    camBusyRef.current = true;

    const stream = localStreamRef.current;
    const pc = pcRef.current;

    try {
      if (camOn) {
        // ── ÉTEINDRE ──
        stream?.getVideoTracks().forEach(t => {
          t.stop();
          stream.removeTrack(t);
        });
        // Couper l'envoi au pair sans casser la connexion
        if (pc) {
          pc.getSenders().forEach(s => {
            if (s.track && s.track.kind === 'video') {
              s.replaceTrack(null).catch(() => { });
            }
          });
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        setCamOn(false);

      } else {
        // ── RALLUMER ──
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        const newTrack = newStream.getVideoTracks()[0];

        if (!newTrack) throw new Error('Pas de piste vidéo');

        // Ajouter le nouveau track au stream local
        if (stream) stream.addTrack(newTrack);

        // Remettre l'envoi au pair via le sender existant
        if (pc) {
          const videoSender = pc.getSenders().find(s =>
            !s.track || s.track.kind === 'video'
          );
          if (videoSender) {
            await videoSender.replaceTrack(newTrack);
          } else {
            pc.addTrack(newTrack, stream || newStream);
          }
        }

        // Ré-attacher au PiP local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream || newStream;
          await localVideoRef.current.play().catch(() => { });
        }
        setCamOn(true);
      }
    } catch (e) {
      console.warn('[toggleCam]', e);
      showToast('Impossible de réactiver la caméra', 'error');
    } finally {
      camBusyRef.current = false;
    }
  }, [camOn]);

  /* ── Sauvegarder notes (onglet RH) ──────────────────────────────────────── */
  const saveNotes = async () => {
    if (!entretien || !isRH) return;
    setSavingNotes(true);
    try {
      await axios.patch(`/api/interviews/${entretien.id}/notes`, { notes });
      setNotesFin(notes); // ✅ garder les notes synchronisées pour la modal de fin
      showToast('Notes sauvegardées ✓');
    } catch { showToast('Erreur sauvegarde', 'error'); }
    finally { setSavingNotes(false); }
  };

  /* ── Ouvrir la modal de fin ─────────────────────────────────────────────── */
  const openFinish = () => {
    // ✅ Pré-remplir avec les notes prises pendant l'entretien
    setNotesFin(notes || entretien?.notesRh || '');
    setShowConfirm(true);
  };

  /* ── Cleanup média + WS ──────────────────────────────────────────────────── */
  const cleanupMedia = () => {
    wsRef.current?.send(JSON.stringify({ type: 'bye' }));
    wsRef.current?.close();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
  };

  /* ── Terminer (RH) — enregistre note /10 + notes, puis termine ───────────── */
  const terminerRH = async () => {
    if (scoreEntretien == null) {
      showToast('Attribuez une note sur 10', 'error');
      return;
    }
    setTerminating(true);
    try {
      // 1. Sauvegarder les notes
      await axios.patch(`/api/interviews/${entretien.id}/notes`, { notes: notesFin });
      // 2. Terminer avec la note /10
      await axios.patch(`/api/interviews/${entretien.id}/terminer`, {
        scoreEntretien: scoreEntretien,
        notesRh: notesFin,
      });
      cleanupMedia();
      navigate('/rh/calendrier');
    } catch {
      showToast('Erreur lors de la clôture', 'error');
      setTerminating(false);
    }
  };

  /* ── Quitter (Candidat) — retour au détail de la candidature ─────────────── */
  const quitterCandidat = () => {
    setShowConfirm(false);
    cleanupMedia();
    // ✅ Retour vers le détail de la candidature
    if (entretien?.candidatureId) {
      navigate(`/candidat/candidatures/${entretien.candidatureId}`);
    } else {
      navigate('/candidat/candidatures');
    }
  };

  const initials = entretien?.candidatNom
    ? entretien.candidatNom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const dateFmt = entretien?.dateDebut
    ? new Date(entretien.dateDebut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const tabs = isRH
    ? [{ k: 'info', l: 'Candidat' }, { k: 'notes', l: 'Notes RH' }]
    : [{ k: 'info', l: 'Informations' }];

  if (loading) return (
    <div className="el-page"><style>{styles}</style>
      <div className="el-loading-screen">
        <i className="ms el-spin" style={{ fontSize: '2.5rem', color: '#003d7a' }}>progress_activity</i>
        <p style={{ fontWeight: 600 }}>Connexion à la salle...</p>
        <p style={{ fontSize: '.75rem', color: '#94a3b8' }}>Salle · {roomToken}</p>
      </div>
    </div>
  );

  if (erreur) return (
    <div className="el-page"><style>{styles}</style>
      <div className="el-error-screen">
        <i className="ms" style={{ fontSize: '4rem', color: '#ef4444', fontVariationSettings: "'FILL' 1" }}>error</i>
        <h2>Salle introuvable</h2><p>{erreur}</p>
        <button onClick={() => navigate(isRH ? '/rh/calendrier' : '/candidat/candidatures')}
          style={{ marginTop: '1rem', padding: '.75rem 1.5rem', background: '#003d7a', border: 'none', borderRadius: '.5rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Public Sans,sans-serif', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <i className="ms">arrow_back</i> Retour
        </button>
      </div>
    </div>
  );

  return (
    <div className="el-page"><style>{styles}</style>
      <div className="el-root">

        {toast && (
          <div className={`el-toast ${toast.type}`}>
            <i className="ms">{toast.type === 'success' ? 'check_circle' : 'error'}</i>{toast.msg}
          </div>
        )}

        {/* ── MODAL DE FIN ── */}
        {showConfirm && (
          <div className="el-confirm-overlay">
            <div className="el-confirm-modal">
              {isRH ? (<>
                <h3>Terminer l'entretien</h3>
                <p>Attribuez une note au candidat et complétez vos notes avant de clôturer.</p>

                {/* Note /10 */}
                <label className="el-finish-label">Note de l'entretien (sur 10)</label>
                <div className="el-score-picker">
                  {Array.from({ length: 11 }, (_, i) => i).map(n => (
                    <button key={n}
                      className={`el-score-pick-btn${scoreEntretien === n ? ' selected' : ''}`}
                      onClick={() => setScoreEntretien(n)}>
                      {n}
                    </button>
                  ))}
                </div>

                {/* Notes (pré-remplies) */}
                <label className="el-finish-label">Notes sur le candidat</label>
                <textarea className="el-finish-textarea"
                  placeholder="Observations, points forts, axes d'amélioration..."
                  value={notesFin}
                  onChange={e => setNotesFin(e.target.value)} />

                <div className="el-confirm-btns">
                  <button className="el-confirm-cancel" onClick={() => setShowConfirm(false)} disabled={terminating}>
                    Annuler
                  </button>
                  <button className="el-confirm-ok green" onClick={terminerRH}
                    disabled={terminating || scoreEntretien == null}>
                    {terminating ? 'Clôture...' : 'Terminer l\'entretien'}
                  </button>
                </div>
              </>) : (<>
                <h3>Quitter l'entretien ?</h3>
                <p>Vous allez quitter la salle d'entretien et revenir au détail de votre candidature.</p>
                <div className="el-confirm-btns">
                  <button className="el-confirm-cancel" onClick={() => setShowConfirm(false)}>Annuler</button>
                  <button className="el-confirm-ok" onClick={quitterCandidat}>Quitter</button>
                </div>
              </>)}
            </div>
          </div>
        )}

        {/* HEADER */}
        <header className="el-header" style={{ marginTop: '1%', borderRadius: '20px' }}>
          <div className="el-header-left">
            <div>
              <p className="el-eyebrow">{isRH ? 'Entretien · Session Live' : 'Votre Entretien · Session Live'}</p>
              <h1 className="el-session-title">{entretien?.sujetTitre || '—'}</h1>
            </div>
            <div className="el-sep" />
            <div className="el-live-badge">
              <div className="el-live-dot" />
              {isRH ? `EN DIRECT · ${entretien?.candidatNom?.toUpperCase() || ''}` : 'ENTRETIEN EN COURS'}
            </div>
            <span className={`el-role-badge ${isRH ? 'rh' : 'candidat'}`}>{isRH ? 'RH' : 'Candidat'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="glass" style={{ padding: '.5rem 1rem', borderRadius: '.625rem', display: 'flex', alignItems: 'center', gap: '.625rem' }}>
              <i className="ms" style={{ color: '#003d7a', fontSize: '1rem' }}>schedule</i>
              <span className="el-timer" style={(restant != null && restant <= ALERTE_AVANT_MIN * 60) ? { color: '#ef4444' } : undefined}>
                {restant == null ? (isRH ? timerLabel : "En attente") : (fini ? "Terminé" : timerLabel)}
              </span>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <div className="el-main" style={isRH ? { height: '1000px' } : { height: 'auto' }}>

          {/* Zone vidéo */}
          <div className="el-video-area" style={!isRH ? { minHeight: 0 } : undefined}>
            <div className="el-video-wrap" style={{ boxShadow: "0 11px 34px rgba(0.2, 0.2, 0.2, 0.2)", ...(!isRH ? { minHeight: 0 } : {}) }}>

              {peerConnected && remoteStream
                ? <video ref={remoteVideoRef} autoPlay playsInline
                  className="el-remote-video"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : (
                  <div className="el-cam-placeholder" style={!isRH ? { minHeight: 0 } : undefined}>
                    <div className="el-avatar-big">
                      {isRH
                        ? (entretien?.candidatPhoto ? <img src={entretien.candidatPhoto} alt="" /> : initials)
                        : '👤'}
                    </div>
                    <p className="el-placeholder-name">
                      {isRH ? entretien?.candidatNom : 'Banque Centrale de Tunisie'}
                    </p>
                    <div className={`el-conn-status ${peerConnected ? 'connected' : 'waiting'}`}>
                      <i className="ms" style={{ fontSize: '.875rem' }}>
                        {peerConnected ? 'check_circle' : 'hourglass_empty'}
                      </i>
                      {peerConnected
                        ? 'Connecté'
                        : isRH
                          ? 'En attente du candidat...'
                          : 'En attente du recruteur...'}
                    </div>
                  </div>
                )
              }

              {/* PiP caméra locale */}
              <div className="el-pip">
                {camOn
                  ? <video ref={localVideoRef} autoPlay muted playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
                  : <div className="el-pip-off"><i className="ms" style={{ color: '#94a3b8' }}>videocam_off</i></div>
                }
                <div className="el-pip-label">
                  <i className="ms">{micOn ? 'mic' : 'mic_off'}</i>Moi
                </div>
              </div>

              {peerConnected && (
                <div className="el-speaker glass">
                  <div className="el-bars">
                    <div className="el-bar" /> <div className="el-bar" /> <div className="el-bar" />
                  </div>
                  <span style={{ fontSize: '.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {isRH ? 'Candidat' : 'RH'} · Audio
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Panneau droite */}
          <aside className="el-panel">
            <nav className="el-tabs glass" style={{ boxShadow: "0 11px 34px rgba(0.2, 0.2, 0.2, 0.2)" }}>
              {tabs.map(t => (
                <button key={t.k} className={`el-tab${activeTab === t.k ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.k)}>{t.l}</button>
              ))}
            </nav>

            <div className="el-panel-content glass" style={{ boxShadow: "0 11px 34px rgba(0.2, 0.2, 0.2, 0.2)" }}>
              {activeTab === 'info' && (<>
                {isRH ? (<>
                  <div className="el-cand-row">
                    <div className="el-cand-photo">
                      {entretien?.candidatPhoto
                        ? <img src={entretien.candidatPhoto} alt="" />
                        : initials}
                    </div>
                    <div>
                      <p className="el-cand-name">{entretien?.candidatNom || '—'}</p>
                      <p className="el-cand-sub">{entretien?.sujetTitre || '—'}</p>
                      {entretien?.sujetDept && <p className="el-cand-dept">{entretien.sujetDept}</p>}
                    </div>
                  </div>
                  <div className="el-divider" />
                  <div>
                    <p className="el-sec-lbl">Scores pré-entretien</p>
                    <div className="el-scores-grid">
                      <div className="el-score-box">
                        <div className="el-score-num blue">{entretien?.scoreQuiz ?? '—'}<span className="el-score-unit">/50</span></div>
                        <div className="el-score-lbl">Quiz Technique</div>
                      </div>
                      <div className="el-score-box">
                        <div className="el-score-num green">{entretien?.scoreAi ?? '—'}<span className="el-score-unit">/100</span></div>
                        <div className="el-score-lbl">Score IA CV</div>
                      </div>
                    </div>
                  </div>
                  <div className="el-divider" />
                </>) : (<>
                  <div className="el-info-box">
                    <p className="el-info-title"><i className="ms">info</i>Informations</p>
                    <div className="el-info-row"><i className="ms">work</i><span><strong>Poste :</strong> {entretien?.sujetTitre || '—'}</span></div>
                    {entretien?.sujetDept && <div className="el-info-row"><i className="ms">corporate_fare</i><span><strong>Département :</strong> {entretien.sujetDept}</span></div>}
                    <div className="el-info-row"><i className="ms">mail</i><span><strong>Contact :</strong> rh@bct.tn</span></div>
                  </div>
                </>)}
                <div className="el-horaire">
                  <p className="el-horaire-lbl">Créneau</p>
                  <p className="el-horaire-val">{entretien?.heureDebut} – {entretien?.heureFin}</p>
                  <p className="el-horaire-date">{dateFmt}</p>
                </div>

                {/* ✅ Toolbar CANDIDAT — dans le bloc info */}
                {!isRH && (
                  <div className="el-toolbar-inner glass" style={{ marginTop: '.25rem' }}>
                    <div className="el-tool-group">
                      <button className={`el-tool-btn${!micOn ? ' off' : ''}`} onClick={toggleMic} title={micOn ? 'Couper' : 'Activer'}>
                        <i className="ms">{micOn ? 'mic' : 'mic_off'}</i>
                      </button>
                      <button className={`el-tool-btn${!camOn ? ' off' : ''}`} onClick={toggleCam} title={camOn ? 'Éteindre' : 'Rallumer'}>
                        <i className="ms">{camOn ? 'videocam' : 'videocam_off'}</i>
                      </button>
                    </div>
                    <div className="el-tool-group">
                      <button className="el-end-btn" onClick={() => setShowConfirm(true)}>
                        <i className="ms">call_end</i>
                        Quitter
                      </button>
                    </div>
                  </div>
                )}
              </>)}

              {activeTab === 'notes' && isRH && (<>
                <p className="el-notes-lbl">Notes (RH uniquement)</p>
                <textarea className="el-notes-area"
                  placeholder="Observations, points forts, axes d'amélioration..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
                <button className="el-save-btn" onClick={saveNotes} disabled={savingNotes}>
                  <i className="ms">{savingNotes ? 'progress_activity' : 'save'}</i>
                  {savingNotes ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </>)}
            </div>
          </aside>
        </div>

        {/* TOOLBAR — visible/cliquable RH ; présente mais invisible pour candidat */}
        <div className="el-toolbar" style={!isRH ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}>
          <div className="el-toolbar-inner glass">
            <div className="el-tool-group">
              <button className={`el-tool-btn${!micOn ? ' off' : ''}`} onClick={toggleMic} title={micOn ? 'Couper' : 'Activer'}>
                <i className="ms">{micOn ? 'mic' : 'mic_off'}</i>
              </button>
              <button className={`el-tool-btn${!camOn ? ' off' : ''}`} onClick={toggleCam} title={camOn ? 'Éteindre' : 'Rallumer'}>
                <i className="ms">{camOn ? 'videocam' : 'videocam_off'}</i>
              </button>
            </div>
            <div className="el-tool-group">
              <button className="el-tool-btn" onClick={() => setActiveTab('notes')} title="Notes">
                <i className="ms">edit_note</i>
              </button>
            </div>
            <div className="el-tool-group">
              <button className="el-end-btn" onClick={openFinish}>
                <i className="ms">call_end</i>
                Terminer l'entretien
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EntretienLive;