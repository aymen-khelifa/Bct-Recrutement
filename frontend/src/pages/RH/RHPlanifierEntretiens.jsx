import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
//  RHPlanifierEntretiens.jsx
//
//  Bouton "Lancer la planification IA" → planifie TOUS les sujets en même temps
//  Props : onBack (optionnel)
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_SCOPES    = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
body{margin:0;padding:0;}

.rpe-root *{box-sizing:border-box;margin:0;padding:0;}
.rpe-root{font-family:'Public Sans',sans-serif;color:#0f172a;}
.rpe-root .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;vertical-align:middle;}

.rpe-back{display:inline-flex;align-items:center;gap:.5rem;background:none;border:none;cursor:pointer;font-family:'Public Sans',sans-serif;font-size:.875rem;font-weight:700;color:#64748b;margin-bottom:1.5rem;padding:0;transition:color .15s;}
.rpe-back:hover{color:#003d7a;}
.rpe-back .material-symbols-outlined{font-size:1.125rem;}

.rpe-title{font-size:2rem;font-weight:900;color:#003d7a;letter-spacing:-.04em;margin-bottom:.5rem;}
.rpe-title-bar{width:4rem;height:.3125rem;background:#003d7a;border-radius:9999px;margin-bottom:1.5rem;}
.rpe-subtitle{font-size:.9375rem;color:#64748b;margin-bottom:2rem;font-weight:500;}

/* LAYOUT */
.rpe-layout{display:grid;grid-template-columns:1fr 360px;gap:1.5rem;}
@media(max-width:1024px){.rpe-layout{grid-template-columns:1fr;}}

/* CARDS */
.rpe-card{background:#fff;border:1px solid #e2e8f0;border-radius:1rem;padding:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.04);margin-bottom:1.5rem;}
.rpe-card-title{font-size:.875rem;font-weight:800;color:#0f172a;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;}
.rpe-card-title .material-symbols-outlined{font-size:1.125rem;color:#003d7a;}

/* GOOGLE */
.rpe-google-btn{display:flex;align-items:center;gap:.875rem;padding:.875rem 1.5rem;background:#fff;border:1.5px solid #e2e8f0;border-radius:.75rem;cursor:pointer;font-family:'Public Sans',sans-serif;font-size:.9375rem;font-weight:700;color:#0f172a;transition:all .2s;width:100%;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.08);}
.rpe-google-btn:hover{border-color:#003d7a;box-shadow:0 4px 16px rgba(0,61,122,.15);}
.rpe-google-btn:disabled{opacity:.5;cursor:not-allowed;}
.rpe-google-logo{width:1.5rem;height:1.5rem;flex-shrink:0;}
.rpe-connected{display:flex;align-items:center;gap:.875rem;padding:1rem 1.25rem;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:.75rem;}
.rpe-connected-icon{width:2.5rem;height:2.5rem;background:#059669;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rpe-connected-icon .material-symbols-outlined{color:#fff;font-size:1.375rem;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;}
.rpe-connected-name{font-size:.875rem;font-weight:700;color:#059669;}
.rpe-connected-sub{font-size:.75rem;color:#16a34a;margin-top:.125rem;}
.rpe-disconnect{margin-left:auto;background:none;border:none;cursor:pointer;color:#94a3b8;padding:.25rem;display:flex;}
.rpe-disconnect:hover{color:#dc2626;}

/* RÈGLES */
.rpe-rules{display:grid;grid-template-columns:1fr 1fr;gap:.875rem;margin-bottom:1.5rem;}
.rpe-rule{background:#f8fafc;border:1px solid #e2e8f0;border-radius:.75rem;padding:1rem;display:flex;align-items:flex-start;gap:.75rem;}
.rpe-rule-icon{width:2.25rem;height:2.25rem;border-radius:.5rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rpe-rule-icon.blue{background:rgba(0,61,122,.08);} .rpe-rule-icon.blue .material-symbols-outlined{color:#003d7a;font-size:1.125rem;}
.rpe-rule-icon.green{background:rgba(5,150,105,.08);} .rpe-rule-icon.green .material-symbols-outlined{color:#059669;font-size:1.125rem;}
.rpe-rule-icon.purple{background:rgba(124,58,237,.08);} .rpe-rule-icon.purple .material-symbols-outlined{color:#7c3aed;font-size:1.125rem;}
.rpe-rule-icon.amber{background:rgba(245,158,11,.08);} .rpe-rule-icon.amber .material-symbols-outlined{color:#d97706;font-size:1.125rem;}
.rpe-rule-title{font-size:.75rem;font-weight:700;color:#0f172a;margin-bottom:.25rem;}
.rpe-rule-val{font-size:.6875rem;color:#64748b;}

/* STATS PAR SUJET */
.rpe-sujet-row{display:flex;align-items:center;justify-content:space-between;padding:.875rem 1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:.75rem;margin-bottom:.625rem;}
.rpe-sujet-name{font-size:.875rem;font-weight:600;color:#0f172a;}
.rpe-sujet-count{display:flex;align-items:center;gap:.375rem;font-size:.75rem;font-weight:700;color:#7c3aed;background:rgba(124,58,237,.08);padding:.2rem .625rem;border-radius:9999px;border:1px solid rgba(124,58,237,.2);}
.rpe-sujet-count .material-symbols-outlined{font-size:.875rem;}

/* CANDIDATS */
.rpe-candidat-list{display:flex;flex-direction:column;gap:.5rem;}
.rpe-candidat-item{display:flex;align-items:center;gap:.875rem;padding:.875rem 1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:.75rem;}
.rpe-cand-avatar{width:2.25rem;height:2.25rem;border-radius:50%;background:rgba(0,61,122,.1);display:flex;align-items:center;justify-content:center;color:#003d7a;font-size:.6875rem;font-weight:700;flex-shrink:0;}
.rpe-cand-name{font-size:.875rem;font-weight:600;color:#0f172a;}
.rpe-cand-meta{font-size:.75rem;color:#94a3b8;margin-top:.1rem;}
.rpe-quiz-score{margin-left:auto;display:inline-flex;align-items:center;gap:.25rem;padding:.2rem .625rem;background:rgba(124,58,237,.08);color:#7c3aed;border:1px solid rgba(124,58,237,.2);border-radius:.375rem;font-size:.6875rem;font-weight:700;flex-shrink:0;}
.rpe-quiz-score .material-symbols-outlined{font-size:.875rem;}

/* ═══ BOUTON PLANIFIER GLOBAL ═══ */
.rpe-btn-plan-global{
  width:100%;padding:1.125rem;
  background:linear-gradient(135deg,#003d7a,#0056b3);
  color:#fff;border:none;border-radius:.875rem;
  font-size:1.0625rem;font-weight:900;
  cursor:pointer;font-family:'Public Sans',sans-serif;
  display:flex;align-items:center;justify-content:center;gap:.75rem;
  transition:all .2s;
  box-shadow:0 6px 20px rgba(0,61,122,.35);
  letter-spacing:.01em;
  position:relative;overflow:hidden;
}
.rpe-btn-plan-global::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.08),transparent);
}
.rpe-btn-plan-global:hover:not(:disabled){
  opacity:.92;box-shadow:0 8px 24px rgba(0,61,122,.45);transform:translateY(-2px);
}
.rpe-btn-plan-global:active:not(:disabled){transform:translateY(0);}
.rpe-btn-plan-global:disabled{opacity:.45;cursor:not-allowed;transform:none;}
.rpe-btn-plan-global .material-symbols-outlined{font-size:1.375rem;}
.rpe-btn-plan-global-inner{display:flex;flex-direction:column;align-items:center;gap:.2rem;}
.rpe-btn-plan-global-label{font-size:1.0625rem;font-weight:900;}
.rpe-btn-plan-global-sub{font-size:.6875rem;color:rgba(255,255,255,.7);font-weight:600;}
.rpe-btn-spinner{width:1.25rem;height:1.25rem;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:rpe-spin .7s linear infinite;}
@keyframes rpe-spin{to{transform:rotate(360deg)}}

/* PLANNING RÉSULTAT */
.rpe-success-banner{background:linear-gradient(135deg,#022c1a,#064e2e);border-radius:1rem;padding:1.5rem;color:#fff;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;}
.rpe-success-icon{width:3rem;height:3rem;background:rgba(5,150,105,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rpe-success-icon .material-symbols-outlined{font-size:1.5rem;color:#6ee7b7;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;}
.rpe-planning-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:.75rem;}
.rpe-planning-count{display:flex;align-items:center;gap:.5rem;font-size:.875rem;font-weight:700;color:#059669;}
.rpe-planning-count .material-symbols-outlined{font-size:1.125rem;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;}
.rpe-slot{background:#fff;border:1px solid #e2e8f0;border-radius:.875rem;padding:1.25rem;margin-bottom:.875rem;display:flex;align-items:flex-start;gap:1rem;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.rpe-slot-date{background:#003d7a;color:#fff;border-radius:.625rem;padding:.75rem;text-align:center;flex-shrink:0;min-width:4.5rem;}
.rpe-slot-day{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.7);}
.rpe-slot-num{font-size:1.75rem;font-weight:900;line-height:1;}
.rpe-slot-month{font-size:.625rem;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,.7);}
.rpe-slot-info{flex:1;min-width:0;}
.rpe-slot-time{font-size:.75rem;font-weight:700;color:#003d7a;margin-bottom:.375rem;display:flex;align-items:center;gap:.25rem;}
.rpe-slot-time .material-symbols-outlined{font-size:.875rem;}
.rpe-slot-name{font-size:.9375rem;font-weight:700;color:#0f172a;margin-bottom:.125rem;}
.rpe-slot-sujet{font-size:.75rem;color:#64748b;margin-bottom:.625rem;}
.rpe-meet-link{display:inline-flex;align-items:center;gap:.375rem;padding:.375rem .875rem;background:rgba(0,61,122,.06);border:1px solid rgba(0,61,122,.2);border-radius:.5rem;font-size:.75rem;font-weight:700;color:#003d7a;text-decoration:none;transition:all .15s;}
.rpe-meet-link:hover{background:rgba(0,61,122,.1);}
.rpe-meet-link .material-symbols-outlined{font-size:.875rem;}
.rpe-no-meet{font-size:.75rem;color:#94a3b8;font-style:italic;}

/* SIDEBAR STATS */
.rpe-stat-item{display:flex;align-items:center;justify-content:space-between;padding:.875rem 0;border-bottom:1px solid #f1f5f9;}
.rpe-stat-item:last-child{border-bottom:none;}
.rpe-stat-label{font-size:.8125rem;color:#64748b;display:flex;align-items:center;gap:.5rem;}
.rpe-stat-label .material-symbols-outlined{font-size:1rem;color:#003d7a;}
.rpe-stat-val{font-size:.9375rem;font-weight:800;color:#0f172a;}
.rpe-progress-wrap{margin-bottom:1.5rem;}
.rpe-progress-top{display:flex;justify-content:space-between;margin-bottom:.5rem;}
.rpe-progress-lbl{font-size:.75rem;font-weight:700;color:#64748b;}
.rpe-progress-pct{font-size:.75rem;font-weight:800;color:#003d7a;}
.rpe-progress-bar{height:.5rem;background:#f1f5f9;border-radius:9999px;overflow:hidden;}
.rpe-progress-fill{height:100%;background:linear-gradient(90deg,#003d7a,#0891b2);border-radius:9999px;transition:width .5s ease;}

/* STATES */
.rpe-empty{display:flex;flex-direction:column;align-items:center;padding:3rem 2rem;color:#94a3b8;gap:.75rem;text-align:center;}
.rpe-empty .material-symbols-outlined{font-size:3rem;color:#cbd5e1;}
.rpe-loading{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#64748b;font-size:.875rem;}
.rpe-spin{animation:rpe-spin .8s linear infinite;color:#003d7a;}
.rpe-error{background:#fef2f2;border:1px solid #fecaca;border-radius:.75rem;padding:1rem 1.25rem;font-size:.875rem;color:#b91c1c;display:flex;align-items:center;gap:.5rem;margin-bottom:1.25rem;}

@keyframes rpe-toast-in{from{opacity:0;transform:translateY(1rem)}to{opacity:1;transform:translateY(0)}}
.rpe-toast{position:fixed;bottom:2rem;right:2rem;z-index:9999;background:#0f172a;color:#fff;padding:1rem 1.5rem;border-radius:.75rem;display:flex;align-items:center;gap:.75rem;font-size:.875rem;font-weight:600;font-family:'Public Sans',sans-serif;box-shadow:0 20px 25px -5px rgba(0,0,0,.3);animation:rpe-toast-in .3s ease;}
.rpe-toast.success .material-symbols-outlined{color:#22c55e;}
.rpe-toast.error .material-symbols-outlined{color:#ef4444;}
`;

// ── Helpers ──────────────────────────────────────────────────────────────────
const getInit = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const formatSlot = (isoStr) => {
  if (!isoStr) return { weekday:'?', num:'?', month:'?', time:'?' };
  const d = new Date(isoStr);
  const JOURS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const MOIS  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  return {
    weekday: JOURS[d.getDay()],
    num:     d.getDate().toString().padStart(2,'0'),
    month:   MOIS[d.getMonth()],
    time:    `${d.getHours().toString().padStart(2,'0')}h${d.getMinutes().toString().padStart(2,'0')}`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
const RHPlanifierEntretiens = ({ onBack }) => {
  const [googleToken,  setGoogleToken]  = useState(null);
  const [googleUser,   setGoogleUser]   = useState(null);
  const [candidats,    setCandidats]    = useState([]);    // tous ACCEPTE_QUIZ
  const [parSujetMap,  setParSujetMap]  = useState({});   // { [sujetTitre]: count }
  const [loadingCands, setLoadingCands] = useState(true);
  const [planning,     setPlanning]     = useState([]);
  const [resumeParSujet, setResumeParSujet] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState('');
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Charger tous les candidats ACCEPTE_QUIZ (tous sujets) ────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingCands(true);
      try {
        const { data } = await axios.get('/api/candidatures');
        const filtres = data
          .filter(c => c.statut === 'ACCEPTE_QUIZ')
          .sort((a, b) => (b.scoreQuiz ?? 0) - (a.scoreQuiz ?? 0));

        setCandidats(filtres);

        // Grouper par sujet
        const map = {};
        filtres.forEach(c => {
          const t = c.sujetTitre || 'Sujet inconnu';
          map[t] = (map[t] || 0) + 1;
        });
        setParSujetMap(map);

      } catch { setError('Erreur lors du chargement des candidats.'); }
      finally { setLoadingCands(false); }
    };
    load();
  }, []);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleLogin = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      // Mode démo
      setGoogleToken('demo_token');
      setGoogleUser({ name: 'RH BCT', email: 'rh@bct.tn' });
      showToast('Connecté en mode démo (pas de Client ID configuré)', 'error');
      return;
    }

    if (window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope:     GOOGLE_SCOPES,
        callback:  async (resp) => {
          if (resp.access_token) {
            setGoogleToken(resp.access_token);
            try {
              const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` }
              });
              const u = await r.json();
              setGoogleUser({ name: u.name, email: u.email });
              showToast('Google Calendar connecté !');
            } catch {
              setGoogleUser({ name: 'RH connecté', email: '' });
            }
          }
        },
      });
      client.requestAccessToken();
    } else {
      showToast('Google Identity Services non chargé. Vérifiez votre connexion.', 'error');
    }
  }, []);

  const handleDisconnect = () => {
    setGoogleToken(null); setGoogleUser(null);
    setPlanning([]); setSuccess(false); setResumeParSujet([]);
  };

  // ── Lancer planification — TOUS LES SUJETS ───────────────────────────────
  const handlePlanifierTous = async () => {
    if (!googleToken) { showToast('Connectez votre Google Calendar d\'abord', 'error'); return; }
    if (candidats.length === 0) { showToast('Aucun candidat à planifier', 'error'); return; }

    setLoading(true); setError(''); setSuccess(false);

    try {
      // Body vide = tous les sujets
      const { data } = await axios.post(
        '/api/interviews/planifier',
        {},   // ← vide = tous les sujets
        { headers: { 'X-Google-Token': googleToken } }
      );

      if (data.success) {
        setPlanning(data.planning || []);
        setResumeParSujet(data.parSujet || []);
        setSuccess(true);
        showToast(`${data.planifies} entretien(s) planifié(s) sur ${data.total} candidat(s) !`);
      } else {
        setError(data.message || 'Erreur lors de la planification.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la planification.');
    } finally { setLoading(false); }
  };

  const totalJours = [...new Set(planning.map(s => s.debut?.split('T')[0]))].length;
  const parJourMoy = planning.length > 0 && totalJours > 0
    ? Math.round(planning.length / totalJours) : 0;

  return (
    <>
      <script src="https://accounts.google.com/gsi/client" async defer />
      <style>{styles}</style>
      <div className="rpe-root">

        {toast && (
          <div className={`rpe-toast ${toast.type}`}>
            <span className="material-symbols-outlined">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {toast.msg}
          </div>
        )}

        {onBack && (
          <button className="rpe-back" onClick={onBack}>
            <span className="material-symbols-outlined">arrow_back</span>
            Retour
          </button>
        )}

        <h2 className="rpe-title">Planification des Entretiens</h2>
        <div className="rpe-title-bar" />
        <p className="rpe-subtitle">
          Planification automatique IA — <strong>tous les sujets en même temps</strong>
          {' · '}Google Calendar + Google Meet
        </p>

        {/* Bannière succès */}
        {success && (
          <div className="rpe-success-banner">
            <div className="rpe-success-icon">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <div>
              <p style={{fontSize:'.9375rem',fontWeight:800,marginBottom:'.375rem'}}>
                {planning.length} entretien{planning.length > 1 ? 's' : ''} planifié{planning.length > 1 ? 's' : ''} — tous sujets !
              </p>
              <p style={{fontSize:'.8125rem',color:'rgba(255,255,255,.75)'}}>
                Emails envoyés aux candidats. Événements dans votre Google Calendar.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rpe-error">
            <span className="material-symbols-outlined">error</span>{error}
          </div>
        )}

        <div className="rpe-layout">

          {/* ── COLONNE PRINCIPALE ── */}
          <div>

            {/* Règles */}
            <div className="rpe-card">
              <p className="rpe-card-title">
                <span className="material-symbols-outlined">rule</span>
                Règles de planification IA
              </p>
              <div className="rpe-rules">
                <div className="rpe-rule">
                  <div className="rpe-rule-icon blue">
                    <span className="material-symbols-outlined">schedule</span>
                  </div>
                  <div>
                    <p className="rpe-rule-title">Horaires</p>
                    <p className="rpe-rule-val">10h00 – 17h00</p>
                  </div>
                </div>
                <div className="rpe-rule">
                  <div className="rpe-rule-icon green">
                    <span className="material-symbols-outlined">timer</span>
                  </div>
                  <div>
                    <p className="rpe-rule-title">Durée / entretien</p>
                    <p className="rpe-rule-val">15 minutes</p>
                  </div>
                </div>
                <div className="rpe-rule">
                  <div className="rpe-rule-icon purple">
                    <span className="material-symbols-outlined">event_repeat</span>
                  </div>
                  <div>
                    <p className="rpe-rule-title">Maximum / jour</p>
                    <p className="rpe-rule-val">10 entretiens</p>
                  </div>
                </div>
                <div className="rpe-rule">
                  <div className="rpe-rule-icon amber">
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <div>
                    <p className="rpe-rule-title">Priorisation</p>
                    <p className="rpe-rule-val">Score quiz décroissant</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Répartition par sujet */}
            <div className="rpe-card">
              <p className="rpe-card-title">
                <span className="material-symbols-outlined">work</span>
                Candidats par sujet ({candidats.length} au total)
              </p>
              {loadingCands ? (
                <div className="rpe-loading">
                  <span className="material-symbols-outlined rpe-spin">progress_activity</span>
                  Chargement...
                </div>
              ) : Object.keys(parSujetMap).length === 0 ? (
                <div className="rpe-empty">
                  <span className="material-symbols-outlined">inbox</span>
                  <p>Aucun candidat ACCEPTE_QUIZ</p>
                </div>
              ) : (
                Object.entries(parSujetMap).map(([sujet, count]) => (
                  <div key={sujet} className="rpe-sujet-row">
                    <p className="rpe-sujet-name">{sujet}</p>
                    <span className="rpe-sujet-count">
                      <span className="material-symbols-outlined">group</span>
                      {count} candidat{count > 1 ? 's' : ''}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Liste triée des candidats */}
            {candidats.length > 0 && (
              <div className="rpe-card">
                <p className="rpe-card-title">
                  <span className="material-symbols-outlined">sort</span>
                  Ordre de priorité (score quiz décroissant)
                </p>
                <div className="rpe-candidat-list">
                  {candidats.map((c, idx) => (
                    <div key={c.id} className="rpe-candidat-item">
                      <div className="rpe-cand-avatar">{getInit(c.candidatNom)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <p className="rpe-cand-name">
                          <span style={{color:'#94a3b8',fontWeight:600,marginRight:'.375rem'}}>
                            #{idx + 1}
                          </span>
                          {c.candidatNom || '—'}
                        </p>
                        <p className="rpe-cand-meta">{c.sujetTitre || '—'}</p>
                      </div>
                      {c.scoreQuiz != null && (
                        <span className="rpe-quiz-score">
                          <span className="material-symbols-outlined">quiz</span>
                          {c.scoreQuiz}/50
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Planning généré */}
            {planning.length > 0 && (
              <div className="rpe-card">
                <div className="rpe-planning-header">
                  <p className="rpe-card-title" style={{margin:0}}>
                    <span className="material-symbols-outlined">calendar_month</span>
                    Planning généré — tous sujets
                  </p>
                  <span className="rpe-planning-count">
                    <span className="material-symbols-outlined">check_circle</span>
                    {planning.length} entretien{planning.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Résumé par sujet */}
                {resumeParSujet.length > 0 && (
                  <div style={{marginBottom:'1.25rem',display:'flex',flexWrap:'wrap',gap:'.5rem'}}>
                    {resumeParSujet.map(s => (
                      <span key={s.sujetTitre} style={{
                        padding:'.25rem .75rem',background:'rgba(0,61,122,.06)',
                        border:'1px solid rgba(0,61,122,.15)',borderRadius:'9999px',
                        fontSize:'.6875rem',fontWeight:700,color:'#003d7a'
                      }}>
                        {s.sujetTitre} : {s.planifies} entretien{s.planifies > 1 ? 's' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {planning.map((slot, idx) => {
                  const { weekday, num, month, time } = formatSlot(slot.debut);
                  const finTime = formatSlot(slot.fin).time;
                  return (
                    <div key={idx} className="rpe-slot">
                      <div className="rpe-slot-date">
                        <p className="rpe-slot-day">{weekday}</p>
                        <p className="rpe-slot-num">{num}</p>
                        <p className="rpe-slot-month">{month}</p>
                      </div>
                      <div className="rpe-slot-info">
                        <p className="rpe-slot-time">
                          <span className="material-symbols-outlined">schedule</span>
                          {time} – {finTime}
                        </p>
                        <p className="rpe-slot-name">{slot.candidatNom || '—'}</p>
                        <p className="rpe-slot-sujet">{slot.sujetTitre || ''}</p>
                        {slot.meetLink ? (
                          <a href={slot.meetLink} target="_blank" rel="noreferrer" className="rpe-meet-link">
                            <span className="material-symbols-outlined">video_call</span>
                            Google Meet
                          </a>
                        ) : (
                          <span className="rpe-no-meet">Lien Meet en cours...</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <div>

            {/* Google Calendar */}
            <div className="rpe-card">
              <p className="rpe-card-title">
                <span className="material-symbols-outlined">calendar_today</span>
                Google Calendar
              </p>
              {googleToken ? (
                <div className="rpe-connected">
                  <div className="rpe-connected-icon">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p className="rpe-connected-name">{googleUser?.name || 'Connecté'}</p>
                    <p className="rpe-connected-sub">{googleUser?.email || 'Google Calendar actif'}</p>
                  </div>
                  <button className="rpe-disconnect" onClick={handleDisconnect}>
                    <span className="material-symbols-outlined">logout</span>
                  </button>
                </div>
              ) : (
                <>
                  <p style={{fontSize:'.8125rem',color:'#64748b',marginBottom:'1rem',lineHeight:1.6}}>
                    Connectez votre Google Calendar pour créer les événements et liens Meet automatiquement.
                  </p>
                  <button className="rpe-google-btn" onClick={handleGoogleLogin}>
                    <svg className="rpe-google-logo" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Se connecter avec Google
                  </button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="rpe-card">
              <p className="rpe-card-title">
                <span className="material-symbols-outlined">bar_chart</span>
                Résumé global
              </p>
              {planning.length > 0 && (
                <div className="rpe-progress-wrap">
                  <div className="rpe-progress-top">
                    <span className="rpe-progress-lbl">Candidats planifiés</span>
                    <span className="rpe-progress-pct">
                      {planning.length}/{candidats.length}
                    </span>
                  </div>
                  <div className="rpe-progress-bar">
                    <div className="rpe-progress-fill"
                      style={{width: candidats.length > 0
                        ? `${Math.round(planning.length / candidats.length * 100)}%` : '0%'}}
                    />
                  </div>
                </div>
              )}
              <div>
                {[
                  ['group',              'Sujets concernés',        Object.keys(parSujetMap).length],
                  ['people',             'Candidats ACCEPTE_QUIZ',  candidats.length],
                  ['event',              'Entretiens planifiés',    planning.length],
                  ['calendar_view_week', 'Jours utilisés',          totalJours],
                  ['avg_pace',           'Moy. / jour',             parJourMoy],
                ].map(([icon, label, val]) => (
                  <div key={label} className="rpe-stat-item">
                    <span className="rpe-stat-label">
                      <span className="material-symbols-outlined">{icon}</span>
                      {label}
                    </span>
                    <span className="rpe-stat-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ══ BOUTON PLANIFIER TOUS LES SUJETS ══ */}
            <button
              className="rpe-btn-plan-global"
              onClick={handlePlanifierTous}
              disabled={loading || !googleToken || candidats.length === 0}
            >
              {loading ? (
                <>
                  <div className="rpe-btn-spinner" />
                  <div className="rpe-btn-plan-global-inner">
                    <span className="rpe-btn-plan-global-label">Planification en cours...</span>
                    <span className="rpe-btn-plan-global-sub">
                      {candidats.length} candidats · {Object.keys(parSujetMap).length} sujets
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">auto_schedule</span>
                  <div className="rpe-btn-plan-global-inner">
                    <span className="rpe-btn-plan-global-label">
                      {success ? 'Replanifier tous les sujets' : 'Lancer la planification IA'}
                    </span>
                    <span className="rpe-btn-plan-global-sub">
                      {candidats.length} candidat{candidats.length > 1 ? 's' : ''} · {Object.keys(parSujetMap).length} sujet{Object.keys(parSujetMap).length > 1 ? 's' : ''}
                    </span>
                  </div>
                </>
              )}
            </button>

            {!googleToken && (
              <p style={{fontSize:'.75rem',color:'#94a3b8',textAlign:'center',marginTop:'.875rem',lineHeight:1.5}}>
                Connectez votre Google Calendar<br/>pour activer la planification
              </p>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default RHPlanifierEntretiens;