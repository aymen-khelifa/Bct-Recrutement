import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import bctImage from '../../assets/bct.png';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;700;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Public Sans',sans-serif;background:#f1f5f9;color:#0f172a;}
.ms{font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;vertical-align:middle;font-style:normal;line-height:1;}
.ms.fill{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;}

/* HEADER */
.rp-header{background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.04);position:sticky;top:0;z-index:50;}
.rp-header-inner{max-width:72rem;margin:0 auto;padding:0 2rem;height:4rem;display:flex;align-items:center;}
.rp-brand{display:flex;align-items:center;gap:0.625rem;}
.rp-brand-icon{width:2.25rem;height:2.25rem;background:#003d7a;border-radius:0.5rem;display:flex;align-items:center;justify-content:center;color:#fff;}
.rp-brand-icon .ms{font-size:1.25rem;}
.rp-brand-name{font-size:1rem;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.02em;}
 .login-header {
    width: 100%; background: #fff;
    border-bottom: 1px solid #e2e8f0;
    padding: 0 1.5rem; height: 4rem;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .login-header-brand { display: flex; align-items: center; gap: 0.75rem; }
  .login-header-brand h1 { font-size: 1.125rem; font-weight: 700; color: #0f172a; line-height: 1.2; }
  .login-header-brand p { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
 .reg-header-right { display: flex; align-items: center; gap: 0.75rem; }
/* PAGE */
.rp-page{min-height:calc(100vh - 4rem);display:flex;align-items:center;justify-content:center;padding:2rem;}
.reg-back-btn:hover { background: #e2e8f0; color: #003d7a; }
  .reg-back-btn .material-symbols-outlined { font-size: 1.125rem; }
/* CARD */
.rp-card{background:#fff;border:1px solid #e2e8f0;border-radius:1rem;width:100%;max-width:28rem;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07);}
 .reg-back-btn {
    display: flex; align-items: center; gap: 0.375rem;
    padding: 0.5rem 1rem; border-radius: 0.5rem;
    background: #f1f5f9; color: #475569; border: none; cursor: pointer;
    font-size: 0.8125rem; font-weight: 600; font-family: 'Public Sans', sans-serif;
    transition: background 0.2s; text-decoration: none;
  }
/* Card accent */
.rp-card-accent{height:4px;background:#003d7a;}

/* Card header icon */
.rp-card-top{padding:2.5rem 2.5rem 0;text-align:center;}
.rp-icon-wrap{width:5rem;height:5rem;background:#003d7a;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;box-shadow:0 8px 24px rgba(0,61,122,.25);}
.rp-icon-wrap .ms{font-size:2.25rem;color:#fff;}
.rp-card-title{font-size:1.375rem;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:0.375rem;}
.rp-card-sub{font-size:0.8125rem;color:#64748b;line-height:1.55;}

/* Card body */
.rp-card-body{padding:2rem 2.5rem 2.5rem;}

/* Inputs */
.rp-label{display:block;font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:0.5rem;}
.rp-input-wrap{position:relative;margin-bottom:1.25rem;}
.rp-input{width:100%;height:3rem;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:0.625rem;padding:0 3rem 0 1rem;font-size:0.875rem;color:#0f172a;outline:none;transition:border-color .15s,box-shadow .15s;font-family:'Public Sans',sans-serif;}
.rp-input:focus{border-color:#003d7a;box-shadow:0 0 0 3px rgba(0,61,122,.08);}
.rp-input::placeholder{color:#cbd5e1;}
.rp-toggle{position:absolute;right:0.875rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94a3b8;display:flex;padding:0;}
.rp-toggle:hover{color:#003d7a;}
.rp-toggle .ms{font-size:1.125rem;}

/* Strength indicator */
.rp-strength{margin-bottom:1.25rem;}
.rp-strength-bars{display:flex;gap:0.25rem;margin-bottom:0.375rem;}
.rp-strength-bar{flex:1;height:0.25rem;border-radius:9999px;background:#e2e8f0;transition:background .3s;}
.rp-strength-bar.weak{background:#ef4444;}
.rp-strength-bar.medium{background:#f59e0b;}
.rp-strength-bar.strong{background:#059669;}
.rp-strength-label{font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;}
.rp-strength-label.weak{color:#ef4444;}
.rp-strength-label.medium{color:#f59e0b;}
.rp-strength-label.strong{color:#059669;}

/* Security note */
.rp-note{background:#f8fafc;border:1px solid #e2e8f0;border-radius:0.625rem;padding:0.875rem 1rem;display:flex;gap:0.625rem;align-items:flex-start;margin-bottom:1.5rem;}
.rp-note .ms{font-size:1rem;color:#003d7a;flex-shrink:0;margin-top:0.125rem;}
.rp-note-text{font-size:0.75rem;color:#64748b;line-height:1.55;font-style:italic;}

/* Button */
.rp-btn{width:100%;height:3rem;background:#003d7a;color:#fff;border:none;border-radius:0.625rem;font-size:0.875rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:opacity .15s,transform .1s;margin-bottom:1.5rem;}
.rp-btn:hover:not(:disabled){opacity:0.9;}
.rp-btn:active:not(:disabled){transform:scale(0.98);}
.rp-btn:disabled{opacity:0.5;cursor:not-allowed;}
.rp-btn-spinner{width:1.125rem;height:1.125rem;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:rp-spin 0.7s linear infinite;}
@keyframes rp-spin{to{transform:rotate(360deg)}}

/* Divider + back link */
.rp-divider{border:none;border-top:1px solid #f1f5f9;margin-bottom:1.25rem;}
.rp-back{display:flex;align-items:center;justify-content:center;gap:0.375rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#003d7a;text-decoration:none;}
.rp-back:hover{opacity:0.7;}
.rp-back .ms{font-size:0.875rem;}

/* Alerts */
.rp-error{background:#fef2f2;border:1px solid #fecaca;border-radius:0.625rem;padding:0.875rem 1rem;display:flex;align-items:center;gap:0.5rem;font-size:0.8125rem;color:#b91c1c;margin-bottom:1.25rem;}
.rp-error .ms{font-size:1rem;flex-shrink:0;color:#ef4444;}

/* Full screen states */
.rp-full{min-height:calc(100vh - 4rem);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center;gap:1.25rem;}
.rp-full-icon{font-size:4rem!important;}
.rp-full-icon.gr{color:#059669;}
.rp-full-icon.rd{color:#ef4444;}
.rp-full-icon.bl{color:#003d7a;}
.rp-full-title{font-size:1.75rem;font-weight:900;text-transform:uppercase;letter-spacing:-0.03em;}
.rp-full-sub{font-size:1rem;color:#64748b;max-width:28rem;line-height:1.65;}
.rp-full-btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.75rem 1.75rem;background:#003d7a;color:#fff;border:none;border-radius:0.625rem;font-size:0.875rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;text-decoration:none;}
.rp-full-btn:hover{opacity:0.9;}
@keyframes rp-spinfl{to{transform:rotate(360deg)}}
.rp-spinner{width:3rem;height:3rem;border:3px solid #e2e8f0;border-top-color:#003d7a;border-radius:50%;animation:rp-spinfl 0.8s linear infinite;}

/* FOOTER */
.rp-footer{text-align:center;padding:2rem;color:#94a3b8;font-size:0.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;}
`;

// Calcul de la force du mot de passe
const getStrength = (pwd) => {
  if (!pwd) return { level: 0, label: '', cls: '' };
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { level: 1, label: 'Faible',    cls: 'weak'   };
  if (score <= 3) return { level: 2, label: 'Moyen',     cls: 'medium' };
  return            { level: 3, label: 'Fort',      cls: 'strong' };
};

// ─────────────────────────────────────────────────────────────────────────────
const ResetPassword = () => {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get('token') || '';

  const [tokenStatus,     setTokenStatus]     = useState('validating'); // validating | valid | invalid
  const [tokenError,      setTokenError]      = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [error,           setError]           = useState('');

  const strength = getStrength(newPassword);

  // ── Valider le token au chargement ───────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      setTokenError("Lien invalide ou manquant. Veuillez refaire une demande.");
      return;
    }

    axios.get(`/api/auth/reset-password/validate`, { params: { token } })
      .then(() => setTokenStatus('valid'))
      .catch(err => {
        setTokenStatus('invalid');
        setTokenError(err.response?.data?.message || "Lien invalide ou expiré.");
      });
  }, [token]);

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
      // Rediriger vers login après 3s
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>

      {/* ── HEADER ── */}
             <header className="login-header">
               <div className="login-header-brand">
                 <img src={bctImage} style={{ width: '233px',marginBottom:'25px' }} alt="BCT" />
                 <div>
                   <h1>Banque Centrale</h1>
                   <p>Plateforme de Recrutement</p>
                 </div>
               </div>
               <div className="reg-header-right">
                 <Link to="/" className="reg-back-btn">
                   <span className="material-symbols-outlined">arrow_back</span>
                   Retour à l'accueil
                 </Link>
               </div>
             </header>

      {/* ── Validation du token en cours ── */}
      {tokenStatus === 'validating' && (
        <div className="rp-full">
          <div className="rp-spinner" />
          <p style={{color:'#64748b', fontWeight:600}}>Vérification du lien...</p>
        </div>
      )}

      {/* ── Token invalide ── */}
      {tokenStatus === 'invalid' && (
        <div className="rp-full">
          <i className="ms fill rp-full-icon rd">link_off</i>
          <p className="rp-full-title" style={{color:'#0f172a'}}>Lien invalide</p>
          <p className="rp-full-sub">{tokenError}</p>
          <Link to="/forgot-password" className="rp-full-btn">
            <i className="ms">refresh</i>
            Faire une nouvelle demande
          </Link>
          <Link to="/login" style={{fontSize:'0.8125rem', color:'#64748b', fontWeight:600}}>
            Retour à la connexion
          </Link>
        </div>
      )}

      {/* ── Succès ── */}
      {success && (
        <div className="rp-full">
          <i className="ms fill rp-full-icon gr">check_circle</i>
          <p className="rp-full-title" style={{color:'#059669'}}>Mot de passe réinitialisé !</p>
          <p className="rp-full-sub">
            Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion dans quelques secondes...
          </p>
          <Link to="/login" className="rp-full-btn">
            <i className="ms">login</i>
            Se connecter maintenant
          </Link>
        </div>
      )}

      {/* ── Formulaire ── */}
      {tokenStatus === 'valid' && !success && (
        <div className="rp-page">
          <div className="rp-card">
            <div className="rp-card-accent" />

            {/* Header */}
            <div className="rp-card-top">
              <div className="rp-icon-wrap">
                <i className="ms fill">lock_reset</i>
              </div>
              <p className="rp-card-title">Nouveau mot de passe</p>
              <p className="rp-card-sub">
                Choisissez un mot de passe robuste pour sécuriser votre accès.
              </p>
            </div>

            {/* Body */}
            <div className="rp-card-body">

              {error && (
                <div className="rp-error">
                  <i className="ms">error</i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Nouveau mot de passe */}
                <label className="rp-label" htmlFor="pwd">Nouveau mot de passe</label>
                <div className="rp-input-wrap">
                  <input
                    id="pwd"
                    type={showPwd ? 'text' : 'password'}
                    className="rp-input"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    required
                  />
                  <button type="button" className="rp-toggle" onClick={() => setShowPwd(v => !v)}>
                    <i className="ms">{showPwd ? 'visibility_off' : 'visibility'}</i>
                  </button>
                </div>

                {/* Indicateur de force */}
                {newPassword && (
                  <div className="rp-strength">
                    <div className="rp-strength-bars">
                      {[1,2,3].map(l => (
                        <div
                          key={l}
                          className={`rp-strength-bar ${strength.level >= l ? strength.cls : ''}`}
                        />
                      ))}
                    </div>
                    <p className={`rp-strength-label ${strength.cls}`}>
                      Force : {strength.label}
                    </p>
                  </div>
                )}

                {/* Confirmer */}
                <label className="rp-label" htmlFor="confirm">Confirmer le mot de passe</label>
                <div className="rp-input-wrap">
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className="rp-input"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="rp-toggle" onClick={() => setShowConfirm(v => !v)}>
                    <i className="ms">{showConfirm ? 'visibility_off' : 'visibility'}</i>
                  </button>
                </div>

                {/* Note de sécurité */}
                <div className="rp-note">
                  <i className="ms fill">info</i>
                  <p className="rp-note-text">
                    Le mot de passe doit contenir au moins 8 caractères. Pour plus de sécurité, combinez majuscules, chiffres et caractères spéciaux.
                  </p>
                </div>

                <button type="submit" className="rp-btn" disabled={loading}>
                  {loading ? (
                    <div className="rp-btn-spinner" />
                  ) : (
                    <>
                      Réinitialiser le mot de passe
                      <i className="ms">arrow_forward</i>
                    </>
                  )}
                </button>
              </form>

              <hr className="rp-divider" />
              <Link to="/login" className="rp-back">
                <i className="ms">arrow_back</i>
                Retour à la connexion
              </Link>

            </div>
          </div>
        </div>
      )}

      <footer className="rp-footer">
        © 2025 Banque Centrale de Tunisie — Tous droits réservés
      </footer>
    </>
  );
};

export default ResetPassword;