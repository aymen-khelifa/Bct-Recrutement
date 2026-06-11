import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

  .cat-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .cat-root { font-family: 'DM Sans', sans-serif; background: #f7f8fc; min-height: 100vh; color: #0f172a; }
  .cat-nav { background: #fff; border-bottom: 1px solid #e8ecf4; padding: 0 2.5rem; display: flex; align-items: center; justify-content: space-between; height: 3.5rem; position: sticky; top: 0; z-index: 50; }
  .cat-nav-brand { display: flex; align-items: center; gap: 0.625rem; text-decoration: none; }
  .cat-nav-diamond { width: 1.5rem; height: 1.5rem; background: #1a3c6e; transform: rotate(45deg); border-radius: 3px; flex-shrink: 0; }
  .cat-nav-brand-name { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 0.9375rem; color: #0f172a; }
  .cat-nav-links { display: flex; align-items: center; gap: 0.25rem; }
  .cat-nav-link { padding: 0.375rem 0.875rem; font-size: 0.875rem; font-weight: 500; color: #475569; border-radius: 0.375rem; cursor: pointer; transition: color 0.15s, background 0.15s; text-decoration: none; border: none; background: none; font-family: 'DM Sans', sans-serif; }
  .cat-nav-link:hover { color: #0f172a; background: #f1f5f9; }
  .cat-nav-link.active { color: #1a3c6e; font-weight: 600; border-bottom: 2px solid #1a3c6e; border-radius: 0; }
  .cat-nav-btn { background: #1a3c6e; color: #fff; border: none; border-radius: 0.5rem; padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
  .cat-nav-btn:hover { background: #0f2850; }
  .cat-hero { padding: 3rem 2.5rem 2rem; max-width: 72rem; margin: 0 auto; }
  .cat-hero h1 { font-family: 'Sora', sans-serif; font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem; letter-spacing: -0.03em; }
  .cat-hero p  { color: #64748b; font-size: 1rem; max-width: 36rem; line-height: 1.65; font-weight: 400; }
  .cat-filters-wrap { max-width: 72rem; margin: 0 auto; padding: 0 2.5rem 2rem; }
  .cat-filters { background: #fff; border: 1px solid #e8ecf4; border-radius: 0.75rem; padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 2px 8px rgba(15,23,42,0.04); flex-wrap: wrap; }
  .cat-search-wrap { flex: 1; min-width: 200px; position: relative; }
  .cat-search-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.125rem; pointer-events: none; }
  .cat-search-input { width: 100%; padding: 0.625rem 0.875rem 0.625rem 2.5rem; border: 1px solid #e8ecf4; border-radius: 0.5rem; font-size: 0.875rem; font-family: 'DM Sans', sans-serif; color: #0f172a; outline: none; background: #f8fafc; transition: border-color 0.15s, background 0.15s, box-shadow 0.15s; }
  .cat-search-input:focus { border-color: #1a3c6e; background: #fff; box-shadow: 0 0 0 3px rgba(26,60,110,0.08); }
  .cat-search-input::placeholder { color: #94a3b8; }
  .cat-filter-sep { width: 1px; height: 1.75rem; background: #e8ecf4; flex-shrink: 0; }
  .cat-select-wrap { position: relative; }
  .cat-select-wrap .material-symbols-outlined.lead  { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 1rem; pointer-events: none; }
  .cat-select-wrap .material-symbols-outlined.arrow { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1rem; pointer-events: none; }
  .cat-select { appearance: none; padding: 0.625rem 2rem 0.625rem 2.25rem; border: 1px solid #e8ecf4; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 600; font-family: 'DM Sans', sans-serif; color: #334155; background: #f8fafc; outline: none; cursor: pointer; transition: border-color 0.15s; }
  .cat-select:focus { border-color: #1a3c6e; }
  .cat-results-bar { max-width: 72rem; margin: 0 auto; padding: 0 2.5rem 1rem; display: flex; align-items: center; justify-content: space-between; }
  .cat-results-count { font-size: 0.8125rem; color: #64748b; font-weight: 500; }
  .cat-results-count strong { color: #0f172a; }
  .mc-breadcrumb { font-size: .85rem; color: #64748b; display: flex; align-items: center; gap: .35rem; margin-bottom: 1rem; }
  .mc-breadcrumb span:last-child { color: #0f172a; font-weight: 600; }
  .mc-breadcrumb .material-symbols-outlined { font-size: 1rem; }
  .cat-grid-wrap { max-width: 72rem; margin: 0 auto; padding: 0 2.5rem 2rem; }
  .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
  @media (max-width: 1024px) { .cat-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px)  { .cat-grid { grid-template-columns: 1fr; } }
  .cat-card { background: #fff; border: 1px solid #e8ecf4; border-radius: 0.875rem; padding: 1.625rem; display: flex; flex-direction: column; transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; cursor: pointer; }
  .cat-card:hover { border-color: #c4d0e8; box-shadow: 0 8px 24px rgba(26,60,110,0.1); transform: translateY(-2px); }
  .cat-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
  .cat-card-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.625rem; background: #f0f4fb; display: flex; align-items: center; justify-content: center; color: #1a3c6e; flex-shrink: 0; }
  .cat-card-icon .material-symbols-outlined { font-size: 1.25rem; }
  .cat-badge { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.25rem 0.625rem; border-radius: 0.25rem; }
  .cat-badge.PUBLIE  { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .cat-badge.URGENT  { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
  .cat-badge.NOUVEAU { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .cat-badge.ARCHIVE { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
  .cat-card-ref { font-size: 0.6rem; font-weight: 700; color: #1a3c6e; background: #f0f4fb; padding: 0.2rem 0.5rem; border-radius: 0.25rem; letter-spacing: 0.06em; white-space: nowrap; }
  .cat-card-dept  { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.5rem; }
  .cat-card-title { font-family: 'Sora', sans-serif; font-size: 1.0625rem; font-weight: 700; color: #0f172a; margin-bottom: 0.75rem; line-height: 1.35; }
  .cat-card-desc  { font-size: 0.8125rem; color: #64748b; line-height: 1.6; margin-bottom: 1.25rem; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .cat-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-bottom: 1.25rem; }
  .cat-tag  { font-size: 0.6875rem; font-weight: 500; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.2rem 0.625rem; border-radius: 9999px; }
  .cat-card-meta { display: flex; gap: 1rem; margin-bottom: 1.375rem; flex-wrap: wrap; }
  .cat-meta-item { display: flex; align-items: center; gap: 0.3rem; font-size: 0.6875rem; color: #64748b; font-weight: 500; }
  .cat-meta-item .material-symbols-outlined { font-size: 0.875rem; color: #94a3b8; }
  .cat-card-footer { display: flex; gap: 0.625rem; margin-top: auto; }
  .cat-btn-primary { flex: 1; background: #1a3c6e; color: #fff; border: none; border-radius: 0.5rem; padding: 0.625rem 1rem; font-size: 0.8125rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s, opacity 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.375rem; }
  .cat-btn-primary:hover:not(:disabled) { background: #0f2850; }
  .cat-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
  .cat-btn-primary.done    { background: #059669; }
  .cat-btn-primary.loading { opacity: 0.7; }
  .cat-btn-primary.closed  { background: #94a3b8; }
  .cat-btn-primary .material-symbols-outlined { font-size: 0.875rem; }
  .cat-btn-secondary { background: #fff; color: #475569; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.625rem 1rem; font-size: 0.8125rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
  .cat-btn-secondary:hover { background: #f8fafc; }
  .cat-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 2rem; gap: 1rem; color: #94a3b8; }
  .cat-state .material-symbols-outlined { font-size: 3rem; color: #cbd5e1; }
  .cat-state p { font-size: 0.9375rem; font-weight: 500; }
  @keyframes cat-spin { to { transform: rotate(360deg); } }
  .cat-spin { animation: cat-spin 0.8s linear infinite; color: #1a3c6e; font-size: 2rem !important; }
  .cat-pagination { max-width: 72rem; margin: 0 auto; padding: 1rem 2.5rem 3rem; display: flex; align-items: center; justify-content: center; gap: 0.375rem; }
  .cat-page-btn { width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; border: 1px solid #e8ecf4; background: #fff; font-size: 0.875rem; font-weight: 600; color: #475569; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
  .cat-page-btn:hover:not(:disabled):not(.active) { background: #f1f5f9; border-color: #c4d0e8; }
  .cat-page-btn.active  { background: #1a3c6e; color: #fff; border-color: #1a3c6e; }
  .cat-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .cat-page-dots { color: #94a3b8; font-size: 0.875rem; padding: 0 0.25rem; }
  @keyframes cat-toast-in { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
  .cat-toast { position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; padding: 0.875rem 1.25rem; border-radius: 0.625rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 600; font-family: 'DM Sans', sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.15); animation: cat-toast-in 0.25s ease; max-width: 22rem; }
  .cat-toast.success { background: #059669; color: #fff; }
  .cat-toast.error   { background: #dc2626; color: #fff; }
  .cat-toast.warn    { background: #d97706; color: #fff; }
  .cat-toast .material-symbols-outlined { font-size: 1.125rem; flex-shrink: 0; }
  .cat-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1.5rem; backdrop-filter: blur(4px); }
  .cat-modal { background: #fff; border-radius: 1rem; width: 100%; max-width: 38rem; box-shadow: 0 25px 50px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
  .cat-modal-header { padding: 1.5rem 1.5rem 1rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .cat-modal-header h2 { font-family: 'Sora', sans-serif; font-size: 1.125rem; font-weight: 700; color: #0f172a; line-height: 1.35; }
  .cat-modal-header p  { font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .cat-modal-close { padding: 0.375rem; border: none; background: #f1f5f9; border-radius: 0.5rem; cursor: pointer; color: #475569; flex-shrink: 0; transition: background 0.15s; }
  .cat-modal-close:hover { background: #e2e8f0; }
  .cat-modal-close .material-symbols-outlined { font-size: 1.125rem; display: block; }
  .cat-modal-body   { padding: 1.5rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 1.25rem; }
  .cat-modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #f1f5f9; display: flex; gap: 0.75rem; }
  .cat-modal-desc { font-size: 0.875rem; color: #475569; line-height: 1.65; }
  .cat-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }
  .cat-modal-field { background: #f8fafc; border-radius: 0.5rem; padding: 0.75rem; }
  .cat-modal-field label { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; display: block; margin-bottom: 0.25rem; }
  .cat-modal-field span  { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .cat-modal-competences h4 { font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.625rem; }
  .cat-sujet-pill { background: #f0f4fb; border-radius: 0.625rem; padding: 0.75rem 1rem; display: flex; gap: 1.5rem; flex-wrap: wrap; }
  .cat-sujet-pill-item { display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; color: #475569; font-weight: 500; }
  .cat-sujet-pill-item .material-symbols-outlined { font-size: 0.875rem; color: #1a3c6e; }
  .cat-lettre-block { display: flex; flex-direction: column; }
  .cat-lettre-label { font-size: 0.8125rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; }
  .cat-lettre-label .req { color: #dc2626; }
  .cat-lettre-hint  { font-size: 0.75rem; color: #64748b; line-height: 1.55; margin-bottom: 0.75rem; }
  .cat-lettre-textarea { width: 100%; min-height: 11rem; padding: 0.875rem; border: 1.5px solid #e2e8f0; border-radius: 0.625rem; font-size: 0.875rem; font-family: 'DM Sans', sans-serif; color: #0f172a; outline: none; resize: vertical; line-height: 1.65; background: #f8fafc; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s; }
  .cat-lettre-textarea:focus { border-color: #1a3c6e; background: #fff; box-shadow: 0 0 0 3px rgba(26,60,110,0.08); }
  .cat-lettre-textarea::placeholder { color: #b0bcc8; }
  .cat-lettre-textarea.err { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
  .cat-lettre-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem; min-height: 1.25rem; }
  .cat-lettre-error { font-size: 0.75rem; color: #dc2626; display: flex; align-items: center; gap: 0.25rem; font-weight: 500; }
  .cat-lettre-error .material-symbols-outlined { font-size: 0.875rem; }
  .cat-lettre-counter { font-size: 0.75rem; font-weight: 600; transition: color 0.2s; }
  .cat-lettre-counter.pending { color: #94a3b8; }
  .cat-lettre-counter.ok      { color: #059669; }
`;

const MIN_LETTRE     = 100;
const ITEMS_PER_PAGE = 6;

const deptIcon = (dept = '') => {
  const d = dept.toLowerCase();
  if (d.includes('financ') || d.includes('marché'))       return 'analytics';
  if (d.includes('cyber') || d.includes('sécurité'))      return 'security';
  if (d.includes('monétaire') || d.includes('politique')) return 'currency_exchange';
  if (d.includes('data') || d.includes('statist'))        return 'database';
  if (d.includes('risque'))                               return 'warning';
  if (d.includes('rh') || d.includes('ressources'))       return 'groups';
  if (d.includes('audit'))                                return 'fact_check';
  if (d.includes('digit') || d.includes('info'))          return 'computer';
  return 'work';
};

const badgeLabel = (statut) => {
  if (statut === 'PUBLIE')  return 'Ouvert';
  if (statut === 'URGENT')  return 'Urgent';
  if (statut === 'NOUVEAU') return 'Nouveau';
  if (statut === 'ARCHIVE') return 'Archivé';
  return statut;
};

const DEPARTEMENTS = ['Tous','Stabilité Financière','Opérations Monétaires','Informatique & Digital','Ressources Humaines','Audit Interne','Politique Monétaire','Statistiques & Data','Gestion des Risques'];
const NIVEAUX      = ['Tous','Bac+2 (BTS / DUT)','Licence (Bac+3)','Master 1 (Bac+4)','Master 2 (Bac+5)','Ingénieur','Doctorat'];

const CandidatOffres = () => {
  const [sujets, setSujets]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('Tous');
  const [niveauFilter, setNiveauFilter] = useState('Tous');
  const [page, setPage]             = useState(1);
  const [postules, setPostules]     = useState(new Set());
  const [sending, setSending]       = useState(new Set());
  const [toast, setToast]           = useState(null);
  const [detailSujet, setDetailSujet] = useState(null);
  const [modalSujet, setModalSujet]   = useState(null);
  const [lettre, setLettre]           = useState('');
  const [lettreError, setLettreError] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  // ── Refs pour avoir toujours les valeurs à jour dans le fetch ────────────
  const searchRef  = useRef(search);
  const deptRef    = useRef(deptFilter);
  const niveauRef  = useRef(niveauFilter);
  useEffect(() => { searchRef.current  = search;      }, [search]);
  useEffect(() => { deptRef.current    = deptFilter;  }, [deptFilter]);
  useEffect(() => { niveauRef.current  = niveauFilter;}, [niveauFilter]);

  useEffect(() => {
    axios.get('/api/candidatures/mes')
      .then(({ data }) => setPostules(new Set(data.map(c => c.sujetId))))
      .catch(() => {});
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── fetchSujets lit depuis les refs → toujours à jour ───────────────────
  const fetchSujets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const s = searchRef.current;
      const d = deptRef.current;
      const n = niveauRef.current;
      if (s && s !== '')     params.set('search', s);
      if (d && d !== 'Tous') params.set('departement', d);
      if (n && n !== 'Tous') params.set('niveau', n);
      const { data } = await axios.get(`/api/sujets${params.toString() ? '?' + params : ''}`);
      setSujets(data);
    } catch { setSujets([]); }
    finally  { setLoading(false); }
  }, []);

  // ── Un seul useEffect — réagit à tous les filtres ───────────────────────
  useEffect(() => {
    const delay = search ? 500 : 0;
    const t = setTimeout(fetchSujets, delay);
    return () => clearTimeout(t);
  }, [search, deptFilter, niveauFilter, fetchSujets]);

  const handleDept   = v => { setDeptFilter(v);   setPage(1); };
  const handleNiveau = v => { setNiveauFilter(v); setPage(1); };

  const ouvrirModalPostuler = (sujet, e) => {
    e?.stopPropagation();
    setDetailSujet(null);
    setLettre('');
    setLettreError('');
    setModalSujet(sujet);
  };

  const fermerModalPostuler = () => { setModalSujet(null); setLettre(''); setLettreError(''); };

  const handleSubmit = async () => {
    if (!modalSujet) return;
    if (lettre.trim().length < MIN_LETTRE) { setLettreError(`Minimum ${MIN_LETTRE} caractères requis.`); return; }
    setLettreError('');
    setSubmitting(true);
    setSending(prev => new Set([...prev, modalSujet.id]));
    try {
      await axios.post('/api/candidatures', { sujetId: modalSujet.id, lettreMotivation: lettre.trim() });
      setPostules(prev => new Set([...prev, modalSujet.id]));
      showToast(`Candidature envoyée pour "${modalSujet.titre}" !`, 'success');
      fermerModalPostuler();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de l\'envoi';
      if (msg.toLowerCase().includes('déjà')) {
        setPostules(prev => new Set([...prev, modalSujet.id]));
        showToast(msg, 'warn');
        fermerModalPostuler();
      } else { showToast(msg, 'error'); }
    } finally {
      setSending(prev => { const s = new Set(prev); s.delete(modalSujet?.id); return s; });
      setSubmitting(false);
    }
  };

  const renderPostulerBtn = (sujet) => {
    const done      = postules.has(sujet.id);
    const isLoading = sending.has(sujet.id);
    const now       = new Date();
    const cutoff    = new Date(now.getFullYear(), 7, 1);
    const apresDelai = now > cutoff;
    const disabled  = done || isLoading || apresDelai;
    let label;
    if (isLoading)    label = <><span className="material-symbols-outlined cat-spin" style={{fontSize:'0.875rem'}}>progress_activity</span> Envoi...</>;
    else if (done)    label = <><span className="material-symbols-outlined">check</span> Candidature envoyée</>;
    else if (apresDelai) label = <><span className="material-symbols-outlined">lock</span> Clôturé</>;
    else              label = <><span className="material-symbols-outlined">edit_note</span> Postuler</>;
    return (
      <button
        className={`cat-btn-primary${done?' done':''}${isLoading?' loading':''}${apresDelai&&!done?' closed':''}`}
        disabled={disabled}
        onClick={e => !disabled && ouvrirModalPostuler(sujet, e)}
      >{label}</button>
    );
  };

  const totalPages = Math.ceil(sujets.length / ITEMS_PER_PAGE);
  const paginated  = sujets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const lettreCount = lettre.trim().length;
  const lettreOk    = lettreCount >= MIN_LETTRE;

  return (
    <>
      <style>{styles}</style>
      <div className="cat-root">

        {toast && (
          <div className={`cat-toast ${toast.type}`}>
            <span className="material-symbols-outlined">
              {toast.type==='success'?'check_circle':toast.type==='warn'?'info':'error'}
            </span>
            {toast.msg}
          </div>
        )}

        {detailSujet && (
          <div className="cat-overlay" onClick={() => setDetailSujet(null)}>
            <div className="cat-modal" onClick={e => e.stopPropagation()}>
              <div className="cat-modal-header">
                <div><p>{detailSujet.codeSujet} · {detailSujet.departement}</p><h2>{detailSujet.titre}</h2></div>
                <button className="cat-modal-close" onClick={() => setDetailSujet(null)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="cat-modal-body">
                <p className="cat-modal-desc">{detailSujet.description}</p>
                <div className="cat-modal-grid">
                  <div className="cat-modal-field"><label>Durée</label><span>{detailSujet.duree}</span></div>
                  <div className="cat-modal-field"><label>Niveau requis</label><span>{detailSujet.niveauEtudes}</span></div>
                  <div className="cat-modal-field"><label>Spécialité</label><span>{detailSujet.specialite}</span></div>
                  <div className="cat-modal-field"><label>Postes disponibles</label><span>{detailSujet.nbStagiaires} poste{detailSujet.nbStagiaires>1?'s':''}</span></div>
                </div>
                {detailSujet.competences?.length > 0 && (
                  <div className="cat-modal-competences">
                    <h4>Compétences requises</h4>
                    <div className="cat-tags">{detailSujet.competences.map(c => <span key={c} className="cat-tag">{c}</span>)}</div>
                  </div>
                )}
              </div>
              <div className="cat-modal-footer">
                {renderPostulerBtn(detailSujet)}
                <button className="cat-btn-secondary" onClick={() => setDetailSujet(null)}>Fermer</button>
              </div>
            </div>
          </div>
        )}

        {modalSujet && (
          <div className="cat-overlay" onClick={fermerModalPostuler}>
            <div className="cat-modal" onClick={e => e.stopPropagation()}>
              <div className="cat-modal-header">
                <div><p>{modalSujet.codeSujet} · {modalSujet.departement}</p><h2>Postuler — {modalSujet.titre}</h2></div>
                <button className="cat-modal-close" onClick={fermerModalPostuler}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="cat-modal-body">
                <div className="cat-sujet-pill">
                  <span className="cat-sujet-pill-item"><span className="material-symbols-outlined">schedule</span>{modalSujet.duree}</span>
                  <span className="cat-sujet-pill-item"><span className="material-symbols-outlined">school</span>{modalSujet.niveauEtudes}</span>
                  <span className="cat-sujet-pill-item"><span className="material-symbols-outlined">group</span>{modalSujet.nbStagiaires} poste{modalSujet.nbStagiaires>1?'s':''}</span>
                </div>
                <div className="cat-lettre-block">
                  <p className="cat-lettre-label"><span className="material-symbols-outlined" style={{fontSize:'1rem',color:'#1a3c6e'}}>edit_note</span>Lettre de motivation <span className="req">*</span></p>
                  <p className="cat-lettre-hint">Présentez votre motivation, vos compétences en lien avec ce sujet et ce que vous souhaitez apprendre durant ce stage.</p>
                  <textarea
                    className={`cat-lettre-textarea${lettreError?' err':''}`}
                    placeholder="Madame, Monsieur,&#10;&#10;Je vous adresse ma candidature pour le stage intitulé..."
                    value={lettre}
                    onChange={e => { setLettre(e.target.value); if (lettreError) setLettreError(''); }}
                    rows={10} autoFocus
                  />
                  <div className="cat-lettre-meta">
                    {lettreError ? <span className="cat-lettre-error"><span className="material-symbols-outlined">error</span>{lettreError}</span> : <span/>}
                    <span className={`cat-lettre-counter ${lettreOk?'ok':'pending'}`}>{lettreCount} / {MIN_LETTRE} caractères min{lettreOk?' ✓':''}</span>
                  </div>
                </div>
              </div>
              <div className="cat-modal-footer">
                <button className={`cat-btn-primary${submitting?' loading':''}`} disabled={submitting||!lettreOk} onClick={handleSubmit} style={{flex:1}}>
                  {submitting ? <><span className="material-symbols-outlined cat-spin" style={{fontSize:'0.875rem'}}>progress_activity</span> Envoi en cours...</> : <><span className="material-symbols-outlined">send</span> Envoyer ma candidature</>}
                </button>
                <button className="cat-btn-secondary" onClick={fermerModalPostuler}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        <div className="cat-hero">
          <div className="mc-breadcrumb">
            Tableau de bord
            <span className="material-symbols-outlined">chevron_right</span>
            <span>Offres de stages</span>
          </div>
          <h1>Catalogue des Offres de Stage</h1>
          <p>Explorez nos opportunités de carrière au sein de l'institution monétaire. Un environnement structuré et innovant pour vos premiers pas professionnels.</p>
        </div>

        <div className="cat-filters-wrap">
          <div className="cat-filters">
            <div className="cat-search-wrap">
              <span className="material-symbols-outlined cat-search-icon">search</span>
              <input className="cat-search-input" type="text" placeholder="Rechercher par mot-clé, domaine ou référence..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
            </div>
            <div className="cat-filter-sep"/>
            <div className="cat-select-wrap">
              <span className="material-symbols-outlined lead">corporate_fare</span>
              <select className="cat-select" value={deptFilter} onChange={e => handleDept(e.target.value)}>
                {DEPARTEMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
              <span className="material-symbols-outlined arrow">expand_more</span>
            </div>
            <div className="cat-select-wrap">
              <span className="material-symbols-outlined lead">school</span>
              <select className="cat-select" value={niveauFilter} onChange={e => handleNiveau(e.target.value)}>
                {NIVEAUX.map(n => <option key={n}>{n}</option>)}
              </select>
              <span className="material-symbols-outlined arrow">expand_more</span>
            </div>
          </div>
        </div>

        {!loading && (
          <div className="cat-results-bar">
            <p className="cat-results-count">
              <strong>{sujets.length}</strong> offre{sujets.length!==1?'s':''} disponible{sujets.length!==1?'s':''}
              {(deptFilter!=='Tous'||niveauFilter!=='Tous'||search)&&' · filtrées'}
            </p>
          </div>
        )}

        <div className="cat-grid-wrap">
          {loading ? (
            <div className="cat-state"><span className="material-symbols-outlined cat-spin">progress_activity</span><p>Chargement des offres...</p></div>
          ) : paginated.length === 0 ? (
            <div className="cat-state"><span className="material-symbols-outlined">search_off</span><p>Aucune offre ne correspond à votre recherche</p></div>
          ) : (
            <div className="cat-grid">
              {paginated.map(s => (
                <div key={s.id} className="cat-card" onClick={() => setDetailSujet(s)}>
                  <div className="cat-card-top">
                    <div className="cat-card-icon"><span className="material-symbols-outlined">{deptIcon(s.departement)}</span></div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'0.375rem'}}>
                      <span className={`cat-badge ${s.statut}`}>{badgeLabel(s.statut)}</span>
                      <span className="cat-card-ref">{s.codeSujet}</span>
                    </div>
                  </div>
                  <p className="cat-card-dept">{s.departement?.toUpperCase()}</p>
                  <h3 className="cat-card-title">{s.titre}</h3>
                  <p className="cat-card-desc">{s.description}</p>
                  {s.competences?.length > 0 && (
                    <div className="cat-tags">
                      {s.competences.slice(0,4).map(c => <span key={c} className="cat-tag">{c}</span>)}
                      {s.competences.length > 4 && <span className="cat-tag">+{s.competences.length-4}</span>}
                    </div>
                  )}
                  <div className="cat-card-meta">
                    <div className="cat-meta-item"><span className="material-symbols-outlined">schedule</span>{s.duree}</div>
                    <div className="cat-meta-item"><span className="material-symbols-outlined">group</span>{s.nbStagiaires} poste{s.nbStagiaires>1?'s':''}</div>
                    <div className="cat-meta-item"><span className="material-symbols-outlined">school</span>{s.niveauEtudes}</div>
                  </div>
                  <div className="cat-card-footer">
                    {renderPostulerBtn(s)}
                    <button className="cat-btn-secondary" onClick={e => { e.stopPropagation(); setDetailSujet(s); }}>Détails</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="cat-pagination">
            <button className="cat-page-btn" disabled={page===1} onClick={() => setPage(p => p-1)}>
              <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_left</span>
            </button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p =>
              p===1||p===totalPages||Math.abs(p-page)<=1
                ? <button key={p} className={`cat-page-btn${page===p?' active':''}`} onClick={() => setPage(p)}>{p}</button>
                : Math.abs(p-page)===2 ? <span key={`dots-${p}`} className="cat-page-dots">…</span> : null
            )}
            <button className="cat-page-btn" disabled={page===totalPages} onClick={() => setPage(p => p+1)}>
              <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_right</span>
            </button>
          </div>
        )}

      </div>
    </>
  );
};

export default CandidatOffres;