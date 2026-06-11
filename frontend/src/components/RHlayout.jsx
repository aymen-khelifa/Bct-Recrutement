import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import ChatbotWidget from './ChatbotWidget';
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .rh-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .rh-root { font-family: 'Public Sans', sans-serif; background: #f1f5f9; color: #0f172a; display: flex; height: 100vh; overflow: hidden; }
  .rh-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }

  /* ── SIDEBAR ── */
  .rh-aside {
    width: 18rem; background: #002b57; color: #fff;
    display: flex; flex-direction: column; flex-shrink: 0; height: 100vh;
    position: sticky; top: 0;
  }
  .rh-aside-brand {
    padding: 1.5rem; display: flex; align-items: center; gap: 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .rh-aside-brand .material-symbols-outlined { font-size: 1.875rem; }
  .rh-aside-brand h1 { font-size: 1.125rem; font-weight: 700; line-height: 1.2; }
  .rh-aside-brand p { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.6); font-weight: 600; }

  .rh-nav { flex: 1; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .rh-nav-link {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 1rem; border-radius: 0.5rem;
    color: rgba(255,255,255,0.75); text-decoration: none; font-size: 0.875rem; font-weight: 500;
    transition: background 0.15s, color 0.15s; border-left: 4px solid transparent;
  }
  .rh-nav-link:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .rh-nav-link.active {
    background: rgba(255,255,255,0.15); color: #fff; font-weight: 600;
    border-left-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .rh-nav-link .material-symbols-outlined { font-size: 1.25rem; flex-shrink: 0; }

  .rh-aside-user {
    padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);
    display: flex; align-items: center; gap: 0.75rem;
  }
  .rh-aside-user img { width: 2.5rem; height: 2.5rem; border-radius: 9999px; border: 2px solid rgba(255,255,255,0.2); object-fit: cover; flex-shrink: 0; }
  .rh-aside-user-info { overflow: hidden; flex: 1; }
  .rh-aside-user-info p:first-child { font-size: 0.875rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rh-aside-user-info p:last-child { font-size: 0.75rem; color: rgba(255,255,255,0.6); }
  .rh-logout-btn {
    background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.5);
    padding: 0.25rem; border-radius: 0.25rem; transition: color 0.2s; line-height: 1;
    font-family: 'Public Sans', sans-serif;
  }
  .rh-logout-btn:hover { color: #fff; }
  .rh-logout-btn .material-symbols-outlined { font-size: 1.25rem; display: block; }

  /* ── MAIN AREA ── */
  .rh-main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

  .rh-topbar {
    height: 4rem; background: #fff; border-bottom: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 2rem; flex-shrink: 0;
  }
  .rh-search-wrap { position: relative; flex: 1; max-width: 32rem; }
  .rh-search-wrap .material-symbols-outlined { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.25rem; }
  .rh-search {
    width: 100%; padding: 0.5rem 1rem 0.5rem 2.5rem;
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem;
    font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif;
    outline: none; transition: border-color 0.2s;
  }
  .rh-search:focus { border-color: #003d7a; }
  .rh-search::placeholder { color: #94a3b8; }

  .rh-topbar-right { display: flex; align-items: center; gap: 1rem; margin-left: 2rem; }
  .rh-ia-status { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 700; color: #059669; }
  .rh-ia-dot { width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: #10b981; animation: pulse-dot 1.5s ease-in-out infinite; }
  @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .rh-notif-btn {
    position: relative; padding: 0.5rem; background: none; border: none;
    color: #64748b; border-radius: 9999px; cursor: pointer; transition: background 0.2s; line-height: 1;
    font-family: 'Public Sans', sans-serif;
  }
  .rh-notif-btn:hover { background: #f1f5f9; }
  .rh-notif-btn .material-symbols-outlined { font-size: 1.5rem; display: block; }
  .rh-notif-dot { position: absolute; top: 0.375rem; right: 0.375rem; width: 0.5rem; height: 0.5rem; background: #ef4444; border-radius: 9999px; border: 2px solid #fff; }
  .rh-new-btn {
    background: #003d7a; color: #fff; border: none; border-radius: 0.5rem;
    padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 700; cursor: pointer;
    font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.5rem;
    transition: opacity 0.2s;
  }
  .rh-new-btn:hover { opacity: 0.9; }
  .rh-new-btn .material-symbols-outlined { font-size: 1.125rem; }

  /* ── CONTENT ── */
  .rh-content {
    flex: 1; overflow-y: auto; padding: 2rem;
  }
  .rh-content::-webkit-scrollbar { width: 4px; }
  .rh-content::-webkit-scrollbar-track { background: #f1f5f9; }
  .rh-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

const navItems = [
  { to: '/rh', icon: 'dashboard', label: 'Centre de Contrôle', end: true },
  { to: '/rh/candidats', icon: 'group', label: 'Candidatures' },
  { to: '/rh/sujets', icon: 'description', label: 'Sujets de Stage' },
  { to: '/rh/calendrier', icon: 'video_chat', label: 'Entretiens' },
  { to: '/rh/parametres', icon: 'settings', label: 'Paramètres' },
];

const RHLayout = () => {

  const { user } = useAuth();
  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      // Rediriger vers la page de connexion après déconnexion
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  };
  return (
    <>
      <style>{styles}</style>
      <div className="rh-root">

        {/* ── SIDEBAR ── */}
        <aside className="rh-aside">
          {/* Brand */}
          <div className="rh-aside-brand">
            <span className="material-symbols-outlined">account_balance</span>
            <div>
              <h1>Banque Centrale</h1>
              <p>Portail Recrutement RH</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="rh-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `rh-nav-link${isActive ? ' active' : ''}`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
         <div className="rh-aside-user">
  {user?.photoUrl ? (
    <img
      alt="Admin"
      src={`/${user.photoUrl.replace(/^\//, '')}`}
      style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px',
        border: '2px solid rgba(255,255,255,0.2)', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: '2.5rem', height: '2.5rem', borderRadius: '9999px',
      border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.875rem', fontWeight: 700, color: '#fff', flexShrink: 0
    }}>
      {(user?.name?.[0] || '?').toUpperCase()}
    </div>
  )}
  <div className="rh-aside-user-info">
    <p>{user?.name || user?.email}</p>
    <p>{user?.role === 'ROLE_RH' ? 'Responsable RH' : 'Utilisateur'}</p>
  </div>
  <button className="rh-logout-btn" onClick={handleLogout}>
    <span className="material-symbols-outlined">logout</span>
  </button>
</div>
        </aside>

        {/* ── MAIN ── */}
        <main className="rh-main">
        

          {/* Page content — changes with route */}
          <div className="rh-content">
            <Outlet />
          </div>
        </main>

      </div>
       <ChatbotWidget />
    </>
  );
};

export default RHLayout;