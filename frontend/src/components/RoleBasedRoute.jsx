import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // ✅ TANT QUE LE CHARGEMENT N'EST PAS FINI → ne rien afficher
  // (évite que la page apparaisse une fraction de seconde avant la redirection)
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        fontFamily: 'Public Sans, sans-serif',
        color: '#003d7a',
        fontWeight: 600,
      }}>
        Chargement...
      </div>
    );
  }

  // ✅ Pas connecté → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Connecté mais mauvais rôle → page non autorisée
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Tout est bon → afficher la page
  return children;
};

export default RoleBasedRoute;