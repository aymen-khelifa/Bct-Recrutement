import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import bctImage from '../../assets/bct.png';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .reg-back-btn:hover { background: #e2e8f0; color: #003d7a; }
  .reg-back-btn .material-symbols-outlined { font-size: 1.125rem; }
  .login-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .login-root {
    font-family: 'Public Sans', sans-serif;
    background: #f5f7f8; min-height: 100vh;
    display: flex; flex-direction: column;
  }
  .login-root .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
body {
  margin: 0;
  padding: 0;
}
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
  .login-help-btn {
    padding: 0.5rem; border-radius: 0.5rem;
    background: #f1f5f9; color: #475569; border: none; cursor: pointer;
    transition: background 0.2s; line-height: 1;
    font-family: 'Public Sans', sans-serif;
  }
  .login-help-btn:hover { background: #e2e8f0; }
  .login-help-btn .material-symbols-outlined { font-size: 1.25rem; }

  .reg-header-right { display: flex; align-items: center; gap: 0.75rem; }
  .reg-back-btn {
    display: flex; align-items: center; gap: 0.375rem;
    padding: 0.5rem 1rem; border-radius: 0.5rem;
    background: #f1f5f9; color: #475569; border: none; cursor: pointer;
    font-size: 0.8125rem; font-weight: 600; font-family: 'Public Sans', sans-serif;
    transition: background 0.2s; text-decoration: none;
  }

  .login-main {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  @media (min-width: 768px) { .login-main { padding: 2rem; } }

  .login-card {
    width: 100%; max-width: 28rem;
    background: #fff; border-radius: 0.75rem;
    box-shadow: 0 20px 25px -5px rgba(148,163,184,0.2);
    border: 1px solid #f1f5f9; overflow: hidden;
  }

  .login-card-banner {
    height: 8rem; background: #003d7a;
    position: relative; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .login-card-banner::before {
    content: ''; position: absolute; inset: 0; opacity: 0.1;
    background: radial-gradient(circle at center, white, transparent, transparent);
  }
  .login-card-banner-icon {
    background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 9999px;
    backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2);
    position: relative; z-index: 1;
  }
  .login-card-banner-icon .material-symbols-outlined { color: #fff; font-size: 3rem; }

  .login-card-body { padding: 2rem; }
  .login-card-title { text-align: center; margin-bottom: 2rem; }
  .login-card-title h2 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
  .login-card-title p { font-size: 0.875rem; color: #64748b; line-height: 1.6; }

  .login-error {
    margin-bottom: 1rem; background: #fee2e2; border: 1px solid #f87171;
    color: #b91c1c; padding: 0.75rem 1rem; border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .login-form { display: flex; flex-direction: column; gap: 1.5rem; }
  .login-fields { display: flex; flex-direction: column; gap: 1rem; }
  .login-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .login-field-header { display: flex; align-items: center; justify-content: space-between; padding: 0 0.25rem; }
  .login-field label { font-size: 0.875rem; font-weight: 600; color: #334155; margin-left: 0.25rem; }
  .login-forgot { font-size: 0.75rem; color: #003d7a; text-decoration: none; font-weight: 500; }
  .login-forgot:hover { text-decoration: underline; }
  .login-input-wrap { position: relative; }
  .login-input-icon {
    position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
    color: #94a3b8; pointer-events: none;
  }
  .login-input-icon .material-symbols-outlined { font-size: 1.25rem; }
  .login-input {
    width: 100%; padding: 0.75rem 1rem 0.75rem 2.75rem;
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem;
    font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .login-input:focus { border-color: #003d7a; box-shadow: 0 0 0 2px rgba(0,61,122,0.1); }
  .login-input::placeholder { color: #94a3b8; }
  .login-input-password { padding-right: 3rem; }
  .login-visibility-btn {
    position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: #94a3b8;
    transition: color 0.2s; line-height: 1; font-family: 'Public Sans', sans-serif;
  }
  .login-visibility-btn:hover { color: #475569; }
  .login-visibility-btn .material-symbols-outlined { font-size: 1.25rem; }

  .login-submit-wrap { padding-top: 0.5rem; }
  .login-submit {
    width: 100%; padding: 1rem;
    background: #003d7a; color: #fff; border: none; border-radius: 0.5rem;
    font-size: 1rem; font-weight: 700; cursor: pointer;
    font-family: 'Public Sans', sans-serif;
    box-shadow: 0 10px 15px -3px rgba(0,61,122,0.2);
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    transition: opacity 0.2s, transform 0.1s;
  }
  .login-submit:hover:not(:disabled) { opacity: 0.95; }
  .login-submit:active:not(:disabled) { transform: scale(0.98); }
  .login-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .login-submit .material-symbols-outlined { font-size: 1.25rem; }
  @keyframes login-spin { to { transform: rotate(360deg); } }
  .login-spin { animation: login-spin 0.8s linear infinite; display: inline-block; }

  .login-card-footer {
    background: #f8fafc; padding: 1.25rem;
    border-top: 1px solid #f1f5f9; text-align: center;
  }
  .login-card-footer p { font-size: 0.875rem; color: #475569; }
  .login-card-footer a { color: #003d7a; font-weight: 700; text-decoration: none; margin-left: 0.25rem; }
  .login-card-footer a:hover { text-decoration: underline; }

  .login-footer { padding: 1.5rem; text-align: center; }
  .login-footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.5rem; margin-bottom: 1rem; }
  .login-footer-links a { font-size: 0.75rem; color: #64748b; text-decoration: none; transition: color 0.2s; }
  .login-footer-links a:hover { color: #003d7a; }
  .login-footer-copy { font-size: 0.6875rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }

  .login-watermark {
    position: fixed; bottom: 0; right: 0; padding: 2rem;
    opacity: 0.03; pointer-events: none; user-select: none;
  }
  .login-watermark .material-symbols-outlined { font-size: 12.5rem; }
`;

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Login = () => {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  // Validation — bouton actif seulement si email valide + password rempli
  const isFormValid = isValidEmail(email) && password.trim() !== '' && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      if (data.role === 'ROLE_CANDIDAT')     navigate('/candidat');
      else if (data.role === 'ROLE_RH')      navigate('/rh');
      else                                   navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">

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

        {/* ── MAIN ── */}
        <main className="login-main">
          <div className="login-card">

            {/* Banner */}
            <div className="login-card-banner">
              <div className="login-card-banner-icon">
                <span className="material-symbols-outlined">lock_open</span>
              </div>
            </div>

            {/* Body */}
            <div className="login-card-body">
              <div className="login-card-title">
                <h2>Connexion à votre espace</h2>
                <p>Accédez à votre dossier de candidature</p>
              </div>

              {error && <div className="login-error">{error}</div>}

              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <div className="login-fields">

                  {/* Email */}
                  <div className="login-field">
                    <label htmlFor="email">Adresse email</label>
                    <div className="login-input-wrap">
                      <div className="login-input-icon">
                        <span className="material-symbols-outlined">mail</span>
                      </div>
                      <input
                        className="login-input"
                        id="email" type="email"
                        placeholder="exemple@banque.fr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    {/* Validation email */}
                    {email && !isValidEmail(email) && (
                      <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', marginLeft: '0.25rem' }}>
                        ✗ Format email invalide
                      </div>
                    )}
                    {email && isValidEmail(email) && (
                      <div style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: '0.25rem', marginLeft: '0.25rem' }}>
                        ✓ Email valide
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div className="login-field">
                    <div className="login-field-header">
                      <label htmlFor="password">Mot de passe</label>
                      <Link className="login-forgot" to="/forgot-password">Mot de passe oublié ?</Link>
                    </div>
                    <div className="login-input-wrap">
                      <div className="login-input-icon">
                        <span className="material-symbols-outlined">lock</span>
                      </div>
                      <input
                        className="login-input login-input-password"
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="login-visibility-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <span className="material-symbols-outlined">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Submit */}
                <div className="login-submit-wrap">
                  <button className="login-submit" type="submit" disabled={!isFormValid}>
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined login-spin" style={{ fontSize: '1.25rem' }}>
                          progress_activity
                        </span>
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">login</span>
                        Se connecter
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Card footer */}
            <div className="login-card-footer">
              <p>
                Pas encore de compte ?
                <Link to="/register">S'inscrire</Link>
              </p>
            </div>

          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="login-footer">
          <div className="login-footer-links">
            <a href="#">Politique de confidentialité</a>
            <a href="#">Conditions d'utilisation</a>
            <a href="#">Support technique</a>
          </div>
          <p className="login-footer-copy">© 2024 Banque Centrale - Département des Ressources Humaines</p>
        </footer>

        {/* ── WATERMARK ── */}
        <div className="login-watermark">
          <span className="material-symbols-outlined">account_balance</span>
        </div>

      </div>
    </>
  );
};

export default Login;