import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const styles = `
  .rh-db * { box-sizing: border-box; }
  .rh-db { font-family: 'Public Sans', sans-serif; }
  .rh-db .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
  body { margin: 0; padding: 0; }
  .rh-db-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
  .rh-db-header h2 { font-size: 1.5rem; font-weight: 900; color: #0f172a; }
  .rh-db-header p { color: #64748b; margin-top: 0.25rem; font-size: 0.875rem; }

  /* ── PIPELINE PHASES ── */
  .rh-pipeline { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem 2rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .rh-pipeline-title { font-size: 0.6875rem; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; margin-bottom: 1.25rem; display: flex; align-items: center; gap: .5rem; }
  .rh-pipeline-title .material-symbols-outlined { font-size: 1rem; color: #003d7a; }
  .rh-pipeline-steps { display: flex; align-items: center; gap: 0; overflow-x: auto; padding-bottom: .25rem; }
  .rh-pipeline-steps::-webkit-scrollbar { height: 3px; }
  .rh-pipeline-steps::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 9999px; }

  /* Step */
  .rh-ps { display: flex; align-items: center; flex-shrink: 0; }
  .rh-ps-inner { display: flex; flex-direction: column; align-items: center; gap: .5rem; min-width: 7rem; }
  .rh-ps-circle { width: 3rem; height: 3rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid; transition: all .2s; position: relative; cursor: default; }
  .rh-ps-circle .material-symbols-outlined { font-size: 1.25rem; }

  /* States */
  .rh-ps-circle.pending  { background: #f8fafc; border-color: #e2e8f0; color: #cbd5e1; }
  .rh-ps-circle.current  { background: #eff6ff; border-color: #003d7a; color: #003d7a; box-shadow: 0 0 0 4px rgba(0,61,122,.1); }
  .rh-ps-circle.success  { background: #ecfdf5; border-color: #059669; color: #059669; }
  .rh-ps-circle.failed   { background: #fef2f2; border-color: #ef4444; color: #ef4444; }
  .rh-ps-circle.active-btn { cursor: pointer; }
  .rh-ps-circle.active-btn:hover { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(0,61,122,.12); }

  .rh-ps-label { font-size: .6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: #475569; text-align: center; line-height: 1.3; white-space: pre-line; }
  .rh-ps-label.current { color: #003d7a; }
  .rh-ps-label.success  { color: #059669; }
  .rh-ps-label.failed   { color: #ef4444; }
  .rh-ps-label.pending  { color: #94a3b8; }

  .rh-ps-sub { font-size: .5625rem; font-weight: 600; color: #94a3b8; text-align: center; }
  .rh-ps-sub.current { color: #003d7a; }
  .rh-ps-sub.success  { color: #059669; }
  .rh-ps-sub.failed   { color: #ef4444; }

  /* Connector */
  .rh-ps-line { flex: 1; height: 2px; min-width: 2rem; background: #e2e8f0; margin: 0 .25rem; position: relative; top: -1.25rem; }
  .rh-ps-line.done { background: #059669; }
  .rh-ps-line.active { background: linear-gradient(90deg, #059669, #003d7a); }

  /* Action button under pipeline */
  .rh-phase-action { margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .rh-phase-action-info { display: flex; align-items: center; gap: .625rem; font-size: .8125rem; color: #475569; font-weight: 600; }
  .rh-phase-action-info .material-symbols-outlined { font-size: 1.125rem; }
  .rh-phase-btn { display: flex; align-items: center; gap: .5rem; padding: .75rem 1.75rem; border: none; border-radius: .625rem; font-size: .875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all .2s; }
  .rh-phase-btn.primary { background: linear-gradient(135deg,#003d7a,#0056b3); color: #fff; box-shadow: 0 4px 12px rgba(0,61,122,.25); }
  .rh-phase-btn.primary:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
  .rh-phase-btn.success { background: linear-gradient(135deg,#059669,#047857); color: #fff; box-shadow: 0 4px 12px rgba(5,150,105,.25); }
  .rh-phase-btn.success:hover:not(:disabled) { opacity: .9; }
  .rh-phase-btn.done { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
  .rh-phase-btn:disabled { opacity: .6; cursor: not-allowed; transform: none !important; }
  .rh-phase-btn .material-symbols-outlined { font-size: 1.125rem; }
  @keyframes rh-btn-spin { to { transform: rotate(360deg); } }
  .rh-btn-spin { animation: rh-btn-spin .7s linear infinite; }

  /* toast confirm */
  .rh-confirm-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px); }
  .rh-confirm-modal { background: #fff; border-radius: 1rem; padding: 2rem; max-width: 24rem; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,.2); }
  .rh-confirm-modal h3 { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin-bottom: .5rem; }
  .rh-confirm-modal p { font-size: .875rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }
  .rh-confirm-btns { display: flex; gap: .75rem; justify-content: flex-end; }
  .rh-confirm-cancel { padding: .625rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: .5rem; font-size: .875rem; font-weight: 600; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .rh-confirm-ok { padding: .625rem 1.25rem; background: #003d7a; border: none; border-radius: .5rem; font-size: .875rem; font-weight: 700; color: #fff; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .rh-confirm-ok:hover { opacity: .9; }

  .rh-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
  @media (max-width: 1024px) { .rh-stats { grid-template-columns: repeat(2, 1fr); } }
  .rh-stat-card { background: #fff; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rh-stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .rh-stat-top p { font-size: 0.875rem; font-weight: 600; color: #64748b; }
  .rh-stat-top .material-symbols-outlined { font-size: 1.5rem; opacity: 0.3; }
  .rh-stat-top .icon-blue { color: #003d7a; }
  .rh-stat-top .icon-green { color: #10b981; }
  .rh-stat-top .icon-amber { color: #f59e0b; }
  .rh-stat-num { font-size: 1.875rem; font-weight: 900; color: #0f172a; }
  .rh-stat-num.green { color: #059669; }
  .rh-stat-sub { font-size: 0.75rem; margin-top: 0.5rem; font-weight: 500; }
  .rh-stat-sub.up { color: #059669; display: flex; align-items: center; gap: 0.25rem; }
  .rh-stat-sub.up .material-symbols-outlined { font-size: 0.875rem; }
  .rh-stat-sub.muted { color: #94a3b8; font-style: italic; }

  .rh-bottom { display: grid; grid-template-columns: 5fr 7fr; gap: 2rem; height: calc(100vh - 520px); min-height: 450px; }
  @media (max-width: 1200px) { .rh-bottom { grid-template-columns: 1fr; height: auto; } }
  .rh-panel { background: #fff; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column; overflow: hidden; }
  .rh-panel-header { padding: 1.25rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; background: rgba(248,250,252,0.5); flex-shrink: 0; }
  .rh-panel-title { font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
  .rh-panel-title .material-symbols-outlined { color: #003d7a; }
  .rh-panel-badge { font-size: 0.625rem; font-weight: 700; color: #059669; text-transform: uppercase; background: #f0fdf4; padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: 1px solid #bbf7d0; }
  .rh-panel-body { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .rh-panel-body::-webkit-scrollbar { width: 4px; }
  .rh-panel-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .rh-panel-loading { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 2rem; color: #94a3b8; font-size: 0.875rem; }
  @keyframes rh-spin { to { transform: rotate(360deg); } }
  .rh-spin { animation: rh-spin 0.8s linear infinite; color: #003d7a; }
  .rh-panel-empty { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.875rem; }
  .rh-panel-empty .material-symbols-outlined { font-size: 2rem; display: block; margin-bottom: 0.5rem; color: #cbd5e1; }
  .rh-subject-card { padding: 1rem; border-radius: 0.5rem; border: 1px solid #f1f5f9; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
  .rh-subject-card:hover { border-color: rgba(0,61,122,0.3); background: #f8fafc; }
  .rh-subject-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.5rem; }
  .rh-subject-title { font-weight: 700; font-size: 0.875rem; color: #0f172a; }
  .rh-subject-ref { font-size: 0.625rem; font-weight: 700; color: #003d7a; background: rgba(0,61,122,0.05); padding: 0.25rem 0.5rem; border-radius: 0.25rem; white-space: nowrap; flex-shrink: 0; }
  .rh-subject-desc { font-size: 0.75rem; color: #64748b; margin-bottom: 0.75rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
  .rh-subject-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .rh-subject-chips { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .rh-subject-chip { font-size: 0.625rem; font-weight: 700; color: #475569; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 0.25rem; display: flex; align-items: center; gap: 0.25rem; }
  .rh-subject-chip .material-symbols-outlined { font-size: 0.75rem; color: #003d7a; }
  .rh-subject-dept { font-size: 0.625rem; color: #64748b; font-style: italic; }
  .rh-sort-btn { font-size: 0.625rem; font-weight: 700; color: #003d7a; padding: 0.25rem 0.75rem; background: #fff; border: 1px solid rgba(0,61,122,0.2); border-radius: 0.25rem; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .rh-sort-btn:hover { background: #003d7a; color: #fff; }
  .rh-table-wrap { flex: 1; overflow-x: auto; }
  table.rh-table { width: 100%; text-align: left; border-collapse: collapse; }
  table.rh-table thead tr { background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
  table.rh-table thead th { padding: 0.75rem 1.5rem; font-size: 0.625rem; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  table.rh-table tbody tr { border-bottom: 1px solid #f8fafc; transition: background 0.1s; }
  table.rh-table tbody tr:hover { background: #f8fafc; }
  table.rh-table tbody td { padding: 1rem 1.5rem; }
  .rh-cand-chip { width: 2rem; height: 2rem; border-radius: 9999px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; color: #475569; flex-shrink: 0; }
  .rh-cand-name { font-size: 0.875rem; font-weight: 700; color: #0f172a; }
  .rh-cand-school { font-size: 0.625rem; color: #64748b; }
  .rh-cand-subject { font-size: 0.75rem; font-weight: 500; color: #475569; }
  .rh-score-wrap { display: flex; align-items: center; gap: 0.5rem; }
  .rh-score-bar-bg { flex: 1; height: 0.375rem; width: 4rem; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
  .rh-score-bar { height: 100%; border-radius: 9999px; }
  .rh-score-bar.green { background: #10b981; }
  .rh-score-bar.amber { background: #f59e0b; }
  .rh-score-bar.gray { background: #cbd5e1; }
  .rh-score-val { font-size: 0.75rem; font-weight: 900; white-space: nowrap; }
  .rh-score-val.green { color: #059669; }
  .rh-score-val.amber { color: #d97706; }
  .rh-score-val.gray { color: #94a3b8; }
  .rh-panel-footer { padding: 1rem; border-top: 1px solid #f1f5f9; background: rgba(248,250,252,0.3); flex-shrink: 0; }
  .rh-see-all-btn { width: 100%; padding: 0.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .rh-see-all-btn:hover { background: #f8fafc; }

  @keyframes toastin { from{opacity:0;transform:translateY(1rem)} to{opacity:1;transform:translateY(0)} }
  .rh-toast { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 999; background: #0f172a; color: #fff; padding: .875rem 1.25rem; border-radius: .75rem; display: flex; align-items: center; gap: .625rem; font-size: .8125rem; font-weight: 600; box-shadow: 0 20px 25px -5px rgba(0,0,0,.25); animation: toastin .3s ease; font-family: 'Public Sans', sans-serif; }
  .rh-toast.success .material-symbols-outlined { color: #22c55e; }
  .rh-toast.error   .material-symbols-outlined { color: #ef4444; }
`;

