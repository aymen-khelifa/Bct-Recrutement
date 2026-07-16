/* eslint-disable react-refresh/only-export-components */
// cspell:ignore Notif notif

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
//  Mapping type → icône + couleur
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_STYLES = {
  PRESELECTIONNE_CV:  { icon: 'verified',    iconClass: 'green'  },
  ACCEPTE_QUIZ:       { icon: 'quiz',         iconClass: 'purple' },
  ELIMINE_CV:         { icon: 'cancel',       iconClass: 'red'    },
  ELIMINE_QUIZ:       { icon: 'cancel',       iconClass: 'red'    },
  ENTRETIEN_PLANIFIE: { icon: 'event',        iconClass: 'yellow' },
  ENTRETIEN_REPROG:   { icon: 'event_repeat', iconClass: 'yellow' },
  ACCEPTE:            { icon: 'task_alt',     iconClass: 'green'  },
  REFUSE:             { icon: 'cancel',       iconClass: 'red'    },
  STATUT_CHANGE:      { icon: 'update',       iconClass: 'blue'   },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Formatage date relative
// ─────────────────────────────────────────────────────────────────────────────
const formatTime = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m <  1)  return "À l'instant";
  if (m < 60)  return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Il y a ${h}h`;
  if (h < 48)  return 'Hier';
  return `Il y a ${Math.floor(h / 24)} jours`;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Valeur par défaut du context
//  → évite le type "null" inféré par l'IDE et supprime le useNotif ?? {...}
// ─────────────────────────────────────────────────────────────────────────────
const defaultContext = {
  notifications: [],
  unreadCount:   0,
  loading:       false,
  markAllRead:   async () => {},
  markRead:      async () => {},
};

const NotifContext = createContext(defaultContext);

// ─────────────────────────────────────────────────────────────────────────────
//  Provider
// ─────────────────────────────────────────────────────────────────────────────
export const NotifProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const esRef = useRef(null);

  const enrich = (n) => ({
    ...n,
    ...(NOTIF_STYLES[n.type] || { icon: 'notifications', iconClass: 'gray' }),
    timeLabel: formatTime(n.createdAt),
  });

  const fetchAll = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/notifications');
      const enriched = data.map(enrich);
      setNotifications(enriched);
      setUnreadCount(enriched.filter(n => !n.lu).length);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await axios.post('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
      setUnreadCount(0);
    } catch { /* silently fail */ }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await axios.post(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchAll();

    const es = new EventSource('/api/notifications/stream', { withCredentials: true });
    esRef.current = es;

    es.addEventListener('notification', (e) => {
      try {
        const raw      = JSON.parse(e.data);
        const enriched = enrich(raw);
        setNotifications(prev => [enriched, ...prev]);
        setUnreadCount(prev => prev + 1);
      } catch { /* parse error silently ignored */ }
    });

    es.onerror = () => {
      es.close();
      setTimeout(() => fetchAll(), 8000);
    };

    return () => es.close();
  }, [fetchAll]);

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, loading }}>
      {children}
    </NotifContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────────────────────
export const useNotif = () => useContext(NotifContext);