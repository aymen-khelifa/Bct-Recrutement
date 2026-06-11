import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const styles = `
  .admd-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .admd-root { font-family: 'Public Sans', sans-serif; }
  .admd-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
  body { margin: 0; padding: 0; }

  .admd-title { font-size: 2.5rem; font-weight: 900; color: #001b3d; letter-spacing: -0.05em; margin-bottom: 0.375rem; }
  .admd-title-bar { width: 5rem; height: 0.375rem; background: #001b3d; border-radius: 9999px; margin-bottom: 1.25rem; }
  .admd-subtitle { font-size: 0.9375rem; color: #64748b; margin-bottom: 2rem; font-weight: 500; }

  .admd-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
  @media (max-width: 1024px) { .admd-stats { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { .admd-stats { grid-template-columns: 1fr; } }
  .admd-stat-card { background: #fff; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .admd-stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .admd-stat-top p { font-size: 0.875rem; font-weight: 600; color: #64748b; }
  .admd-stat-top .material-symbols-outlined { font-size: 1.75rem; }
  .admd-stat-num { font-size: 2rem; font-weight: 900; color: #0f172a; }

  .admd-quick { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.75rem 2rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .admd-quick-title { font-size: 0.6875rem; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; margin-bottom: 1.25rem; display: flex; align-items: center; gap: .5rem; }
  .admd-quick-title .material-symbols-outlined { font-size: 1rem; color: #001b3d; }
  .admd-quick-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
  .admd-action-btn { display: flex; align-items: center; gap: 0.625rem; padding: 0.875rem 1.5rem; background: #001b3d; color: #fff; border: none; border-radius: 0.625rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,27,61,.2); }
  .admd-action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .admd-action-btn.ghost { background: #fff; color: #001b3d; border: 1px solid #e2e8f0; box-shadow: none; }
  .admd-action-btn.ghost:hover { background: #f8fafc; }
  .admd-action-btn .material-symbols-outlined { font-size: 1.125rem; }

  @keyframes admd-spin { to { transform: rotate(360deg); } }
  .admd-spin { animation: admd-spin 0.8s linear infinite; color: #001b3d; }
  .admd-loading { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #64748b; font-weight: 600; }
`;

const Icon = ({ name, className='', style={} }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Utilisateurs totaux', key: 'total',     icon: 'group',          color: '#001b3d' },
    { label: 'Responsables RH',     key: 'rh',         icon: 'badge',          color: '#003d7a' },
    { label: 'Candidats',           key: 'candidats',  icon: 'school',         color: '#059669' },
    { label: 'Comptes actifs',      key: 'actifs',     icon: 'check_circle',   color: '#f59e0b' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="admd-root">
        <h2 className="admd-title">Tableau de bord</h2>
        <div className="admd-title-bar"/>
        <p className="admd-subtitle">Administration de la plateforme — gestion des utilisateurs et des accès.</p>

        {loading ? (
          <div className="admd-loading">
            <Icon name="progress_activity" className="admd-spin"/>Chargement des statistiques...
          </div>
        ) : (
          <>
            <div className="admd-stats">
              {cards.map(c => (
                <div key={c.key} className="admd-stat-card">
                  <div className="admd-stat-top">
                    <p>{c.label}</p>
                    <Icon name={c.icon} style={{color:c.color, opacity:0.4}}/>
                  </div>
                  <p className="admd-stat-num" style={{color:c.color}}>
                    {stats ? (stats[c.key] ?? 0) : '—'}
                  </p>
                </div>
              ))}
            </div>

            <div className="admd-quick">
              <p className="admd-quick-title"><Icon name="bolt"/>Actions rapides</p>
              <div className="admd-quick-actions">
                <button className="admd-action-btn" onClick={() => navigate('/admin/utilisateurs?nouveau=1')}>
                  <Icon name="person_add"/>Ajouter un compte RH
                </button>
                <button className="admd-action-btn ghost" onClick={() => navigate('/admin/utilisateurs')}>
                  <Icon name="manage_accounts"/>Gérer les utilisateurs
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default AdminDashboard;