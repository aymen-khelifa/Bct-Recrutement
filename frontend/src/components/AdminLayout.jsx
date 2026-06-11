import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import ChatbotWidget from './ChatbotWidget';
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .adm-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .adm-root { font-family: 'Public Sans', sans-serif; background: #f1f5f9; color: #0f172a; display: flex; height: 100vh; overflow: hidden; }
  .adm-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }

  /* ── SIDEBAR ── */
  .adm-aside {
    width: 18rem; background: #001b3d; color: #fff;
    display: flex; flex-direction: column; flex-shrink: 0; height: 100vh;
    position: sticky; top: 0;
  }
  .adm-aside-brand {
    padding: 1.5rem; display: flex; align-items: center; gap: 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .adm-aside-brand .material-symbols-outlined { font-size: 1.875rem; }
  .adm-aside-brand h1 { font-size: 1.125rem; font-weight: 700; line-height: 1.2; }
  .adm-aside-brand p { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.6); font-weight: 600; }

  .adm-nav { flex: 1; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .adm-nav-link {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 1rem; border-radius: 0.5rem;
    color: rgba(255,255,255,0.75); text-decoration: none; font-size: 0.875rem; font-weight: 500;
    transition: background 0.15s, color 0.15s; border-left: 4px solid transparent;
  }
  .adm-nav-link:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .adm-nav-link.active {
    background: rgba(255,255,255,0.15); color: #fff; font-weight: 600;
    border-left-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .adm-nav-link .material-symbols-outlined { font-size: 1.25rem; flex-shrink: 0; }

  .adm-aside-user {
    padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);
    display: flex; align-items: center; gap: 0.75rem;
  }
  .adm-aside-user-info { overflow: hidden; flex: 1; }
  .adm-aside-user-info p:first-child { font-size: 0.875rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .adm-aside-user-info p:last-child { font-size: 0.75rem; color: rgba(255,255,255,0.6); }
  .adm-logout-btn {
    background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.5);
    padding: 0.25rem; border-radius: 0.25rem; transition: color 0.2s; line-height: 1;
    font-family: 'Public Sans', sans-serif;
  }
  .adm-logout-btn:hover { color: #fff; }
  .adm-logout-btn .material-symbols-outlined { font-size: 1.25rem; display: block; }

  /* ── MAIN AREA ── */
  .adm-main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .adm-content { flex: 1; overflow-y: auto; padding: 2rem; }
  .adm-content::-webkit-scrollbar { width: 4px; }
  .adm-content::-webkit-scrollbar-track { background: #f1f5f9; }
  .adm-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

const navItems = [
  { to: '/admin', icon: 'dashboard', label: 'Tableau de bord', end: true },
  { to: '/admin/utilisateurs', icon: 'group', label: 'Utilisateurs' },
  { to: '/admin/candidats', icon: 'badge', label: 'Candidatures' },
  { to: '/admin/sujets', icon: 'description', label: 'Sujets de Stage' },
  { to: '/admin/calendrier', icon: 'video_chat', label: 'Entretiens' },
];

const AdminLayout = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="adm-root">

        {/* ── SIDEBAR ── */}
        <aside className="adm-aside">
          <div className="adm-aside-brand">
            <span className="material-symbols-outlined">admin_panel_settings</span>
            <div>
              <h1>Banque Centrale</h1>
              <p>Administration</p>
            </div>
          </div>

          <nav className="adm-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="adm-aside-user">
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
                {(user?.name?.[0] || 'A').toUpperCase()}
              </div>
            )}
            <div className="adm-aside-user-info">
              <p>{user?.name || user?.email}</p>
              <p>Administrateur</p>
            </div>
            <button className="adm-logout-btn" onClick={handleLogout}>
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="adm-main">
          <div className="adm-content">
            <Outlet />
          </div>
        </main>

      </div>
       <ChatbotWidget />
    </>
  );
};

export default AdminLayout;