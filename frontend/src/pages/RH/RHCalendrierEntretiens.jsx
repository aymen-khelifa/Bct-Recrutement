import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const styles = `
  .cal-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .cal-root { font-family: 'Public Sans', sans-serif; }
  .cal-root .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    vertical-align: middle;
  }
  body { margin: 0; padding: 0; }

  .cal-title { font-size: 2.5rem; font-weight: 900; color: #003d7a; letter-spacing: -0.05em; margin-bottom: 0.375rem; text-transform: uppercase; }
  .cal-title-bar { width: 5rem; height: 0.375rem; background: #003d7a; border-radius: 9999px; margin-bottom: 1.25rem; }
  .cal-subtitle { font-size: 0.9375rem; color: #64748b; margin-bottom: 2rem; font-weight: 500; }

  .cal-topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
  .cal-topbar-left { display: flex; align-items: center; gap: 0.75rem; }
  .cal-stat-mini { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #475569; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .cal-stat-mini .material-symbols-outlined { font-size: 1rem; color: #003d7a; }
  .cal-stat-mini span.num { color: #003d7a; font-size: 1rem; font-weight: 900; }

  .cal-planifier-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.5rem; background: #003d7a; color: #fff; border: none; border-radius: 0.75rem; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; box-shadow: 0 4px 12px rgba(0,61,122,.25); transition: all 0.15s; }
  .cal-planifier-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .cal-planifier-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .cal-planifier-btn .material-symbols-outlined { font-size: 1.125rem; }

  .cal-main { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; }
  @media (max-width: 1024px) { .cal-main { grid-template-columns: 1fr; } }

  /* CALENDRIER */
  .cal-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); overflow: hidden; }
  .cal-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
  .cal-month-label { font-size: 1.125rem; font-weight: 900; color: #003d7a; text-transform: uppercase; letter-spacing: -0.02em; }
  .cal-nav-btn { width: 2rem; height: 2rem; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .cal-nav-btn:hover { background: #f1f5f9; border-color: #003d7a; }
  .cal-nav-btn .material-symbols-outlined { font-size: 1.125rem; color: #475569; }
  .cal-day-headers { display: grid; grid-template-columns: repeat(7, 1fr); background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .cal-day-hdr { padding: 0.625rem; text-align: center; font-size: 0.5625rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; border-right: 1px solid #e2e8f0; }
  .cal-day-hdr:last-child { border-right: none; }
  .cal-day-hdr.weekend { color: #ef4444; }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
  .cal-cell { min-height: 100px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 0.5rem; cursor: pointer; transition: background 0.12s; position: relative; }
  .cal-cell:nth-child(7n) { border-right: none; }
  .cal-cell:hover { background: #f8fafc; }
  .cal-cell.other-month { background: #fafafa; cursor: default; }
  .cal-cell.today { background: rgba(0,61,122,.04); outline: 2px solid #003d7a; outline-offset: -2px; }
  .cal-cell.selected { background: rgba(0,61,122,.07); }
  .cal-cell.weekend-cell { background: #f8fafc; }
  .cal-cell-num { font-size: 0.75rem; font-weight: 700; color: #334155; margin-bottom: 0.25rem; }
  .cal-cell.other-month .cal-cell-num { color: #cbd5e1; }
  .cal-cell.today .cal-cell-num { color: #003d7a; font-weight: 900; }
  .cal-cell.weekend-cell .cal-cell-num { color: #ef4444; }
  .cal-today-label { font-size: 0.4375rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #003d7a; margin-bottom: 0.25rem; }
  .cal-event { font-size: 0.5625rem; font-weight: 600; padding: 0.1875rem 0.375rem; border-radius: 0.25rem; margin-bottom: 0.125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; border-left: 2px solid #003d7a; background: rgba(0,61,122,.08); color: #003d7a; transition: background 0.12s; }
  .cal-event:hover { background: rgba(0,61,122,.16); }
  .cal-event.done { border-left-color: #059669; background: rgba(5,150,105,.08); color: #059669; }
  .cal-event.done:hover { background: rgba(5,150,105,.16); }
  .cal-event-more { font-size: 0.5rem; color: #94a3b8; font-weight: 700; margin-top: 0.125rem; }

  /* DROITE */
  .cal-right { display: flex; flex-direction: column; gap: 1rem; }

  /* AGENDA */
  .cal-agenda { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); overflow: hidden; }
  .cal-agenda-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
  .cal-agenda-eyebrow { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.375rem; }
  .cal-agenda-lbl { font-size: 0.5625rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; }
  .cal-agenda-count { background: rgba(0,61,122,.08); color: #003d7a; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.5625rem; font-weight: 700; }
  .cal-agenda-date { font-size: 1rem; font-weight: 900; color: #0f172a; }
  .cal-agenda-body { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.875rem; max-height: 380px; overflow-y: auto; }
  .cal-agenda-body::-webkit-scrollbar { width: 4px; }
  .cal-agenda-body::-webkit-scrollbar-track { background: transparent; }
  .cal-agenda-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

  .cal-agenda-item { padding: 0.875rem; border: 1px solid #f1f5f9; border-radius: 0.75rem; background: #f8fafc; border-left: 3px solid #003d7a; }
  .cal-agenda-item.past { border-left-color: #e2e8f0; }
  .cal-agenda-item.done { border-left-color: #059669; }
  .cal-agenda-time { font-size: 0.6875rem; font-weight: 700; color: #003d7a; margin-bottom: 0.25rem; }
  .cal-agenda-item.past .cal-agenda-time { color: #94a3b8; }
  .cal-agenda-item.done .cal-agenda-time { color: #059669; }
  .cal-agenda-name { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin-bottom: 0.125rem; }
  .cal-agenda-poste { font-size: 0.6875rem; color: #64748b; font-style: italic; margin-bottom: 0.625rem; }
  .cal-rejoindre-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem; background: #003d7a; color: #fff; border: none; border-radius: 0.5rem; font-size: 0.625rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: opacity 0.15s; text-transform: uppercase; letter-spacing: 0.06em; }
  .cal-rejoindre-btn:hover { opacity: 0.85; }
  .cal-rejoindre-btn .material-symbols-outlined { font-size: 0.875rem; }

  /* ✅ Badge terminé + bouton détail */
  .cal-done-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.625rem; background: rgba(5,150,105,.1); color: #059669; border: 1px solid rgba(5,150,105,.25); border-radius: 9999px; font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
  .cal-done-badge .material-symbols-outlined { font-size: 0.75rem; }
  .cal-done-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .cal-note-chip { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.6875rem; font-weight: 800; color: #003d7a; background: rgba(0,61,122,.06); padding: 0.25rem 0.5rem; border-radius: 0.375rem; }
  .cal-detail-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem; background: #fff; color: #003d7a; border: 1px solid #003d7a; border-radius: 0.5rem; font-size: 0.625rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.06em; }
  .cal-detail-btn:hover { background: #003d7a; color: #fff; }
  .cal-detail-btn .material-symbols-outlined { font-size: 0.875rem; }

  .cal-agenda-empty { padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.875rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .cal-agenda-empty .material-symbols-outlined { font-size: 2.5rem; color: #cbd5e1; }

  /* STATS */
  .cal-stats { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .cal-stats-title { font-size: 0.5625rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; margin-bottom: 1rem; }
  .cal-stat-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.625rem; }
  .cal-stat-lbl { font-size: 0.8125rem; color: #475569; }
  .cal-stat-val { font-size: 0.9375rem; font-weight: 900; color: #003d7a; }
  .cal-stat-val.green { color: #059669; }
  .cal-progress { width: 100%; height: 0.375rem; background: #f1f5f9; border-radius: 9999px; overflow: hidden; margin-top: 0.5rem; margin-bottom: 1rem; }
  .cal-progress-fill { height: 100%; background: #003d7a; border-radius: 9999px; transition: width 0.6s ease; }

  /* LEGENDE */
  .cal-legende { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .cal-legende-title { font-size: 0.5625rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; margin-bottom: 0.875rem; }
  .cal-legende-item { display: flex; align-items: center; gap: 0.625rem; font-size: 0.75rem; color: #475569; font-weight: 600; margin-bottom: 0.5rem; }
  .cal-legende-dot { width: 0.875rem; height: 0.875rem; border-radius: 0.25rem; flex-shrink: 0; }

  /* MODAL DÉTAIL */
  .cal-overlay { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .cal-overlay-bg { position: absolute; inset: 0; background: rgba(15,23,42,.6); backdrop-filter: blur(4px); }
  .cal-modal { position: relative; background: #fff; border-radius: 1rem; width: 100%; max-width: 38rem; max-height: 90vh; box-shadow: 0 25px 60px rgba(0,0,0,.3); overflow: hidden; display: flex; flex-direction: column; }
  .cal-modal-header { background: linear-gradient(135deg, #001b3d, #0056b3); padding: 1.5rem 2rem; flex-shrink: 0; position: relative; }
  .cal-modal-title { font-size: 1.125rem; font-weight: 900; color: #fff; }
  .cal-modal-sub { font-size: 0.8125rem; color: rgba(255,255,255,.65); margin-top: 0.25rem; }
  .cal-modal-close { position: absolute; top: 1.25rem; right: 1.5rem; width: 2rem; height: 2rem; border-radius: 0.5rem; border: none; background: rgba(255,255,255,.15); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .cal-modal-close:hover { background: rgba(255,255,255,.25); }
  .cal-modal-body { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.25rem; overflow-y: auto; }
  .cal-modal-body::-webkit-scrollbar { width: 5px; }
  .cal-modal-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }

  .cal-d-cand { display: flex; align-items: center; gap: 1rem; }
  .cal-d-photo { width: 3.5rem; height: 3.5rem; border-radius: 0.75rem; background: rgba(0,61,122,.08); border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 1.125rem; font-weight: 900; color: #003d7a; flex-shrink: 0; overflow: hidden; }
  .cal-d-photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 0.75rem; }
  .cal-d-cand-name { font-size: 1rem; font-weight: 800; color: #0f172a; }
  .cal-d-cand-mail { font-size: 0.75rem; color: #64748b; }

  .cal-d-note-box { display: flex; align-items: center; gap: 1rem; background: rgba(5,150,105,.06); border: 1px solid rgba(5,150,105,.2); border-radius: 0.875rem; padding: 1.25rem; }
  .cal-d-note-big { font-size: 2.75rem; font-weight: 900; color: #059669; line-height: 1; }
  .cal-d-note-unit { font-size: 1rem; color: #94a3b8; }
  .cal-d-note-txt { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #059669; }

  .cal-d-section { }
  .cal-d-sec-lbl { font-size: 0.5625rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.625rem; display: flex; align-items: center; gap: 0.375rem; }
  .cal-d-sec-lbl .material-symbols-outlined { font-size: 0.875rem; color: #003d7a; }
  .cal-d-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem; }
  .cal-d-field { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 0.625rem; padding: 0.625rem 0.875rem; }
  .cal-d-field-lbl { font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 0.25rem; }
  .cal-d-field-val { font-size: 0.8125rem; font-weight: 600; color: #0f172a; }
  .cal-d-full { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 0.625rem; padding: 0.75rem 0.875rem; }
  .cal-d-notes-rh { background: rgba(0,61,122,.03); border: 1px solid rgba(0,61,122,.12); border-radius: 0.75rem; padding: 1rem; font-size: 0.8125rem; color: #334155; line-height: 1.65; white-space: pre-wrap; }
  .cal-d-notes-empty { color: #94a3b8; font-style: italic; }
  .cal-d-scores { display: flex; gap: 0.625rem; }
  .cal-d-score { flex: 1; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 0.625rem; padding: 0.75rem; text-align: center; }
  .cal-d-score-num { font-size: 1.25rem; font-weight: 900; color: #003d7a; }
  .cal-d-score-num.green { color: #059669; }
  .cal-d-score-lbl { font-size: 0.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-top: 0.25rem; }

  .cal-modal-loading { padding: 3rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #64748b; font-weight: 600; }

  /* ✅ Bouton modifier l'heure */
  .cal-edit-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem; background: #fff; color: #b45309; border: 1px solid #f59e0b; border-radius: 0.5rem; font-size: 0.625rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.06em; }
  .cal-edit-btn:hover { background: #f59e0b; color: #fff; }
  .cal-edit-btn .material-symbols-outlined { font-size: 0.875rem; }

  /* ✅ Popup reprogrammation */
  .cal-resched-modal { position: relative; background: #fff; border-radius: 1rem; width: 100%; max-width: 26rem; box-shadow: 0 25px 60px rgba(0,0,0,.3); overflow: hidden; }
  .cal-resched-header { background: linear-gradient(135deg, #b45309, #f59e0b); padding: 1.5rem 2rem; position: relative; }
  .cal-resched-title { font-size: 1.0625rem; font-weight: 900; color: #fff; }
  .cal-resched-sub { font-size: 0.8125rem; color: rgba(255,255,255,.8); margin-top: 0.25rem; }
  .cal-resched-body { padding: 1.75rem 2rem; display: flex; flex-direction: column; gap: 1rem; }
  .cal-resched-cand { background: rgba(0,61,122,.04); border: 1px solid rgba(0,61,122,.12); border-radius: 0.625rem; padding: 0.75rem 1rem; font-size: 0.8125rem; color: #475569; }
  .cal-resched-cand strong { color: #003d7a; }
  .cal-resched-label { font-size: 0.625rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.375rem; display: block; }
  .cal-resched-input { width: 100%; padding: 0.75rem 0.875rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.625rem; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; outline: none; }
  .cal-resched-input:focus { border-color: #f59e0b; box-shadow: 0 0 0 2px rgba(245,158,11,.15); }
  .cal-resched-note { font-size: 0.75rem; color: #94a3b8; font-style: italic; display: flex; align-items: center; gap: 0.375rem; }
  .cal-resched-note .material-symbols-outlined { font-size: 0.9375rem; color: #f59e0b; }
  .cal-resched-footer { padding: 1.25rem 2rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.75rem; }
  .cal-resched-cancel { padding: 0.625rem 1.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .cal-resched-save { padding: 0.625rem 1.5rem; background: #f59e0b; color: #fff; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.5rem; transition: opacity 0.15s; }
  .cal-resched-save:hover:not(:disabled) { opacity: 0.88; }
  .cal-resched-save:disabled { opacity: 0.5; cursor: not-allowed; }

  /* TOAST */
  @keyframes cal-toast-in { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
  .cal-toast { position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; background: #0f172a; color: #fff; padding: 1rem 1.5rem; border-radius: 0.75rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 600; font-family: 'Public Sans', sans-serif; box-shadow: 0 20px 25px -5px rgba(0,0,0,.3); animation: cal-toast-in 0.3s ease; }
  .cal-toast .material-symbols-outlined { font-size: 1.25rem; }
  .cal-toast.success .material-symbols-outlined { color: #22c55e; }
  .cal-toast.error   .material-symbols-outlined { color: #ef4444; }

  @keyframes cal-spin { to { transform: rotate(360deg); } }
  .cal-spin { animation: cal-spin 0.8s linear infinite; }
  .cal-loading { display: flex; align-items: center; justify-content: center; padding: 5rem; gap: 0.75rem; color: #64748b; font-size: 0.875rem; font-weight: 600; }
`;

