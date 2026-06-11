import { useState, useRef } from 'react';
import axios from 'axios';

const styles = `
  .ns-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .ns-root { font-family: 'Public Sans', sans-serif; }
  .ns-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
  .ns-header { margin-bottom: 2rem; }
  .ns-header h1 { font-size: 1.875rem; font-weight: 900; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.025em; }
  .ns-header p { color: #64748b; font-size: 0.875rem; line-height: 1.6; }
  body { margin: 0; padding: 0; }
  .ns-card { background: #fff; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(148,163,184,0.15); overflow: hidden; }
  .ns-section { padding: 2rem; border-bottom: 1px solid #f1f5f9; }
  .ns-section-title { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
  .ns-section-title .material-symbols-outlined { color: #003d7a; font-size: 1.25rem; }
  .ns-section-title h3 { font-size: 1rem; font-weight: 700; color: #1e293b; }
  .ns-grid-2 { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
  @media (min-width: 640px) { .ns-grid-2 { grid-template-columns: 1fr 1fr; } }
  .ns-grid-3 { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
  @media (min-width: 640px) { .ns-grid-3 { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1024px) { .ns-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }
  .ns-span2 { grid-column: 1 / -1; }
  .ns-label { display: block; font-size: 0.8125rem; font-weight: 600; color: #334155; margin-bottom: 0.375rem; }
  .ns-label span { color: #ef4444; margin-left: 0.125rem; }
  .ns-input, .ns-select { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #f8fafc; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; }
  .ns-input:focus, .ns-select:focus { border-color: #003d7a; box-shadow: 0 0 0 3px rgba(0,61,122,0.1); background: #fff; }
  .ns-input::placeholder { color: #94a3b8; }
  .ns-input-icon-wrap { position: relative; }
  .ns-input-icon-wrap .material-symbols-outlined { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.125rem; pointer-events: none; }
  .ns-input-icon-wrap .ns-input { padding-left: 2.375rem; }
  .ns-editor { border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; }
  .ns-toolbar { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0.5rem; display: flex; gap: 0.25rem; align-items: center; }
  .ns-toolbar-btn { padding: 0.25rem; border-radius: 0.25rem; background: none; border: none; cursor: pointer; color: #475569; line-height: 1; }
  .ns-toolbar-btn:hover { background: #e2e8f0; }
  .ns-toolbar-btn .material-symbols-outlined { font-size: 1.25rem; display: block; }
  .ns-toolbar-sep { width: 1px; height: 1.25rem; background: #e2e8f0; margin: 0 0.25rem; }
  .ns-textarea { width: 100%; padding: 0.875rem; border: none; outline: none; resize: vertical; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; background: #fff; line-height: 1.6; }
  .ns-textarea::placeholder { color: #94a3b8; }
  .ns-tags-wrap { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.625rem 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; min-height: 2.75rem; align-items: center; cursor: text; }
  .ns-tags-wrap:focus-within { border-color: #003d7a; box-shadow: 0 0 0 3px rgba(0,61,122,0.1); background: #fff; }
  .ns-tag { display: flex; align-items: center; gap: 0.25rem; background: rgba(0,61,122,0.08); color: #003d7a; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
  .ns-tag-remove { background: none; border: none; cursor: pointer; color: #003d7a; padding: 0; line-height: 1; display: flex; align-items: center; }
  .ns-tag-remove .material-symbols-outlined { font-size: 0.875rem; }
  .ns-tag-input { background: transparent; border: none; outline: none; font-size: 0.875rem; font-family: 'Public Sans', sans-serif; color: #0f172a; min-width: 8rem; flex: 1; }
  .ns-tag-input::placeholder { color: #94a3b8; }
  .ns-footer { padding: 1.25rem 2rem; background: #fff; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.75rem; align-items: stretch; justify-content: flex-end; }
  @media (min-width: 640px) { .ns-footer { flex-direction: row; align-items: center; } }
  .ns-btn-cancel { padding: 0.75rem 2rem; color: #475569; font-weight: 600; font-size: 0.875rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #fff; cursor: pointer; font-family: 'Public Sans', sans-serif; text-align: center; }
  .ns-btn-cancel:hover { background: #f8fafc; }
  .ns-btn-submit { padding: 0.75rem 2rem; background: linear-gradient(135deg, #003d7a 0%, #0056b3 100%); color: #fff; font-weight: 700; font-size: 0.875rem; border: none; border-radius: 0.5rem; cursor: pointer; font-family: 'Public Sans', sans-serif; box-shadow: 0 4px 6px -1px rgba(0,61,122,0.25); display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .ns-btn-submit:hover:not(:disabled) { opacity: 0.9; }
  .ns-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .ns-btn-submit .material-symbols-outlined { font-size: 1.125rem; }
  @keyframes ns-spin { to { transform: rotate(360deg); } }
  .ns-spin { animation: ns-spin 0.7s linear infinite; }
  .ns-field-error { font-size: 0.75rem; color: #ef4444; margin-top: 0.25rem; }
  .ns-api-error { background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; padding: 0.875rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; margin: 1.5rem 2rem 0; display: flex; align-items: center; gap: 0.5rem; }
  .ns-note { margin-top: 1.5rem; text-align: center; font-size: 0.6875rem; color: #94a3b8; }

  /* ── Quiz mode cards ── */
  .ns-quiz-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 640px) { .ns-quiz-cards { grid-template-columns: 1fr; } }
  .ns-quiz-card { border: 2px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; cursor: pointer; transition: all 0.2s; background: #f8fafc; position: relative; }
  .ns-quiz-card:hover { border-color: #003d7a; background: rgba(0,61,122,.03); }
  .ns-quiz-card.selected { border-color: #003d7a; background: rgba(0,61,122,.05); }
  .ns-quiz-card-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.625rem; display: flex; align-items: center; justify-content: center; margin-bottom: 0.875rem; }
  .ns-quiz-card-icon.ai { background: linear-gradient(135deg,#7c3aed,#4f46e5); }
  .ns-quiz-card-icon.manual { background: linear-gradient(135deg,#059669,#0284c7); }
  .ns-quiz-card-icon .material-symbols-outlined { color: #fff; font-size: 1.25rem; }
  .ns-quiz-card h4 { font-size: 0.9375rem; font-weight: 700; color: #0f172a; margin-bottom: 0.375rem; }
  .ns-quiz-card p { font-size: 0.75rem; color: #64748b; line-height: 1.55; }
  .ns-quiz-card .ns-check { position: absolute; top: 0.75rem; right: 0.75rem; width: 1.25rem; height: 1.25rem; border-radius: 50%; border: 2px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; }
  .ns-quiz-card.selected .ns-check { background: #003d7a; border-color: #003d7a; }
  .ns-quiz-card.selected .ns-check .material-symbols-outlined { color: #fff; font-size: 0.875rem; display: block; }
  .ns-quiz-card:not(.selected) .ns-check .material-symbols-outlined { display: none; }
  .ns-quiz-badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; margin-top: 0.625rem; }
  .ns-quiz-badge.ai { background: #f3f0ff; color: #7c3aed; }
  .ns-quiz-badge.manual { background: #ecfdf5; color: #059669; }
  .ns-quiz-badge .material-symbols-outlined { font-size: 0.75rem; }
  .ns-info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.625rem; padding: 0.875rem 1rem; display: flex; gap: 0.75rem; align-items: flex-start; margin-top: 1rem; }
  .ns-info-box .material-symbols-outlined { color: #2563eb; font-size: 1.125rem; flex-shrink: 0; margin-top: 0.0625rem; }
  .ns-info-box p { font-size: 0.8125rem; color: #1e40af; line-height: 1.55; }
  .ns-info-box strong { font-weight: 700; }

  /* ── Wizard stepper ── */
  .ns-stepper { display: flex; align-items: center; gap: 0; margin-bottom: 2rem; }
  .ns-step { display: flex; align-items: center; gap: 0.625rem; }
  .ns-step-num { width: 2rem; height: 2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0; transition: all 0.2s; }
  .ns-step-num.done { background: #059669; color: #fff; }
  .ns-step-num.active { background: #003d7a; color: #fff; box-shadow: 0 0 0 3px rgba(0,61,122,0.15); }
  .ns-step-num.pending { background: #e2e8f0; color: #94a3b8; }
  .ns-step-label { font-size: 0.8125rem; font-weight: 700; }
  .ns-step-label.active { color: #003d7a; }
  .ns-step-label.pending { color: #94a3b8; }
  .ns-step-label.done { color: #059669; }
  .ns-step-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 0.75rem; }
  .ns-step-line.done { background: #059669; }

  /* ── Quiz editor inline (étape 2) ── */
  .qe-wrap { display: grid; grid-template-columns: 1fr 260px; gap: 1.5rem; }
  @media (max-width: 900px) { .qe-wrap { grid-template-columns: 1fr; } }
  .qe-card { background: #fff; border-radius: 0.875rem; border: 1px solid #e2e8f0; overflow: hidden; }
  .qe-body { padding: 1.5rem; }
  .qe-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; display: block; margin-bottom: 0.625rem; }
  .qe-textarea { width: 100%; padding: 0.875rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.625rem; font-size: 0.9375rem; font-weight: 600; font-family: 'Public Sans', sans-serif; color: #0f172a; resize: none; outline: none; line-height: 1.6; }
  .qe-textarea:focus { border-color: #003d7a; box-shadow: 0 0 0 3px rgba(0,61,122,.07); background: #fff; }
  .qe-textarea.error { border-color: #ef4444; background: #fff8f8; }
  .qe-enonce-error { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; color: #ef4444; font-weight: 600; margin-top: 0.375rem; }
  .qe-diff-row { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
  .qe-diff-btn { padding: 0.375rem 0.875rem; border: 1.5px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; background: #f8fafc; color: #64748b; transition: all 0.15s; }
  .qe-diff-btn.sel { border-color: #003d7a; background: rgba(0,61,122,.06); color: #003d7a; }
  .qe-img-zone { border: 2px dashed #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 1.25rem; }
  .qe-img-zone:hover { border-color: #003d7a; background: rgba(0,61,122,.03); }
  .qe-img-zone.has { border-style: solid; border-color: #003d7a; background: rgba(0,61,122,.03); padding: 0.75rem; }
  .qe-img-preview { max-width: 100%; max-height: 180px; border-radius: 0.5rem; object-fit: contain; display: block; margin: 0 auto; cursor: zoom-in; }
  .qe-img-icon { font-size: 2rem !important; color: #cbd5e1; }
  .qe-img-text { font-size: 0.8125rem; color: #94a3b8; font-weight: 600; margin-top: 0.375rem; }
  .qe-img-actions { display: flex; gap: 0.5rem; margin-top: 0.625rem; justify-content: center; }
  .qe-opt-row { display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem 1.125rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.625rem; margin-bottom: 0.625rem; }
  .qe-opt-row.correct { background: rgba(0,61,122,.04); border-color: rgba(0,61,122,.3); }
  .qe-opt-radio { width: 1rem; height: 1rem; accent-color: #003d7a; flex-shrink: 0; cursor: pointer; }
  .qe-opt-input { flex: 1; background: transparent; border: none; outline: none; font-size: 0.875rem; font-family: 'Public Sans', sans-serif; color: #0f172a; font-weight: 500; }
  .qe-opt-input::placeholder { color: #cbd5e1; }
  .qe-opt-badge { font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #cbd5e1; white-space: nowrap; }
  .qe-opt-badge.ok { color: #059669; background: #ecfdf5; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
  .qe-footer { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.5rem; border-top: 1px solid #f1f5f9; background: #fafbfc; flex-wrap: wrap; gap: 0.75rem; }
  .qe-footer-info { font-size: 0.6875rem; color: #94a3b8; font-style: italic; display: flex; align-items: center; gap: 0.375rem; }
  .qe-footer-actions { display: flex; gap: 0.625rem; }
  .qe-btn-save { padding: 0.5625rem 1.25rem; background: #003d7a; color: #fff; border: none; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.375rem; }
  .qe-btn-save:hover { opacity: 0.88; }
  .qe-btn-save:disabled { opacity: 0.45; cursor: not-allowed; }
  .qe-btn-del { padding: 0.5rem 0.875rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; color: #dc2626; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.375rem; }
  .qe-btn-del:hover { background: #fee2e2; }
  .qe-btn-del:disabled { opacity: 0.4; cursor: not-allowed; }
  .qe-nav { display: flex; justify-content: space-between; margin-top: 1rem; }
  .qe-btn-nav { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.625rem; font-size: 0.8125rem; font-weight: 700; color: #0f172a; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .qe-btn-nav:hover { border-color: #003d7a; color: #003d7a; }
  .qe-btn-nav:disabled { opacity: 0.4; cursor: not-allowed; }
  .qe-bank { padding: 1.25rem; }
  .qe-bank-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  .qe-bank-title { font-size: 0.6875rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #0f172a; }
  .qe-bank-badge { padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.5625rem; font-weight: 700; background: #002b57; color: #fff; }
  .qe-bank-badge.warn { background: #fbbf24; color: #0f172a; }
  .qe-bank-badge.full { background: #ef4444; color: #fff; }
  .qe-progress { width: 100%; height: 0.3rem; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-bottom: 1rem; }
  .qe-progress-fill { height: 100%; background: #003d7a; border-radius: 9999px; transition: width 0.4s ease; }
  .qe-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 0.375rem; }
  .qe-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 0.375rem; font-size: 0.6rem; font-weight: 700; cursor: pointer; border: none; font-family: 'Public Sans', sans-serif; transition: all 0.15s; position: relative; }
  .qe-cell.done { background: #003d7a; color: #fff; }
  .qe-cell.current { background: #fff; border: 2px solid #003d7a; color: #003d7a; font-weight: 900; box-shadow: 0 0 0 3px rgba(0,61,122,0.1); }
  .qe-cell.empty { background: #e2e8f0; color: #94a3b8; }
  .qe-cell.hasimg::after { content: '🖼'; position: absolute; top: -3px; right: -3px; font-size: 0.5rem; }
  .qe-legend { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 0.5rem; }
  .qe-legend-item { display: flex; align-items: center; gap: 0.625rem; font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
  .qe-legend-dot { width: 0.625rem; height: 0.625rem; border-radius: 0.25rem; }
  .qe-legend-dot.done { background: #003d7a; }
  .qe-legend-dot.cur { background: #fff; border: 2px solid #003d7a; }
  .qe-legend-dot.empty { background: #e2e8f0; }
  .qe-btn-add { width: 100%; padding: 0.625rem; background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 0.5rem; color: #059669; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; justify-content: center; gap: 0.375rem; margin-top: 1rem; padding-top: 1rem; border-top-color: #f1f5f9; }
  .qe-btn-add:hover { background: #d1fae5; }
  .qe-btn-add:disabled { opacity: 0.4; cursor: not-allowed; }
  .qe-counter { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-radius: 0.625rem; margin-bottom: 1.25rem; border: 1.5px solid; }
  .qe-counter.ok { background: rgba(5,150,105,.04); border-color: rgba(5,150,105,.2); }
  .qe-counter.warn { background: rgba(245,158,11,.04); border-color: rgba(245,158,11,.2); }
  .qe-counter.full { background: rgba(239,68,68,.04); border-color: rgba(239,68,68,.2); }
  .qe-counter-num { font-size: 1.5rem; font-weight: 900; }
  .qe-counter.ok .qe-counter-num { color: #059669; }
  .qe-counter.warn .qe-counter-num { color: #d97706; }
  .qe-counter.full .qe-counter-num { color: #ef4444; }
  .qe-mgmt { background: #002b57; border-radius: 0.875rem; padding: 1.25rem; color: #fff; margin-top: 1rem; }
  .qe-mgmt h5 { font-size: 0.875rem; font-weight: 700; margin: 0.5rem 0; }
  .qe-mgmt p { font-size: 0.6875rem; color: rgba(168,200,255,.7); line-height: 1.6; }

  /* ── Lightbox ── */
  .ns-lb { position: fixed; inset: 0; z-index: 9999; background: rgba(15,23,42,.92); display: flex; align-items: center; justify-content: center; padding: 2rem; backdrop-filter: blur(6px); cursor: zoom-out; }
  .ns-lb-inner { position: relative; max-width: 90vw; max-height: 90vh; }
  .ns-lb img { max-width: 90vw; max-height: 85vh; border-radius: 1rem; object-fit: contain; box-shadow: 0 25px 60px rgba(0,0,0,.5); display: block; }
  .ns-lb-close { position: absolute; top: -1rem; right: -1rem; width: 2.25rem; height: 2.25rem; border-radius: 50%; background: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,.3); }
  .ns-lb-close .material-symbols-outlined { font-size: 1.125rem; }

  @keyframes toastin { from { opacity:0; transform:translateY(1rem); } to { opacity:1; transform:translateY(0); } }
  .ns-toast { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 999; background: #0f172a; color: #fff; padding: 0.875rem 1.25rem; border-radius: 0.75rem; display: flex; align-items: center; gap: 0.625rem; font-size: 0.8125rem; font-weight: 600; box-shadow: 0 20px 25px -5px rgba(0,0,0,.25); animation: toastin 0.3s ease; font-family: 'Public Sans', sans-serif; }
  .ns-toast.success .material-symbols-outlined { color: #22c55e; }
  .ns-toast.error .material-symbols-outlined { color: #ef4444; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 0.8s linear infinite; }
`;

