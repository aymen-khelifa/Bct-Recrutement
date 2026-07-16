import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, LabelList, Legend, PieChart, Pie
} from 'recharts';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

  .rh-db * { box-sizing: border-box; }
  .rh-db { font-family: 'Public Sans', sans-serif; }
  .rh-db .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
  body { margin: 0; padding: 0; }

  /* ── HEADER ── */
  .rh-db-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
  .rh-db-header h2 { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin: 0; }
  .rh-db-header p { color: #64748b; margin-top: 0.25rem; font-size: 0.875rem; margin-bottom: 0; }
  .rh-db-header-right { display: flex; align-items: center; gap: 1rem; }
  .rh-db-phase-badge { font-size: .75rem; color: #94a3b8; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; padding: .4rem .9rem; border-radius: .5rem; }
  .rh-db-phase-badge strong { color: #003d7a; }

  /* ── PIPELINE ── */
  .rh-pipeline { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem 2rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .rh-pipeline-title { font-size: 0.6875rem; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; margin-bottom: 1.25rem; display: flex; align-items: center; gap: .5rem; }
  .rh-pipeline-title .material-symbols-outlined { font-size: 1rem; color: #003d7a; }
  .rh-pipeline-steps { display: flex; align-items: center; justify-content: center; gap: 0; overflow-x: auto; padding-bottom: .25rem; }
  .rh-pipeline-steps::-webkit-scrollbar { height: 3px; }
  .rh-pipeline-steps::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 9999px; }

  .rh-ps { display: flex; align-items: center; flex-shrink: 0; }
  .rh-ps-inner { display: flex; flex-direction: column; align-items: center; gap: .5rem; min-width: 7rem; }
  .rh-ps-circle { width: 3rem; height: 3rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid; transition: all .2s; position: relative; cursor: default; }
  .rh-ps-circle .material-symbols-outlined { font-size: 1.25rem; }
  .rh-ps-circle.pending  { background: #f8fafc; border-color: #e2e8f0; color: #cbd5e1; }
  .rh-ps-circle.current  { background: #eff6ff; border-color: #003d7a; color: #003d7a; box-shadow: 0 0 0 4px rgba(0,61,122,.1); }
  .rh-ps-circle.success  { background: #ecfdf5; border-color: #059669; color: #059669; }
  .rh-ps-circle.active-btn { cursor: pointer; }
  .rh-ps-circle.active-btn:hover { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(0,61,122,.12); }
  .rh-ps-label { font-size: .6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: #475569; text-align: center; line-height: 1.3; white-space: pre-line; }
  .rh-ps-label.current { color: #003d7a; }
  .rh-ps-label.success  { color: #059669; }
  .rh-ps-label.pending  { color: #94a3b8; }
  .rh-ps-sub { font-size: .5625rem; font-weight: 600; color: #94a3b8; text-align: center; }
  .rh-ps-sub.current { color: #003d7a; }
  .rh-ps-sub.success  { color: #059669; }
  .rh-ps-line { flex: 1; height: 2px; min-width: 2rem; background: #e2e8f0; margin: 0 .25rem; position: relative; top: -1.25rem; }
  .rh-ps-line.done   { background: #059669; }
  .rh-ps-line.active { background: linear-gradient(90deg, #059669, #003d7a); }

  .rh-phase-action { margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .rh-phase-action-info { display: flex; align-items: center; gap: .625rem; font-size: .8125rem; color: #475569; font-weight: 600; }
  .rh-phase-btn { display: flex; align-items: center; gap: .5rem; padding: .75rem 1.75rem; border: none; border-radius: .625rem; font-size: .875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all .2s; }
  .rh-phase-btn.primary { background: linear-gradient(135deg,#003d7a,#0056b3); color: #fff; box-shadow: 0 4px 12px rgba(0,61,122,.25); }
  .rh-phase-btn.primary:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
  .rh-phase-btn.success { background: linear-gradient(135deg,#059669,#047857); color: #fff; box-shadow: 0 4px 12px rgba(5,150,105,.25); }
  .rh-phase-btn.done { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
  .rh-phase-btn:disabled { opacity: .6; cursor: not-allowed; transform: none !important; }
  @keyframes rh-btn-spin { to { transform: rotate(360deg); } }
  .rh-btn-spin { animation: rh-btn-spin .7s linear infinite; }

  /* ── MODALS ── */
  .rh-confirm-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px); }
  .rh-confirm-modal { background: #fff; border-radius: 1rem; padding: 2rem; max-width: 24rem; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,.2); }
  .rh-confirm-modal h3 { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin-bottom: .5rem; margin-top: 0; }
  .rh-confirm-modal p { font-size: .875rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }
  .rh-confirm-btns { display: flex; gap: .75rem; justify-content: flex-end; }
  .rh-confirm-cancel { padding: .625rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: .5rem; font-size: .875rem; font-weight: 600; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .rh-confirm-ok { padding: .625rem 1.25rem; background: #003d7a; border: none; border-radius: .5rem; font-size: .875rem; font-weight: 700; color: #fff; cursor: pointer; font-family: 'Public Sans', sans-serif; }

  /* ── STATS ── */
  .rh-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
  @media (max-width: 1024px) { .rh-stats { grid-template-columns: repeat(2, 1fr); } }
  .rh-stat-card { background: #fff; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: box-shadow .2s, transform .2s; }
  .rh-stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); transform: translateY(-1px); }
  .rh-stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .rh-stat-top p { font-size: 0.875rem; font-weight: 600; color: #64748b; margin: 0; }
  .rh-stat-icon { width: 2.5rem; height: 2.5rem; border-radius: .625rem; display: flex; align-items: center; justify-content: center; }
  .rh-stat-icon.blue   { background: rgba(0,61,122,.08);  color: #003d7a; }
  .rh-stat-icon.green  { background: rgba(5,150,105,.08); color: #059669; }
  .rh-stat-icon.amber  { background: rgba(245,158,11,.08); color: #d97706; }
  .rh-stat-icon.purple { background: rgba(124,58,237,.08); color: #7c3aed; }
  .rh-stat-num { font-size: 1.875rem; font-weight: 900; color: #0f172a; margin: .25rem 0; }
  .rh-stat-num.green  { color: #059669; }
  .rh-stat-num.amber  { color: #d97706; }
  .rh-stat-num.purple { color: #7c3aed; }
  .rh-stat-sub { font-size: 0.75rem; font-weight: 500; display: flex; align-items: center; gap: .25rem; }
  .rh-stat-sub.up    { color: #059669; }
  .rh-stat-sub.muted { color: #94a3b8; font-style: italic; }

  /* ── BI SECTION ── */
  .rh-bi-section { margin-bottom: 2rem; }
  .rh-bi-section-title { font-size: 0.6875rem; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; margin-bottom: 1.25rem; display: flex; align-items: center; gap: .5rem; }
  .rh-bi-section-title .material-symbols-outlined { font-size: 1rem; color: #003d7a; }
  .rh-bi-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
  .rh-bi-grid-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem; }
  @media (max-width: 1100px) {
    .rh-bi-grid { grid-template-columns: 1fr; }
    .rh-bi-grid-bottom { grid-template-columns: 1fr; }
  }
  .rh-bi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: .875rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .rh-bi-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  .rh-bi-card-title { font-size: .8125rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: .5rem; margin: 0; }
  .rh-bi-card-title .material-symbols-outlined { font-size: 1.1rem; color: #003d7a; }
  .rh-bi-card-badge { font-size: .5625rem; font-weight: 700; color: #003d7a; background: rgba(0,61,122,.07); padding: .2rem .5rem; border-radius: .25rem; border: 1px solid rgba(0,61,122,.12); }
  .rh-bi-loading { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: 3rem; color: #94a3b8; font-size: .875rem; }
  .rh-bi-empty { text-align: center; padding: 2.5rem; color: #94a3b8; font-size: .8125rem; }
  .rh-bi-empty .material-symbols-outlined { font-size: 2rem; display: block; margin-bottom: .5rem; color: #cbd5e1; }

  /* Tooltip custom recharts */
  .rh-tooltip { background: #0f172a; border-radius: .5rem; padding: .625rem .875rem; box-shadow: 0 10px 25px rgba(0,0,0,.2); }
  .rh-tooltip-label { font-size: .625rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .25rem; }
  .rh-tooltip-value { font-size: .875rem; font-weight: 900; color: #fff; }

  /* Entonnoir custom */
  .rh-funnel { display: flex; flex-direction: column; gap: .5rem; }
  .rh-funnel-row { display: flex; align-items: center; gap: .75rem; }
  .rh-funnel-label { font-size: .6875rem; font-weight: 700; color: #475569; width: 6rem; flex-shrink: 0; text-align: right; }
  .rh-funnel-bar-wrap { flex: 1; position: relative; height: 2rem; background: #f8fafc; border-radius: .375rem; overflow: hidden; }
  .rh-funnel-bar { height: 100%; border-radius: .375rem; display: flex; align-items: center; justify-content: flex-end; padding-right: .625rem; transition: width 1s cubic-bezier(.4,0,.2,1); }
  .rh-funnel-bar span { font-size: .6875rem; font-weight: 900; color: #fff; }
  .rh-funnel-pct { font-size: .625rem; font-weight: 700; color: #94a3b8; width: 2.5rem; flex-shrink: 0; }

  /* ── BOTTOM PANELS ── */
  .rh-bottom { display: grid; grid-template-columns: 5fr 7fr; gap: 2rem; min-height: 420px; }
  @media (max-width: 1200px) { .rh-bottom { grid-template-columns: 1fr; } }
  .rh-panel { background: #fff; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column; overflow: hidden; }
  .rh-panel-header { padding: 1.25rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; background: rgba(248,250,252,0.5); flex-shrink: 0; }
  .rh-panel-title { font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; margin: 0; }
  .rh-panel-badge { font-size: 0.625rem; font-weight: 700; color: #059669; text-transform: uppercase; background: #f0fdf4; padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: 1px solid #bbf7d0; }
  .rh-panel-body { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .rh-panel-body::-webkit-scrollbar { width: 4px; }
  .rh-panel-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .rh-panel-loading { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 2rem; color: #94a3b8; font-size: 0.875rem; }
  @keyframes rh-spin { to { transform: rotate(360deg); } }
  .rh-spin { animation: rh-spin 0.8s linear infinite; color: #003d7a; }
  .rh-panel-empty { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.875rem; }
  .rh-panel-empty .material-symbols-outlined { font-size: 2rem; display: block; margin-bottom: 0.5rem; color: #cbd5e1; }

  .rh-subject-card { padding: 1rem; border-radius: 0.5rem; border: 1px solid #f1f5f9; cursor: pointer; transition: border-color 0.15s, background 0.15s, box-shadow .15s; }
  .rh-subject-card:hover { border-color: rgba(0,61,122,0.3); background: #f8fafc; box-shadow: 0 2px 8px rgba(0,61,122,.06); }
  .rh-subject-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.5rem; }
  .rh-subject-title { font-weight: 700; font-size: 0.875rem; color: #0f172a; margin: 0; }
  .rh-subject-ref { font-size: 0.625rem; font-weight: 700; color: #003d7a; background: rgba(0,61,122,0.05); padding: 0.25rem 0.5rem; border-radius: 0.25rem; white-space: nowrap; flex-shrink: 0; }
  .rh-subject-desc { font-size: 0.75rem; color: #64748b; margin-bottom: 0.75rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; margin-top: 0; }
  .rh-subject-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .rh-subject-chips { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .rh-subject-chip { font-size: 0.625rem; font-weight: 700; color: #475569; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 0.25rem; display: flex; align-items: center; gap: 0.25rem; }
  .rh-subject-chip .material-symbols-outlined { font-size: 0.75rem; color: #003d7a; }
  .rh-subject-dept { font-size: 0.625rem; color: #64748b; font-style: italic; }

  .rh-sort-btn { font-size: 0.625rem; font-weight: 700; color: #003d7a; padding: 0.25rem 0.75rem; background: #fff; border: 1px solid rgba(0,61,122,0.2); border-radius: 0.25rem; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all .15s; }
  .rh-sort-btn:hover { background: #003d7a; color: #fff; }

  .rh-table-wrap { flex: 1; overflow-x: auto; }
  table.rh-table { width: 100%; text-align: left; border-collapse: collapse; }
  table.rh-table thead tr { background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
  table.rh-table thead th { padding: 0.75rem 1.25rem; font-size: 0.625rem; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  table.rh-table tbody tr { border-bottom: 1px solid #f8fafc; transition: background 0.1s; }
  table.rh-table tbody tr:hover { background: #f8fafc; }
  table.rh-table tbody td { padding: .875rem 1.25rem; }
  .rh-cand-chip { width: 2rem; height: 2rem; border-radius: 9999px; background: linear-gradient(135deg,#003d7a,#0056b3); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.6875rem; color: #fff; flex-shrink: 0; }
  .rh-cand-name { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin: 0; }
  .rh-cand-school { font-size: 0.625rem; color: #64748b; margin: 0; }
  .rh-cand-subject { font-size: 0.75rem; font-weight: 500; color: #475569; }
  .rh-score-wrap { display: flex; align-items: center; gap: 0.5rem; }
  .rh-score-bar-bg { flex: 1; height: 0.375rem; width: 4rem; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
  .rh-score-bar { height: 100%; border-radius: 9999px; transition: width .8s ease; }
  .rh-score-bar.green { background: linear-gradient(90deg,#10b981,#059669); }
  .rh-score-bar.amber { background: linear-gradient(90deg,#fbbf24,#f59e0b); }
  .rh-score-bar.gray  { background: #cbd5e1; }
  .rh-score-val { font-size: 0.75rem; font-weight: 900; white-space: nowrap; }
  .rh-score-val.green { color: #059669; }
  .rh-score-val.amber { color: #d97706; }
  .rh-score-val.gray  { color: #94a3b8; }

  .rh-panel-footer { padding: 1rem; border-top: 1px solid #f1f5f9; background: rgba(248,250,252,0.3); flex-shrink: 0; }
  .rh-see-all-btn { width: 100%; padding: 0.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all .15s; }
  .rh-see-all-btn:hover { background: #f8fafc; border-color: #003d7a; color: #003d7a; }

  /* Statut badge */
  .rh-statut { font-size: .625rem; font-weight: 700; padding: .2rem .5rem; border-radius: .25rem; white-space: nowrap; }
  .rh-statut.ACCEPTE           { background: #f0fdf4; color: #059669; }
  .rh-statut.REFUSE            { background: #fff5f5; color: #dc2626; }
  .rh-statut.ENTRETIEN_PLANIFIE{ background: #fffbeb; color: #b45309; }
  .rh-statut.EN_ATTENTE        { background: #eff6ff; color: #1d4ed8; }
  .rh-statut.default           { background: #f1f5f9; color: #475569; }
  .rh-quiz-badge { display: inline-flex; align-items: center; gap: .25rem; padding: .2rem .5rem; border-radius: .375rem; font-size: .6875rem; font-weight: 700; background: rgba(124,58,237,.08); color: #7c3aed; border: 1px solid rgba(124,58,237,.2); }
.rh-entretien-badge { display: inline-flex; align-items: center; gap: .25rem; padding: .2rem .5rem; border-radius: .375rem; font-size: .6875rem; font-weight: 700; background: rgba(5,150,105,.08); color: #059669; border: 1px solid rgba(5,150,105,.2); }

  /* Pie legend */
  .rh-pie-legend-item { font-size: .6875rem !important; color: #475569; }

  @keyframes toastin { from{opacity:0;transform:translateY(1rem)} to{opacity:1;transform:translateY(0)} }
  .rh-toast { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 999; background: #0f172a; color: #fff; padding: .875rem 1.25rem; border-radius: .75rem; display: flex; align-items: center; gap: .625rem; font-size: .8125rem; font-weight: 600; box-shadow: 0 20px 25px -5px rgba(0,0,0,.25); animation: toastin .3s ease; font-family: 'Public Sans', sans-serif; max-width: 28rem; }
  .rh-toast.success .material-symbols-outlined { color: #22c55e; }
  .rh-toast.error   .material-symbols-outlined { color: #ef4444; }
`;

// ── Phases ────────────────────────────────────────────────────────────────────
const PHASES = [
  { id: 'DEBUT',     label: 'Début',             icon: 'flag',              api: null,                                    btnLabel: 'Phase active',              info: 'Recrutement ouvert — candidatures en cours.',                        color: '#003d7a' },
  { id: 'CV',        label: 'Analyse\nCV',        icon: 'description',       api: '/api/candidatures/filtrer-et-envoyer', btnLabel: 'Lancer le filtrage CV',      info: 'Filtrage automatique des CV par score IA.',                          color: '#7c3aed' },
  { id: 'QUIZ',      label: 'Quiz\nTechnique',    icon: 'quiz',              api: '/api/candidatures/quiz/global',        btnLabel: 'Lancer le filtrage Quiz',    info: 'Analyse des résultats du quiz.',                                     color: '#0284c7' },
  { id: 'ENTRETIEN', label: 'Entretien\nRH',      icon: 'groups',            api: '/api/candidatures/final/global',       btnLabel: 'Lancer le filtrage Entretien', info: 'Évaluation des entretiens RH.',                                   color: '#059669' },
  { id: 'TERMINE',   label: 'Terminé',            icon: 'workspace_premium', api: null,                                    btnLabel: 'Recrutement clôturé',       info: 'Le processus de recrutement est terminé.',                           color: '#f59e0b' },
];

const FUNNEL_COLORS = ['#003d7a', '#7c3aed', '#0284c7', '#059669'];
const LINE_COLOR    = '#7c3aed';

// Codes réels du système (StatutCandidature) → couleur cohérente avec le reste de l'app
const STATUT_COLORS = {
  EN_COURS_EXAMEN:     '#1d4ed8',
  PRESELECTIONNE_CV:   '#059669',
  ELIMINE_CV:          '#dc2626',
  ACCEPTE_QUIZ:        '#7c3aed',
  ELIMINE_QUIZ:        '#ae2828',
  ENTRETIEN_PLANIFIE:  '#ef8636',
  ACCEPTE_ENTRETIEN:   '#059669',
  ELIMINE_ENTRETIEN:   '#9a0f0f',
  ACCEPTE:             '#059669',
  REFUSE:              '#f94d4d',
};

const Icon = ({ name, className = '', style = {} }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

// ── Tooltip Recharts custom ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rh-tooltip">
      <p className="rh-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="rh-tooltip-value" style={{ color: p.color || '#fff' }}>
          {p.value}
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const RHDashboard = () => {
  const navigate = useNavigate();

  // ── Pipeline ─────────────────────────────────────────────────────────────
  const [phaseIndex,    setPhaseIndex]    = useState(0);
  const [phaseLoading,  setPhaseLoading]  = useState(false);
  const [confirm,       setConfirm]       = useState(false);
  const [confirmPhase,  setConfirmPhase]  = useState(null);
  const [confirmReset,  setConfirmReset]  = useState(false);
  const [toast,         setToast]         = useState(null);

  // ── Données ───────────────────────────────────────────────────────────────
  const [sujets,              setSujets]              = useState([]);
  const [loadingSujets,       setLoadingSujets]       = useState(true);
  const [candidatures,        setCandidatures]        = useState([]);
  const [loadingCandidatures, setLoadingCandidatures] = useState(true);
  const [sortByScore,         ]         = useState(false);

  // ── Données BI (backend) ─────────────────────────────────────────────────
  const [biParJour,    setBiParJour]    = useState([]);
  const [biParSujet,   setBiParSujet]   = useState([]);
  const [loadingBI,    setLoadingBI]    = useState(true);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    axios.get('/api/phase')
      .then(({ data }) => {
        const idx = PHASES.findIndex(p => p.id === data.phaseActuelle);
        if (idx >= 0) setPhaseIndex(idx);
      })
      .catch(() => {});
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

  // ── BI depuis le backend (évolution temporelle + top sujets) ─────────────
  // Ces deux-là nécessitent une agrégation SQL/JPQL (groupement par date,
  // comptage par sujet) → restent côté backend.
  useEffect(() => {
    Promise.all([
      axios.get('/api/stats/candidatures-par-jour'),
      axios.get('/api/stats/top-sujets'),
    ])
      .then(([jourRes, sujetRes]) => {
        setBiParJour(jourRes.data);
        setBiParSujet(sujetRes.data.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoadingBI(false));
  }, []);



 
  // ── Répartition par statut — calculée localement, pas d'appel réseau ─────
  const statutsDistribution = useMemo(() => {
    const map = {};
    candidatures.forEach(c => {
      const key = c.statut || 'INCONNU';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([statut, count]) => ({ statut, count, label: candidatures.find(c => c.statut === statut)?.statutLabel || statut }))
      .sort((a, b) => b.count - a.count);
  }, [candidatures]);
  const [nbSujetsPublies, setNbSujetsPublies] = useState(0);
  const [nbSujetsArchives, setNbSujetsArchives] = useState(0);

  useEffect(() => {
  axios.get('/api/sujets/all')
    .then(({ data }) => {
      const publies  = data.filter(s => s.statut === 'PUBLIE');
      const archives = data.filter(s => s.statut === 'ARCHIVE');
      setSujets(publies);
      setNbSujetsPublies(publies.length);
      setNbSujetsArchives(archives.length);
    })
    .catch(() => { setSujets([]); setNbSujetsPublies(0); setNbSujetsArchives(0); })
    .finally(() => setLoadingSujets(false));
}, []);


  // ── Stats cards ───────────────────────────────────────────────────────────
  const statsCards = useMemo(() => {
    const total    = candidatures.length;
    const rdv      = candidatures.filter(c => c.statut === 'ENTRETIEN_PLANIFIE').length;
    return [
   
{ label: 'Sujets Publiés', value: nbSujetsPublies, iconClass: 'blue', icon: 'work', numClass: '', sub: 'Offres de stage actives', subType: 'muted' }, 
         { label: 'Sujets Archivés',      value: nbSujetsArchives,          iconClass: 'amber',  icon: 'inventory_2',    numClass: 'amber',  sub: 'Offres clôturées',         subType: 'muted' },
 { label: 'Candidatures Totales', value: total.toLocaleString('fr'), iconClass: 'blue',   icon: 'groups',          numClass: '',        subType: 'muted' }, 
      { label: 'Entretiens Prévus',    value: rdv,                        iconClass: 'purple', icon: 'calendar_month',  numClass: 'purple',      subType: 'muted' },
    ];
  }, [candidatures,nbSujetsPublies, nbSujetsArchives]);

  const getInitiales  = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const getStatutClass = (statut) => ['ACCEPTE','REFUSE','ENTRETIEN_PLANIFIE','EN_ATTENTE'].includes(statut) ? statut : 'default';

  const candidaturesAffichees = useMemo(() =>
    [...candidatures]
      .sort((a, b) => sortByScore ? (b.score ?? -1) - (a.score ?? -1) : 0)
      .slice(0, 5),
    [candidatures, sortByScore]
  );

  // ── Actions pipeline ─────────────────────────────────────────────────────
  const handlePhaseAction = async (targetPhase = null) => {
    const phase = targetPhase ?? PHASES[phaseIndex + 1];
    if (!phase?.api) return;
    setConfirm(false);
    setPhaseLoading(true);
    const targetIdx = PHASES.findIndex(p => p.id === phase.id);
    const doAdvance = targetIdx === phaseIndex || targetIdx === phaseIndex + 1;
    const label = phase.label.replace('\n', ' ');
    try {
      const filtrageResp = await axios.post(phase.api);
      const { data } = await axios.post('/api/phase/declencher', { phase: phase.id, advance: doAdvance });
      if (doAdvance) {
        const newIdx = PHASES.findIndex(p => p.id === data.phaseActuelle);
        if (newIdx >= 0) setPhaseIndex(newIdx);
        showToast(`✅ ${label} — ${filtrageResp.data?.message || 'filtrage effectué'} · pipeline avancé !`, 'success');
      } else {
        showToast(`🔄 ${label} re-déclenché — ${filtrageResp.data?.message || 'filtrage effectué'}`, 'success');
      }
      try {
        const { data: cands } = await axios.get('/api/candidatures');
        setCandidatures(cands);
      } catch { /* ignore */ }
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur lors du filtrage', 'error');
    } finally {
      setPhaseLoading(false);
    }
  };

  const handleReset = async () => {
    setConfirmReset(false);
    setPhaseLoading(true);
    try {
      await axios.post('/api/phase/reset');
      setPhaseIndex(0);
      showToast('🔄 Recrutement relancé — pipeline remis à zéro', 'success');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur serveur', 'error');
    } finally {
      setPhaseLoading(false);
    }
  };

  const handleCircleClick = (phase) => {
    if (!phase.api) return;
    setConfirmPhase(phase);
    setConfirm(true);
  };

  // ── Rendu pipeline ────────────────────────────────────────────────────────
  const renderPipeline = () => {
    const currentPhase = PHASES[phaseIndex];
    const isLast = phaseIndex === PHASES.length - 1;
    return (
      <div className="rh-pipeline">
        <p className="rh-pipeline-title"><Icon name="route" />Pipeline de recrutement</p>
        <div className="rh-pipeline-steps">
          {PHASES.map((phase, idx) => {
            let state = 'pending';
            if (idx < phaseIndex)  state = 'success';
            if (idx === phaseIndex) state = 'current';
            if (idx === 0) state = 'success';
            return (
              <div key={phase.id} className="rh-ps">
                <div className="rh-ps-inner">
                  <div
                    className={`rh-ps-circle ${state}${phase.api && idx > 0 ? ' active-btn' : ''}`}
                    style={{
                      ...(state === 'success' ? { borderColor: phase.color } : state === 'current' ? { borderColor: phase.color, background: `${phase.color}12` } : {}),
                    }}
                    onClick={() => phase.api && idx > 0 && handleCircleClick(phase)}
                    title={phase.api && idx > 0 ? (idx <= phaseIndex ? `Re-déclencher : ${phase.btnLabel}` : `Déclencher : ${phase.btnLabel}`) : undefined}
                  >
                    {state === 'success'
                      ? <Icon name="check" style={{ color: phase.color }} />
                      : <Icon name={phase.icon} style={state === 'current' ? { color: phase.color } : {}} />
                    }
                  </div>
                  <span className={`rh-ps-label ${state}`}>{phase.label}</span>
                  <span className={`rh-ps-sub ${state}`}>
                    {state === 'success' ? 'Terminé ✓' : state === 'current' ? 'En cours' : 'En attente'}
                  </span>
                </div>
                {idx < PHASES.length - 1 && (
                  <div className={`rh-ps-line ${idx < phaseIndex ? 'done' : idx === phaseIndex - 1 ? 'active' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="rh-phase-action">
          <div className="rh-phase-action-info">
            <Icon name={currentPhase.icon} style={{ color: currentPhase.color }} />
            <span>{currentPhase.info}</span>
          </div>
          {isLast ? (
            <button className="rh-phase-btn success" disabled={phaseLoading} onClick={() => setConfirmReset(true)}>
              <Icon name={phaseLoading ? 'progress_activity' : 'restart_alt'} className={phaseLoading ? 'rh-btn-spin' : ''} />
              {phaseLoading ? 'En cours...' : 'Relancer le recrutement'}
            </button>
          ) : currentPhase.api ? (
            <button className="rh-phase-btn primary" disabled={phaseLoading} onClick={() => { setConfirmPhase(currentPhase); setConfirm(true); }}>
              <Icon name={phaseLoading ? 'progress_activity' : currentPhase.icon} className={phaseLoading ? 'rh-btn-spin' : ''} />
              {phaseLoading ? 'En cours...' : currentPhase.btnLabel}
            </button>
          ) : (
            <button className="rh-phase-btn done" disabled>
              <Icon name="hourglass_empty" />En attente de candidatures
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Rendu BI ──────────────────────────────────────────────────────────────
  const renderBI = () => (
    <div className="rh-bi-section">
      <p className="rh-bi-section-title"><Icon name="bar_chart" />Tableau de Bord BI — Analyse du Recrutement</p>

    <div className="rh-bi-grid">
  {/* Évolution des candidatures */}
  <div className="rh-bi-card">
    <div className="rh-bi-card-header">
      <h4 className="rh-bi-card-title"><Icon name="trending_up" />Évolution des candidatures / jour</h4>
      <span className="rh-bi-card-badge">30 derniers jours</span>
    </div>
    {loadingBI ? (
      <div className="rh-bi-loading"><Icon name="progress_activity" className="rh-spin" />Chargement...</div>
    ) : biParJour.length === 0 ? (
      <div className="rh-bi-empty"><Icon name="show_chart" />Pas encore de données</div>
    ) : (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={biParJour} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="total" stroke={LINE_COLOR} strokeWidth={2.5}
            dot={{ fill: LINE_COLOR, r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    )}
  </div>

  {/* Répartition des statuts */}
  <div className="rh-bi-card">
    <div className="rh-bi-card-header">
      <h4 className="rh-bi-card-title"><Icon name="donut_small" />Répartition des statuts</h4>
      <span className="rh-bi-card-badge">{candidatures.length} total</span>
    </div>
    {loadingCandidatures ? (
      <div className="rh-bi-loading"><Icon name="progress_activity" className="rh-spin" />Chargement...</div>
    ) : statutsDistribution.length === 0 ? (
      <div className="rh-bi-empty"><Icon name="donut_small" />Aucune donnée</div>
    ) : (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={statutsDistribution}
            dataKey="count"
            nameKey="label"
            cx="50%" cy="50%"
            innerRadius={42}
            outerRadius={72}
            paddingAngle={2}
          >
            {statutsDistribution.map((entry, i) => (
              <Cell key={i} fill={STATUT_COLORS[entry.statut] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle" iconSize={7}
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) => <span className="rh-pie-legend-item">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
</div>


      {/* Ligne 3 : Top sujets */}
      <div className="rh-bi-grid-bottom">
        <div className="rh-bi-card" style={{ gridColumn: 'span 2' }}>
          <div className="rh-bi-card-header">
            <h4 className="rh-bi-card-title"><Icon name="leaderboard" />Top sujets par candidatures reçues</h4>
            <span className="rh-bi-card-badge">Top 6</span>
          </div>
          {loadingBI ? (
            <div className="rh-bi-loading"><Icon name="progress_activity" className="rh-spin" />Chargement...</div>
          ) : biParSujet.length === 0 ? (
            <div className="rh-bi-empty"><Icon name="bar_chart" />Pas encore de données</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={biParSujet} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="sujet" tick={{ fontSize: 10, fill: '#475569' }} width={130} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {biParSujet.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#003d7a' : i === 1 ? '#7c3aed' : i === 2 ? '#0284c7' : '#059669'} />
                  ))}
                  <LabelList dataKey="total" position="right" style={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="rh-db">

        {/* Toast */}
        {toast && (
          <div className={`rh-toast ${toast.type}`}>
            <Icon name={toast.type === 'success' ? 'check_circle' : 'error'} />{toast.msg}
          </div>
        )}

        {/* Modal confirmation phase */}
        {confirm && (
          <div className="rh-confirm-overlay" onClick={() => setConfirm(false)}>
            <div className="rh-confirm-modal" onClick={e => e.stopPropagation()}>
              <h3>
                {confirmPhase && PHASES.findIndex(p => p.id === confirmPhase.id) === phaseIndex + 1
                  ? 'Confirmer le passage à la phase suivante'
                  : 'Re-déclencher cette phase'}
              </h3>
              <p>
                Vous allez lancer <strong>{confirmPhase?.btnLabel}</strong>.<br />
                {confirmPhase && PHASES.findIndex(p => p.id === confirmPhase.id) === phaseIndex + 1
                  ? 'Cette action lancera le filtrage et avancera le pipeline.'
                  : 'Cette phase a déjà été effectuée — le pipeline ne sera pas modifié.'}
              </p>
              <div className="rh-confirm-btns">
                <button className="rh-confirm-cancel" onClick={() => { setConfirm(false); setConfirmPhase(null); }}>Annuler</button>
                <button className="rh-confirm-ok" onClick={() => handlePhaseAction(confirmPhase)}>Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal reset */}
        {confirmReset && (
          <div className="rh-confirm-overlay" onClick={() => setConfirmReset(false)}>
            <div className="rh-confirm-modal" onClick={e => e.stopPropagation()}>
              <h3>Relancer le recrutement ?</h3>
              <p>Le pipeline sera remis à zéro.<br /><strong>Les candidatures existantes ne seront pas supprimées.</strong></p>
              <div className="rh-confirm-btns">
                <button className="rh-confirm-cancel" onClick={() => setConfirmReset(false)}>Annuler</button>
                <button className="rh-confirm-ok" style={{ background: '#059669' }} onClick={handleReset}>Relancer</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="rh-db-header">
          
            <h2 style={{ color: '#0f086c' }}>Tableau de Bord RH — Vue Unifiée</h2>
          
          <div className="rh-db-header-right">
            <div className="rh-db-phase-badge">
              Phase : <strong>{PHASES[phaseIndex].label.replace('\n', ' ')}</strong>
            </div>
          </div>
        </div>

        {/* Pipeline */}
        {renderPipeline()}

        {/* Stats */}
        <div className="rh-stats">
          {statsCards.map(s => (
            <div key={s.label} className="rh-stat-card">
              <div className="rh-stat-top">
                <p>{s.label}</p>
                <div className={`rh-stat-icon ${s.iconClass}`}>
                  <Icon name={s.icon} />
                </div>
              </div>
              <p className={`rh-stat-num ${s.numClass}`}>{s.value}</p>
              <p className={`rh-stat-sub ${s.subType}`}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── BI Section ── */}
        {renderBI()}

        {/* Bottom panels */}
        <div className="rh-bottom">
          {/* Sujets */}
          <div className="rh-panel">
            <div className="rh-panel-header">
              <h4 className="rh-panel-title"><Icon name="list_alt" />Sujets de Stage Actifs</h4>
              <span className="rh-panel-badge">{loadingSujets ? '...' : `${sujets.length} Ouvert${sujets.length !== 1 ? 's' : ''}`}</span>
            </div>
            <div className="rh-panel-body">
              {loadingSujets ? (
                <div className="rh-panel-loading"><Icon name="progress_activity" className="rh-spin" />Chargement...</div>
              ) : sujets.length === 0 ? (
                <div className="rh-panel-empty"><Icon name="description" />Aucun sujet actif</div>
              ) : sujets.slice(0, 3).map(s => (
                <div key={s.id} className="rh-subject-card" >
                  <div className="rh-subject-top">
                    <h5 className="rh-subject-title">{s.titre}</h5>
                    <span className="rh-subject-ref">{s.codeSujet}</span>
                  </div>
                  <p className="rh-subject-desc">{s.description}</p>
                  <div className="rh-subject-footer">
                    <div className="rh-subject-chips">
                      <span className="rh-subject-chip"><Icon name="group" />{s.nbStagiaires} stagiaire{s.nbStagiaires > 1 ? 's' : ''}</span>
                      <span className="rh-subject-chip"><Icon name="schedule" />{s.duree}</span>
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
              <h4 className="rh-panel-title"><Icon name="person_search" style={{ color: '#059669' }} />Candidatures récentes </h4>
             
            </div>
            <div className="rh-table-wrap">
              <table className="rh-table">
               <thead>
  <tr>
    <th>Candidat</th>
    <th>Sujet ciblé</th>
    
    <th>Statut</th>
  </tr>
</thead>
                <tbody>
                  {loadingCandidatures ? (
                    <tr><td colSpan={4}><div className="rh-panel-loading"><Icon name="progress_activity" className="rh-spin" />Chargement...</div></td></tr>
                  ) : candidaturesAffichees.length === 0 ? (
                    <tr><td colSpan={4}><div className="rh-panel-empty"><Icon name="inbox" />Aucune candidature</div></td></tr>
                  ) : candidaturesAffichees.map(c => {
 
  return (
    <tr key={c.id}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div className="rh-cand-chip">{getInitiales(c.candidatNom)}</div>
          <div>
            <p className="rh-cand-name">{c.candidatNom || '—'}</p>
            <p className="rh-cand-school">{c.candidatEmail || ''}</p>
          </div>
        </div>
      </td>
      <td><span className="rh-cand-subject">{c.sujetTitre || '—'}</span></td>
     
      <td>
        <span className={`rh-statut ${getStatutClass(c.statut)}`}>
          {c.statutLabel || c.statut}
        </span>
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