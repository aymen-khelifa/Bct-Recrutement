import { Link } from 'react-router-dom';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
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

  .unauth-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .unauth-root {
    font-family: 'Public Sans', sans-serif;
    background: #f5f7f8; min-height: 100vh;
    display: flex; flex-direction: column;
  }
  .unauth-root .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  /* ── HEADER ── */
  .unauth-header {
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid #e2e8f0; padding: 1rem 2.5rem;
    background: #fff;
  }
  .unauth-header-left { display: flex; align-items: center; gap: 1rem; }
  .unauth-logo { color: #003d7a; width: 2rem; height: 2rem; flex-shrink: 0; }
  .unauth-brand { font-size: 1.25rem; font-weight: 700; color: #003d7a;
    text-transform: uppercase; letter-spacing: 0.05em; }
  .unauth-header-right { display: flex; align-items: center; gap: 1rem; }
  .unauth-header-label { font-size: 0.875rem; font-weight: 500; color: #64748b; }
  .unauth-header-avatar {
    width: 2.5rem; height: 2.5rem; border-radius: 9999px;
    background: #e2e8f0; display: flex; align-items: center; justify-content: center;
  }
  .unauth-header-avatar .material-symbols-outlined { color: #64748b; }

  /* ── MAIN ── */
  .unauth-main {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 3rem 1rem;
  }
  .unauth-content {
    max-width: 38rem; width: 100%;
    display: flex; flex-direction: column; align-items: center; text-align: center;
  }

  /* ── ICON ── */
  .unauth-icon-wrap { position: relative; margin-bottom: 2rem; }
  .unauth-icon-glow {
    position: absolute; inset: -1rem;
    background: rgba(0,61,122,0.05); border-radius: 9999px; filter: blur(1.5rem);
  }
  .unauth-icon-circle {
    position: relative; width: 8rem; height: 8rem; border-radius: 9999px;
    background: #f1f5f9; border: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: center;
  }
  .unauth-icon-circle .material-symbols-outlined {
    font-size: 3.75rem; color: #94a3b8;
    font-variation-settings: 'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 48;
  }
  .unauth-icon-badge {
    position: absolute; bottom: 0; right: 0;
    width: 2.5rem; height: 2.5rem; border-radius: 9999px;
    background: #ef4444; color: #fff;
    display: flex; align-items: center; justify-content: center;
    border: 4px solid #f5f7f8;
  }
  .unauth-icon-badge .material-symbols-outlined { font-size: 1.125rem; }

  /* ── TEXT ── */
  .unauth-eyebrow {
    font-size: 0.75rem; font-weight: 700; color: #003d7a;
    text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 1rem;
  }
  .unauth-title {
    font-size: 2.75rem; font-weight: 700; color: #0f172a;
    line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 0.75rem;
  }
  .unauth-subtitle {
    font-size: 1.25rem; font-weight: 500; color: #64748b; margin-bottom: 1rem;
  }
  .unauth-divider {
    width: 4rem; height: 0.25rem; background: rgba(0,61,122,0.2);
    border-radius: 9999px; margin: 0 auto 1.5rem;
  }
  .unauth-desc {
    font-size: 1rem; color: #64748b; line-height: 1.7;
    max-width: 28rem; margin: 0 auto 2.5rem;
  }

  /* ── BUTTONS ── */
  .unauth-actions { display: flex; flex-direction: column; gap: 1rem; width: 100%; justify-content: center; }
  @media (min-width: 480px) { .unauth-actions { flex-direction: row; } }
  .unauth-btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.75rem 2rem; background: #003d7a; color: #fff;
    font-size: 0.9375rem; font-weight: 600; border-radius: 0.5rem;
    text-decoration: none; border: none; cursor: pointer;
    font-family: 'Public Sans', sans-serif;
    box-shadow: 0 10px 15px -3px rgba(0,61,122,0.2);
    transition: opacity 0.2s;
  }
  .unauth-btn-primary:hover { opacity: 0.9; }
  .unauth-btn-primary .material-symbols-outlined { font-size: 1.25rem; }
  .unauth-btn-secondary {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.75rem 2rem; background: #fff; color: #003d7a;
    font-size: 0.9375rem; font-weight: 600; border-radius: 0.5rem;
    text-decoration: none; border: 1px solid rgba(0,61,122,0.2); cursor: pointer;
    font-family: 'Public Sans', sans-serif; transition: background 0.2s;
  }
  .unauth-btn-secondary:hover { background: #f8fafc; }
  .unauth-btn-secondary .material-symbols-outlined { font-size: 1.25rem; }

  /* ── SESSION ID ── */
  .unauth-session {
    margin-top: 4rem; font-size: 0.875rem; color: #94a3b8;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .unauth-session .material-symbols-outlined { font-size: 1rem; }

  /* ── BOTTOM BAR ── */
  .unauth-bottom-bar {
    position: fixed; bottom: 0; left: 0; right: 0; height: 0.25rem;
    background: linear-gradient(to right, transparent, rgba(0,61,122,0.2), transparent);
  }
`;

const Unauthorized = () => {
  // Générer un ID de session unique à chaque affichage

  return (
    <>
      <style>{styles}</style>
      <div className="unauth-root">

      

        {/* ── MAIN ── */}
        <main className="unauth-main">
          <div className="unauth-content">

            {/* Icône */}
            <div className="unauth-icon-wrap">
              <div className="unauth-icon-glow"/>
              <div className="unauth-icon-circle">
                <span className="material-symbols-outlined">lock_person</span>
              </div>
              <div className="unauth-icon-badge">
                <span className="material-symbols-outlined">close</span>
              </div>
            </div>

            {/* Texte */}
            <p className="unauth-eyebrow">Erreur de sécurité</p>
            <h1 className="unauth-title">403 — Accès Interdit</h1>
            <h2 className="unauth-subtitle">Accès non autorisé</h2>
            <div className="unauth-divider"/>
            <p className="unauth-desc">
              Désolé, vous n'avez pas les permissions nécessaires pour accéder
              à cette page ou effectuer cette action sur la plateforme de la Banque Centrale.
            </p>

            {/* Boutons */}
            <div className="unauth-actions">
              <Link to="/" className="unauth-btn-primary">
                <span className="material-symbols-outlined">home</span>
                Retour à l'accueil
              </Link>
             
            </div>

            
          </div>
        </main>

        {/* Barre bas */}
        <div className="unauth-bottom-bar"/>

      </div>
    </>
  );
};

export default Unauthorized;