// ── Définition des phases ─────────────────────────────────────────────────────
const PHASES = [
  {
    id:      'DEBUT',
    label:   'Début',
    icon:    'flag',
    api:     null, // pas d'API pour la phase initiale
    btnLabel: 'Phase active',
    info:    'Recrutement ouvert — candidatures en cours de réception.',
    color:   '#003d7a',
  },
  {
    id:      'CV',
    label:   'Analyse\nCV',
    icon:    'description',
    api:     '/api/candidatures/filtrer-et-envoyer',
    btnLabel: 'Lancer le filtrage CV',
    info:    'Filtrage automatique des CV par score IA. Les candidats qualifiés passent au quiz.',
    color:   '#7c3aed',
  },
  {
    id:      'QUIZ',
    label:   'Quiz\nTechnique',
    icon:    'quiz',
    api:     '/api/candidatures/quiz/global',
    btnLabel: 'Lancer le filtrage Quiz',
    info:    'Analyse des résultats du quiz. Les meilleurs scores accèdent à l\'entretien.',
    color:   '#0284c7',
  },
  {
    id:      'ENTRETIEN',
    label:   'Entretien\nRH',
    icon:    'groups',
    api:     '/api/candidatures/final/global',
    btnLabel: 'Lancer le filtrage Entretien',
    info:    'Évaluation des entretiens RH. Sélection finale des candidats retenus.',
    color:   '#059669',
  },
  {
    id:      'TERMINE',
    label:   'Terminé',
    icon:    'workspace_premium',
    api:     null,
    btnLabel: 'Recrutement clôturé',
    info:    'Le processus de recrutement est terminé.',
    color:   '#f59e0b',
  },
];