const MOIS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin',
                  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const RHCalendrierEntretiens = () => {
  const navigate = useNavigate();
  const today = new Date();

  const [annee,         setAnnee]         = useState(today.getFullYear());
  const [mois,          setMois]          = useState(today.getMonth() + 1);
  const [entretiens,    setEntretiens]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedDay,   setSelectedDay]   = useState(today.getDate());
  const [toast,         setToast]         = useState(null);

  // ✅ Popup détail
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [detailData,    setDetailData]    = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ✅ Popup reprogrammation
  const [reschedOpen,   setReschedOpen]   = useState(false);
  const [reschedEnt,    setReschedEnt]    = useState(null);   // entretien à reprogrammer
  const [reschedValue,  setReschedValue]  = useState('');     // datetime-local value
  const [reschedSaving, setReschedSaving] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({msg, type}); setTimeout(() => setToast(null), 4000);
  };

  const fetchEntretiens = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/interviews/calendrier', {
        params: { annee, mois }
      });
      setEntretiens(data);
    } catch {
      showToast('Erreur chargement calendrier', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEntretiens(); }, [annee, mois]);

  // ✅ Ouvrir le popup détail
  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const { data } = await axios.get(`/api/interviews/${id}/detail`);
      setDetailData(data);
    } catch {
      showToast('Erreur chargement du détail', 'error');
      setDetailOpen(false);
    } finally { setDetailLoading(false); }
  };
  const closeDetail = () => { setDetailOpen(false); setDetailData(null); };

  // ✅ Ouvrir le popup reprogrammation
  const openResched = (ent) => {
    setReschedEnt(ent);
    // Pré-remplir avec la date/heure actuelle au format datetime-local (YYYY-MM-DDTHH:mm)
    const d = new Date(ent.dateDebut);
    const pad = n => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setReschedValue(local);
    setReschedOpen(true);
  };
  const closeResched = () => { setReschedOpen(false); setReschedEnt(null); setReschedValue(''); };

  // ✅ Enregistrer la nouvelle heure
  const saveResched = async () => {
    if (!reschedValue) { showToast('Choisissez une date et une heure', 'error'); return; }
    setReschedSaving(true);
    try {
      // Envoie au format ISO local (ex: 2026-06-12T09:30) — le backend parse + fin = +15min
      await axios.patch(`/api/interviews/${reschedEnt.id}/reprogrammer`, {
        dateDebut: reschedValue,
      });
      showToast('Entretien reprogrammé — email envoyé au candidat');
      closeResched();
      fetchEntretiens(); // recharger le calendrier
    } catch {
      showToast('Erreur lors de la reprogrammation', 'error');
      setReschedSaving(false);
    }
  };

  // ── Grille calendrier ─────────────────────────────────────────────────────
  const calCells = useMemo(() => {
    const premierJour = new Date(annee, mois - 1, 1);
    let startOffset = premierJour.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const nbJours = new Date(annee, mois, 0).getDate();
    const prevLast = new Date(annee, mois - 1, 0).getDate();
    const cells = [];
    for (let i = startOffset - 1; i >= 0; i--)
      cells.push({ day: prevLast - i, current: false });
    for (let d = 1; d <= nbJours; d++)
      cells.push({ day: d, current: true });
    let nxt = 1;
    while (cells.length < 42) cells.push({ day: nxt++, current: false });
    return cells;
  }, [annee, mois]);

  const entretiensParJour = useMemo(() => {
    const map = {};
    entretiens.forEach(e => {
      const k = e.jour;
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return map;
  }, [entretiens]);

  const selectedDayEvents = useMemo(() =>
    entretiens.filter(e => {
      const d = new Date(e.dateDebut);
      return d.getDate() === selectedDay
          && d.getMonth() + 1 === mois
          && d.getFullYear() === annee;
    }).sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))
  , [entretiens, selectedDay, annee, mois]);

  const isToday = d =>
    d === today.getDate() && mois === today.getMonth()+1 && annee === today.getFullYear();
  const isWeekend = idx => { const dow = idx % 7; return dow === 5 || dow === 6; };

  const prevMois = () => {
    if (mois === 1) { setAnnee(a => a-1); setMois(12); }
    else setMois(m => m-1);
    setSelectedDay(1);
  };
  const nextMois = () => {
    if (mois === 12) { setAnnee(a => a+1); setMois(1); }
    else setMois(m => m+1);
    setSelectedDay(1);
  };

  const rejoindre = (roomToken) => navigate(`/rh/entretien/${roomToken}`);

  const statsTotal    = entretiens.length;
  const statsPlanif   = entretiens.filter(e => e.statut === 'PLANIFIE').length;
  const statsTermines = entretiens.filter(e => e.statut === 'TERMINE').length;
  const statsPct      = statsTotal > 0 ? Math.round((statsPlanif/statsTotal)*100) : 0;

  return (
    <>
      <style>{styles}</style>
      <div className="cal-root">

        {/* Toast */}
        {toast && (
          <div className={`cal-toast ${toast.type}`}>
            <span className="material-symbols-outlined">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {toast.msg}
          </div>
        )}

        {/* ── POPUP DÉTAIL ENTRETIEN TERMINÉ ── */}
        {detailOpen && (
          <div className="cal-overlay">
            <div className="cal-overlay-bg" onClick={closeDetail}/>
            <div className="cal-modal">
              <div className="cal-modal-header">
                <p className="cal-modal-title">Détail de l'entretien</p>
                <p className="cal-modal-sub">
                  {detailData ? detailData.dateComplete : 'Chargement...'}
                </p>
                <button className="cal-modal-close" onClick={closeDetail}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {detailLoading || !detailData ? (
                <div className="cal-modal-loading">
                  <span className="material-symbols-outlined cal-spin" style={{color:'#003d7a'}}>
                    progress_activity
                  </span>
                  Chargement du détail...
                </div>
              ) : (
                <div className="cal-modal-body">

                  {/* Candidat */}
                  <div className="cal-d-cand">
                    <div className="cal-d-photo">
                      {detailData.candidatPhoto
                        ? <img src={detailData.candidatPhoto} alt=""/>
                        : (detailData.candidatNom || '?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                    </div>
                    <div>
                      <p className="cal-d-cand-name">{detailData.candidatNom}</p>
                      <p className="cal-d-cand-mail">{detailData.candidatEmail}</p>
                    </div>
                  </div>

                  {/* Note d'entretien /10 */}
                  <div className="cal-d-note-box">
                    <div>
                      <span className="cal-d-note-big">
                        {detailData.scoreEntretien != null ? detailData.scoreEntretien : '—'}
                      </span>
                      <span className="cal-d-note-unit">/10</span>
                    </div>
                    <div className="cal-d-note-txt">Note de l'entretien</div>
                  </div>

                  {/* Scores pré-entretien */}
                  <div className="cal-d-section">
                    <p className="cal-d-sec-lbl"><span className="material-symbols-outlined">analytics</span>Scores pré-entretien</p>
                    <div className="cal-d-scores">
                      <div className="cal-d-score">
                        <div className="cal-d-score-num">{detailData.scoreQuiz ?? '—'}<span style={{fontSize:'.75rem',color:'#94a3b8'}}>/50</span></div>
                        <div className="cal-d-score-lbl">Quiz technique</div>
                      </div>
                      <div className="cal-d-score">
                        <div className="cal-d-score-num green">{detailData.scoreAi ?? '—'}<span style={{fontSize:'.75rem',color:'#94a3b8'}}>/100</span></div>
                        <div className="cal-d-score-lbl">Score IA CV</div>
                      </div>
                    </div>
                  </div>

                  {/* Sujet de stage */}
                  <div className="cal-d-section">
                    <p className="cal-d-sec-lbl"><span className="material-symbols-outlined">work</span>Sujet de stage</p>
                    <div className="cal-d-full" style={{marginBottom:'.625rem'}}>
                      <div className="cal-d-field-lbl">Titre</div>
                      <div className="cal-d-field-val">{detailData.sujetTitre}</div>
                    </div>
                    <div className="cal-d-grid">
                      <div className="cal-d-field">
                        <div className="cal-d-field-lbl">Code</div>
                        <div className="cal-d-field-val">{detailData.sujetCode || '—'}</div>
                      </div>
                      <div className="cal-d-field">
                        <div className="cal-d-field-lbl">Département</div>
                        <div className="cal-d-field-val">{detailData.sujetDepartement || '—'}</div>
                      </div>
                      <div className="cal-d-field">
                        <div className="cal-d-field-lbl">Durée</div>
                        <div className="cal-d-field-val">{detailData.sujetDuree || '—'}</div>
                      </div>
                      <div className="cal-d-field">
                        <div className="cal-d-field-lbl">Niveau</div>
                        <div className="cal-d-field-val">{detailData.sujetNiveau || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Candidature */}
                  <div className="cal-d-section">
                    <p className="cal-d-sec-lbl"><span className="material-symbols-outlined">description</span>Candidature</p>
                    <div className="cal-d-grid">
                      <div className="cal-d-field">
                        <div className="cal-d-field-lbl">Statut</div>
                        <div className="cal-d-field-val">{detailData.candidatureStatut}</div>
                      </div>
                      <div className="cal-d-field">
                        <div className="cal-d-field-lbl">Mention quiz</div>
                        <div className="cal-d-field-val">{detailData.mentionQuiz || '—'}</div>
                      </div>
                    </div>
                    {detailData.lettreMotivation && (
                      <div className="cal-d-full" style={{marginTop:'.625rem'}}>
                        <div className="cal-d-field-lbl">Lettre de motivation</div>
                        <div className="cal-d-field-val" style={{fontWeight:400,lineHeight:1.6,marginTop:'.25rem',whiteSpace:'pre-wrap'}}>
                          {detailData.lettreMotivation}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes RH (remarques) */}
                  <div className="cal-d-section">
                    <p className="cal-d-sec-lbl"><span className="material-symbols-outlined">edit_note</span>Remarques du RH</p>
                    <div className="cal-d-notes-rh">
                      {detailData.notesRh && detailData.notesRh.trim()
                        ? detailData.notesRh
                        : <span className="cal-d-notes-empty">Aucune remarque saisie.</span>}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {/* ── POPUP REPROGRAMMATION ── */}
        {reschedOpen && reschedEnt && (
          <div className="cal-overlay">
            <div className="cal-overlay-bg" onClick={closeResched}/>
            <div className="cal-resched-modal">
              <div className="cal-resched-header">
                <p className="cal-resched-title">Reprogrammer l'entretien</p>
                <p className="cal-resched-sub">Modifier la date et l'heure de début</p>
              </div>
              <div className="cal-resched-body">
                <div className="cal-resched-cand">
                  <strong>{reschedEnt.candidatNom}</strong><br/>
                  {reschedEnt.sujetTitre}
                </div>
                <div>
                  <label className="cal-resched-label">Nouvelle date et heure de début</label>
                  <input
                    type="datetime-local"
                    className="cal-resched-input"
                    value={reschedValue}
                    onChange={e => setReschedValue(e.target.value)}
                  />
                </div>
                <div className="cal-resched-note">
                  <span className="material-symbols-outlined">info</span>
                  La fin sera fixée automatiquement à +15 minutes. Un email sera envoyé au candidat.
                </div>
              </div>
              <div className="cal-resched-footer">
                <button className="cal-resched-cancel" onClick={closeResched} disabled={reschedSaving}>
                  Annuler
                </button>
                <button className="cal-resched-save" onClick={saveResched} disabled={reschedSaving || !reschedValue}>
                  {reschedSaving
                    ? <><span className="material-symbols-outlined cal-spin">progress_activity</span>Envoi...</>
                    : <><span className="material-symbols-outlined">save</span>Reprogrammer</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PAGE ── */}
        <h2 className="cal-title">Calendrier des entretiens</h2>
        <div className="cal-title-bar"/>
        <p className="cal-subtitle">Entretiens en ligne — planification automatique via Groq IA.</p>

        {/* Topbar */}
        <div className="cal-topbar">
          <div className="cal-topbar-left">
            <div className="cal-stat-mini">
              <span className="material-symbols-outlined">event</span>
              <span className="num">{statsTotal}</span> ce mois
            </div>
            <div className="cal-stat-mini">
              <span className="material-symbols-outlined">check_circle</span>
              <span className="num">{statsTermines}</span> terminés
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="cal-main">

          {/* ── Calendrier mensuel ── */}
          <div className="cal-panel">
            <div className="cal-panel-header">
              <h3 className="cal-month-label">{MOIS_FR[mois-1]} {annee}</h3>
              <div style={{display:'flex',gap:'0.375rem'}}>
                <button className="cal-nav-btn" onClick={prevMois}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="cal-nav-btn" onClick={nextMois}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="cal-day-headers">
              {JOURS_FR.map((j, i) => (
                <div key={j} className={`cal-day-hdr${i >= 5 ? ' weekend' : ''}`}>{j}</div>
              ))}
            </div>

            {loading ? (
              <div className="cal-loading">
                <span className="material-symbols-outlined cal-spin" style={{color:'#003d7a'}}>
                  progress_activity
                </span>
                Chargement des entretiens...
              </div>
            ) : (
              <div className="cal-grid">
                {calCells.map((cell, idx) => {
                  const events  = cell.current ? (entretiensParJour[cell.day] || []) : [];
                  const weekend = isWeekend(idx);
                  const today_  = cell.current && isToday(cell.day);
                  const sel     = cell.current && cell.day === selectedDay;
                  return (
                    <div key={idx}
                      className={[
                        'cal-cell',
                        !cell.current ? 'other-month' : '',
                        today_ ? 'today' : '',
                        sel && !today_ ? 'selected' : '',
                        weekend && cell.current ? 'weekend-cell' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => cell.current && setSelectedDay(cell.day)}
                    >
                      {today_ && <div className="cal-today-label">Aujourd'hui</div>}
                      <div className="cal-cell-num">{cell.day}</div>
                      {events.slice(0, 2).map(e => {
                        const done = e.statut === 'TERMINE';
                        return (
                          <div key={e.id} className={`cal-event${done ? ' done' : ''}`}
                            title={`${e.heureDebut} — ${e.candidatNom}${done ? ' (terminé)' : ''}`}
                            onClick={ev => {
                              ev.stopPropagation();
                              done ? openDetail(e.id) : rejoindre(e.roomToken);
                            }}>
                            {e.heureDebut} {e.candidatNom?.split(' ')[0]}
                          </div>
                        );
                      })}
                      {events.length > 2 && (
                        <div className="cal-event-more">
                          +{events.length - 2} autre{events.length-2>1?'s':''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Colonne droite ── */}
          <div className="cal-right">

            {/* Agenda du jour sélectionné */}
            <div className="cal-agenda">
              <div className="cal-agenda-header">
                <div className="cal-agenda-eyebrow">
                  <span className="cal-agenda-lbl">
                    {isToday(selectedDay) && mois===today.getMonth()+1 && annee===today.getFullYear()
                      ? 'Agenda du jour' : 'Entretiens sélectionnés'}
                  </span>
                  {selectedDayEvents.length > 0 && (
                    <span className="cal-agenda-count">{selectedDayEvents.length}</span>
                  )}
                </div>
                <p className="cal-agenda-date">
                  {new Date(annee, mois-1, selectedDay).toLocaleDateString('fr-FR', {
                    weekday:'long', day:'numeric', month:'long'
                  })}
                </p>
              </div>
              <div className="cal-agenda-body">
                {selectedDayEvents.length === 0 ? (
                  <div className="cal-agenda-empty">
                    <span className="material-symbols-outlined">event_busy</span>
                    <p>Aucun entretien ce jour</p>
                  </div>
                ) : selectedDayEvents.map(e => {
                  const done   = e.statut === 'TERMINE';
                  const isPast = new Date(e.dateDebut) < new Date();
                  return (
                    <div key={e.id} className={`cal-agenda-item${done ? ' done' : isPast ? ' past' : ''}`}>
                      <div className="cal-agenda-time">
                        {e.heureDebut} – {e.heureFin}
                      </div>
                      <p className="cal-agenda-name">{e.candidatNom}</p>
                      <p className="cal-agenda-poste">{e.sujetTitre}</p>

                      {done ? (
                        <>
                          {/* ✅ Entretien terminé : badge + bouton détail (pas de "Rejoindre") */}
                          <span className="cal-done-badge">
                            <span className="material-symbols-outlined">check_circle</span>
                            Entretien terminé
                          </span>
                          <div className="cal-done-row">
                            <button className="cal-detail-btn" onClick={() => openDetail(e.id)}>
                              <span className="material-symbols-outlined">visibility</span>
                              Voir le détail
                            </button>
                          </div>
                        </>
                      ) : (
                        /* Entretien planifié : bouton rejoindre + modifier l'heure */
                        <div className="cal-done-row">
                          <button className="cal-rejoindre-btn" onClick={() => rejoindre(e.roomToken)}>
                            <span className="material-symbols-outlined">videocam</span>
                            Rejoindre la salle
                          </button>
                          <button className="cal-edit-btn" onClick={() => openResched(e)}>
                            <span className="material-symbols-outlined">edit_calendar</span>
                            Modifier l'heure
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="cal-stats">
              <p className="cal-stats-title">Statistiques du mois</p>
              <div className="cal-stat-row">
                <span className="cal-stat-lbl">Total entretiens</span>
                <span className="cal-stat-val">{statsTotal}</span>
              </div>
              <div className="cal-stat-row">
                <span className="cal-stat-lbl">Planifiés</span>
                <span className="cal-stat-val">{statsPlanif}</span>
              </div>
              <div className="cal-progress">
                <div className="cal-progress-fill" style={{width:`${statsPct}%`}}/>
              </div>
              <div className="cal-stat-row">
                <span className="cal-stat-lbl">Terminés</span>
                <span className="cal-stat-val green">{statsTermines}</span>
              </div>
            </div>

            {/* Légende */}
            <div className="cal-legende">
              <p className="cal-legende-title">Légende</p>
              <div className="cal-legende-item">
                <div className="cal-legende-dot" style={{background:'rgba(0,61,122,.08)',borderLeft:'3px solid #003d7a'}}/>
                Entretien planifié
              </div>
              <div className="cal-legende-item">
                <div className="cal-legende-dot" style={{background:'rgba(5,150,105,.08)',borderLeft:'3px solid #059669'}}/>
                Entretien terminé
              </div>
              <div className="cal-legende-item">
                <div className="cal-legende-dot" style={{background:'rgba(0,61,122,.04)',outline:'2px solid #003d7a'}}/>
                Aujourd'hui
              </div>
              <div className="cal-legende-item">
                <div className="cal-legende-dot" style={{background:'rgba(0,61,122,.07)'}}/>
                Jour sélectionné
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RHCalendrierEntretiens;