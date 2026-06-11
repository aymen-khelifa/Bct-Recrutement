import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import bctImage from '../assets/bct.png';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .db-header {
    background: #fff; border-bottom: 1px solid #e2e8f0;
    font-family: 'Public Sans', sans-serif;
  }
  @media (min-width: 1024px) { .db-header { padding: 0rem 0rem; } }
  .db-header-inner {
    max-width: 1280px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
  }
  .db-brand { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; }
  .db-brand svg { width: 2rem; height: 2rem; color: #00007a; flex-shrink: 0; }
  .db-brand h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.025em; color: #00007a; text-transform: uppercase; }
  .db-nav { display: none; }
  @media (min-width: 768px) { .db-nav { display: flex; align-items: center; gap: 2rem; } }
  .db-nav a {
    font-size: 0.875rem; font-weight: 500; color: #475569;
    text-decoration: none; transition: color 0.2s; padding-bottom: 0.25rem;
  }
  .db-nav a:hover { color: #00007a; }
  .db-nav a.active { font-weight: 700; color: #00007a; border-bottom: 2px solid #00007a; }
  .db-header-actions { display: flex; align-items: center; gap: 1rem; }
  .db-notif-btn {
    position: relative; padding: 0.5rem; background: none; border: none;
    color: #475569; border-radius: 9999px; cursor: pointer; transition: background 0.2s;
  }
  .db-notif-btn:hover { background: #f1f5f9; }
  .db-notif-btn .material-symbols-outlined { font-size: 1.5rem; display: block; }
  .db-notif-badge { position: absolute; top: 0.5rem; right: 0.5rem; width: 0.5rem; height: 0.5rem; }
  .db-notif-ping {
    position: absolute; width: 100%; height: 100%; border-radius: 9999px;
    background: #f87171; opacity: 0.75;
    animation: ping 1s cubic-bezier(0,0,0.2,1) infinite;
  }
  @keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }
  .db-notif-dot { position: relative; width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: #ef4444; }
  .db-divider { width: 1px; height: 2rem; background: #e2e8f0; margin: 0 0.5rem; }
  .db-user-info { display: none; text-align: right; }
  @media (min-width: 640px) { .db-user-info { display: block; } }
  .db-user-info p:first-child { font-size: 0.875rem; font-weight: 700; line-height: 1; }
  .db-user-info p:last-child { font-size: 0.75rem; color: #64748b; }
  .db-avatar {
    width: 2.5rem; height: 2.5rem; border-radius: 9999px;
    background: rgba(0,0,122,0.1); border: 1px solid rgba(0,0,122,0.2);
    background-size: cover; background-position: center; overflow: hidden;
    flex-shrink: 0;
  }
  .db-logout-btn {
    display: none; background: #00007a; color: #fff; border: none;
    padding: 0.5rem; border-radius: 0.5rem; cursor: pointer; transition: opacity 0.2s;
    align-items: center; justify-content: center;
  }
  @media (min-width: 640px) { .db-logout-btn { display: flex; } }
  .db-logout-btn:hover { opacity: 0.9; }
  .db-logout-btn .material-symbols-outlined { font-size: 0.875rem; }
`;

const navItems = [
  { to: '/candidat',              end: true,  label: 'Accueil'          },
  { to: '/candidat/offres',       end: false, label: 'Offres'           },
  { to: '/candidat/candidatures', end: false, label: 'Mes candidatures' },
  { to: '/candidat/profil',       end: false, label: 'Mon profil'       },
];

const Navbar = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  };

  // URL Cloudinary déjà absolue (https://res.cloudinary.com/...)
  // plus besoin d'ajouter '/' devant
  const avatarStyle = user?.photoUrl
    ? { backgroundImage: `url('${user.photoUrl}')` }
    : {};

  return (
    <>
      <style>{styles}</style>
      <header className="db-header">
        <div className="db-header-inner">

          <Link to="/candidat">
            <img src={bctImage} style={{ width: '240px', marginBottom: '15px' }} alt="BCT" />
          </Link>

          <nav className="db-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `db-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="db-header-actions">
            <button className="db-notif-btn" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
              <span className="db-notif-badge">
                <span className="db-notif-ping"></span>
                <span className="db-notif-dot"></span>
              </span>
            </button>
            <div className="db-divider"></div>
            <div className="db-user-info">
              <p>{user?.name ?? 'Candidat'}</p>
              <p>Candidat</p>
            </div>

            {/* ── Avatar — URL Cloudinary directe ── */}
            <div className="db-avatar" style={avatarStyle} />

            <button className="db-logout-btn" onClick={handleLogout} aria-label="Se déconnecter">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>

        </div>
      </header>
    </>
  );
};

export default Navbar;