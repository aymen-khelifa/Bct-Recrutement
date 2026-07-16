import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useNotif } from '../../context/NotifContext';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .db-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .db-root {
    font-family: 'Public Sans', sans-serif;
    background: #f5f5f8; color: #0f172a; min-height: 100vh;
  }
  .db-root .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  /* ── HEADER ── */
  .db-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #e2e8f0; padding: 0.75rem 1rem; }
  @media (min-width: 1024px) { .db-header { padding: 0.75rem 2.5rem; } }
  .db-header-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
  .db-brand { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; }
  .db-brand svg { width: 2rem; height: 2rem; color: #00007a; flex-shrink: 0; }
  .db-brand h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.025em; color: #00007a; text-transform: uppercase; }
  .db-nav { display: none; }
  @media (min-width: 768px) { .db-nav { display: flex; align-items: center; gap: 2rem; } }
  .db-nav a { font-size: 0.875rem; font-weight: 500; color: #475569; text-decoration: none; transition: color 0.2s; }
  .db-nav a:hover { color: #00007a; }
  .db-nav a.active { font-weight: 700; color: #00007a; border-bottom: 2px solid #00007a; padding-bottom: 0.25rem; }
  .db-header-actions { display: flex; align-items: center; gap: 1rem; }
  .db-notif-btn { position: relative; padding: 0.5rem; background: none; border: none; color: #475569; border-radius: 9999px; cursor: pointer; transition: background 0.2s; }
  .db-notif-btn:hover { background: #f1f5f9; }
  .db-notif-btn .material-symbols-outlined { font-size: 1.5rem; display: block; }
  .db-notif-badge { position: absolute; top: 0.5rem; right: 0.5rem; width: 0.5rem; height: 0.5rem; }
  .db-notif-ping { position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: #f87171; opacity: 0.75; animation: ping 1s cubic-bezier(0,0,0.2,1) infinite; }
  @keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }
  .db-notif-dot { position: relative; width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: #ef4444; }
  .db-divider { width: 1px; height: 2rem; background: #e2e8f0; margin: 0 0.5rem; }
  .db-user-info { display: none; text-align: right; }
  @media (min-width: 640px) { .db-user-info { display: block; } }
  .db-user-info p:first-child { font-size: 0.875rem; font-weight: 700; line-height: 1; }
  .db-user-info p:last-child { font-size: 0.75rem; color: #64748b; }
  .db-avatar { width: 2.5rem; height: 2.5rem; border-radius: 9999px; background: rgba(0,0,122,0.1); border: 1px solid rgba(0,0,122,0.2); background-size: cover; background-position: center; overflow: hidden; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #00007a; font-size: 0.875rem; }
  .db-logout-btn { display: none; background: #00007a; color: #fff; border: none; padding: 0.5rem; border-radius: 0.5rem; cursor: pointer; transition: opacity 0.2s; align-items: center; justify-content: center; }
  @media (min-width: 640px) { .db-logout-btn { display: flex; } }
  .db-logout-btn:hover { opacity: 0.9; }
  .db-logout-btn .material-symbols-outlined { font-size: 0.875rem; }

  /* ── MAIN GRID ── */
  .db-main { max-width: 1280px; margin: 0 auto; padding: 2rem 1rem; display: grid; gap: 2rem; grid-template-columns: 1fr; }
  @media (min-width: 1024px) { .db-main { grid-template-columns: 8fr 4fr; } }

  /* ── CARDS ── */
  .db-card { background: #fff; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .db-section { display: flex; flex-direction: column; gap: 1rem; }

  /* Profile Card */
  .db-profile-card { padding: 1.5rem; }
  .db-profile-inner { display: flex; flex-direction: column; gap: 1.5rem; align-items: flex-start; justify-content: space-between; }
  @media (min-width: 768px) { .db-profile-inner { flex-direction: row; align-items: center; } }
  .db-profile-left { display: flex; align-items: center; gap: 1.5rem; }
  .db-profile-pic { width: 6rem; height: 6rem; border-radius: 1rem; background: rgba(0,0,122,0.1); background-size: cover; background-position: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; color: #00007a; }
  .db-profile-name { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
  .db-profile-info { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.25rem; }
  .db-profile-info-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #475569; }
  .db-profile-info-item .material-symbols-outlined { font-size: 0.875rem; }
  .db-badge { display: inline-flex; align-items: center; margin-top: 0.5rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; background: rgba(0,0,122,0.1); color: #00007a; border: 1px solid rgba(0,0,122,0.2); }
  .db-edit-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #fff; font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.2s; }
  .db-edit-btn:hover { background: #f8fafc; }
  .db-edit-btn .material-symbols-outlined { font-size: 0.875rem; }

  /* Section headers */
  .db-section-header { display: flex; align-items: center; justify-content: space-between; padding: 0 0.5rem; }
  .db-section-title { font-size: 1.125rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
  .db-section-title .material-symbols-outlined { color: #00007a; }
  .db-section-link { font-size: 0.875rem; font-weight: 600; color: #00007a; text-decoration: none; }
  .db-section-link:hover { text-decoration: underline; }

  /* Table */
  .db-table-wrap { overflow-x: auto; }
  table { width: 100%; text-align: left; border-collapse: collapse; }
  thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  thead th { padding: 1rem 1.5rem; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
  thead th.center { text-align: center; }
  thead th.right  { text-align: right; }
  tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: rgba(248,250,252,0.5); }
  tbody td { padding: 1rem 1.5rem; vertical-align: middle; }
  .db-td-title { font-weight: 600; font-size: 0.9375rem; color: #0f172a; line-height: 1.3; }
  .db-td-sub   { font-size: 0.75rem; color: #64748b; margin-top: 0.2rem; }
  .db-td-date  { font-size: 0.875rem; color: #475569; white-space: nowrap; }
  .db-td-center { text-align: center; }
  .db-td-right  { text-align: right; }

  .db-status { display: inline-flex; align-items: center; padding: 0.25rem 0.875rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; line-height: 1.4; white-space: nowrap; }
  .db-status-blue   { background: #00007a; color: #fff; }
  .db-status-green  { background: #10b981; color: #fff; }
  .db-status-gray   { background: #e2e8f0; color: #334155; }
  .db-status-red    { background: #ef4444; color: #fff; }
  .db-status-orange { background: #f59e0b; color: #fff; }

  .db-view-btn { padding: 0.5rem; background: none; border: none; cursor: pointer; color: #94a3b8; border-radius: 0.375rem; transition: color 0.2s, background 0.15s; }
  .db-view-btn:hover { color: #00007a; background: rgba(0,0,122,0.06); }
  .db-view-btn .material-symbols-outlined { font-size: 1.375rem; display: block; }

  .db-table-state { padding: 3rem; text-align: center; color: #94a3b8; font-size: 0.875rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .db-table-state .material-symbols-outlined { font-size: 2.5rem; color: #cbd5e1; }
  @keyframes db-spin { to { transform: rotate(360deg); } }
  .db-spin { animation: db-spin 0.8s linear infinite; color: #00007a; font-size: 1.75rem !important; }

  /* ── CANDIDATURES CARDS ── */
  .db-apps-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .db-app-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.125rem 1.25rem; display: flex; align-items: center; gap: 1rem; transition: box-shadow 0.2s, border-color 0.2s; cursor: default; position: relative; overflow: hidden; }
  .db-app-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 0 2px 2px 0; background: #00007a; opacity: 0; transition: opacity 0.2s; }
  .db-app-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: rgba(0,0,122,0.2); }
  .db-app-card:hover::before { opacity: 1; }
  .db-app-num { width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; flex-shrink: 0; background: rgba(0,0,122,0.07); color: #00007a; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; letter-spacing: -0.02em; }
  .db-app-body { flex: 1; min-width: 0; }
  .db-app-title { font-size: 0.9375rem; font-weight: 700; color: #0f172a; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .db-app-sub { font-size: 0.75rem; color: #64748b; margin-top: 0.2rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .db-app-sub-item { display: flex; align-items: center; gap: 0.25rem; }
  .db-app-sub-item .material-symbols-outlined { font-size: 0.75rem; color: #94a3b8; }
  .db-app-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
  .db-app-pill { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3125rem 0.75rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; white-space: nowrap; line-height: 1; }
  .db-app-pill-dot { width: 0.375rem; height: 0.375rem; border-radius: 9999px; flex-shrink: 0; }
  .db-app-action { width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: #fff; color: #94a3b8; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
  .db-app-action:hover { color: #00007a; border-color: rgba(0,0,122,0.25); background: rgba(0,0,122,0.05); }
  .db-app-action .material-symbols-outlined { font-size: 1rem; }

  /* Recommendation cards */
  .db-rec-nav { display: flex; gap: 0.5rem; }
  .db-rec-nav-btn { padding: 0.5rem; border-radius: 9999px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; transition: background 0.2s; line-height: 1; }
  .db-rec-nav-btn:hover { background: #f8fafc; }
  .db-rec-nav-btn .material-symbols-outlined { font-size: 0.875rem; display: block; }
  .db-rec-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
  @media (min-width: 768px) { .db-rec-grid { grid-template-columns: 1fr 1fr; } }
  .db-rec-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; transition: box-shadow 0.2s; cursor: pointer; }
  .db-rec-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .db-rec-card:hover .db-rec-title { color: #00007a; }
  .db-rec-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.75rem; }
  .db-rec-icon { padding: 0.5rem; background: #eff6ff; border-radius: 0.5rem; color: #00007a; }
  .db-rec-icon .material-symbols-outlined { font-size: 1.5rem; display: block; }
  .db-rec-match { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; background: #f8fafc; padding: 0.25rem 0.5rem; border-radius: 0.25rem; }
  .db-rec-title { font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; transition: color 0.2s; }
  .db-rec-desc { font-size: 0.875rem; color: #64748b; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .db-rec-footer { display: flex; align-items: center; justify-content: space-between; }
  .db-rec-location { font-size: 0.75rem; font-weight: 500; color: #94a3b8; display: flex; align-items: center; gap: 0.25rem; }
  .db-rec-location .material-symbols-outlined { font-size: 0.75rem; }
  .db-rec-apply { font-size: 0.875rem; font-weight: 700; color: #00007a; background: none; border: none; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.25rem; transition: gap 0.2s; }
  .db-rec-apply:hover { gap: 0.5rem; }
  .db-rec-apply .material-symbols-outlined { font-size: 0.875rem; }

  /* ── SIDEBAR ── */
  .db-sidebar { display: flex; flex-direction: column; gap: 1.5rem; }
  .db-notif-card { overflow: hidden; }
  .db-notif-header { padding: 1rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
  .db-notif-title { font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
  .db-notif-title .material-symbols-outlined { color: #00007a; }
  .db-notif-count { background: #00007a; color: #fff; font-size: 0.625rem; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
  .db-notif-item { padding: 1rem; border-bottom: 1px solid #f1f5f9; display: flex; gap: 0.75rem; transition: background 0.15s; cursor: pointer; }
  .db-notif-item.unread { background: rgba(0,0,122,0.03); }
  .db-notif-item:hover { background: rgba(0,0,122,0.06); }
  .db-notif-item.read { opacity: 0.6; }
  .db-notif-item.read:hover { background: #f8fafc; opacity: 1; }
  .db-notif-icon { width: 2rem; height: 2rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
  .db-notif-icon .material-symbols-outlined { font-size: 0.875rem; }
  .db-notif-icon.blue   { background: #003d7a; }
  .db-notif-icon.green  { background: #10b981; }
  .db-notif-icon.yellow { background: #f59e0b; }
  .db-notif-icon.red    { background: #ef4444; }
  .db-notif-icon.purple { background: #7c3aed; }
  .db-notif-icon.gray   { background: #cbd5e1; color: #64748b; }
  .db-notif-text p:first-child { font-size: 0.875rem; font-weight: 700; }
  .db-notif-text p:nth-child(2) { font-size: 0.75rem; color: #475569; margin-top: 0.25rem; }
  .db-notif-text p:last-child { font-size: 0.625rem; color: #94a3b8; margin-top: 0.5rem; }

  /* Skeleton notif (chargement) */
  .db-notif-skeleton { padding: 1rem; border-bottom: 1px solid #f1f5f9; display: flex; gap: 0.75rem; }
  .db-sk { background: #f1f5f9; border-radius: 0.375rem; animation: db-sk 1.5s ease-in-out infinite; }
  .db-sk-circle { width: 2rem; height: 2rem; border-radius: 9999px; flex-shrink: 0; background: #f1f5f9; animation: db-sk 1.5s ease-in-out infinite; }
  @keyframes db-sk { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

  .db-notif-empty { padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.875rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .db-notif-empty .material-symbols-outlined { font-size: 2rem; color: #cbd5e1; }
  .db-mark-all-btn { width: 100%; padding: 0.75rem; font-size: 0.75rem; font-weight: 700; color: #64748b; background: #f8fafc; border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.1em; font-family: 'Public Sans', sans-serif; transition: color 0.2s; }
  .db-mark-all-btn:hover { color: #00007a; }
  .db-mark-all-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Progress card */
  .db-progress-card { background: linear-gradient(135deg, #00007a, #1e3a8a); border-radius: 0.75rem; padding: 1.5rem; color: #fff; box-shadow: 0 10px 25px rgba(0,0,122,0.3); }
  .db-progress-title { font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
  .db-progress-steps { display: flex; flex-direction: column; }
  .db-progress-step { display: flex; align-items: center; gap: 0.75rem; }
  .db-progress-connector { width: 2px; height: 2rem; background: rgba(255,255,255,0.2); margin-left: 0.6875rem; }
  .db-step-num { width: 1.5rem; height: 1.5rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; font-weight: 700; flex-shrink: 0; border: 2px solid; }
  .db-step-num.done    { border-color: #fff; background: #fff; color: #00007a; }
  .db-step-num.active  { border-color: #fff; background: transparent; color: #fff; animation: pulse-border 1.5s ease-in-out infinite; box-shadow: 0 0 10px rgba(255,255,255,0.6); }
  @keyframes pulse-border { 0%,100% { box-shadow: 0 0 0 rgba(255,255,255,0.4); } 50% { box-shadow: 0 0 12px rgba(255,255,255,0.8); } }
  .db-step-num.pending { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.4); }
  .db-step-label { font-size: 0.75rem; font-weight: 500; }
  .db-step-label.active  { font-weight: 700; }
  .db-step-label.pending { color: rgba(255,255,255,0.5); }
  .db-prep-btn { width: 100%; margin-top: 1.5rem; padding: 0.5rem; background: #fff; color: #00007a; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.2s; }
  .db-prep-btn:hover { background: #eff6ff; }
`;





const CandidatDashboard = () => {
  const [user,    setUser]    = useState(null);
  const [profil,  setprofil]  = useState(null);
  const navigate = useNavigate();

  // ── Notifications temps réel ──────────────────────────────────────────
  const {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    loading: notifLoading,
  } = useNotif() ?? { notifications: [], unreadCount: 0, markAllRead: () => {}, markRead: () => {}, loading: false };

  useEffect(() => {
    axios.get('/api/auth/whoami').then(r => setUser(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    axios.get('/api/profil/me').then(r => setprofil(r.data)).catch(() => {});
  }, []);

  const [applications, setApplications] = useState([]);
  const [loadingApps,  setLoadingApps]  = useState(true);
  const [errorApps,    setErrorApps]    = useState(null);

  useEffect(() => {
    axios.get('/api/candidatures/mes')
      .then(r => setApplications(r.data))
      .catch(() => setErrorApps('Impossible de charger vos candidatures.'))
      .finally(() => setLoadingApps(false));
  }, []);


  const userName       = user?.name        || '—';
  const userEmail      = user?.email       || '—';
  const userPhone      = user?.phoneNumber || null;
  const userPhoto      = user?.photoUrl    || user?.photo_url || '';
  const userSpecialite = profil?.specialite;
  const useruniversite = profil?.universite;
  const initiales      = (userName[0] || '?').toUpperCase();

  // Notifications affichées : max 5 dans le panel
  const visibleNotifs = notifications.slice(0, 5);

  return (
    <>
      <style>{styles}</style>
      <div className="db-root">
        <main className="db-main">

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Profile card */}
            <div className="db-card db-profile-card">
              <div className="db-profile-inner">
                <div className="db-profile-left">
                  <div className="db-profile-pic" style={{ backgroundImage: userPhoto ? `url('${userPhoto}')` : 'none' }}>
                    {!userPhoto && initiales}
                  </div>
                  <div>
                    <p className="db-profile-name">{userName}</p>
                    <div className="db-profile-info">
                      <span className="db-profile-info-item">
                        <span className="material-symbols-outlined">mail</span> {userEmail}
                      </span>
                      {userPhone && (
                        <span className="db-profile-info-item">
                          <span className="material-symbols-outlined">phone</span> +216 {userPhone}
                        </span>
                      )}
                      {useruniversite && (
                        <span className="db-profile-info-item">
                          <span className="material-symbols-outlined">school</span> {useruniversite}
                        </span>
                      )}
                      <span className="db-badge">{userSpecialite}</span>
                    </div>
                  </div>
                </div>
                <button className="db-edit-btn" onClick={() => navigate('/candidat/profil')}>
                  <span className="material-symbols-outlined">edit</span> Modifier le profil
                </button>
              </div>
            </div>

            {/* Candidatures */}
            <div className="db-section">
              <div className="db-section-header">
                <h3 className="db-section-title">
                  <span className="material-symbols-outlined">description</span>
                  Mes candidatures
                  {!loadingApps && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                      ({applications.length} / 3)
                    </span>
                  )}
                </h3>
                <a href="/candidat/candidatures" className="db-section-link">Voir tout</a>
              </div>

              <div className="db-card">
                {loadingApps && (
                  <div className="db-table-state">
                    <span className="material-symbols-outlined db-spin">progress_activity</span>
                    <p>Chargement de vos candidatures...</p>
                  </div>
                )}
                {!loadingApps && errorApps && (
                  <div className="db-table-state">
                    <span className="material-symbols-outlined">error_outline</span>
                    <p>{errorApps}</p>
                  </div>
                )}
                {!loadingApps && !errorApps && applications.length === 0 && (
                  <div className="db-table-state">
                    <span className="material-symbols-outlined">inbox</span>
                    <p>Vous n'avez encore postulé à aucune offre.</p>
                  </div>
                )}
                {!loadingApps && !errorApps && applications.length > 0 && (
                  <div style={{ padding: '1rem' }}>
                    <div className="db-apps-list">
                      {applications.map((app, idx) => {
                        const colorMap = {
                          EN_COURS_EXAMEN:    { border: '#003d7a', pill: 'rgba(0,61,122,0.08)',   text: '#003d7a', dot: '#003d7a' },
                          ENTRETIEN_PLANIFIE: { border: '#d97706', pill: 'rgba(245,158,11,0.1)',  text: '#d97706', dot: '#d97706' },
                          ACCEPTE_QUIZ:       { border: '#7c3aed', pill: 'rgba(124,58,237,0.08)', text: '#7c3aed', dot: '#7c3aed' },
                          ACCEPTE:            { border: '#059669', pill: 'rgba(5,150,105,0.1)',   text: '#059669', dot: '#059669' },
                          REFUSE:             { border: '#dc2626', pill: 'rgba(220,38,38,0.08)',  text: '#dc2626', dot: '#dc2626' },
                          PRESELECTIONNE_CV:  { border: '#059669', pill: 'rgba(25,65,17,0.08)',   text: '#059669', dot: '#059669' },
                          ELIMINE_CV:         { border: '#dc2626', pill: 'rgba(220,38,38,0.08)',  text: '#dc2626', dot: '#dc2626' },
                          ELIMINE_QUIZ:       { border: '#dc2626', pill: 'rgba(220,38,38,0.08)',  text: '#dc2626', dot: '#dc2626' },
                        };
                        const c = colorMap[app.statut] || { border: '#94a3b8', pill: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
                        const labelMap = {
                          EN_ATTENTE:         'En attente',
                          EN_COURS_EXAMEN:    "En cours d'examen",
                          ENTRETIEN_PLANIFIE: 'Entretien planifié',
                          ACCEPTE_QUIZ:       'Quiz technique',
                          ACCEPTE:            'Accepté',
                          REFUSE:             'Refusé',
                          PRESELECTIONNE_CV:  'Présélectionné',
                          ELIMINE_CV:         'Non retenu (CV)',
                          ELIMINE_QUIZ:       'Non retenu (Quiz)',
                        };
                        const label = app.statutLabel || labelMap[app.statut] || app.statut || '—';
                        return (
                          <div key={app.id} className="db-app-card"
                            style={{ borderLeftColor: c.border, borderLeftWidth: '3px', opacity: app.statut === 'REFUSE' ? 0.8 : 1 }}>
                            <div className="db-app-num" style={{ background: c.pill, color: c.text }}>#{idx + 1}</div>
                            <div className="db-app-body">
  <p
    className="db-app-title"
    style={{
      margin: 0,
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "break-word",
      lineHeight: "1.4"
    }}
  >
    {app.sujetTitre}
  </p>

  <div className="db-app-sub">
    {app.sujetDepartement && (
      <span className="db-app-sub-item">
        <span className="material-symbols-outlined">
          corporate_fare
        </span>
        {app.sujetDepartement}
      </span>
    )}

    <span className="db-app-sub-item">
      <span className="material-symbols-outlined">
        calendar_today
      </span>
      {app.dateDepot || "—"}
    </span>
  </div>
</div>
                            <div className="db-app-right">
                              <span className="db-app-pill" style={{ background: c.pill, color: c.text }}>
                                <span className="db-app-pill-dot" style={{ background: c.dot }}/>
                                {label}
                              </span>
                              <button className="db-app-action" title="Voir les détails"
                                onClick={() => navigate(`/candidat/candidatures/${app.id}`)}>
                                <span className="material-symbols-outlined">chevron_right</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          
          </div>

          {/* ── SIDEBAR ── */}
          <aside className="db-sidebar">

            {/* ── Panel notifications — données réelles ── */}
            <div className="db-card db-notif-card">
              <div className="db-notif-header">
                <h3 className="db-notif-title">
                  <span className="material-symbols-outlined">notifications_active</span> Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="db-notif-count">{unreadCount} Nouvelle{unreadCount > 1 ? 's' : ''}</span>
                )}
              </div>

              {/* Chargement */}
              {notifLoading && (
                <>
                  {[1,2,3].map(i => (
                    <div key={i} className="db-notif-skeleton">
                      <div className="db-sk-circle"/>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:'0.375rem'}}>
                        <div className="db-sk" style={{height:'0.75rem',width:'60%'}}/>
                        <div className="db-sk" style={{height:'0.625rem',width:'90%'}}/>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Vide */}
              {!notifLoading && visibleNotifs.length === 0 && (
                <div className="db-notif-empty">
                  <span className="material-symbols-outlined">notifications_off</span>
                  <p>Aucune notification pour le moment.</p>
                </div>
              )}

              {/* Liste */}
              {!notifLoading && visibleNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`db-notif-item ${n.lu ? 'read' : 'unread'}`}
                  onClick={() => !n.lu && markRead(n.id)}
                >
                  <div className={`db-notif-icon ${n.iconClass}`}>
                    <span className="material-symbols-outlined">{n.icon}</span>
                  </div>
                  <div className="db-notif-text">
                    <p>{n.titre}</p>
                    <p>{n.message}</p>
                    <p>{n.timeLabel}</p>
                  </div>
                </div>
              ))}

              <button
                className="db-mark-all-btn"
                onClick={markAllRead}
                disabled={unreadCount === 0}
              >
                Tout marquer comme lu
              </button>
            </div>

            

          </aside>
        </main>
      </div>
    </>
  );
};

export default CandidatDashboard;