const stats = [
  { label: 'Candidatures Totales', value: '1,284', iconClass: 'icon-blue', icon: 'groups', sub: '+12%', subType: 'up' },
  { label: "Qualifiés par l'IA",   value: '312',   iconClass: 'icon-green', icon: 'auto_awesome', numClass: 'green', sub: 'Score de matching > 80%', subType: 'muted' },
  { label: 'Analyses en Cours',    value: '45',    iconClass: 'icon-amber', icon: 'psychology', sub: 'Traitement IA actif', subType: 'muted' },
  { label: 'Entretiens Prévus',    value: '18',    iconClass: 'icon-blue',  icon: 'calendar_month', sub: 'Semaine en cours', subType: 'muted' },
];

const Icon = ({ name, className='', style={} }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

// ─────────────────────────────────────────────────────────────────────────────
const RHDashboard = () => {
  const navigate = useNavigate();

  // ── État pipeline ─────────────────────────────────────────────────────────
  // phaseIndex : 0=DEBUT 1=CV 2=QUIZ 3=ENTRETIEN 4=TERMINE
  const [phaseIndex,  setPhaseIndex]  = useState(0);
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [confirm,     setConfirm]     = useState(false); // modal confirmation
  const [confirmPhase, setConfirmPhase] = useState(null); // phase à confirmer
  const [confirmReset, setConfirmReset] = useState(false); // modal reset pipeline
  const [toast,       setToast]       = useState(null);

  // ── Données ───────────────────────────────────────────────────────────────
  const [sujets,              setSujets]              = useState([]);
  const [loadingSujets,       setLoadingSujets]       = useState(true);
  const [candidatures,        setCandidatures]        = useState([]);
  const [loadingCandidatures, setLoadingCandidatures] = useState(true);
  const [sortByScore,         setSortByScore]         = useState(false);

  const showToast = (msg, type='success') => {
    setToast({msg,type});
    setTimeout(() => setToast(null), 4000);
  };

  // ── Charger la phase depuis la BDD au montage ───────────────────────────
  useEffect(() => {
    axios.get('/api/phase')
      .then(({ data }) => {
        const idx = PHASES.findIndex(p => p.id === data.phaseActuelle);
        if (idx >= 0) setPhaseIndex(idx);
      })
      .catch(() => {}); // DEBUT par défaut si erreur
  }, []);

  useEffect(() => {
    axios.get('/api/sujets')
      .then(({ data }) => setSujets(data.filter(s => s.statut === 'PUBLIE')))
      .catch(() => setSujets([]))
      .finally(() => setLoadingSujets(false));
  }, []);

  useEffect(() => {
    axios.get('/api/candidatures')
      .then(({ data }) => setCandidatures(data))
      .catch(() => setCandidatures([]))
      .finally(() => setLoadingCandidatures(false));
  }, []);

  const getInitiales  = (name='') => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?';
  const getScoreClass = (score)   => score==null?'gray':score>=70?'green':score>=45?'amber':'gray';
  const candidaturesAffichees = [...candidatures]
    .sort((a,b) => sortByScore ? (b.score??-1)-(a.score??-1) : 0)
    .slice(0, 10);

  // ── Déclencher une phase : LANCE LE FILTRAGE (phase.api) PUIS avance le pipeline ─
  const handlePhaseAction = async (targetPhase = null) => {
    const phase = targetPhase ?? PHASES[phaseIndex + 1];
    if (!phase || !phase.api) return;
    setConfirm(false);
    setPhaseLoading(true);

    const targetIdx = PHASES.findIndex(p => p.id === phase.id);
    const doAdvance = targetIdx === phaseIndex || targetIdx === phaseIndex + 1;
    const label = phase.label.replace('\n', ' ');

    try {
      // ── 1. ✅ APPELER L'API MÉTIER (le vrai filtrage CV / Quiz / Entretien) ──
      const filtrageResp = await axios.post(phase.api);
      console.log(`[Filtrage ${phase.id}]`, filtrageResp.data);

      // ── 2. Enregistrer l'avancement du pipeline en BDD ──
      const { data } = await axios.post('/api/phase/declencher', {
        phase:   phase.id,
        advance: doAdvance,
      });

      // ── 3. Mettre à jour l'affichage si on avance ──
      if (doAdvance) {
        const newIdx = PHASES.findIndex(p => p.id === data.phaseActuelle);
        if (newIdx >= 0) setPhaseIndex(newIdx);
        showToast(`✅ ${label} — ${filtrageResp.data?.message || 'filtrage effectué'} · pipeline avancé !`, 'success');
      } else {
        showToast(`🔄 ${label} re-déclenché — ${filtrageResp.data?.message || 'filtrage effectué'} (pipeline inchangé)`, 'success');
      }

      // ── 4. Rafraîchir les candidatures (statuts mis à jour par le filtrage) ──
      try {
        const { data: cands } = await axios.get('/api/candidatures');
        setCandidatures(cands);
      } catch { /* ignore */ }

    } catch(e) {
      showToast(e?.response?.data?.message || 'Erreur lors du filtrage', 'error');
    } finally {
      setPhaseLoading(false);
    }
  };

  // Reset pipeline → retour à DEBUT
  const handleReset = async () => {
    setConfirmReset(false);
    setPhaseLoading(true);
    try {
      await axios.post('/api/phase/reset');
      setPhaseIndex(0);
      showToast('🔄 Recrutement relancé — pipeline remis à zéro', 'success');
    } catch(e) {
      showToast(e?.response?.data?.message || 'Erreur serveur', 'error');
    } finally {
      setPhaseLoading(false);
    }
  };

  // Clic direct sur un cercle de phase → déclencher cette phase
  const handleCircleClick = (phase, ) => {
    // DEBUT et TERMINE n'ont pas d'API → ignorer
    if (!phase.api) return;
    setConfirmPhase(phase);
    setConfirm(true);
  };

  // ── Rendu pipeline ────────────────────────────────────────────────────────
  const renderPipeline = () => {
    const currentPhase = PHASES[phaseIndex];
    //const nextPhase    = PHASES[phaseIndex + 1];
    const isLast       = phaseIndex === PHASES.length - 1;

    return (
      <div className="rh-pipeline">
        <p className="rh-pipeline-title">
          <Icon name="route"/>Pipeline de recrutement
        </p>

        <div className="rh-pipeline-steps" style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
          {PHASES.map((phase, idx) => {
            // État de chaque étape
            let state = 'pending';
            if (idx < phaseIndex)  state = 'success';
            if (idx === phaseIndex) state = 'current';
            // DEBUT est toujours vert — c'est le point de départ
            if (idx === 0) state = 'success';

            const isConnectorDone = idx < phaseIndex;
            const isConnectorActive = idx === phaseIndex - 1;

            return (
              <div key={phase.id} className="rh-ps">
                <div className="rh-ps-inner">
                  <div
                    className={`rh-ps-circle ${state}${phase.api && idx > 0?' active-btn':''}`}
                    style={{
                      ...(state==='success' ? {borderColor:phase.color} : state==='current' ? {borderColor:phase.color,background:`${phase.color}12`} : {}),
                      ...(phase.api && idx > 0 ? {cursor:'pointer'} : {}),
                    }}
                    onClick={() => phase.api && idx > 0 && handleCircleClick(phase, idx)}
                    title={phase.api && idx > 0
                      ? idx < phaseIndex
                        ? `Re-déclencher : ${phase.btnLabel} (pipeline inchangé)`
                        : idx === phaseIndex
                          ? `Re-déclencher : ${phase.btnLabel} (pipeline inchangé)`
                          : `Déclencher : ${phase.btnLabel}`
                      : undefined
                    }
                  >
                    {state === 'success'
                      ? <Icon name="check" style={{color:phase.color}}/>
                      : <Icon name={phase.icon} style={state==='current'?{color:phase.color}:{}}/>
                    }
                  </div>
                  <span className={`rh-ps-label ${state}`}>{phase.label}</span>
                  <span className={`rh-ps-sub ${state}`}>
                    {state==='success' ? 'Terminé ✓' : state==='current' ? 'En cours' : 'En attente'}
                  </span>
                </div>
                {idx < PHASES.length - 1 && (
                  <div className={`rh-ps-line ${isConnectorDone?'done':isConnectorActive?'active':''}`}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Action button */}
        <div className="rh-phase-action">
          <div className="rh-phase-action-info">
            <Icon name={currentPhase.icon} style={{color:currentPhase.color}}/>
            <span>{currentPhase.info}</span>
          </div>

          {isLast ? (
            // TERMINE → bouton relancer
            <button
              className="rh-phase-btn success"
              disabled={phaseLoading}
              onClick={() => setConfirmReset(true)}
            >
              <Icon name={phaseLoading ? 'progress_activity' : 'restart_alt'} className={phaseLoading ? 'rh-btn-spin' : ''}/>
              {phaseLoading ? 'En cours...' : 'Relancer le recrutement'}
            </button>
          ) : currentPhase.api ? (
            // Phase avec API (CV, QUIZ, ENTRETIEN) → lancer CETTE phase
            <button
              className="rh-phase-btn primary"
              disabled={phaseLoading}
              onClick={() => { setConfirmPhase(currentPhase); setConfirm(true); }}
            >
              <Icon name={phaseLoading ? 'progress_activity' : currentPhase.icon} className={phaseLoading ? 'rh-btn-spin' : ''}/>
              {phaseLoading ? 'En cours...' : currentPhase.btnLabel}
            </button>
          ) : (
            // DEBUT → pas d'API, bouton désactivé
            <button className="rh-phase-btn done" disabled>
              <Icon name="hourglass_empty"/>
              En attente de candidatures
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="rh-db">

        {/* Toast */}
        {toast && (
          <div className={`rh-toast ${toast.type}`}>
            <Icon name={toast.type==='success'?'check_circle':'error'}/>{toast.msg}
          </div>
        )}

        {/* Modal confirmation */}
        {confirm && (
          <div className="rh-confirm-overlay" onClick={() => setConfirm(false)}>
            <div className="rh-confirm-modal" onClick={e => e.stopPropagation()}>
              <h3>
                {confirmPhase && PHASES.findIndex(p => p.id === confirmPhase.id) === phaseIndex + 1
                  ? 'Confirmer le passage à la phase suivante'
                  : 'Re-déclencher cette phase'
                }
              </h3>
              <p>
                Vous allez lancer <strong>{confirmPhase?.btnLabel ?? PHASES[phaseIndex+1]?.btnLabel}</strong>.<br/>
                {confirmPhase && PHASES.findIndex(p => p.id === confirmPhase.id) === phaseIndex + 1
                  ? 'Cette action lancera le filtrage et avancera le pipeline au stade suivant.'
                  : 'Cette phase a déjà été effectuée — le pipeline ne sera pas modifié, seul le filtrage sera re-exécuté.'
                }
              </p>
              <div className="rh-confirm-btns">
                <button className="rh-confirm-cancel" onClick={() => { setConfirm(false); setConfirmPhase(null); }}>Annuler</button>
                <button className="rh-confirm-ok" onClick={() => handlePhaseAction(confirmPhase)}>Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal reset pipeline */}
        {confirmReset && (
          <div className="rh-confirm-overlay" onClick={() => setConfirmReset(false)}>
            <div className="rh-confirm-modal" onClick={e => e.stopPropagation()}>
              <h3>Relancer le recrutement ?</h3>
              <p>
                Vous allez remettre le pipeline à zéro et recommencer un nouveau cycle de recrutement.<br/>
                <strong>Les candidatures et données existantes ne seront pas supprimées.</strong>
              </p>
              <div className="rh-confirm-btns">
                <button className="rh-confirm-cancel" onClick={() => setConfirmReset(false)}>Annuler</button>
                <button className="rh-confirm-ok" style={{background:'#059669'}} onClick={handleReset}>Relancer</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="rh-db-header">
          <div>
            <h2>Tableau de Bord RH — Vue Unifiée</h2>
            <p>Supervision temps-réel des recrutements et analyses prédictives.</p>
          </div>
          <div style={{fontSize:'.75rem',color:'#94a3b8',fontWeight:600}}>
            Phase actuelle : <strong style={{color:'#003d7a'}}>{PHASES[phaseIndex].label.replace('\n',' ')}</strong>
          </div>
        </div>

        {/* ── Pipeline ── */}
        {renderPipeline()}

        {/* Stats */}
        <div className="rh-stats">
          {stats.map(s => (
            <div key={s.label} className="rh-stat-card">
              <div className="rh-stat-top">
                <p>{s.label}</p>
                <Icon name={s.icon} className={s.iconClass} style={{opacity:.3}}/>
              </div>
              <p className={`rh-stat-num ${s.numClass||''}`}>{s.value}</p>
              <p className={`rh-stat-sub ${s.subType}`}>
                {s.subType==='up'&&<><Icon name="trending_up" style={{fontSize:'.875rem'}}/> {s.sub}</>}
                {s.subType==='muted'&&s.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom panels */}
        <div className="rh-bottom">
          {/* Sujets */}
          <div className="rh-panel">
            <div className="rh-panel-header">
              <h4 className="rh-panel-title"><Icon name="list_alt"/>Sujets de Stage Actifs</h4>
              <span className="rh-panel-badge">{loadingSujets?'...':`${sujets.length} Ouvert${sujets.length!==1?'s':''}`}</span>
            </div>
            <div className="rh-panel-body">
              {loadingSujets ? (
                <div className="rh-panel-loading"><Icon name="progress_activity" className="rh-spin"/>Chargement...</div>
              ) : sujets.length===0 ? (
                <div className="rh-panel-empty"><Icon name="description"/>Aucun sujet actif</div>
              ) : sujets.map(s => (
                <div key={s.id} className="rh-subject-card">
                  <div className="rh-subject-top">
                    <h5 className="rh-subject-title">{s.titre}</h5>
                    <span className="rh-subject-ref">{s.codeSujet}</span>
                  </div>
                  <p className="rh-subject-desc">{s.description}</p>
                  <div className="rh-subject-footer">
                    <div className="rh-subject-chips">
                      <span className="rh-subject-chip"><Icon name="group"/>{s.nbStagiaires} stagiaire{s.nbStagiaires>1?'s':''}</span>
                      <span className="rh-subject-chip"><Icon name="schedule"/>{s.duree}</span>
                    </div>
                    <span className="rh-subject-dept">{s.departement}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rh-panel-footer">
              <button className="rh-see-all-btn" onClick={() => navigate('/rh/sujets')}>
                Voir tous les sujets ({sujets.length})
              </button>
            </div>
          </div>

          {/* Candidatures */}
          <div className="rh-panel">
            <div className="rh-panel-header">
              <h4 className="rh-panel-title"><Icon name="person_search" style={{color:'#059669'}}/>Candidatures récentes (Scoring IA)</h4>
              <button className="rh-sort-btn" onClick={() => setSortByScore(s=>!s)}>
                {sortByScore?'Ordre original':'Trier par score'}
              </button>
            </div>
            <div className="rh-table-wrap">
              <table className="rh-table">
                <thead>
                  <tr>
                    <th>Candidat</th><th>Sujet Ciblé</th><th>Score IA</th><th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCandidatures ? (
                    <tr><td colSpan={4}><div className="rh-panel-loading"><Icon name="progress_activity" className="rh-spin"/>Chargement...</div></td></tr>
                  ) : candidaturesAffichees.length===0 ? (
                    <tr><td colSpan={4}><div className="rh-panel-empty"><Icon name="inbox"/>Aucune candidature</div></td></tr>
                  ) : candidaturesAffichees.map(c => {
                    const sc = getScoreClass(c.score);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                            <div className="rh-cand-chip">{getInitiales(c.candidatNom)}</div>
                            <div>
                              <p className="rh-cand-name">{c.candidatNom||'—'}</p>
                              <p className="rh-cand-school">{c.candidatEmail||''}</p>
                            </div>
                          </div>
                        </td>
                        <td><span className="rh-cand-subject">{c.sujetTitre||'—'}</span></td>
                        <td>
                          {c.score!=null ? (
                            <div className="rh-score-wrap">
                              <div className="rh-score-bar-bg"><div className={`rh-score-bar ${sc}`} style={{width:`${c.score}%`}}/></div>
                              <span className={`rh-score-val ${sc}`}>{c.score}%</span>
                            </div>
                          ) : <span style={{fontSize:'.75rem',color:'#94a3b8',fontStyle:'italic'}}>En attente...</span>}
                        </td>
                        <td>
                          <span style={{fontSize:'.625rem',fontWeight:700,padding:'.2rem .5rem',borderRadius:'.25rem',whiteSpace:'nowrap',
                            background:c.statut==='ACCEPTE'?'#f0fdf4':c.statut==='REFUSE'?'#fff5f5':c.statut==='ENTRETIEN_PLANIFIE'?'#fffbeb':'#eff6ff',
                            color:c.statut==='ACCEPTE'?'#059669':c.statut==='REFUSE'?'#dc2626':c.statut==='ENTRETIEN_PLANIFIE'?'#b45309':'#1d4ed8',
                          }}>{c.statutLabel||c.statut}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="rh-panel-footer">
              <button className="rh-see-all-btn" onClick={() => navigate('/rh/candidats')}>
                Voir toutes les candidatures ({candidatures.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RHDashboard;