import { useState, useRef,useEffect } from 'react';
import { Link ,useNavigate} from 'react-router-dom';
import bctImage from '../../assets/bct.png';
import { useAuth } from '../../context/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const steps = [
  { icon: 'person_add', title: '1. Inscription', description: 'Créez votre profil en quelques minutes et téléchargez vos documents académiques en toute sécurité.' },
  { icon: 'psychology', title: '2. Analyse IA du CV', description: 'Notre intelligence artificielle analyse vos compétences clés par rapport aux besoins stratégiques de la Banque.' },
  { icon: 'quiz', title: '3. Quiz Technique', description: 'Validez vos connaissances académiques avec des tests spécialisés adaptés au poste visé.' },
  { icon: 'videocam', title: '4. Entretien Automatisé', description: "Passez une évaluation vidéo asynchrone guidée par IA pour présenter votre motivation et votre parcours." },

];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
.bc-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
  .bc-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .bc-root { font-family: 'Public Sans', sans-serif; background: #f5f7f8; color: #0f172a; }
  .bc-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }

  .bc-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); }
  .spinner { animation: spin 1s linear infinite; margin-right: 8px; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .bc-modal { position: relative; width: 100%; max-width: 28rem; border-radius: 1rem; overflow: hidden; background: #fff; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4); }
  .bc-modal-header { background: #003d7a; padding: 2rem; text-align: center; color: #fff; }
  .bc-modal-icon { display: inline-flex; align-items: center; justify-content: center; width: 4rem; height: 4rem; border-radius: 9999px; background: rgba(255,255,255,0.1); margin-bottom: 1rem; }
  .bc-modal-icon .material-symbols-outlined { font-size: 2.5rem; }
  .bc-modal-header h2 { font-size: 1.5rem; font-weight: 700; }
  .bc-modal-header p { margin-top: 0.5rem; font-size: 0.875rem; color: #e2e8f0; }
  .bc-modal-body { padding: 2rem; }
  .bc-form-group { margin-bottom: 1.25rem; }
  .bc-form-group label { display: block; font-size: 0.875rem; font-weight: 600; color: #334155; margin-bottom: 0.25rem; }
  .bc-input-wrap { position: relative; }
  .bc-input-wrap .material-symbols-outlined { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.25rem; }
  .bc-input { display: block; width: 100%; padding: 0.625rem 0.75rem 0.625rem 2.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #f8fafc; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; transition: border-color 0.2s, box-shadow 0.2s; outline: none; }
  .bc-input:focus { border-color: #003d7a; box-shadow: 0 0 0 3px rgba(0,61,122,0.15); }
  .bc-input::placeholder { color: #94a3b8; }
  .bc-submit { display: flex; align-items: center; justify-content: center; width: 100%; padding: 0.875rem; background: #003d7a; color: #fff; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.15); transition: transform 0.2s; margin-top: 2rem; }
  .bc-submit:hover { transform: scale(1.01); }
  .bc-terms { margin-top: 1.5rem; text-align: center; font-size: 0.75rem; color: #64748b; }
  .bc-terms a { color: #003d7a; text-decoration: underline; }
  .bc-terms a:hover { color: #1d4ed8; }
  .bc-modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7); transition: color 0.2s; line-height: 1; }
  .bc-modal-close:hover { color: #fff; }
  .bc-modal-close .material-symbols-outlined { font-size: 1.5rem; }
  .otp-error { margin-bottom: 1rem; background: #fee2e2; border: 1px solid #f87171; color: #b91c1c; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
  .otp-success { margin-bottom: 1rem; background: #d1fae5; border: 1px solid #10b981; color: #065f46; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
  .forgot-password-link { color: #003d7a; font-size: 0.75rem; font-weight: 600; text-decoration: none; }
  .forgot-password-link:hover { text-decoration: underline; }

  .bc-header { position: sticky; top: 0; z-index: 50; width: 100%; border-bottom: 1px solid #e2e8f0; background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); }
  .bc-header-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0rem 0.5rem; }
  .bc-brand { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; }
  .bc-brand-name { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.025em; color: #003d7a; }
  .bc-nav { display: flex; flex: 1; justify-content: center; gap: 2.5rem; }
  .bc-nav button { font-size: 0.875rem; font-weight: 600; color: #0f172a; background: none; border: none; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: color 0.2s; padding: 0; }
  .bc-nav button:hover { color: #003d7a; }
  .bc-header-actions { display: flex; align-items: center; gap: 1rem; }
  .bc-btn-login { display: flex; align-items: center; background: #003d7a; color: #fff; border: none; border-radius: 0.5rem; padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; font-family: 'Public Sans', sans-serif; }
  .bc-btn-login:hover { opacity: 0.9; }

  .bc-hero { position: relative; width: 100%; }
  .bc-hero-inner { position: relative; height: 600px; width: 100%; overflow: hidden; background: #0f172a; }
  .bc-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
  .bc-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,25,35,0.8), transparent); }
  .bc-hero-content { position: relative; max-width: 1280px; margin: 0 auto; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 0 2.5rem; }
  .bc-hero-text { max-width: 42rem; }
  .bc-hero-text h1 { font-size: clamp(2.25rem, 5vw, 3.75rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.025em; color: #fff; }
  .bc-hero-text p { margin-top: 1.5rem; font-size: 1.125rem; font-weight: 500; color: #e2e8f0; }
  .bc-hero-buttons { margin-top: 2.5rem; display: flex; flex-wrap: wrap; gap: 1rem; }
  .bc-btn-primary { display: inline-block; background: #003d7a; color: #fff; padding: 1rem 2rem; border-radius: 0.5rem; font-size: 1rem; font-weight: 700; text-decoration: none; border: none; cursor: pointer; font-family: 'Public Sans', sans-serif; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); transition: transform 0.2s; }
  .bc-btn-primary:hover { transform: scale(1.02); }
  .bc-btn-outline { display: inline-block; border: 2px solid #fff; background: transparent; color: #fff; padding: 1rem 2rem; border-radius: 0.5rem; font-size: 1rem; font-weight: 700; text-decoration: none; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.2s, color 0.2s; }
  .bc-btn-outline:hover { background: #fff; color: #003d7a; }

  .bc-how { padding: 5rem 0; background: #fff; scroll-margin-top: 70px; }
  @media (min-width: 1024px) { .bc-how { padding: 8rem 0; } }
  .bc-how-inner { max-width: 1280px; margin: 0 auto; padding: 0 2.5rem; }
  .bc-how-header { margin-bottom: 4rem; }
  .bc-how-label { color: #003d7a; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
  .bc-how-title { margin-top: 0.5rem; font-size: clamp(1.875rem, 3vw, 2.25rem); font-weight: 900; letter-spacing: -0.025em; color: #0f172a; }
  .bc-how-desc { margin-top: 1rem; max-width: 42rem; font-size: 1.125rem; color: #475569; }
  .bc-steps { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .bc-step { border-radius: 0.75rem; border: 1px solid #e2e8f0; background: #f5f7f8; padding: 2rem; transition: border-color 0.2s, box-shadow 0.2s; }
  .bc-step:hover { border-color: rgba(0,61,122,0.5); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
  .bc-step-icon { width: 3.5rem; height: 3.5rem; border-radius: 0.5rem; background: rgba(0,61,122,0.1); color: #003d7a; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; transition: background 0.2s, color 0.2s; }
  .bc-step:hover .bc-step-icon { background: #003d7a; color: #fff; }
  .bc-step-icon .material-symbols-outlined { font-size: 1.875rem; }
  .bc-step h4 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
  .bc-step p { font-size: 0.875rem; line-height: 1.625; color: #475569; }

  .bc-offres { scroll-margin-top: 70px; }
  .bc-faq { scroll-margin-top: 70px; }

  .bc-cta { background: #003d7a; padding: 5rem 0; color: #fff; }
  .bc-cta-inner { max-width: 56rem; margin: 0 auto; padding: 0 1.5rem; text-align: center; }
  .bc-cta-inner h2 { font-size: clamp(1.875rem, 3vw, 2.25rem); font-weight: 900; }
  .bc-cta-inner p { margin-top: 1.5rem; font-size: 1.125rem; color: #e2e8f0; }
  .bc-cta-btn-wrap { margin-top: 2.5rem; display: flex; justify-content: center; }
  .bc-btn-cta { display: inline-block; background: #fff; color: #003d7a; padding: 1rem 2.5rem; border-radius: 0.5rem; font-size: 1rem; font-weight: 700; border: none; cursor: pointer; font-family: 'Public Sans', sans-serif; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25); transition: transform 0.2s; }
  .bc-btn-cta:hover { transform: scale(1.05); }

  .bc-footer { background: #0f172a; padding: 4rem 0 2rem; color: #94a3b8; }
  .bc-footer-inner { max-width: 1280px; margin: 0 auto; padding: 0 2.5rem; }
  .bc-footer-grid { display: grid; gap: 3rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); border-bottom: 1px solid #1e293b; padding-bottom: 3rem; }
  .bc-footer-brand { display: flex; align-items: center; gap: 0.75rem; color: #fff; margin-bottom: 1.5rem; }
  .bc-footer-brand .material-symbols-outlined { font-size: 1.5rem; }
  .bc-footer-brand span { font-size: 1.125rem; font-weight: 700; }
  .bc-footer-col p { font-size: 0.875rem; }
  .bc-footer-col h5 { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #fff; margin-bottom: 1.5rem; }
  .bc-footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
  .bc-footer-col ul li a { font-size: 0.875rem; color: #94a3b8; text-decoration: none; transition: color 0.2s; }
  .bc-footer-col ul li a:hover { color: #fff; }
  .bc-footer-bottom { margin-top: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
  .bc-footer-bottom p { font-size: 0.75rem; }
  .bc-footer-icons { display: flex; gap: 1.5rem; }
  .bc-footer-icons a { color: #94a3b8; transition: color 0.2s; text-decoration: none; }
  .bc-footer-icons a:hover { color: #fff; }
  .bc-footer-icons .material-symbols-outlined { font-size: 1.25rem; }
`;

const HomePage = () => {
  const [showModal, setShowModal] = useState(false);
  const [showModal1, setShowModal1] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '',university: '', specialty: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();
const [showPassword, setShowPassword] = useState(false);
const [showConfirm,  setShowConfirm]  = useState(false);
  // Refs pour le scroll
  const offresRef = useRef(null);
  const processusRef = useRef(null);
  const ctaRef = useRef(null)

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };
  const [passwordStrength, setPasswordStrength] = useState('');
const checkPasswordStrength = (pwd) => {
  const hasUpperCase = /[A-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[@$!%*?&]/.test(pwd);
  const isLongEnough = pwd.length >= 12;
  if (isLongEnough && hasUpperCase && hasDigit && hasSpecial) setPasswordStrength('Fort');
  else if (pwd.length >= 8) setPasswordStrength('Moyen');
  else setPasswordStrength('Faible');
};
const getPasswordColor = (strength) => {
  switch (strength) {
    case "Faible":  return "#ef4444"; // rouge
    case "Moyen":   return "#f97316"; // orange
    case "Fort":    return "#16a34a"; // vert
    default:        return "#94a3b8"; // gris
  }
};
const [loginEmail,         setLoginEmail]         = useState('');
const [loginPassword,      setLoginPassword]      = useState('');
const [showLoginPassword,  setShowLoginPassword]  = useState(false);
const [loginError,         setLoginError]         = useState('');
const [loginLoading,       setLoginLoading]       = useState(false);
  const { login } = useAuth();

const isFormValid =
  !loading &&
  formData.name.trim() !== '' &&
  formData.email.trim() !== '' &&
  formData.password !== '' &&
  passwordStrength !== '' &&
  passwordStrength !== 'Faible' &&
  formData.confirmPassword !== '' &&
  formData.password === formData.confirmPassword;
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
      }, 1500);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Erreur lors de l'inscription";
      if (errorMessage === "Email déjà utilisé") {
        setError("Cet email est déjà associé à un compte. Veuillez vous connecter ou utiliser un autre email.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };
useEffect(() => {
  if (!error) return;
  const timer = setTimeout(() => setError(null), 1500);
  return () => clearTimeout(timer);
}, [error]);

// Handler login modal
const handleLoginSubmit = async (e) => {
  e.preventDefault();
  setLoginLoading(true);
  setLoginError('');
  try {
    const data = await login(loginEmail, loginPassword);
    setShowModal1(false);
    if (data.role === 'ROLE_CANDIDAT')  navigate('/candidat');
    else if (data.role === 'ROLE_RH')   navigate('/rh');
    else                                navigate('/');
  } catch (err) {
    setLoginError(err.response?.data?.message || 'Email ou mot de passe incorrect');
  } finally {
    setLoginLoading(false);
  }
};
useEffect(() => {
  if (!successMessage) return;
  const timer = setTimeout(() => setSuccessMessage(null), 1500);
  return () => clearTimeout(timer);
}, [successMessage]);
  return (
    <>
      <style>{styles}</style>
      <div className="bc-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>

        {/* ── MODAL INSCRIPTION ── */}
        {showModal && (
          <div className="bc-overlay">
            <div className="bc-modal">
              <div className="bc-modal-header">
               
                <h2>Créer votre compte</h2>
                <p>Rejoignez le programme de stage d'excellence</p>
              </div>
              <div className="bc-modal-body">
              <form onSubmit={handleSubmit}>
  {successMessage && <div className="otp-success">{successMessage}</div>}
  {error && <div className="otp-error">{error}</div>}

  {/* Nom */}
  <div className="bc-form-group">
    <label htmlFor="name">Nom complet</label>
    <div className="bc-input-wrap">
      <span className="material-symbols-outlined">person</span>
      <input className="bc-input" value={formData.name} onChange={handleChange}
        required id="name" placeholder="Jean Dupont" type="text" />
    </div>
  </div>

  {/* Email */}
  <div className="bc-form-group">
    <label htmlFor="email">Adresse e-mail</label>
    <div className="bc-input-wrap">
      <span className="material-symbols-outlined">mail</span>
      <input className="bc-input" value={formData.email} onChange={handleChange}
        required id="email" placeholder="jean.dupont@exemple.com" type="email" />
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
<div className="bc-form-group">
  <label htmlFor="password">Mot de passe</label>
  <div className="bc-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }}>lock</span>
    <input
      className="bc-input"
      id="password"
      value={formData.password}
      onChange={(e) => { handleChange(e); checkPasswordStrength(e.target.value); }}
      placeholder="••••••••"
      type={showPassword ? 'text' : 'password'}
      style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      style={{
        position: 'absolute', right: '2.3rem',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, display: 'flex', alignItems: 'center', color: '#94a3b8'
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
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
                   
</div>

{/* Confirmation */}
<div className="bc-form-group">
  <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
  <div className="bc-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }}>lock</span>
    <input
      className="bc-input"
      id="confirmPassword"
      value={formData.confirmPassword}
      onChange={handleChange}
      placeholder="••••••••"
      type={showConfirm ? 'text' : 'password'}
      style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
    />
    <button
      type="button"
      onClick={() => setShowConfirm(!showConfirm)}
      style={{
        position: 'absolute', right: '2.3rem',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, display: 'flex', alignItems: 'center', color: '#94a3b8'
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
        {showConfirm ? 'visibility_off' : 'visibility'}
      </span>
    </button>
  </div>
  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
      ✗ Les mots de passe ne correspondent pas
    </div>
  )}
  {formData.confirmPassword && formData.password === formData.confirmPassword && (
    <div style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: '0.25rem' }}>
      ✓ Les mots de passe correspondent
    </div>
  )}
</div>
  {/* Bouton */}
  <button
    type="submit"
    className="bc-submit"
    disabled={!isFormValid}
  >
    {loading && <FaSpinner className="spinner" />}
    {loading ? 'Inscription et envoi de mail en cours...' : "S'inscrire"}
  </button>
</form>
  <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#475569' }}>
                  A déjà un compte ?{' '}
                  <a href="#" style={{ color: '#003d7a', fontWeight: 700, textDecoration: 'none' }}
                    onClick={(e) => { e.preventDefault(); setShowModal1(true); setShowModal(false); }}>
                   Se Connecter
                  </a>
                </div>
                
              </div>
              <button className="bc-modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
        )}

       {/* ── MODAL CONNEXION ── */}
{showModal1 && (
  <div className="bc-overlay">
    <div className="bc-modal">
      <div className="bc-modal-header">
        <div className="bc-modal-icon">
          <span className="material-symbols-outlined">account_balance</span>
        </div>
        <h2>Se connecter</h2>
        <p>Connectez-vous </p>
      </div>
      <div className="bc-modal-body">
        <form onSubmit={handleLoginSubmit}>

          {loginError && (
            <div style={{ marginBottom: '1rem', background: '#fee2e2', border: '1px solid #f87171',
              color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
              {loginError}
            </div>
          )}

          {/* Email */}
          <div className="bc-form-group">
            <label htmlFor="login-email">Adresse Email</label>
            <div className="bc-input-wrap">
              <span className="material-symbols-outlined">mail</span>
              <input
                className="bc-input"
                id="login-email"
                placeholder="nom@exemple.com"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            {loginEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail) && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', marginLeft: '0.25rem' }}>
                ✗ Format email invalide
              </div>
            )}
            {loginEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail) && (
              <div style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: '0.25rem', marginLeft: '0.25rem' }}>
                ✓ Email valide
              </div>
            )}
          </div>

          {/* Mot de passe */}
          <div className="bc-form-group">
            <label htmlFor="login-password">Mot de passe</label>
            <div className="bc-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }}>lock</span>
              <input
                className="bc-input"
                id="login-password"
                placeholder="••••••••"
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem', width: '100%' }}
              />
              <button
                type="button"
                className="login-visibility-btn"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                style={{ position: 'absolute', right: '2.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#94a3b8' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                  {showLoginPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Link className="forgot-password-link" to="/forgot-password">Mot de passe oublié ?</Link>
            </div>
          </div>

          {/* Bouton */}
          <button
            className="bc-submit"
            type="submit"
            disabled={
              loginLoading ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail) ||
              loginPassword.trim() === ''
            }
          >
            {loginLoading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#475569' }}>
          Pas encore de compte ?{' '}
          <a href="#" style={{ color: '#003d7a', fontWeight: 700, textDecoration: 'none' }}
            onClick={(e) => { e.preventDefault(); setShowModal1(false); setShowModal(true); }}>
            Créer un profil
          </a>
        </div>
      </div>
      <button className="bc-modal-close" onClick={() => setShowModal1(false)}>
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  </div>
)}

        {/* ── HEADER ── */}
        <header className="bc-header">
          <div className="bc-header-inner">
            <Link to="/" className="bc-brand">
              <img src={bctImage} style={{ width: '240px' ,marginBottom:'25px'}} alt="BCT" />
            </Link>
            <nav className="bc-nav">
              <button onClick={() => scrollTo(offresRef)}>Accueil</button>
              <button onClick={() => scrollTo(processusRef)}>Processus</button>
              <button onClick={() => scrollTo(ctaRef)}>Candidater</button>
            </nav>
            <div className="bc-header-actions">
              <button className="bc-btn-login" onClick={() => setShowModal1(true)}>Se Connecter</button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1 }}>

          {/* ── HERO ── */}
          <section className="bc-hero">
            <div className="bc-hero-inner">
              <img className="bc-hero-img" alt="Banque Centrale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNj-ZMB7jwdhTpLMRATmRx3fFKAj8bg85Wssj7oO8lw7vomyzj56EHd_w7U4TcTt-PJ-tIjs4j49FLt3eW0YSy4V4GIaaqeaSb-FDBYQaVqkU1gaOKSsgAE7O2t2Qf-pmbklyNa1JImyCfafWrDqT8J8h39iAldaht90VwsGqokeCdCYqS6v4GzvJ5ak65ZIMqw8MLjioLu_q1TDTpiAMb02fuEorpRhoCEBxGv3GL3tOW5OakCsK2YjGdLGPsxdbI6JRBoT3cVFE" />
              <div className="bc-hero-overlay" />
              <div className="bc-hero-content">
                <div className="bc-hero-text">
                  <h1>Façonnez l'avenir de l'économie</h1>
                  <p>Rejoignez le programme de stage d'excellence de la Banque Centrale. Profitez d'un processus de recrutement innovant propulsé par l'IA pour propulser votre carrière.</p>
                  <div className="bc-hero-buttons">
                    <a className="bc-btn-primary" href="/login">commencer</a>
                    <button className="bc-btn-outline" onClick={() => scrollTo(ctaRef)}>Candidater</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── OFFRES ── 
          <section ref={offresRef} className="bc-offres" style={{ padding: '5rem 0', background: '#f5f7f8' }}>
            <div className="bc-how-inner">
              <div className="bc-how-header">
                <p className="bc-how-label">Opportunités</p>
                <h3 className="bc-how-title">Nos offres de stage</h3>
                <p className="bc-how-desc">Découvrez les postes disponibles au sein de la Banque Centrale et trouvez celui qui correspond à votre profil.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '1rem' }}>
                <span className="material-symbols-outlined" style={{ marginRight: '0.75rem', color: '#003d7a', fontSize: '1.5rem' }}>work</span>
                Les offres seront affichées ici.
              </div>
            </div>
          </section>*/}

          {/* ── PROCESSUS ── */}
          <section ref={processusRef} className="bc-how">
            <div className="bc-how-inner">
              <div className="bc-how-header">
                <p className="bc-how-label">Innovation</p>
                <h3 className="bc-how-title">Comment ça marche</h3>
                <p className="bc-how-desc">Un processus de recrutement intelligent et automatisé pour simplifier votre candidature et valoriser votre talent.</p>
              </div>
              <div className="bc-steps">
                {steps.map((step) => (
                  <div key={step.title} className="bc-step">
                    <div className="bc-step-icon">
                      <span className="material-symbols-outlined">{step.icon}</span>
                    </div>
                    <h4>{step.title}</h4>
                    <p>{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FAQ ──
          <section ref={faqRef} className="bc-faq" style={{ padding: '5rem 0', background: '#f5f7f8' }}>
            <div className="bc-how-inner">
              <div className="bc-how-header">
                <p className="bc-how-label">Questions fréquentes</p>
                <h3 className="bc-how-title">FAQ</h3>
                <p className="bc-how-desc">Trouvez les réponses aux questions les plus fréquentes sur notre processus de recrutement.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '1rem' }}>
                <span className="material-symbols-outlined" style={{ marginRight: '0.75rem', color: '#003d7a', fontSize: '1.5rem' }}>help</span>
                Les questions fréquentes seront affichées ici.
              </div>
            </div>
          </section> */}

          {/* ── CTA ── */}
          <section className="bc-cta" ref={ctaRef}>
            <div className="bc-cta-inner">
              <h2>Prêt à commencer votre carrière ?</h2>
              <p>Rejoignez l'élite économique et participez à des projets d'envergure nationale au sein de la Banque Centrale.</p>
             <div className="bc-cta-btn-wrap">
  <a className="bc-btn-cta" href="/register">Créer mon profil candidat</a>
</div>
            </div>
          </section>

        </main>

        {/* ── FOOTER ── */}
        <footer className="bc-footer">
          <div className="bc-footer-inner">
            <div className="bc-footer-grid">
              <div className="bc-footer-col">
                <div className="bc-footer-brand">
                  <span className="material-symbols-outlined">account_balance</span>
                  <span>Banque Centrale</span>
                </div>
                <p>Garant de la stabilité monétaire et financière, nous construisons l'économie de demain avec les talents d'aujourd'hui.</p>
              </div>
              <div className="bc-footer-col">
                <h5>Navigation</h5>
                <ul>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo(offresRef); }}>Toutes nos offres</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo(processusRef); }}>Processus de sélection</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo(ctaRef); }}>FAQ</a></li>
                </ul>
              </div>
              <div className="bc-footer-col">
                <h5>Institutionnel</h5>
                <ul>
                  <li><Link to="/about">À propos de nous</Link></li>
                  <li><Link to="/rapports">Rapports annuels</Link></li>
                  <li><Link to="/gouvernance">Gouvernance</Link></li>
                </ul>
              </div>
              <div className="bc-footer-col">
                <h5>Légal &amp; Contact</h5>
                <ul>
                  <li><Link to="/mentions-legales">Mentions Légales</Link></li>
                  <li><Link to="/confidentialite">Confidentialité</Link></li>
                  <li><Link to="/contact">Contactez-nous</Link></li>
                </ul>
              </div>
            </div>
            <div className="bc-footer-bottom">
              <p>© 2024 Banque Centrale de l'Union. Tous droits réservés.</p>
              <div className="bc-footer-icons">
                <a href="#"><span className="material-symbols-outlined">language</span></a>
                <a href="#"><span className="material-symbols-outlined">share</span></a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default HomePage;