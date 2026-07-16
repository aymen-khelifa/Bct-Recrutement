import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

  .admd-root * { box-sizing: border-box; }
  .admd-root { font-family: 'Public Sans', sans-serif; }
  .admd-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
  body { margin: 0; padding: 0; }

  /* ── HEADER ── */
  .admd-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
  .admd-header h2 { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin: 0; }
  .admd-header p { color: #64748b; margin-top: 0.25rem; font-size: 0.875rem; margin-bottom: 0; }

  /* ── STATS ── */
  .admd-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
  @media (max-width: 1280px) { .admd-stats { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 640px)  { .admd-stats { grid-template-columns: repeat(2, 1fr); } }
  .admd-stat-card { background: #fff; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: box-shadow .2s, transform .2s; }
  .admd-stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); transform: translateY(-1px); }
  .admd-stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .admd-stat-top p { font-size: 0.875rem; font-weight: 600; color: #64748b; margin: 0; }
  .admd-stat-icon { width: 2.5rem; height: 2.5rem; border-radius: .625rem; display: flex; align-items: center; justify-content: center; }
  .admd-stat-icon.blue   { background: rgba(0,61,122,.08);  color: #003d7a; }
  .admd-stat-icon.green  { background: rgba(5,150,105,.08); color: #059669; }
  .admd-stat-icon.amber  { background: rgba(245,158,11,.08); color: #d97706; }
  .admd-stat-icon.purple { background: rgba(124,58,237,.08); color: #7c3aed; }
  .admd-stat-icon.red    { background: rgba(239,68,68,.08);  color: #dc2626; }
  .admd-stat-num { font-size: 1.875rem; font-weight: 900; color: #0f172a; margin: .25rem 0; }
  .admd-stat-num.green  { color: #059669; }
  .admd-stat-num.amber  { color: #d97706; }
  .admd-stat-num.purple { color: #7c3aed; }
  .admd-stat-num.red    { color: #dc2626; }
  .admd-stat-sub { font-size: 0.75rem; font-weight: 500; color: #94a3b8; font-style: italic; }

  /* ── QUICK ACTIONS ── */
  .admd-quick { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.75rem 2rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); margin-bottom: 2rem; }
  .admd-quick-title { font-size: 0.6875rem; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; margin-bottom: 1.25rem; display: flex; align-items: center; gap: .5rem; }
  .admd-quick-title .material-symbols-outlined { font-size: 1rem; color: #001b3d; }
  .admd-quick-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
  .admd-action-btn { display: flex; align-items: center; gap: 0.625rem; padding: 0.875rem 1.5rem; background: #001b3d; color: #fff; border: none; border-radius: 0.625rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,27,61,.2); }
  .admd-action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .admd-action-btn.ghost { background: #fff; color: #001b3d; border: 1px solid #e2e8f0; box-shadow: none; }
  .admd-action-btn.ghost:hover { background: #f8fafc; }
  .admd-action-btn .material-symbols-outlined { font-size: 1.125rem; }

  /* ── BOTTOM PANELS ── */
  .admd-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
  @media (max-width: 1024px) { .admd-bottom { grid-template-columns: 1fr; } }
  .admd-panel { background: #fff; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column; overflow: hidden; }
  .admd-panel-header { padding: 1.25rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; background: rgba(248,250,252,0.5); flex-shrink: 0; }
  .admd-panel-title { font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; margin: 0; }
  .admd-panel-badge { font-size: 0.625rem; font-weight: 700; color: #003d7a; text-transform: uppercase; background: rgba(0,61,122,.08); padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: 1px solid rgba(0,61,122,.15); }
  .admd-panel-body { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .admd-panel-body::-webkit-scrollbar { width: 4px; }
  .admd-panel-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .admd-panel-empty { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.875rem; }
  .admd-panel-empty .material-symbols-outlined { font-size: 2rem; display: block; margin-bottom: 0.5rem; color: #cbd5e1; }
  .admd-panel-footer { padding: 1rem; border-top: 1px solid #f1f5f9; background: rgba(248,250,252,0.3); flex-shrink: 0; }
  .admd-see-all-btn { width: 100%; padding: 0.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all .15s; }
  .admd-see-all-btn:hover { background: #f8fafc; border-color: #001b3d; color: #001b3d; }

  /* User row */
  .admd-user-row { display: flex; align-items: center; gap: 0.875rem; padding: 0.75rem 0.875rem; border-radius: 0.5rem; border: 1px solid #f1f5f9; transition: background .15s; }
  .admd-user-row:hover { background: #f8fafc; }
  .admd-user-chip { width: 2.25rem; height: 2.25rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.6875rem; color: #fff; flex-shrink: 0; }
  .admd-user-chip.rh   { background: linear-gradient(135deg,#001b3d,#003d7a); }
  .admd-user-chip.cand { background: linear-gradient(135deg,#059669,#047857); }
  .admd-user-name { font-size: 0.875rem; font-weight: 700; color: #0f172a; }
  .admd-user-email { font-size: 0.625rem; color: #64748b; margin-top: 0.1rem; }
  .admd-user-badge { margin-left: auto; font-size: .625rem; font-weight: 700; padding: .2rem .5rem; border-radius: .25rem; white-space: nowrap; }
  .admd-user-badge.rh   { background: rgba(0,61,122,.08);  color: #003d7a; }
  .admd-user-badge.actif  { background: rgba(5,150,105,.08); color: #059669; }
  .admd-user-badge.bloque { background: rgba(239,68,68,.08); color: #dc2626; }

  @keyframes admd-spin { to { transform: rotate(360deg); } }
  .admd-spin { animation: admd-spin 0.8s linear infinite; color: #001b3d; }
  .admd-loading { display: flex; align-items: center; justify-content: center; padding: 5rem; gap: 0.75rem; color: #64748b; font-weight: 600; }

  @keyframes toastin { from{opacity:0;transform:translateY(1rem)} to{opacity:1;transform:translateY(0)} }
  .admd-toast { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 999; background: #0f172a; color: #fff; padding: .875rem 1.25rem; border-radius: .75rem; display: flex; align-items: center; gap: .625rem; font-size: .8125rem; font-weight: 600; box-shadow: 0 20px 25px -5px rgba(0,0,0,.25); animation: toastin .3s ease; font-family: 'Public Sans', sans-serif; }
  .admd-toast.success .material-symbols-outlined { color: #22c55e; }
  .admd-toast.error   .material-symbols-outlined { color: #ef4444; }
`;

const Icon = ({ name, className = '', style = {} }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const getInit = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    Promise.all([
      axios.get('/api/admin/stats'),
      axios.get('/api/admin/users'),
    ])
      .then(([statsRes, usersRes]) => {
        setStats(statsRes.data);
        setUsers(usersRes.data);
      })
      .catch(() => showToast('Erreur chargement données', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const statsCards = stats ? [
    { label: 'Utilisateurs totaux', value: stats.total    ?? 0, iconClass: 'blue',   icon: 'group',         numClass: '',       sub: 'Tous rôles confondus'   },
    { label: 'Responsables RH',     value: stats.rh       ?? 0, iconClass: 'purple', icon: 'badge',         numClass: 'purple', sub: 'Comptes RH actifs'      },
    { label: 'Candidats',           value: stats.candidats?? 0, iconClass: 'blue',   icon: 'school',        numClass: '',       sub: 'Comptes candidats'      },
    { label: 'Comptes actifs',      value: stats.actifs   ?? 0, iconClass: 'green',  icon: 'check_circle',  numClass: 'green',  sub: 'Accès autorisé'         },
    { label: 'Comptes bloqués',     value: stats.bloques  ?? 0, iconClass: 'red',    icon: 'block',         numClass: 'red',    sub: 'Accès suspendu'         },
  ] : [];

  const rhUsers   = users.filter(u => u.role === 'ROLE_RH').slice(0, 5);
  const blocUsers = users.filter(u => u.enabled === false ).slice(0, 5);

  return (
    <>
      <style>{styles}</style>
      <div className="admd-root">

        {toast && (
          <div className={`admd-toast ${toast.type}`}>
            <Icon name={toast.type === 'success' ? 'check_circle' : 'error'} />
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="admd-header">
          <div>
            <h2>Tableau de Bord Admin</h2>
            <p>Administration de la plateforme — gestion des utilisateurs et des accès.</p>
          </div>
        </div>

        {loading ? (
          <div className="admd-loading">
            <Icon name="progress_activity" className="admd-spin" />
            Chargement...
          </div>
        ) : (<>

          {/* Stats */}
          <div className="admd-stats">
            {statsCards.map(s => (
              <div key={s.label} className="admd-stat-card">
                <div className="admd-stat-top">
                  <p>{s.label}</p>
                  <div className={`admd-stat-icon ${s.iconClass}`}>
                    <Icon name={s.icon} />
                  </div>
                </div>
                <p className={`admd-stat-num ${s.numClass}`}>{s.value}</p>
                <p className="admd-stat-sub">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Actions rapides */}
          <div className="admd-quick">
            <p className="admd-quick-title"><Icon name="bolt" />Actions rapides</p>
            <div className="admd-quick-actions">
              <button className="admd-action-btn"
                onClick={() => navigate('/admin/utilisateurs?nouveau=1')}>
                <Icon name="person_add" />Ajouter un compte RH
              </button>
              <button className="admd-action-btn ghost"
                onClick={() => navigate('/admin/utilisateurs')}>
                <Icon name="manage_accounts" />Gérer les utilisateurs
              </button>
            </div>
          </div>

          {/* Panels */}
          <div className="admd-bottom">

            {/* Responsables RH */}
            <div className="admd-panel">
              <div className="admd-panel-header">
                <h4 className="admd-panel-title">
                  <Icon name="badge" style={{ color: '#003d7a' }} />
                  Responsables RH
                </h4>
                <span className="admd-panel-badge">{rhUsers.length} affichés</span>
              </div>
              <div className="admd-panel-body">
                {rhUsers.length === 0 ? (
                  <div className="admd-panel-empty">
                    <Icon name="badge" />Aucun responsable RH
                  </div>
                ) : rhUsers.map(u => (
                  <div key={u.id} className="admd-user-row">
                    <div className="admd-user-chip rh">{getInit(u.name || u.email)}</div>
                    <div>
                      <p className="admd-user-name">{u.name || '—'}</p>
                      <p className="admd-user-email">{u.email}</p>
                    </div>
                    <span className="admd-user-badge rh">RH</span>
                  </div>
                ))}
              </div>
              <div className="admd-panel-footer">
                <button className="admd-see-all-btn"
                  onClick={() => navigate('/admin/utilisateurs')}>
                  Voir tous les utilisateurs
                </button>
              </div>
            </div>

            {/* Comptes bloqués */}
            <div className="admd-panel">
              <div className="admd-panel-header">
                <h4 className="admd-panel-title">
                  <Icon name="block" style={{ color: '#dc2626' }} />
                  Comptes bloqués
                </h4>
                <span className="admd-panel-badge" style={{ color: '#dc2626', background: 'rgba(239,68,68,.08)', borderColor: 'rgba(239,68,68,.2)' }}>
                  {stats?.bloques ?? 0} bloqués
                </span>
              </div>
              <div className="admd-panel-body">
                {blocUsers.length === 0 ? (
                  <div className="admd-panel-empty">
                    <Icon name="check_circle" />Aucun compte bloqué
                  </div>
                ) : blocUsers.map(u => (
                  <div key={u.id} className="admd-user-row">
                    <div className="admd-user-chip cand">{getInit(u.name || u.email)}</div>
                    <div>
                      <p className="admd-user-name">{u.name || '—'}</p>
                      <p className="admd-user-email">{u.email}</p>
                    </div>
                    <span className="admd-user-badge bloque">Bloqué</span>
                  </div>
                ))}
              </div>
              <div className="admd-panel-footer">
                <button className="admd-see-all-btn"
                  onClick={() => navigate('/admin/utilisateurs')}>
                  Gérer les accès
                </button>
              </div>
            </div>

          </div>
        </>)}
      </div>
    </>
  );
};

export default AdminDashboard;