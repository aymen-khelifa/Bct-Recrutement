import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

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

  if (user) {
    // Rediriger selon le rôle
     if (user.role === 'ROLE_ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'ROLE_CANDIDAT') {
      return <Navigate to="/candidat" replace />;
    }
    if (user.role === 'ROLE_RH') {
      return <Navigate to="/rh" replace />;
    }
    // Fallback (si rôle inconnu)
    return <Navigate to="/" replace />;
  }

  // Utilisateur non connecté → accès autorisé
  return children;
};

export default PublicRoute;