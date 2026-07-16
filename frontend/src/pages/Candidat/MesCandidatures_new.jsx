import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .mc-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .mc-root { font-family: 'Public Sans', sans-serif; background: #f5f7f8; color: #0f172a; min-height: 100vh; }
  .mc-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }

  .mc-main { max-width: 72rem; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }

  .mc-breadcrumb { display: flex; align-items: center; gap: 0.375rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 1rem; }
  .mc-breadcrumb span { color: #003d7a; }
  .mc-breadcrumb .material-symbols-outlined { font-size: 0.875rem; }

  .mc-header { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2.5rem; }
  @media (min-width: 768px) { .mc-header { flex-direction: row; align-items: flex-end; justify-content: space-between; } }
  .mc-header h1 { font-size: 2.25rem; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; }
  .mc-header p { font-size: 0.9375rem; color: #64748b; margin-top: 0.375rem; }
  .mc-stats { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .mc-stat { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.875rem 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); min-width: 5.5rem; }
  .mc-stat-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; display: block; margin-bottom: 0.25rem; }
  .mc-stat-val { font-size: 1.5rem; font-weight: 900; line-height: 1; }
  .mc-stat-val.blue { color: #003d7a; }

  /* ── LISTE ── */
  .mc-list { display: flex; flex-direction: column; gap: 0.875rem; }
  .mc-item {
    background: rgba(255,255,255,0.97);
    border: 1px solid rgba(0,61,122,0.1); border-radius: 0.875rem;
    padding: 1.375rem 1.5rem; transition: box-shadow 0.2s, border-color 0.2s;
    display: flex; flex-direction: column; gap: 1.25rem;
    border-left-width: 4px; border-left-style: solid;
  }
  @media (min-width: 1024px) { .mc-item { flex-direction: row; align-items: center; gap: 1.5rem; } }
  .mc-item:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
  .mc-item.refused { opacity: 0.75; filter: grayscale(0.3); }
  .mc-item.refused:hover { opacity: 1; filter: none; }

  .mc-item-icon { width: 3.5rem; height: 3.5rem; border-radius: 0.625rem; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .mc-item-icon .material-symbols-outlined { font-size: 1.75rem; }

  .mc-item-body { flex: 1; min-width: 0; }
  .mc-item-title-row { display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap; }
  .mc-item-title { font-size: 1.0625rem; font-weight: 700; color: #0f172a; }
  .mc-item-dept { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; display: flex; align-items: center; gap: 0.375rem; }
  .mc-item-dept .material-symbols-outlined { font-size: 0.875rem; color: #94a3b8; }
  .mc-item-date { font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem; }

  .mc-badge { display: inline-flex; align-items: center; padding: 0.2rem 0.625rem; border-radius: 9999px; font-size: 0.625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; line-height: 1.4; }

  .mc-item-right { display: flex; align-items: center; gap: 0.875rem; flex-shrink: 0; flex-wrap: wrap; }

  .mc-event-chip { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.5rem 0.75rem; }
  .mc-event-chip .material-symbols-outlined { font-size: 1.125rem; color: #d97706; font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
  .mc-event-chip-label { font-size: 0.6875rem; font-weight: 700; color: #0f172a; display: block; line-height: 1.2; }
  .mc-event-chip-sub { font-size: 0.625rem; color: #64748b; }

  .mc-progress-wrap { display: none; }
  @media (min-width: 640px) { .mc-progress-wrap { display: flex; align-items: center; gap: 0.5rem; } }
  .mc-progress-bar { width: 6rem; height: 0.375rem; background: #e2e8f0; border-radius: 9999px; overflow: hidden; }
  .mc-progress-fill { height: 100%; background: #7c3aed; border-radius: 9999px; }

  .mc-btn-primary { padding: 0.5625rem 1.25rem; background: #003d7a; color: #fff; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.2s; white-space: nowrap; }
  .mc-btn-primary:hover { background: #002a5c; }
  .mc-btn-outline { padding: 0.5625rem 1.25rem; background: #fff; color: #003d7a; border: 1px solid #003d7a; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.2s; white-space: nowrap; }
  .mc-btn-outline:hover { background: rgba(0,61,122,0.05); }
  .mc-btn-neutral { padding: 0.5625rem 1.25rem; background: #fff; color: #64748b; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.2s; white-space: nowrap; }
  .mc-btn-neutral:hover { background: #f8fafc; }

  .mc-bento { display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-top: 3rem; }
  @media (min-width: 768px) { .mc-bento { grid-template-columns: 2fr 1fr; } }
  .mc-bento-cta { background: #003d7a; border-radius: 1rem; padding: 2rem; color: #fff; position: relative; overflow: hidden; }
  .mc-bento-cta h2 { font-size: 1.375rem; font-weight: 800; margin-bottom: 0.75rem; }
  .mc-bento-cta p { font-size: 0.875rem; color: rgba(255,255,255,0.75); margin-bottom: 1.5rem; line-height: 1.6; }
  .mc-bento-cta button { background: #fff; color: #003d7a; border: none; padding: 0.5rem 1.25rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .mc-bento-icon { position: absolute; right: -1rem; bottom: -1rem; font-size: 8rem !important; color: rgba(255,255,255,0.08); transform: rotate(12deg); }
  .mc-bento-support { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column; align-items: center; text-align: center; justify-content: center; gap: 0.75rem; }
  .mc-bento-support-icon { width: 3.5rem; height: 3.5rem; border-radius: 9999px; background: rgba(0,61,122,0.08); display: flex; align-items: center; justify-content: center; }
  .mc-bento-support-icon .material-symbols-outlined { font-size: 1.75rem; color: #003d7a; }
  .mc-bento-support h3 { font-size: 1rem; font-weight: 700; color: #0f172a; }
  .mc-bento-support p { font-size: 0.875rem; color: #64748b; line-height: 1.5; }
  .mc-bento-support a { font-size: 0.875rem; font-weight: 700; color: #003d7a; text-decoration: none; }

  .mc-state { padding: 4rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.875rem; }
  .mc-state .material-symbols-outlined { font-size: 3rem; color: #cbd5e1; }
  @keyframes mc-spin { to { transform: rotate(360deg); } }
  .mc-spin { animation: mc-spin 0.8s linear infinite; color: #003d7a; font-size: 2rem !important; }
`;

// ── Couleurs par statut ────────────────────────────────────────────────────
const colorMap = {
 
  EN_COURS_EXAMEN:    { border: '#003d7a', bg: 'rgba(124,58,237,0.08)', text: '#003d7a', icon: 'analytics',       btnType: 'outline' },
  ENTRETIEN_PLANIFIE: { border: '#d97706', bg: 'rgba(245,158,11,0.08)', text: '#d97706', icon: 'event',           btnType: 'primary' },
  ACCEPTE_QUIZ:       { border: '#7c3aed', bg: 'rgba(0,61,122,0.07)',   text: '#7c3aed', icon: 'quiz',            btnType: 'primary' },
  ACCEPTE:            { border: '#059669', bg: 'rgba(5,150,105,0.08)',  text: '#059669', icon: 'task_alt',        btnType: 'primary' },
  REFUSE:             { border: '#dc2626', bg: 'rgba(220,38,38,0.07)',  text: '#dc2626', dot: '#dc2626', icon: 'cancel',          btnType: 'neutral' },
  // fallback labels du backend
  PRESELECTIONNE_CV:            { border: '#059669', bg: 'rgba(5,150,105,0.08)',  text: '#059669', icon: 'task_alt',        btnType: 'primary' },
    ELIMINE_CV:             { border: '#dc2626', pill: 'rgba(220,38,38,0.08)',  text: '#dc2626', dot: '#dc2626', icon: 'task_alt',        btnType: 'primary'  },
    ELIMINE_QUIZ:             { border: '#dc2626', pill: 'rgba(220,38,38,0.08)',  text: '#dc2626', dot: '#dc2626', icon: 'task_alt',        btnType: 'primary'  },

  "En cours d'examen":    { border: '#003d7a', bg: 'rgba(0,61,122,0.08)',   text: '#003d7a', dot: '#003d7a', icon: 'analytics',       btnType: 'outline' },
  "Entretien planifié":   { border: '#d97706', bg: 'rgba(245,158,11,0.08)', text: '#d97706', dot: '#d97706', icon: 'event',           btnType: 'primary' },
  "Accepté phase quiz":   { border: '#7c3aed', bg: 'rgba(124,58,237,0.08)', text: '#7c3aed', dot: '#7c3aed', icon: 'quiz',            btnType: 'primary' },
  "Accepté":              { border: '#059669', bg: 'rgba(5,150,105,0.08)',  text: '#059669', dot: '#059669', icon: 'task_alt',        btnType: 'primary' },
  "Refusé":               { border: '#dc2626', bg: 'rgba(220,38,38,0.07)',  text: '#dc2626', dot: '#dc2626', icon: 'cancel',          btnType: 'neutral' },
};

const getColor = (app) => colorMap[app.statut] || colorMap[app.statutLabel];

const labelMap = {
 
  EN_COURS_EXAMEN:    "En cours d'examen",
  ENTRETIEN_PLANIFIE: 'Entretien planifié',
  ACCEPTE_QUIZ:       'Accepté phase quiz',
  ACCEPTE:            'Accepté',
  REFUSE:             'Refusé',
};
const getLabel = (app) => app.statutLabel || labelMap[app.statut] || app.statut || '—';

const Mescandidatures = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loadingApps,  setLoadingApps]  = useState(true);
  const [errorApps,    setErrorApps]    = useState(null);

  useEffect(() => {
    axios.get('/api/candidatures/mes')
      .then(r => setApplications(r.data))
      .catch(() => setErrorApps('Impossible de charger vos candidatures.'))
      .finally(() => setLoadingApps(false));
  }, []);

  const total = applications.length;

  return (
    <>
      <style>{styles}</style>
      <div className="mc-root">
        <main className="mc-main">

          {/* HEADER */}
          <div className="mc-header">
            <div>
              <div className="mc-breadcrumb">
                Tableau de bord
                <span className="material-symbols-outlined">chevron_right</span>
                <span>Mes Candidatures</span>
              </div>
              <h1>Mes Candidatures</h1>
              <p>Suivez l'état d'avancement de vos postulations en temps réel.</p>
            </div>
            <div className="mc-stats">
              <div className="mc-stat">
                <span className="mc-stat-label">Total</span>
                <span className="mc-stat-val blue">{loadingApps ? '—' : String(total).padStart(2,'0')}</span>
              </div>
            </div>
          </div>

          {/* STATES */}
          {loadingApps && (
            <div className="mc-state">
              <span className="material-symbols-outlined mc-spin">progress_activity</span>
              <p>Chargement de vos candidatures...</p>
            </div>
          )}
          {!loadingApps && errorApps && (
            <div className="mc-state">
              <span className="material-symbols-outlined">error_outline</span>
              <p>{errorApps}</p>
            </div>
          )}
          {!loadingApps && !errorApps && applications.length === 0 && (
            <div className="mc-state">
              <span className="material-symbols-outlined">inbox</span>
              <p>Vous n'avez encore postulé à aucune offre.</p>
            </div>
          )}

          {/* LISTE */}
          {!loadingApps && !errorApps && applications.length > 0 && (
            <div className="mc-list">
              {applications.map(app => {
                const c     = getColor(app);
                const label = getLabel(app);
                return (
                  <div
                    key={app.id}
                    className={`mc-item${app.statut === 'REFUSE' ? ' refused' : ''}`}
                    style={{ borderLeftColor: c.border }}
                  >
                    {/* Icône */}
                    <div
                      className="mc-item-icon"
                      style={{ background: c.bg, color: c.text }}
                    >
                      <span className="material-symbols-outlined">{c.icon}</span>
                    </div>

                    {/* Corps */}
                    <div className="mc-item-body">
                      <div className="mc-item-title-row">
                        <span className="mc-item-title">{app.sujetTitre}</span>
                        <span
                          className="mc-badge"
                          style={{ background: c.bg, color: c.text }}
                        >
                          {label}
                        </span>
                      </div>
                      {app.sujetDepartement && (
                        <p className="mc-item-dept">
                          <span className="material-symbols-outlined">corporate_fare</span>
                          {app.sujetDepartement}
                        </p>
                      )}
                      <p className="mc-item-date">Postulé le {app.dateDepot || '—'}</p>
                    </div>

                    {/* Droite */}
                    <div className="mc-item-right">
                      {app.statut === 'ENTRETIEN_PLANIFIE' && app.dateEntretien && (
                        <div className="mc-event-chip">
                          <span className="material-symbols-outlined">event</span>
                          <div>
                            <span className="mc-event-chip-label">Entretien prévu</span>
                            <span className="mc-event-chip-sub">{app.dateEntretien}</span>
                          </div>
                        </div>
                      )}
                      {app.statut === 'EN_COURS_EXAMEN' && (
                        <div className="mc-progress-wrap">
                          <div className="mc-progress-bar">
                            <div className="mc-progress-fill" style={{width:'65%'}}/>
                          </div>
                        </div>
                      )}
                      <button
                        className={`mc-btn-${c.btnType}`}
                        onClick={() => navigate(`/candidat/candidatures/${app.id}`)}
                      >
                        Voir les détails
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        

        </main>
      </div>
    </>
  );
};

export default Mescandidatures;