const DEPARTEMENTS = ['Stabilité Financière','Opérations Monétaires','Informatique & Digital','Ressources Humaines','Audit Interne','Politique Monétaire','Statistiques & Data','Gestion des Risques'];
const NIVEAUX      = ['Bac+2 (BTS / DUT)','Licence (Bac+3)','Master 1 (Bac+4)','Master 2 (Bac+5)','Ingénieur','Doctorat'];
const SPECIALITES  = ['Finance & Marchés','Informatique / Data Science','Cybersécurité','Économie','Statistiques','Droit & Conformité','Ressources Humaines','Audit & Contrôle','Autre'];
const DIFFICULTES  = ['Débutant','Intermédiaire','Avancé','Expert'];
const LABELS       = ['A','B','C'];
const MAX_Q        = 50;

const makeEmptyQ = () => ({
  texte: '', difficulte: 'Intermédiaire', bonneReponse: 0,
  imageFile: null, imagePreview: null,
  options: [{texte:''},{texte:''},{texte:''}],
  done: false,
});

const Icon = ({ name, style={}, className='' }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

// ── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox = ({ src, onClose }) => (
  <div className="ns-lb" onClick={onClose}>
    <div className="ns-lb-inner" onClick={e => e.stopPropagation()}>
      <img src={src} alt="Aperçu"/>
      <button className="ns-lb-close" onClick={onClose}>
        <Icon name="close"/>
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const RHNouveauSujet = ({ onCancel, onSuccess }) => {
  // ── Wizard steps : 'sujet' | 'quiz' ─────────────────────────────────────
  const [step,     setStep]     = useState('sujet');
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast,    setToast]    = useState(null);
  const [errors,   setErrors]   = useState({});
  const [tagInput, setTagInput] = useState('');
  const [quizMode, setQuizMode] = useState('ai');
  const [lbSrc,    setLbSrc]    = useState(null);

  // ── Formulaire sujet ─────────────────────────────────────────────────────
  const [form, setForm] = useState({
    codeSujet: '', titre: '', departement: DEPARTEMENTS[0], duree: '6 mois',
    nbStagiaires: 1, niveauEtudes: NIVEAUX[2], specialite: SPECIALITES[0],
    description: '', competences: ['Python', 'SQL'],
  });

  // ── Quiz manuel — 50 questions locales ───────────────────────────────────
  const [questions,  setQuestions]  = useState([makeEmptyQ()]);
  const [currentQ,   setCurrentQ]   = useState(0);
  const [qError,     setQError]     = useState(false);
  const fileRef = useRef(null);

  const showToast = (msg, type='success') => {
    setToast({msg,type});
    setTimeout(() => setToast(null), 3000);
  };

  // ── Helpers formulaire sujet ──────────────────────────────────────────────
  const setF = (key, val) => { setForm(f => ({...f,[key]:val})); setErrors(e => ({...e,[key]:''})); setApiError(''); };
  const addTag = (e) => {
    if ((e.key==='Enter'||e.key===',') && tagInput.trim()) {
      e.preventDefault();
      if (!form.competences.includes(tagInput.trim())) setF('competences', [...form.competences, tagInput.trim()]);
      setTagInput('');
    }
  };
  const removeTag = (tag) => setF('competences', form.competences.filter(t => t!==tag));

  const validateSujet = () => {
    const e = {};
    if (!form.codeSujet.trim())   e.codeSujet   = 'Le code du sujet est obligatoire.';
    if (!form.titre.trim())       e.titre       = 'Le titre est obligatoire.';
    if (!form.description.trim()) e.description = 'La description est obligatoire.';
    if (form.nbStagiaires < 1)    e.nbStagiaires = 'Minimum 1 stagiaire.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Passer à étape 2 (quiz manuel) ───────────────────────────────────────
  const handleNextStep = () => {
    if (!validateSujet()) return;
    if (quizMode === 'ai') {
      handleSubmitFinal(); // IA → soumettre directement
    } else {
      setStep('quiz');
      window.scrollTo({top:0,behavior:'smooth'});
    }
  };

  // ── Helpers quiz manuel ───────────────────────────────────────────────────
  const q          = questions[currentQ] || makeEmptyQ();
  const totalDone  = questions.filter(qq => qq.done).length;
  const counterCls = questions.length >= MAX_Q ? 'full' : questions.length >= MAX_Q-5 ? 'warn' : 'ok';

  const updateQ      = patch => setQuestions(qs => qs.map((item,i) => i===currentQ ? {...item,...patch} : item));
  const updateOpt    = (idx, texte) => { const opts=[...q.options]; opts[idx]={...opts[idx],texte}; updateQ({options:opts}); };

  const handleImgChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    updateQ({ imageFile: file, imagePreview: preview });
  };
  const handleImgRemove = () => {
    if (q.imagePreview?.startsWith('blob:')) URL.revokeObjectURL(q.imagePreview);
    updateQ({ imageFile: null, imagePreview: null });
    if (fileRef.current) fileRef.current.value = '';
  };

  // Valider et marquer la question courante comme "done"
  const saveCurrentQ = () => {
    if (!q.texte.trim()) { setQError(true); showToast('L\'énoncé est obligatoire.', 'error'); return false; }
    setQError(false);
    if (q.options.some(o => !o.texte.trim())) { showToast('Toutes les options doivent être remplies.', 'error'); return false; }
    updateQ({ done: true });
    showToast(`Question ${currentQ+1} enregistrée ✓`);
    return true;
  };

  const addQuestion = () => {
    if (questions.length >= MAX_Q) { showToast(`Maximum ${MAX_Q} questions.`, 'error'); return; }
    setQuestions(qs => [...qs, makeEmptyQ()]);
    setCurrentQ(questions.length);
  };

  const deleteQuestion = () => {
    if (questions.length <= 1) { showToast('Impossible de supprimer la dernière question.', 'error'); return; }
    setQuestions(qs => qs.filter((_,i) => i!==currentQ));
    setCurrentQ(Math.max(0, currentQ-1));
  };

  // ── Submit final ──────────────────────────────────────────────────────────
  const handleSubmitFinal = async () => {
    setLoading(true);
    setApiError('');
    try {
      // 1. Créer le sujet
      const { data: sujetCree } = await axios.post('/api/sujets', { ...form, quizMode });

      if (quizMode === 'manuel') {
        // 2. Récupérer le quiz créé automatiquement avec le sujet
        const { data: quiz } = await axios.get(`/api/quiz/sujet/${sujetCree.id}`);
        const quizId = quiz.id;

        // 3. Uploader chaque question avec ses options et image
        for (const qq of questions) {
          if (!qq.texte.trim()) continue; // sauter les questions vides

          const payload = {
            texte:      qq.texte,
            difficulte: qq.difficulte,
            options:    qq.options.map((o, idx) => ({
              texte:    o.texte,
              correcte: idx === qq.bonneReponse,
            })),
          };

          const formData = new FormData();
          formData.append('question', JSON.stringify(payload));
          if (qq.imageFile) formData.append('image', qq.imageFile);

          await axios.post(`/api/quiz/${quizId}/question`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      onSuccess?.();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Erreur lors de la publication.');
      setStep('sujet'); // retourner à l'étape 1 en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDU — ÉTAPE 1 : Formulaire sujet
  // ─────────────────────────────────────────────────────────────────────────
  const renderSujet = () => (
    <div className="ns-card">
      <form onSubmit={e => { e.preventDefault(); handleNextStep(); }} noValidate>
        {apiError && (
          <div className="ns-api-error">
            <Icon name="error"/>{apiError}
          </div>
        )}

        {/* 1. Infos générales */}
        <div className="ns-section">
          <div className="ns-section-title"><Icon name="info"/><h3>Informations Générales</h3></div>
          <div className="ns-grid-2">
            <div>
              <label className="ns-label" htmlFor="ns-code">Code du sujet <span>*</span></label>
              <div className="ns-input-icon-wrap">
                <Icon name="tag"/>
                <input className="ns-input" id="ns-code" type="text" placeholder="ex: BC-24-001"
                  value={form.codeSujet} onChange={e => setF('codeSujet', e.target.value.toUpperCase())}/>
              </div>
              {errors.codeSujet && <p className="ns-field-error">{errors.codeSujet}</p>}
            </div>
            <div>
              <label className="ns-label" htmlFor="ns-duree">Durée du stage</label>
              <select className="ns-select" id="ns-duree" value={form.duree} onChange={e => setF('duree', e.target.value)}>
                {['1 mois','2 mois','3 mois','4 mois','5 mois','6 mois'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="ns-span2">
              <label className="ns-label" htmlFor="ns-titre">Titre du stage <span>*</span></label>
              <input className="ns-input" id="ns-titre" type="text"
                placeholder="ex: Analyse des Risques de Marché via Machine Learning"
                value={form.titre} onChange={e => setF('titre', e.target.value)}/>
              {errors.titre && <p className="ns-field-error">{errors.titre}</p>}
            </div>
            <div className="ns-span2">
              <label className="ns-label" htmlFor="ns-dept">Département</label>
              <select className="ns-select" id="ns-dept" value={form.departement} onChange={e => setF('departement', e.target.value)}>
                {DEPARTEMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 2. Profil */}
        <div className="ns-section">
          <div className="ns-section-title"><Icon name="school"/><h3>Profil Recherché</h3></div>
          <div className="ns-grid-3">
            <div>
              <label className="ns-label" htmlFor="ns-nb">Nombre de stagiaires <span>*</span></label>
              <select className="ns-select" id="ns-nb" value={form.nbStagiaires}
                onChange={e => setF('nbStagiaires', Number(e.target.value))}>
                <option value={1}>1 stagiaire</option>
                <option value={2}>2 stagiaires</option>
                <option value={3}>3 stagiaires</option>
              </select>
              {errors.nbStagiaires && <p className="ns-field-error">{errors.nbStagiaires}</p>}
            </div>
            <div>
              <label className="ns-label" htmlFor="ns-niveau">Niveau d'études requis</label>
              <select className="ns-select" id="ns-niveau" value={form.niveauEtudes}
                onChange={e => setF('niveauEtudes', e.target.value)}>
                {NIVEAUX.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="ns-label" htmlFor="ns-spe">Spécialité</label>
              <select className="ns-select" id="ns-spe" value={form.specialite}
                onChange={e => setF('specialite', e.target.value)}>
                {SPECIALITES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Description */}
        <div className="ns-section">
          <div className="ns-section-title"><Icon name="description"/><h3>Description du Sujet <span style={{color:'#ef4444',fontSize:'0.875rem'}}>*</span></h3></div>
          <div className="ns-editor">
            <div className="ns-toolbar">
              {['format_bold','format_italic','format_list_bulleted','format_list_numbered'].map(icon => (
                <button key={icon} type="button" className="ns-toolbar-btn">
                  <Icon name={icon}/>
                </button>
              ))}
              <div className="ns-toolbar-sep"/>
              <button type="button" className="ns-toolbar-btn"><Icon name="link"/></button>
            </div>
            <textarea className="ns-textarea" rows={7}
              placeholder="Décrivez les objectifs, les missions et les livrables attendus du stage..."
              value={form.description} onChange={e => setF('description', e.target.value)}/>
          </div>
          {errors.description && <p className="ns-field-error" style={{marginTop:'0.5rem'}}>{errors.description}</p>}
        </div>

        {/* 4. Compétences */}
        <div className="ns-section">
          <div className="ns-section-title"><Icon name="psychology"/><h3>Compétences Requises</h3></div>
          <div className="ns-tags-wrap" onClick={() => document.getElementById('ns-tag-input').focus()}>
            {form.competences.map(tag => (
              <span key={tag} className="ns-tag">
                {tag}
                <button type="button" className="ns-tag-remove" onClick={() => removeTag(tag)}>
                  <Icon name="close"/>
                </button>
              </span>
            ))}
            <input id="ns-tag-input" className="ns-tag-input"
              placeholder="Ajouter une compétence et appuyer sur Entrée..."
              value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}/>
          </div>
          <p style={{fontSize:'0.75rem',color:'#94a3b8',marginTop:'0.5rem'}}>
            Appuyez sur <strong>Entrée</strong> ou <strong>,</strong> pour ajouter.
          </p>
        </div>

        {/* 5. Mode quiz */}
        <div className="ns-section" style={{borderBottom:'none'}}>
          <div className="ns-section-title"><Icon name="quiz"/><h3>Quiz d'Évaluation</h3></div>
          <div className="ns-quiz-cards">
            <div className={`ns-quiz-card${quizMode==='ai'?' selected':''}`} onClick={() => setQuizMode('ai')}>
              <div className="ns-check"><Icon name="check"/></div>
              <div className="ns-quiz-card-icon ai"><Icon name="smart_toy"/></div>
              <h4>Généré par l'IA</h4>
              <p>50 questions QCM générées automatiquement par Groq Llama à partir du titre, de la description et des compétences du sujet.</p>
              <span className="ns-quiz-badge ai"><Icon name="auto_awesome" style={{fontSize:'0.75rem'}}/>Automatique — Groq Llama</span>
            </div>
            <div className={`ns-quiz-card${quizMode==='manuel'?' selected':''}`} onClick={() => setQuizMode('manuel')}>
              <div className="ns-check"><Icon name="check"/></div>
              <div className="ns-quiz-card-icon manual"><Icon name="edit_note"/></div>
              <h4>Créé manuellement</h4>
              <p>Vous rédigez vous-même les 50 questions et leurs 3 options de réponse, avec image optionnelle par question (Cloudinary).</p>
              <span className="ns-quiz-badge manual"><Icon name="person" style={{fontSize:'0.75rem'}}/>Manuel — 50 questions</span>
            </div>
          </div>
          {quizMode === 'ai' ? (
            <div className="ns-info-box">
              <Icon name="info"/>
              <p><strong>Génération automatique :</strong> dès la publication, l'IA génère 50 questions QCM. Vous pouvez les modifier ensuite depuis l'éditeur de quiz.</p>
            </div>
          ) : (
            <div className="ns-info-box" style={{background:'#f0fdf4',borderColor:'#bbf7d0'}}>
              <Icon name="info" style={{color:'#059669'}}/>
              <p style={{color:'#166534'}}><strong>Quiz manuel :</strong> après avoir validé les informations du sujet, vous accéderez à l'éditeur pour créer vos 50 questions avant la publication finale.</p>
            </div>
          )}
        </div>

        <div className="ns-footer">
          <button type="button" className="ns-btn-cancel" onClick={onCancel}>Annuler</button>
          <button type="submit" className="ns-btn-submit" disabled={loading}>
            <Icon name={loading ? 'progress_activity' : quizMode==='manuel' ? 'arrow_forward' : 'send'} className={loading?'ns-spin':''}/>
            {loading ? 'En cours...' : quizMode==='manuel' ? 'Suivant — Créer le quiz' : 'Publier avec quiz IA'}
          </button>
        </div>
      </form>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDU — ÉTAPE 2 : Éditeur quiz manuel
  // ─────────────────────────────────────────────────────────────────────────
  const renderQuiz = () => (
    <div>
      {/* Compteur */}
      <div className={`qe-counter ${counterCls}`}>
        <div>
          <div className="qe-counter-num">{totalDone}/{MAX_Q}</div>
          <div style={{fontSize:'0.75rem',color:'#64748b',marginTop:'0.125rem'}}>questions complétées</div>
        </div>
        <div style={{textAlign:'right',fontSize:'0.75rem',color:'#64748b'}}>
          <div style={{fontWeight:700,color: questions.length>=MAX_Q?'#ef4444':'#0f172a'}}>{questions.length}/{MAX_Q} créées</div>
          <div>{MAX_Q - questions.length} restantes</div>
        </div>
      </div>

      {/* Message progression */}
      {totalDone < MAX_Q ? (
        <div style={{display:'flex',alignItems:'center',gap:'.625rem',padding:'.75rem 1rem',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'.625rem',marginBottom:'1.25rem',fontSize:'.8125rem',color:'#92400e',fontWeight:600}}>
          <Icon name="warning" style={{color:'#d97706',fontSize:'1.125rem'}}/>
          Il reste <strong style={{color:'#b45309',margin:'0 .25rem'}}>{MAX_Q - totalDone} question{MAX_Q-totalDone>1?'s':''}</strong> à compléter. Utilisez <strong style={{color:'#b45309',margin:'0 .25rem'}}>Enregistrer</strong> sur chaque question.
        </div>
      ) : (
        <div style={{display:'flex',alignItems:'center',gap:'.625rem',padding:'.75rem 1rem',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'.625rem',marginBottom:'1.25rem',fontSize:'.8125rem',color:'#166534',fontWeight:600}}>
          <Icon name="check_circle" style={{color:'#059669',fontSize:'1.125rem'}}/>
          <strong>Quiz complet !</strong>&nbsp;Toutes les {MAX_Q} questions sont prêtes — vous pouvez publier.
        </div>
      )}

      <div className="qe-wrap">
        {/* ── Colonne gauche ── */}
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="qe-card">
            <div className="qe-body">

              {/* Difficulté */}
              <label className="qe-label">Difficulté</label>
              <div className="qe-diff-row">
                {DIFFICULTES.map(d => (
                  <button key={d} type="button"
                    className={`qe-diff-btn${q.difficulte===d?' sel':''}`}
                    onClick={() => updateQ({difficulte:d})}>
                    {d}
                  </button>
                ))}
              </div>

              {/* Énoncé */}
              <label className="qe-label">Énoncé de la question <span style={{color:'#ef4444'}}>*</span></label>
              <textarea
                className={`qe-textarea${qError?' error':''}`} rows={3}
                placeholder="Saisissez l'intitulé de la question..."
                value={q.texte}
                onChange={e => { updateQ({texte:e.target.value}); if(e.target.value.trim()) setQError(false); }}
              />
              {qError && <p className="qe-enonce-error"><Icon name="error"/>L'énoncé est obligatoire.</p>}

              {/* Image */}
              <div style={{marginTop:'1.25rem',marginBottom:'0'}}>
                <label className="qe-label">Image (optionnel) — uploadée vers Cloudinary</label>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImgChange}/>
                <div
                  className={`qe-img-zone${q.imagePreview?' has':''}`}
                  onClick={() => !q.imagePreview && fileRef.current?.click()}
                  style={{display:'flex',flexDirection:'column',alignItems:'center'}}
                >
                  {q.imagePreview ? (
                    <>
                      <img src={q.imagePreview} alt="Aperçu" className="qe-img-preview"
                        onClick={e => { e.stopPropagation(); setLbSrc(q.imagePreview); }}/>
                      <p style={{fontSize:'.625rem',color:'#94a3b8',marginTop:'.375rem'}}>Cliquez sur l'image pour agrandir</p>
                      <div className="qe-img-actions">
                        <button type="button"
                          onClick={e=>{e.stopPropagation();fileRef.current?.click();}}
                          style={{padding:'.375rem .875rem',background:'rgba(0,61,122,.08)',border:'1px solid rgba(0,61,122,.2)',borderRadius:'.375rem',color:'#003d7a',fontSize:'.75rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'.375rem'}}>
                          <Icon name="swap_horiz" style={{fontSize:'.875rem'}}/>Changer
                        </button>
                        <button type="button"
                          onClick={e=>{e.stopPropagation();handleImgRemove();}}
                          style={{padding:'.375rem .875rem',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'.375rem',color:'#dc2626',fontSize:'.75rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'.375rem'}}>
                          <Icon name="delete" style={{fontSize:'.875rem'}}/>Supprimer
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Icon name="add_photo_alternate" className="qe-img-icon"/>
                      <p className="qe-img-text">Cliquez pour ajouter une image (JPG, PNG, GIF...)</p>
                    </>
                  )}
                </div>
              </div>

              {/* Options */}
              <div style={{marginTop:'1.5rem'}}>
                <label className="qe-label">Options de réponse — sélectionnez la correcte <span style={{color:'#ef4444'}}>*</span></label>
                {q.options.map((opt, idx) => {
                  const isCorrect = q.bonneReponse === idx;
                  return (
                    <div key={idx} className={`qe-opt-row${isCorrect?' correct':''}`}>
                      <input type="radio" className="qe-opt-radio"
                        name={`q-${currentQ}`} checked={isCorrect}
                        onChange={() => updateQ({bonneReponse:idx})}/>
                      <input type="text" className="qe-opt-input"
                        placeholder={`Option ${LABELS[idx]}...`}
                        value={opt.texte}
                        onChange={e => updateOpt(idx, e.target.value)}/>
                      <span className={`qe-opt-badge${isCorrect?' ok':''}`}>
                        {isCorrect ? '✓ Correcte' : `Option ${LABELS[idx]}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="qe-footer">
              <div className="qe-footer-info">
                <Icon name="info" style={{fontSize:'1rem'}}/>
                Question {currentQ+1}/{questions.length}
                {q.imagePreview ? ' · 🖼 Image' : ''}
                {q.done ? <span style={{color:'#059669',marginLeft:'.25rem'}}>· ✓ Enregistrée</span> : ''}
              </div>
              <div className="qe-footer-actions">
                <button type="button" className="qe-btn-del"
                  disabled={questions.length<=1} onClick={deleteQuestion}>
                  <Icon name="delete"/>Supprimer
                </button>
                <button type="button" className="qe-btn-save" onClick={saveCurrentQ}>
                  <Icon name="save"/>Enregistrer
                </button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="qe-nav">
            <button type="button" className="qe-btn-nav" disabled={currentQ===0}
              onClick={() => setCurrentQ(c => Math.max(0,c-1))}>
              <Icon name="arrow_back"/>Précédente
            </button>
            <button type="button" className="qe-btn-nav" disabled={currentQ===questions.length-1}
              onClick={() => setCurrentQ(c => Math.min(questions.length-1,c+1))}>
              Suivante<Icon name="arrow_forward"/>
            </button>
          </div>
        </div>

        {/* ── Colonne droite ── */}
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="qe-card qe-bank">
            <div className="qe-bank-header">
              <span className="qe-bank-title">Banque de Questions</span>
              <span className={`qe-bank-badge${questions.length>=MAX_Q?' full':questions.length>=MAX_Q-5?' warn':''}`}>
                {questions.length}/{MAX_Q}
              </span>
            </div>
            <div className="qe-progress">
              <div className="qe-progress-fill" style={{width:`${(questions.length/MAX_Q)*100}%`}}/>
            </div>
            <div className="qe-grid">
              {questions.map((qq,i) => {
                const cls = i===currentQ ? 'current' : qq.done ? 'done' : 'empty';
                return (
                  <button key={i} type="button"
                    className={`qe-cell ${cls}${qq.imagePreview?' hasimg':''}`}
                    onClick={() => setCurrentQ(i)}>
                    {i+1}
                  </button>
                );
              })}
            </div>
            <div className="qe-legend">
              <div className="qe-legend-item"><div className="qe-legend-dot done"/>Enregistrée</div>
              <div className="qe-legend-item"><div className="qe-legend-dot cur"/>En cours</div>
              <div className="qe-legend-item"><div className="qe-legend-dot empty"/>Vide</div>
              <div className="qe-legend-item"><span style={{fontSize:'.75rem'}}>🖼</span>Avec image</div>
            </div>
            <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid #f1f5f9'}}>
              <button type="button" className="qe-btn-add" onClick={addQuestion} disabled={questions.length>=MAX_Q}>
                <Icon name="add_circle"/>
                {questions.length>=MAX_Q ? `Complet (${MAX_Q}/${MAX_Q})` : `Ajouter une question (${questions.length}/${MAX_Q})`}
              </button>
            </div>
          </div>

          <div className="qe-mgmt">
            <Icon name="inventory_2" style={{fontSize:'1.5rem',color:'#a8c8ff'}}/>
            <h5>Création du quiz</h5>
            <p>
              Créez jusqu'à <strong style={{color:'#a8c8ff'}}>50 questions</strong>.<br/><br/>
              <strong style={{color:'#a8c8ff'}}>Enregistrer</strong> → valide la question courante<br/>
              <strong style={{color:'#a8c8ff'}}>Image</strong> → JPG/PNG optionnel (Cloudinary)<br/>
              <strong style={{color:'#a8c8ff'}}>Publier</strong> → crée le sujet + toutes les questions
            </p>
          </div>
        </div>
      </div>

      {/* Footer étape 2 */}
      {apiError && (
        <div className="ns-api-error" style={{margin:'1.5rem 0 0'}}>
          <Icon name="error"/>{apiError}
        </div>
      )}
      <div className="ns-footer" style={{background:'transparent',border:'none',paddingLeft:0,paddingRight:0}}>
        <button type="button" className="ns-btn-cancel" onClick={() => setStep('sujet')}>
          <Icon name="arrow_back" style={{verticalAlign:'middle',marginRight:'.25rem'}}/>Retour au sujet
        </button>
        <button type="button" className="ns-btn-submit"
          disabled={loading || totalDone < MAX_Q}
          onClick={handleSubmitFinal}
          title={totalDone < MAX_Q ? `Complétez les ${MAX_Q} questions avant de publier (${totalDone}/${MAX_Q} faites)` : undefined}
        >
          <Icon name={loading?'progress_activity':'send'} className={loading?'ns-spin':''}/>
          {loading
            ? 'Publication en cours...'
            : totalDone < MAX_Q
              ? `${totalDone}/${MAX_Q} questions — continuez à remplir`
              : `Publier le sujet + ${MAX_Q} questions ✓`
          }
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDU PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="ns-root">
        {lbSrc && <Lightbox src={lbSrc} onClose={() => setLbSrc(null)}/>}
        {toast && (
          <div className={`ns-toast ${toast.type}`}>
            <Icon name={toast.type==='success'?'check_circle':'error'}/>{toast.msg}
          </div>
        )}

        <div className="ns-header">
          <h1>Créer un Nouveau Sujet de Stage</h1>
          <p>Renseignez les informations du stage et configurez le quiz d'évaluation.</p>
        </div>

        {/* Stepper */}
        <div className="ns-stepper">
          <div className="ns-step">
            <div className={`ns-step-num ${step==='sujet'?'active':'done'}`}>
              {step==='sujet' ? '1' : <Icon name="check" style={{fontSize:'0.875rem'}}/>}
            </div>
            <span className={`ns-step-label ${step==='sujet'?'active':'done'}`}>Informations du sujet</span>
          </div>
          <div className={`ns-step-line ${step==='quiz'?'done':''}`}/>
          <div className="ns-step">
            <div className={`ns-step-num ${step==='quiz'?'active':'pending'}`}>2</div>
            <span className={`ns-step-label ${step==='quiz'?'active':'pending'}`}>
              {quizMode==='ai' ? 'Quiz IA (auto)' : 'Créer le quiz'}
            </span>
          </div>
        </div>

        {step === 'sujet' ? renderSujet() : renderQuiz()}

        <p className="ns-note">
          Les candidatures reçues seront analysées et scorées automatiquement par l'IA.
        </p>
      </div>
    </>
  );
};

export default RHNouveauSujet;