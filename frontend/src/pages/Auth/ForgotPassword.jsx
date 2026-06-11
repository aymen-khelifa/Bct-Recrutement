import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import bctImage from '../../assets/bct.png';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;700;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Public Sans',sans-serif;background:#f1f5f9;color:#0f172a;}
.ms{font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;vertical-align:middle;font-style:normal;line-height:1;}
.ms.fill{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;}
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
/* HEADER */
.fp-header{background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.04);position:sticky;top:0;z-index:50;}
.fp-header-inner{max-width:72rem;margin:0 auto;padding:0 2rem;height:4rem;display:flex;align-items:center;justify-content:space-between;}
.fp-brand{display:flex;align-items:center;gap:0.625rem;}
.fp-brand-icon{width:2.25rem;height:2.25rem;background:#003d7a;border-radius:0.5rem;display:flex;align-items:center;justify-content:center;color:#fff;}
.fp-brand-icon .ms{font-size:1.25rem;}
.fp-brand-name{font-size:1rem;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.02em;}

/* PAGE */
.fp-page{min-height:calc(100vh - 4rem);display:flex;align-items:center;justify-content:center;padding:2rem;}
 .reg-back-btn {
    display: flex; align-items: center; gap: 0.375rem;
    padding: 0.5rem 1rem; border-radius: 0.5rem;
    background: #f1f5f9; color: #475569; border: none; cursor: pointer;
    font-size: 0.8125rem; font-weight: 600; font-family: 'Public Sans', sans-serif;
    transition: background 0.2s; text-decoration: none;
  }
/* CARD */
.fp-card{background:#fff;border:1px solid #e2e8f0;border-radius:1rem;width:100%;max-width:28rem;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07);}
.reg-back-btn:hover { background: #e2e8f0; color: #003d7a; }
  .reg-back-btn .material-symbols-outlined { font-size: 1.125rem; }
/* Card header */
.fp-card-header{background:#003d7a;padding:2.5rem 2.5rem 2rem;text-align:center;position:relative;overflow:hidden;}
.fp-card-header::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,rgba(255,255,255,0.08),transparent 60%);}
.fp-card-header > *{position:relative;z-index:1;}
.fp-card-icon{width:4rem;height:4rem;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:1rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;}
.fp-card-icon .ms{font-size:2rem;color:#fff;}
.fp-card-title{font-size:1.25rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-0.01em;margin-bottom:0.375rem;}
.fp-card-sub{font-size:0.75rem;color:rgba(255,255,255,0.65);font-weight:600;letter-spacing:0.04em;}

/* Card body */
.fp-card-body{padding:2rem 2.5rem;}
.fp-desc{font-size:0.875rem;color:#475569;line-height:1.65;margin-bottom:1.75rem;}

/* Form */
.fp-label{display:block;font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:0.5rem;}
.fp-input-wrap{position:relative;margin-bottom:1.5rem;}
.fp-input-icon{position:absolute;left:0.875rem;top:50%;transform:translateY(-50%);color:#94a3b8;}
.fp-input-icon .ms{font-size:1.125rem;}
.fp-input{width:100%;height:3rem;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:0.625rem;padding:0 1rem 0 2.75rem;font-size:0.875rem;color:#0f172a;outline:none;transition:border-color .15s,box-shadow .15s;font-family:'Public Sans',sans-serif;}
.fp-input:focus{border-color:#003d7a;box-shadow:0 0 0 3px rgba(0,61,122,.08);}
.fp-input::placeholder{color:#cbd5e1;}

/* Button */
.fp-btn{width:100%;height:3rem;background:#003d7a;color:#fff;border:none;border-radius:0.625rem;font-size:0.875rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:opacity .15s,transform .1s;margin-bottom:1.5rem;}
.fp-btn:hover{opacity:0.9;}
.fp-btn:active{transform:scale(0.98);}
.fp-btn:disabled{opacity:0.5;cursor:not-allowed;}
.fp-btn .ms{font-size:1.125rem;}
.fp-btn-spinner{width:1.125rem;height:1.125rem;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:fp-spin 0.7s linear infinite;}
@keyframes fp-spin{to{transform:rotate(360deg)}}

/* Divider */
.fp-divider{border:none;border-top:1px solid #f1f5f9;margin-bottom:1.5rem;}

/* Back link */
.fp-back{display:flex;align-items:center;justify-content:center;gap:0.375rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#003d7a;text-decoration:none;transition:opacity .15s;}
.fp-back:hover{opacity:0.7;}
.fp-back .ms{font-size:0.875rem;}

/* Success state */
.fp-success{text-align:center;padding:1rem 0;}
.fp-success-icon{width:4rem;height:4rem;background:#ecfdf5;border:2px solid #d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;}
.fp-success-icon .ms{font-size:2rem;color:#059669;}
.fp-success-title{font-size:1.125rem;font-weight:800;color:#0f172a;margin-bottom:0.625rem;}
.fp-success-text{font-size:0.875rem;color:#475569;line-height:1.65;margin-bottom:1.75rem;}
.fp-success-note{font-size:0.75rem;color:#94a3b8;line-height:1.6;}

/* Error */
.fp-error{background:#fef2f2;border:1px solid #fecaca;border-radius:0.625rem;padding:0.875rem 1rem;display:flex;align-items:center;gap:0.5rem;font-size:0.8125rem;color:#b91c1c;margin-bottom:1.25rem;}
.fp-error .ms{font-size:1rem;flex-shrink:0;color:#ef4444;}

/* Security badge */
.fp-badge{display:flex;align-items:center;justify-content:center;gap:0.375rem;padding:0.5rem;background:#f0fdf4;border:1px solid #dcfce7;border-radius:0.5rem;font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#166534;margin-top:1.5rem;}
.fp-badge .ms{font-size:0.875rem;color:#16a34a;}

/* FOOTER */
.fp-footer{text-align:center;padding:2rem;color:#94a3b8;font-size:0.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;}
`;

const ForgotPassword = () => {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Une erreur est survenue. Réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>

      {/* Header */}
      {/* ── HEADER ── */}
             <header className="login-header" >
               <div className="login-header-brand" style={{ marginTop:'25px',marginBottom:'25px' }}>
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

      <div className="fp-page">
        <div className="fp-card">

          {/* Card Header */}
          <div className="fp-card-header">
            <div className="fp-card-icon">
              <i className="ms fill">lock_reset</i>
            </div>
            <p className="fp-card-title">Mot de passe oublié</p>
            <p className="fp-card-sub">Banque Centrale de Tunisie</p>
          </div>

          {/* Card Body */}
          <div className="fp-card-body">

            {success ? (
              /* ── Succès ── */
              <div className="fp-success">
                <div className="fp-success-icon">
                  <i className="ms fill">mark_email_read</i>
                </div>
                <p className="fp-success-title">Email envoyé !</p>
                <p className="fp-success-text">
                  Si l'adresse <strong>{email}</strong> est associée à un compte, vous recevrez un email avec un lien de réinitialisation dans quelques instants.
                </p>
                <p className="fp-success-note">
                  Vérifiez également vos spams.<br />
                  Le lien est valable <strong>15 minutes</strong>.
                </p>
                <hr className="fp-divider" style={{marginTop:'1.5rem'}} />
                <Link to="/login" className="fp-back">
                  <i className="ms">arrow_back</i>
                  Retour à la connexion
                </Link>
              </div>
            ) : (
              /* ── Formulaire ── */
              <>
                <p className="fp-desc">
                  Saisissez l'adresse email associée à votre compte. Nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
                </p>

                {error && (
                  <div className="fp-error">
                    <i className="ms">error</i>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <label className="fp-label" htmlFor="email">
                    Adresse email
                  </label>
                  <div className="fp-input-wrap">
                    <div className="fp-input-icon">
                      <i className="ms">mail</i>
                    </div>
                    <input
                      id="email"
                      type="email"
                      className="fp-input"
                      placeholder="votre.email@exemple.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>

                  <button type="submit" className="fp-btn" disabled={loading}>
                    {loading ? (
                      <div className="fp-btn-spinner" />
                    ) : (
                      <>
                        Envoyer le lien de réinitialisation
                        <i className="ms">arrow_forward</i>
                      </>
                    )}
                  </button>
                </form>

                <hr className="fp-divider" />

                <Link to="/login" className="fp-back">
                  <i className="ms">arrow_back</i>
                  Retour à la connexion
                </Link>

              
              </>
            )}

          </div>
        </div>
      </div>

      <footer className="fp-footer">
        © 2025 Banque Centrale de Tunisie — Tous droits réservés
      </footer>
    </>
  );
};

export default ForgotPassword;