import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { resendOtp } from '../../services/authService';
import bctImage from '../../assets/bct.png';
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .otp-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .otp-root {
    font-family: 'Public Sans', sans-serif;
    background: #f5f7f8; min-height: 100vh;
    display: flex; flex-direction: column;
  }
  .otp-root .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  /* Hide number input arrows */
  .otp-root input::-webkit-outer-spin-button,
  .otp-root input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .otp-root input[type=number] { -moz-appearance: textfield; }

  /* ── HEADER ── */
  .otp-header {
    width: 100%; background: #fff;
    border-bottom: 1px solid #e2e8f0;
    
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .otp-header-brand { display: flex; align-items: center; gap: 0.75rem; }
  .otp-header-brand svg { width: 2rem; height: 2rem; color: #003d7a; }
  .otp-header-brand h1 { font-size: 1.125rem; font-weight: 700; color: #0f172a; line-height: 1.2; }
  .otp-header-brand p { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .otp-help-btn {
    padding: 0.5rem; border-radius: 0.5rem;
    background: #f1f5f9; color: #475569; border: none; cursor: pointer;
    transition: background 0.2s; line-height: 1;
    font-family: 'Public Sans', sans-serif;
  }
  .otp-help-btn:hover { background: #e2e8f0; }
  .otp-help-btn .material-symbols-outlined { font-size: 1.25rem; }

  /* ── MAIN ── */
  .otp-main {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  @media (min-width: 768px) { .otp-main { padding: 2rem; } }

  /* ── CARD ── */
  .otp-card {
    width: 100%; max-width: 28rem;
    background: #fff; border-radius: 0.75rem;
    box-shadow: 0 20px 25px -5px rgba(148,163,184,0.2);
    border: 1px solid #f1f5f9; overflow: hidden;
  }

  /* Card top banner */
  .otp-card-banner {
    height: 8rem; background: #003d7a;
    position: relative; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .otp-card-banner::before {
    content: ''; position: absolute; inset: 0;
    opacity: 0.1;
    background: radial-gradient(circle at center, white, transparent, transparent);
  }
  .otp-card-banner-icon {
    background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 9999px;
    backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2);
    position: relative; z-index: 1;
  }
  .otp-card-banner-icon .material-symbols-outlined { color: #fff; font-size: 3rem; }

  /* Card body */
  .otp-card-body { padding: 2rem; }
  .otp-card-title { text-align: center; margin-bottom: 2rem; }
  .otp-card-title h2 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
  .otp-card-title p { font-size: 0.875rem; color: #64748b; line-height: 1.6; }
  .otp-card-title p span { font-weight: 600; color: #334155; }

  /* Error */
  .otp-error {
    margin-bottom: 1rem; background: #fee2e2; border: 1px solid #f87171;
    color: #b91c1c; padding: 0.75rem 1rem; border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  /* OTP inputs */
  .otp-inputs { display: flex; justify-content: space-between; gap: 0.5rem; margin-bottom: 2rem; }
  @media (min-width: 768px) { .otp-inputs { gap: 1rem; } }
  .otp-input {
    width: 100%; height: 3.5rem; text-align: center;
    font-size: 1.5rem; font-weight: 700;
    background: #f8fafc; border: none; border-bottom: 2px solid #e2e8f0;
    border-radius: 0.5rem; outline: none; color: #0f172a;
    font-family: 'Public Sans', sans-serif;
    transition: border-color 0.2s;
  }
  .otp-input:focus { border-bottom-color: #003d7a; }

  /* Actions */
  .otp-actions { display: flex; flex-direction: column; gap: 1rem; }
  .otp-submit {
    width: 100%; padding: 1rem;
    background: #003d7a; color: #fff; border: none; border-radius: 0.5rem;
    font-size: 1rem; font-weight: 700; cursor: pointer;
    font-family: 'Public Sans', sans-serif;
    box-shadow: 0 10px 15px -3px rgba(0,61,122,0.2);
    transition: opacity 0.2s, transform 0.1s;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  }
  .otp-submit:hover { opacity: 0.9; }
  .otp-submit:active { transform: scale(0.98); }
  .otp-submit .material-symbols-outlined { font-size: 1.25rem; }

  .otp-resend-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .otp-resend-wrap > p { font-size: 0.875rem; color: #64748b; }
  .otp-resend-btn {
    color: #003d7a; font-weight: 600; font-size: 0.875rem; background: none; border: none;
    cursor: pointer; font-family: 'Public Sans', sans-serif;
    display: flex; align-items: center; gap: 0.25rem;
    transition: opacity 0.2s;
  }
  .otp-resend-btn:hover:not(:disabled) { text-decoration: underline; }
  .otp-resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .otp-resend-btn .material-symbols-outlined { font-size: 0.875rem; }
  .otp-timer {
    font-size: 0.625rem; color: #94a3b8; text-transform: uppercase;
    letter-spacing: 0.1em; margin-top: 0.5rem;
  }
  .otp-timer span { font-weight: 700; }

  /* Trust footer */
  .otp-trust {
    background: #f8fafc; padding: 1rem;
    border-top: 1px solid #f1f5f9;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  }
  .otp-trust .material-symbols-outlined { color: #94a3b8; font-size: 1.125rem; }
  .otp-trust span:last-child { font-size: 0.75rem; color: #64748b; font-style: italic; font-weight: 500; }

  /* ── FOOTER ── */
  .otp-success {
  margin-bottom: 1rem;
  background: #d1fae5;      /* vert très clair */
  border: 1px solid #10b981; /* vert */
  color: #065f46;           /* vert foncé */
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}
  .otp-footer { padding: 1.5rem; text-align: center; }
  .otp-footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.5rem; margin-bottom: 1rem; }
  .otp-footer-links a { font-size: 0.75rem; color: #64748b; text-decoration: none; transition: color 0.2s; }
  .otp-footer-links a:hover { color: #003d7a; }
  .otp-footer-copy { font-size: 0.6875rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }

  /* ── WATERMARK ── */
  .otp-watermark {
    position: fixed; bottom: 0; right: 0; padding: 2rem;
    opacity: 0.03; pointer-events: none; user-select: none;
  }
  .otp-watermark .material-symbols-outlined { font-size: 12.5rem; }
`;

const VerifyOtp = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(180);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp } = useAuth();
const [successMessage, setSuccessMessage] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email') || '';
useEffect(() => {
  if (!error) return;
  const timer = setTimeout(() => setError(null), 1000);
  return () => clearTimeout(timer);
}, [error]);

useEffect(() => {
  if (!successMessage) return;
  const timer = setTimeout(() => setSuccessMessage(null), 1500);
  return () => clearTimeout(timer);
}, [successMessage]);
  useEffect(() => {
    let interval;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1500);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);



  // Remplacer handleChange par :
const handleChange = (index, value) => {
  // Garder seulement le dernier chiffre saisi
  const digit = value.replace(/\D/g, '').slice(-1);
  const newCode = [...code];
  newCode[index] = digit;
  setCode(newCode);
  if (digit !== '' && index < 5) {
    inputRefs.current[index + 1].focus();
  }
};

// Ajouter handlePaste :
const handlePaste = (e) => {
  e.preventDefault();
  // Récupérer le texte collé et garder seulement les chiffres
  const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
  if (!pasted) return;

  const newCode = ['', '', '', '', '', ''];
  pasted.split('').forEach((char, i) => {
    newCode[i] = char;
  });
  setCode(newCode);

  // Focus sur le dernier chiffre rempli ou le dernier input
  const lastIndex = Math.min(pasted.length, 5);
  inputRefs.current[lastIndex]?.focus();
};
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();  setSuccessMessage('');

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Veuillez saisir les 6 chiffres du code.');
      return;
    }
    try {
      await verifyOtp(email, fullCode);
         setSuccessMessage('Compte activé avec succès ! Redirection vers la connexion...');
    
    setTimeout(() => {
      navigate('/login', { 
        state: { message: 'Compte activé avec succès ! Veuillez vous connecter.' } 
      });
      // Ne pas remettre loading à false ici car le composant va être démonté
    }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Code incorrect ou expiré.');
    }
  };

  const [loadingResend, setLoadingResend] = useState(false);

const handleResend = async () => {
  setLoadingResend(true);
  setError('');
  setSuccessMessage('');
  try {
    await resendOtp(email);
    setSuccessMessage('Un nouveau code vous a été envoyé.');
    setTimeout(() => setSuccessMessage(''), 1500);
  } catch (err) {
    setError(err.response?.data?.message || 'Erreur lors du renvoi.');
  } finally {
    setLoadingResend(false);
  }
};
  return (
    <>
      <style>{styles}</style>

      <div className="otp-root">

        {/* ── HEADER ── */}
        <header className="otp-header">
          <div className="otp-header-brand">
           <img src={bctImage}  style={{ width: '248px',marginBottom:'25px' }} />

            <div>
              <h1>Banque Centrale</h1>
              <p>Plateforme de Recrutement</p>
            </div>
          </div>
          
          <button className="otp-help-btn" onClick={() => window.location.href = '/'}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </header>

        {/* ── MAIN ── */}
        <main className="otp-main">
          <div className="otp-card">

            {/* Banner */}
            <div className="otp-card-banner">
              <div className="otp-card-banner-icon">
                <span className="material-symbols-outlined">mark_email_unread</span>
              </div>
            </div>

            {/* Body */}
            <div className="otp-card-body">
              <div className="otp-card-title">
                <h2>Vérification de sécurité</h2>
                <p>
                  Pour sécuriser votre accès, veuillez saisir le code à 6 chiffres envoyé à{' '}
                  <span>{email || 'votre email'}</span>
                </p>
              </div>

              {error && <div className="otp-error">{error}</div>}
{successMessage && <div className="otp-success">{successMessage}</div>}

              <form onSubmit={handleSubmit}>
                {/* OTP Inputs */}
                <div className="otp-inputs">
                  {code.map((digit, index) => (
  <input
    key={index}
    className="otp-input"
    type="number"
    maxLength="1"
    value={digit}
    onChange={(e) => handleChange(index, e.target.value)}
    onKeyDown={(e) => handleKeyDown(index, e)}
    onPaste={index === 0 ? handlePaste : undefined}
    ref={(el) => (inputRefs.current[index] = el)}
    required
  />
))}
                </div>

                {/* Actions */}
                <div className="otp-actions">
                  <button className="otp-submit" type="submit">
                    <span className="material-symbols-outlined">verified_user</span>
                    Vérifier le code
                  </button>

                  <div className="otp-resend-wrap">
                    <p>Vous n'avez pas reçu le code ?</p>
                    <button
                      type="button"
                      className="otp-resend-btn"
                      onClick={handleResend} disabled={loadingResend}
                     
                    >
                      <span className="material-symbols-outlined">refresh</span>
                      Renvoyer le code
                    </button>
                  
                  </div>
                </div>
              </form>
            </div>

            {/* Trust footer */}
            <div className="otp-trust">
              <span className="material-symbols-outlined">lock</span>
              <span>Connexion sécurisée par cryptage de bout en bout</span>
            </div>

          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="otp-footer">
          <div className="otp-footer-links">
            <a href="#">Politique de confidentialité</a>
            <a href="#">Conditions d'utilisation</a>
            <a href="#">Support technique</a>
          </div>
          <p className="otp-footer-copy">© 2024 Banque Centrale - Département des Ressources Humaines</p>
        </footer>

        {/* ── WATERMARK ── */}
        <div className="otp-watermark">
          <span className="material-symbols-outlined">account_balance</span>
        </div>

      </div>
    </>
  );
};

export default VerifyOtp;