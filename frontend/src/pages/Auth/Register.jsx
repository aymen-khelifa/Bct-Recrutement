import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import bctImage from '../../assets/bct.png';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .reg-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .reg-root {
    font-family: 'Public Sans', sans-serif;
    background: #f5f7f8; min-height: 100vh;
    display: flex; flex-direction: column;
  }
  .reg-root .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
body {
  margin: 0;
  padding: 0;
}
  /* ── HEADER ── */
  .reg-header {
    width: 100%; background: #fff;
    border-bottom: 1px solid #e2e8f0;
    padding: 0 1.5rem; height: 4rem;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .reg-header-brand { display: flex; align-items: center; gap: 0.75rem; }
  .reg-header-brand h1 { font-size: 1.125rem; font-weight: 700; color: #0f172a; line-height: 1.2; }
  .reg-header-brand p { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .reg-header-right { display: flex; align-items: center; gap: 0.75rem; }
  .reg-back-btn {
    display: flex; align-items: center; gap: 0.375rem;
    padding: 0.5rem 1rem; border-radius: 0.5rem;
    background: #f1f5f9; color: #475569; border: none; cursor: pointer;
    font-size: 0.8125rem; font-weight: 600; font-family: 'Public Sans', sans-serif;
    transition: background 0.2s; text-decoration: none;
  }
  .reg-back-btn:hover { background: #e2e8f0; color: #003d7a; }
  .reg-back-btn .material-symbols-outlined { font-size: 1.125rem; }
  .reg-help-btn {
    padding: 0.5rem; border-radius: 0.5rem;
    background: #f1f5f9; color: #475569; border: none; cursor: pointer;
    transition: background 0.2s; line-height: 1;
  }
  .reg-help-btn:hover { background: #e2e8f0; }
  .reg-help-btn .material-symbols-outlined { font-size: 1.25rem; }

  /* ── MAIN ── */
  .reg-main {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 0.75rem 1rem;
  }

  /* ── CARD ── */
  .reg-card {
    width: 100%; max-width: 32rem;
    background: #fff; border-radius: 0.75rem;
    box-shadow: 0 20px 25px -5px rgba(148,163,184,0.2);
    border: 1px solid #f1f5f9; overflow: hidden;
  }

  .reg-card-banner {
    height: 5.5rem; background: #003d7a;
    position: relative; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .reg-card-banner::before {
    content: ''; position: absolute; inset: 0; opacity: 0.1;
    background: radial-gradient(circle at center, white, transparent, transparent);
  }
  .reg-card-banner-icon {
    background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 9999px;
    backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2);
    position: relative; z-index: 1;
  }
  .reg-card-banner-icon .material-symbols-outlined { color: #fff; font-size: 1.5rem; }

  .reg-card-body { padding: 1rem; }
  .reg-card-title { text-align: center; margin-bottom: 0.5rem; }
  .reg-card-title h2 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
  .reg-card-title p { font-size: 0.875rem; color: #64748b; line-height: 1.6; }

  /* Messages */
  .reg-error {
    margin-bottom: 1rem; background: #fee2e2; border: 1px solid #f87171;
    color: #b91c1c; padding: 0.75rem 1rem; border-radius: 0.5rem;
    font-size: 0.875rem;
  }
  .reg-success {
    margin-bottom: 1rem; background: #f0fdf4; border: 1px solid #86efac;
    color: #15803d; padding: 0.75rem 1rem; border-radius: 0.5rem;
    font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;
  }
  .reg-success .material-symbols-outlined { font-size: 1.125rem; }

  /* Form */
  .reg-form { display: flex; flex-direction: column; gap: 1.5rem; }
  .reg-fields { display: flex; flex-direction: column; gap: 1rem; }
  .reg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .reg-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .reg-field label { font-size: 0.875rem; font-weight: 600; color: #334155; margin-left: 0.25rem; }

  /* Input wrap */
  .reg-input-wrap { position: relative; display: flex; align-items: center; }
  .reg-input-icon {
    position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
    color: #94a3b8; pointer-events: none; z-index: 1;
  }
  .reg-input-icon .material-symbols-outlined { font-size: 1.25rem; }
  .reg-input {
    width: 100%; padding: 0.75rem 1rem 0.75rem 2.75rem;
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem;
    font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .reg-input:focus { border-color: #003d7a; box-shadow: 0 0 0 2px rgba(0,61,122,0.1); background: #fff; }
  .reg-input::placeholder { color: #94a3b8; }
  .reg-input-password { padding-right: 2.75rem; }

  /* Visibility button */
  .reg-visibility-btn {
    position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: #94a3b8;
    transition: color 0.2s; line-height: 1; padding: 0; display: flex; align-items: center;
  }
  .reg-visibility-btn:hover { color: #475569; }
  .reg-visibility-btn .material-symbols-outlined { font-size: 1.25rem; }

  /* Hint */
  .reg-hint { font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; margin-left: 0.25rem; }

  /* Submit */
  .reg-submit-wrap { padding-top: 0rem; }
  .reg-submit {
    width: 100%; padding: 1rem;
    background: #003d7a; color: #fff; border: none; border-radius: 0.5rem;
    font-size: 1rem; font-weight: 700; cursor: pointer;
    font-family: 'Public Sans', sans-serif;
    box-shadow: 0 10px 15px -3px rgba(0,61,122,0.2);
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    transition: opacity 0.2s, transform 0.1s;
  }
  .reg-submit:hover:not(:disabled) { opacity: 0.95; }
  .reg-submit:active:not(:disabled) { transform: scale(0.98); }
  .reg-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .reg-submit .material-symbols-outlined { font-size: 1.25rem; }
  @keyframes reg-spin { to { transform: rotate(360deg); } }
  .reg-spin { animation: reg-spin 0.8s linear infinite; display: inline-block; }

  /* CGU */
  .reg-cgu { font-size: 0.75rem; color: #64748b; text-align: center; line-height: 1.6; }
  .reg-cgu a { color: #003d7a; text-decoration: underline; }

  /* Card footer */
  .reg-card-footer {
    background: #f8fafc; padding: 0.75rem;
    border-top: 1px solid #f1f5f9; text-align: center;
  }
  .reg-card-footer p { font-size: 0.875rem; color: #475569; }
  .reg-card-footer a { color: #003d7a; font-weight: 700; text-decoration: none; margin-left: 0.25rem; }
  .reg-card-footer a:hover { text-decoration: underline; }

  /* Footer */
  .reg-footer { padding: 1.5rem; text-align: center; }
  .reg-footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.5rem; margin-bottom: 1rem; }
  .reg-footer-links a { font-size: 0.75rem; color: #64748b; text-decoration: none; transition: color 0.2s; }
  .reg-footer-links a:hover { color: #003d7a; }
  .reg-footer-copy { font-size: 0.6875rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }

  /* Watermark */
  .reg-watermark {
    position: fixed; bottom: 0; right: 0; padding: 2rem;
    opacity: 0.03; pointer-events: none; user-select: none;
  }
  .reg-watermark .material-symbols-outlined { font-size: 12.5rem; }
`;

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: ''
   
  });
  const [showPassword,     setShowPassword]     = useState(false);
  const [showConfirm,      setShowConfirm]       = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [error,            setError]            = useState('');
  const [successMessage,   setSuccessMessage]   = useState('');
  const [loading,          setLoading]          = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    setError('');
  };

  const checkPasswordStrength = (pwd) => {
    if (!pwd) return setPasswordStrength('');
    const hasUpperCase  = /[A-Z]/.test(pwd);
    const hasDigit      = /\d/.test(pwd);
    const hasSpecial    = /[@$!%*?&]/.test(pwd);
    const isLongEnough  = pwd.length >= 8;
    if (isLongEnough && hasUpperCase && hasDigit && hasSpecial) setPasswordStrength('Fort');
    else if (pwd.length >= 8) setPasswordStrength('Moyen');
    else setPasswordStrength('Faible');
  };

  const getPasswordColor = (strength) => {
    switch (strength) {
      case 'Faible': return '#ef4444';
      case 'Moyen':  return '#f97316';
      case 'Fort':   return '#16a34a';
      default:       return '#94a3b8';
    }
  };

  // Auto-clear error
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 4000);
    return () => clearTimeout(t);
  }, [error]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const isFormValid =
    !loading &&
    formData.name.trim() !== '' &&
    formData.email.trim() !== '' &&  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.password !== '' &&
    passwordStrength !== '' &&
    passwordStrength !== 'Faible' && passwordStrength !== 'Moyen' &&
    formData.confirmPassword !== '' &&
    formData.password === formData.confirmPassword;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await register(formData);
      setSuccessMessage('Inscription réussie ! Redirection vers la vérification...');
      setTimeout(() => {
        navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
      }, 800);
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'inscription";
      setError(msg === 'Email déjà utilisé'
        ? 'Cet email est déjà associé à un compte. Veuillez vous connecter ou utiliser un autre email.'
        : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="reg-root">

        {/* ── HEADER ── */}
        <header className="reg-header">
          <div className="reg-header-brand">
            <img src={bctImage} style={{ width: '233px',marginBottom:'25px' }} alt="BCT" />
            <div>
              <h1>Banque Centrale</h1>
              <p>Plateforme de Recrutement</p>
            </div>
          </div>
          <div className="reg-header-right">
            {/* Bouton retour à l'accueil */}
            <Link to="/" className="reg-back-btn">
              <span className="material-symbols-outlined">arrow_back</span>
              Retour à l'accueil
            </Link>
           
          </div>
        </header>

        {/* ── MAIN ── */}
        <main className="reg-main">
          <div className="reg-card">

            {/* Banner */}
            <div className="reg-card-banner">
              <div className="reg-card-banner-icon">
                <span className="material-symbols-outlined">person_add</span>
              </div>
            </div>

            {/* Body */}
            <div className="reg-card-body">
              <div className="reg-card-title">
                <h2>Créer votre compte</h2>
                <p>Rejoignez le programme de stage de la Banque Centrale</p>
              </div>

              {error && <div className="reg-error">{error}</div>}
              {successMessage && (
                <div className="reg-success">
                  <span className="material-symbols-outlined">check_circle</span>
                  {successMessage}
                </div>
              )}

              <form className="reg-form" onSubmit={handleSubmit} noValidate>
                <div className="reg-fields">

                  {/* Nom complet */}
                  <div className="reg-field">
                    <label htmlFor="name">Nom complet</label>
                    <div className="reg-input-wrap">
                      <div className="reg-input-icon">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                      <input className="reg-input" id="name" type="text"
                        placeholder="ex: Ahmed Ben Salem"
                        value={formData.name} onChange={handleChange} required />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="reg-field">
                    <label htmlFor="email">Adresse e-mail</label>
                    <div className="reg-input-wrap">
                      <div className="reg-input-icon">
                        <span className="material-symbols-outlined">mail</span>
                      </div>
                      <input className="reg-input" id="email" type="email"
                        placeholder="votre.email@exemple.com"
                        value={formData.email} onChange={handleChange} required />
                    </div>
                    {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
  <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', marginLeft: '0.25rem' }}>
    ✗ Format email invalide
  </div>
)}
{formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
  <div style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: '0.25rem', marginLeft: '0.25rem' }}>
    ✓ Email valide
  </div>
)}
                  </div>

                  {/* Mot de passe */}
                  <div className="reg-field">
                    <label htmlFor="password">Mot de passe</label>
                    <div className="reg-input-wrap">
                      <div className="reg-input-icon">
                        <span className="material-symbols-outlined">lock</span>
                      </div>
                      <input className="reg-input reg-input-password" id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => { handleChange(e); checkPasswordStrength(e.target.value); }}
                        required />
                      <button type="button" className="reg-visibility-btn"
                        onClick={() => setShowPassword(s => !s)}>
                        <span className="material-symbols-outlined">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {/* Indicateur force */}
                   {passwordStrength && (
  <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', marginLeft: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    
    {/* Ligne force globale */}
    <div style={{ color: getPasswordColor(passwordStrength), fontWeight: 600 }}>
      {passwordStrength === 'Faible' && '⚠ '}
      {passwordStrength === 'Moyen'  && '◉ '}
      {passwordStrength === 'Fort'   && '✓ '}
      {passwordStrength}
    </div>

    {/* Critères détaillés */}
    <div style={{ color: formData.password.length >= 8 ? '#16a34a' : '#ef4444' }}>
      {formData.password.length >= 8 ? '✓' : '✗'} Minimum 8 caractères
    </div>
    <div style={{ color: /[A-Z]/.test(formData.password) ? '#16a34a' : '#ef4444' }}>
      {/[A-Z]/.test(formData.password) ? '✓' : '✗'} Une lettre majuscule
    </div>
    <div style={{ color: /\d/.test(formData.password) ? '#16a34a' : '#ef4444' }}>
      {/\d/.test(formData.password) ? '✓' : '✗'} Un chiffre
    </div>
    <div style={{ color: /[@$!%*?&]/.test(formData.password) ? '#16a34a' : '#ef4444' }}>
      {/[@$!%*?&]/.test(formData.password) ? '✓' : '✗'} Un caractère spécial (@$!%*?&)
    </div>

  </div>
)}
                    {!passwordStrength && (
                      <p className="reg-hint">Minimum 8 caractères recommandés</p>
                    )}
                  </div>

                  {/* Confirmation mot de passe */}
                  <div className="reg-field">
                    <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                    <div className="reg-input-wrap">
                      <div className="reg-input-icon">
                        <span className="material-symbols-outlined">lock</span>
                      </div>
                      <input className="reg-input reg-input-password" id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange} required />
                      <button type="button" className="reg-visibility-btn"
                        onClick={() => setShowConfirm(s => !s)}>
                        <span className="material-symbols-outlined">
                          {showConfirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', marginLeft: '0.25rem' }}>
                        ✗ Les mots de passe ne correspondent pas
                      </div>
                    )}
                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <div style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: '0.25rem', marginLeft: '0.25rem' }}>
                        ✓ Les mots de passe correspondent
                      </div>
                    )}
                  </div>

                
                </div>

            
                {/* Submit */}
                <div className="reg-submit-wrap">
                  <button className="reg-submit" type="submit" disabled={!isFormValid}>
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined reg-spin" style={{ fontSize: '1.25rem' }}>
                          progress_activity
                        </span>
                        Inscription et envoi d'email en cours...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">person_add</span>
                        S'inscrire maintenant
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Card footer */}
            <div className="reg-card-footer">
              <p>
                Déjà un compte ?
                <Link to="/login">Se connecter</Link>
              </p>
            </div>

          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="reg-footer">
          <div className="reg-footer-links">
            <a href="#">Politique de confidentialité</a>
            <a href="#">Conditions d'utilisation</a>
            <a href="#">Support technique</a>
          </div>
          <p className="reg-footer-copy">© 2026 Banque Centrale - Département des Ressources Humaines</p>
        </footer>

        {/* Watermark */}
        <div className="reg-watermark">
          <span className="material-symbols-outlined">account_balance</span>
        </div>

      </div>
    </>
  );
};

export default Register;