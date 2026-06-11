import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import axios from 'axios';

const VerifyOtpRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed,  setAllowed]  = useState(false);

  const emailParam = new URLSearchParams(location.search).get('email');

  useEffect(() => {
    const check = async () => {
      // Pas d'email dans l'URL → refuser
      if (!emailParam) {
        setAllowed(false);
        setChecking(false);
        return;
      }

      try {
        // Appel backend pour vérifier si cet email existe et n'est pas encore activé
        const { data } = await axios.get(
          `/api/auth/check-enabled?email=${encodeURIComponent(emailParam)}`
        );
        // data.enabled === false → autoriser la page
        setAllowed(data.enabled === false);
      } catch {
        // Email introuvable → refuser
        setAllowed(false);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [emailParam]);

  if (loading || checking) return <div>Chargement...</div>;

  // User connecté et activé → unauthorized
  if (user && user.enabled === true) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Email non autorisé → unauthorized
  if (!allowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default VerifyOtpRoute;