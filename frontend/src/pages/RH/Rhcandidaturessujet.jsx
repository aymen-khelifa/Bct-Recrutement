import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const styles = `
  .rhcs-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .rhcs-root { font-family: 'Public Sans', sans-serif; }
  .rhcs-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
  body { margin: 0; padding: 0; }

  /* BACK + BANNER */
  .rhcs-back { display: inline-flex; align-items: center; gap: 0.5rem; background: none; border: none; cursor: pointer; font-family: 'Public Sans', sans-serif; font-size: 0.875rem; font-weight: 700; color: #64748b; margin-bottom: 1.5rem; padding: 0; transition: color 0.15s; }
  .rhcs-back:hover { color: #003d7a; }
  .rhcs-back .material-symbols-outlined { font-size: 1.125rem; }
  .rhcs-sujet-banner { background: linear-gradient(135deg, #003d7a, #0056b3); border-radius: 1rem; padding: 1.5rem 2rem; color: #fff; margin-bottom: 2rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .rhcs-sujet-eyebrow { font-size: 0.625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.6); margin-bottom: 0.375rem; }
  .rhcs-sujet-titre { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
  .rhcs-sujet-meta { display: flex; flex-wrap: wrap; gap: 1rem; }
  .rhcs-sujet-meta-item { display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; color: rgba(255,255,255,0.75); font-weight: 500; }
  .rhcs-sujet-meta-item .material-symbols-outlined { font-size: 1rem; }
  .rhcs-sujet-stats { display: flex; gap: 1rem; flex-wrap: wrap; }
  .rhcs-stat-box { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15); border-radius: 0.75rem; padding: 0.875rem 1.25rem; text-align: center; min-width: 5rem; }
  .rhcs-stat-num { font-size: 1.75rem; font-weight: 900; line-height: 1; }
  .rhcs-stat-lbl { font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.6); margin-top: 0.25rem; }

  /* TOOLBAR */
  .rhcs-toolbar { display: flex; flex-direction: column; gap: 0.875rem; margin-bottom: 1.5rem; }
  .rhcs-toolbar-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
  .rhcs-search-wrap { flex: 1; min-width: 200px; position: relative; }
  .rhcs-search-wrap .material-symbols-outlined { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.25rem; pointer-events: none; }
  .rhcs-search { width: 100%; padding: 0.75rem 1rem 0.75rem 3rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhcs-search:focus { border-color: #003d7a; box-shadow: 0 0 0 3px rgba(0,61,122,0.1); }
  .rhcs-search::placeholder { color: #94a3b8; }
  .rhcs-select { padding: 0.75rem 2rem 0.75rem 0.875rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.8125rem; font-family: 'Public Sans', sans-serif; color: #0f172a; outline: none; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04); appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M1 1l5 5 5-5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; min-width: 160px; }
  .rhcs-select:focus { border-color: #003d7a; }
  .rhcs-select.active { border-color: #003d7a; background-color: rgba(0,61,122,0.04); color: #003d7a; font-weight: 700; }
  .rhcs-filter-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; font-family: 'Public Sans', sans-serif; white-space: nowrap; transition: background 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhcs-filter-btn:hover { background: #f8fafc; }
  .rhcs-filter-btn .material-symbols-outlined { font-size: 1.125rem; }

  /* TABLE */
  .rhcs-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; }
  .rhcs-table { width: 100%; text-align: left; border-collapse: collapse; }
  .rhcs-thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .rhcs-thead th { padding: 1rem 1.5rem; font-size: 0.625rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
  .rhcs-thead th.right { text-align: right; }
  .rhcs-tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
  .rhcs-tbody tr:last-child { border-bottom: none; }
  .rhcs-tbody tr:hover { background: #f8fafc; }
  .rhcs-tbody td { padding: 1rem 1.5rem; vertical-align: middle; }
  .rhcs-tbody td.right { text-align: right; }

  .rhcs-candidate { display: flex; align-items: center; gap: 0.75rem; }
  .rhcs-avatar { width: 2.25rem; height: 2.25rem; border-radius: 9999px; background: rgba(0,61,122,0.1); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; color: #003d7a; font-weight: 700; font-size: 0.6875rem; flex-shrink: 0; overflow: hidden; }
  .rhcs-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 9999px; }
  .rhcs-cand-name { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .rhcs-cand-email { font-size: 0.75rem; color: #94a3b8; margin-top: 0.1rem; }
  .rhcs-score-wrap { display: flex; align-items: center; gap: 0.75rem; }
  .rhcs-score-bar { width: 5rem; height: 0.3125rem; background: #e2e8f0; border-radius: 9999px; overflow: hidden; flex-shrink: 0; }
  .rhcs-score-fill { height: 100%; background: #003d7a; border-radius: 9999px; }
  .rhcs-score-val { font-size: 0.8125rem; font-weight: 700; color: #334155; min-width: 2rem; }

  .rhcs-badge { display: inline-flex; align-items: center; padding: 0.2rem 0.625rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; white-space: nowrap; }
  .rhcs-badge.EN_COURS_EXAMEN     { background: rgba(37,99,235,0.08);  color: #1d4ed8; }
  .rhcs-badge.PRESELECTIONNE_CV   { background: rgba(5,150,105,0.08);  color: #059669; }
  .rhcs-badge.ELIMINE_CV          { background: rgba(239,68,68,0.08);  color: #dc2626; }
  .rhcs-badge.ENTRETIEN_PLANIFIE  { background: rgba(245,158,11,0.1);  color: #b45309; }
  .rhcs-badge.ACCEPTE_QUIZ        { background: rgba(124,58,237,0.1);  color: #7c3aed; }
  .rhcs-badge.ELIMINE_QUIZ        { background: rgba(239,68,68,0.08);  color: #dc2626; }
  .rhcs-badge.ACCEPTE_ENTRETIEN   { background: rgba(5,150,105,0.1);   color: #059669; }
  .rhcs-badge.ELIMINE_ENTRETIEN   { background: rgba(239,68,68,0.08);  color: #dc2626; }
  .rhcs-badge.ACCEPTE             { background: rgba(5,150,105,0.12);  color: #059669; }
  .rhcs-badge.REFUSE              { background: rgba(239,68,68,0.1);   color: #dc2626; }

  .rhcs-quiz-badge-btn { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 0.375rem; font-size: 0.6875rem; font-weight: 700; background: rgba(124,58,237,0.08); color: #003d7a; border: 1px solid rgba(124,58,237,0.2); cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; }
  .rhcs-quiz-badge-btn:hover { background: rgba(124,58,237,0.15); }

  /* ✅ Badge entretien (note /10) */
  .rhcs-entretien-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 0.375rem; font-size: 0.6875rem; font-weight: 700; background: rgba(5,150,105,0.08); color: #059669; border: 1px solid rgba(5,150,105,0.2); }
  .rhcs-entretien-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhcs-ent-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem; }
  .rhcs-ent-title { font-size: 0.875rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; }
  .rhcs-ent-title .material-symbols-outlined { color: #059669; }
  .rhcs-ent-note-pill { display: flex; align-items: baseline; gap: 0.25rem; background: rgba(5,150,105,0.08); border: 1px solid rgba(5,150,105,0.25); border-radius: 0.75rem; padding: 0.5rem 1rem; }
  .rhcs-ent-note-big { font-size: 1.75rem; font-weight: 900; color: #059669; line-height: 1; }
  .rhcs-ent-note-unit { font-size: 0.875rem; color: #94a3b8; }
  .rhcs-ent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
  .rhcs-ent-field label { font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; display: block; margin-bottom: 0.25rem; }
  .rhcs-ent-field p { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .rhcs-ent-badge-status { display: inline-flex; align-items: center; padding: 0.2rem 0.625rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; }
  .rhcs-ent-badge-status.TERMINE { background: rgba(5,150,105,0.1); color: #059669; }
  .rhcs-ent-badge-status.PLANIFIE { background: rgba(245,158,11,0.1); color: #b45309; }
  .rhcs-ent-badge-status.EN_COURS { background: rgba(37,99,235,0.08); color: #1d4ed8; }
  .rhcs-ent-notes { background: rgba(0,61,122,0.03); border: 1px solid rgba(0,61,122,0.12); border-radius: 0.625rem; padding: 1rem; font-size: 0.8125rem; color: #334155; line-height: 1.65; white-space: pre-wrap; }
  .rhcs-ent-notes-empty { color: #94a3b8; font-style: italic; }
  .rhcs-detail-link { color: #003d7a; font-size: 0.8125rem; font-weight: 700; background: none; border: none; cursor: pointer; font-family: 'Public Sans', sans-serif; padding: 0.375rem 0.875rem; border-radius: 0.5rem; transition: background 0.15s; }
  .rhcs-detail-link:hover { background: rgba(0,61,122,0.06); }

  /* PAGINATION */
  .rhcs-footer { padding: 1rem 1.5rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
  .rhcs-footer-info { font-size: 0.75rem; color: #64748b; font-weight: 600; }
  .rhcs-pages { display: flex; gap: 0.375rem; }
  .rhcs-page-btn { width: 2rem; height: 2rem; border-radius: 0.375rem; border: 1px solid #e2e8f0; background: #fff; font-size: 0.75rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
  .rhcs-page-btn:hover:not(:disabled):not(.active) { background: #f1f5f9; }
  .rhcs-page-btn.active { background: #003d7a; color: #fff; border-color: #003d7a; }
  .rhcs-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* STATES */
  @keyframes rhcs-spin { to { transform: rotate(360deg); } }
  .rhcs-spin { animation: rhcs-spin 0.8s linear infinite; color: #003d7a; }
  .rhcs-loading { display: flex; align-items: center; justify-content: center; padding: 5rem; gap: 0.75rem; color: #64748b; font-size: 0.875rem; font-weight: 600; }
  .rhcs-error { background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; padding: 1rem 1.5rem; border-radius: 0.75rem; margin-bottom: 1.5rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
  .rhcs-empty { text-align: center; padding: 5rem 2rem; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .rhcs-empty .material-symbols-outlined { font-size: 3rem; color: #cbd5e1; }

  /* TOAST */
  @keyframes rhcs-toast-in { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
  .rhcs-toast { position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; background: #0f172a; color: #fff; padding: 1rem 1.5rem; border-radius: 0.75rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 600; font-family: 'Public Sans', sans-serif; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); animation: rhcs-toast-in 0.3s ease; }
  .rhcs-toast .material-symbols-outlined { font-size: 1.25rem; }
  .rhcs-toast.success .material-symbols-outlined { color: #22c55e; }
  .rhcs-toast.error   .material-symbols-outlined { color: #ef4444; }

  /* ── MODAL DÉTAIL (même design que RHCandidatures) ── */
  .rhcs-overlay { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .rhcs-overlay-bg { position: absolute; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); }
  .rhcs-modal { position: relative; background: #fff; width: 100%; max-width: 56rem; max-height: 95vh; display: flex; flex-direction: column; border-radius: 1rem; box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden; }
  .rhcs-modal-header { background: linear-gradient(135deg, #003d7a 0%, #0056b3 100%); padding: 1.5rem 2rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .rhcs-modal-header-left { display: flex; align-items: center; gap: 1rem; }
  .rhcs-modal-avatar { width: 3rem; height: 3rem; border-radius: 9999px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 1rem; flex-shrink: 0; overflow: hidden; }
  .rhcs-modal-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 9999px; }
  .rhcs-modal-name { font-size: 1.25rem; font-weight: 900; color: #fff; }
  .rhcs-modal-id { font-size: 0.8125rem; color: rgba(255,255,255,0.65); margin-top: 0.15rem; }
  .rhcs-modal-close { padding: 0.375rem; background: rgba(255,255,255,0.1); border: none; border-radius: 9999px; cursor: pointer; color: rgba(255,255,255,0.7); transition: all 0.15s; display: flex; }
  .rhcs-modal-close:hover { background: rgba(255,255,255,0.2); color: #fff; }
  .rhcs-modal-close .material-symbols-outlined { font-size: 1.25rem; }
  .rhcs-modal-body { flex: 1; overflow-y: auto; background: #f8fafc; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .rhcs-modal-top { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
  @media (min-width: 768px) { .rhcs-modal-top { grid-template-columns: 2fr 1fr; } }
  .rhcs-info-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhcs-info-card-title { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
  .rhcs-info-card-title .material-symbols-outlined { font-size: 1rem; color: #003d7a; }
  .rhcs-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .rhcs-info-field label { font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; display: block; margin-bottom: 0.25rem; }
  .rhcs-info-field p { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .rhcs-score-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .rhcs-score-card-label { font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 1.25rem; }
  .rhcs-score-wheel { position: relative; width: 8rem; height: 8rem; display: flex; align-items: center; justify-content: center; }
  .rhcs-score-wheel svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  .rhcs-score-wheel-val { font-size: 2rem; font-weight: 900; color: #003d7a; line-height: 1; }
  .rhcs-sujet-banner-modal { background: rgba(0,61,122,0.04); border: 1px solid rgba(0,61,122,0.15); border-radius: 0.75rem; padding: 1.25rem 1.5rem; display: flex; align-items: flex-start; gap: 1rem; }
  .rhcs-sujet-banner-icon { width: 2.75rem; height: 2.75rem; border-radius: 0.5rem; background: #003d7a; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rhcs-sujet-banner-icon .material-symbols-outlined { font-size: 1.25rem; }
  .rhcs-sujet-eyebrow-m { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #003d7a; margin-bottom: 0.3rem; }
  .rhcs-sujet-titre-m { font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; line-height: 1.35; }
  .rhcs-sujet-meta-m { display: flex; flex-wrap: wrap; gap: 1rem; }
  .rhcs-sujet-meta-m span { font-size: 0.8125rem; color: #475569; display: flex; align-items: center; gap: 0.375rem; font-weight: 500; }
  .rhcs-sujet-meta-m .material-symbols-outlined { font-size: 1rem; color: #94a3b8; }
  .rhcs-comp-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.75rem; }
  .rhcs-comp-tag { font-size: 0.6875rem; font-weight: 600; background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; padding: 0.2rem 0.625rem; border-radius: 9999px; }
  .rhcs-ai-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
  @media (min-width: 768px) { .rhcs-ai-grid { grid-template-columns: 1fr 1fr; } }
  .rhcs-ai-title { font-size: 0.875rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
  .rhcs-ai-title .material-symbols-outlined { color: #003d7a; }
  .rhcs-strengths { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1rem; }
  .rhcs-strengths-title { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #15803d; display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.875rem; }
  .rhcs-weaknesses { background: #fffbeb; border: 1px solid #fde68a; border-radius: 0.75rem; padding: 1.25rem; }
  .rhcs-weaknesses-title { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #b45309; display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.875rem; }
  .rhcs-insight-item { font-size: 0.875rem; color: #334155; display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; line-height: 1.55; }
  .rhcs-dot-green { color: #16a34a; font-weight: 800; flex-shrink: 0; }
  .rhcs-dot-amber { color: #d97706; font-weight: 800; flex-shrink: 0; }
  .rhcs-criteria-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhcs-criteria-item { margin-bottom: 1.375rem; }
  .rhcs-criteria-item:last-child { margin-bottom: 0; }
  .rhcs-criteria-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .rhcs-criteria-label { font-size: 0.75rem; font-weight: 700; color: #475569; }
  .rhcs-criteria-val { font-size: 0.875rem; font-weight: 900; color: #003d7a; }
  .rhcs-criteria-bar { width: 100%; height: 0.625rem; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
  .rhcs-criteria-fill { height: 100%; border-radius: 9999px; }
  .rhcs-score-total { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1rem; background: rgba(0,61,122,0.06); border-radius: 0.5rem; margin-top: 1rem; }
  .rhcs-score-total-label { font-size: 0.8125rem; font-weight: 700; color: #003d7a; }
  .rhcs-score-total-val { font-size: 1.5rem; font-weight: 900; color: #003d7a; }
  .rhcs-lettre-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; }
  .rhcs-lettre-title { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.875rem; }
  .rhcs-lettre-text { font-size: 0.875rem; color: #475569; line-height: 1.75; border-left: 3px solid #003d7a; padding-left: 1rem; font-style: italic; white-space: pre-line; }
  .rhcs-modal-footer { padding: 1.25rem 2rem; border-top: 1px solid #e2e8f0; background: #fff; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; flex-wrap: wrap; gap: 0.75rem; }
  .rhcs-footer-left { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
  .rhcs-footer-action-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; border: 1px solid; transition: all 0.15s; }
  .rhcs-footer-action-btn.cv { color: #003d7a; border-color: rgba(0,61,122,0.25); background: rgba(0,61,122,0.05); }
  .rhcs-footer-action-btn.cv:hover { background: rgba(0,61,122,0.1); }
  .rhcs-btn-back { padding: 0.625rem 1.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #fff; font-size: 0.875rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; }

  /* CV popup */
  .rhcs-cv-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .rhcs-cv-popup { background: #fff; border-radius: 0.875rem; width: 100%; max-width: 56rem; height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
  .rhcs-cv-popup-header { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.25rem; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
  .rhcs-cv-popup-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9375rem; font-weight: 700; color: #0f172a; }
  .rhcs-cv-popup-close { width: 2rem; height: 2rem; border: none; background: #f1f5f9; border-radius: 0.375rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .rhcs-cv-popup-body { flex: 1; overflow: hidden; }
  .rhcs-cv-popup-body iframe { width: 100%; height: 100%; border: none; }
  .rhcs-cv-popup-footer { padding: 0.75rem 1.25rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; flex-shrink: 0; }
  .rhcs-cv-popup-dl { padding: 0.5rem 1.25rem; background: #003d7a; color: #fff; border: none; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.375rem; text-decoration: none; }

  /* Quiz/Video popup */
  .rhcs-qv-modal { position: relative; background: #fff; width: 100%; max-width: 42rem; max-height: 95vh; display: flex; flex-direction: column; border-radius: 1rem; box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden; }
  .rhcs-quiz-section { background: linear-gradient(135deg, #1e0a3c, #2d1060); border-radius: 0.75rem; overflow: hidden; }
  .rhcs-quiz-sec-header { padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
  .rhcs-quiz-sec-left { display: flex; align-items: center; gap: 0.75rem; }
  .rhcs-quiz-sec-left .material-symbols-outlined { font-size: 1.5rem; color: #c4b5fd; }
  .rhcs-quiz-sec-title { font-size: 0.9375rem; font-weight: 800; color: #fff; }
  .rhcs-quiz-sec-sub { font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 0.125rem; }
  .rhcs-quiz-score-pill { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 0.75rem; padding: 0.625rem 1.125rem; text-align: center; }
  .rhcs-quiz-score-pill .big { font-size: 1.75rem; font-weight: 900; color: #fff; line-height: 1; }
  .rhcs-quiz-score-pill .small { font-size: 0.5625rem; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.08em; }
  .rhcs-quiz-sec-body { background: #fff; border-top: 1px solid rgba(124,58,237,0.15); padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .rhcs-quiz-info-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.75rem; }
  .rhcs-quiz-info-cell { text-align: center; padding: 0.75rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #f1f5f9; }
  .rhcs-quiz-info-cell .qlabel { font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.25rem; }
  .rhcs-quiz-info-cell .qvalue { font-size: 1rem; font-weight: 900; color: #0f172a; }
  .rhcs-quiz-bar-header { display: flex; justify-content: space-between; margin-bottom: 0.375rem; }
  .rhcs-quiz-bar-label { font-size: 0.75rem; font-weight: 700; color: #475569; }
  .rhcs-quiz-bar-val { font-size: 0.75rem; font-weight: 700; color: #7c3aed; }
  .rhcs-quiz-progress { width: 100%; height: 0.5rem; background: #e2e8f0; border-radius: 9999px; overflow: hidden; }
  .rhcs-quiz-progress-fill { height: 100%; border-radius: 9999px; transition: width 0.6s ease; }
  .rhcs-quiz-no-data { padding: 1.5rem; text-align: center; color: rgba(255,255,255,0.5); font-size: 0.875rem; font-style: italic; }
  .rhcs-video-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhcs-video-header { background: #0f172a; padding: 0.875rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
  .rhcs-video-header-left { display: flex; align-items: center; gap: 0.625rem; }
  .rhcs-video-header-left .material-symbols-outlined { color: #94a3b8; font-size: 1.125rem; }
  .rhcs-video-header-left span { font-size: 0.875rem; font-weight: 700; color: #fff; }
  .rhcs-video-body { padding: 1.25rem; }
  .rhcs-video-player { width: 100%; border-radius: 0.625rem; overflow: hidden; background: #000; aspect-ratio: 16/9; }
  .rhcs-video-player video { width: 100%; height: 100%; object-fit: contain; display: block; }
  .rhcs-video-meta { display: flex; gap: 1.25rem; margin-top: 0.875rem; flex-wrap: wrap; align-items: center; }
  .rhcs-video-meta-item { font-size: 0.75rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 0.375rem; }
  .rhcs-video-meta-item .material-symbols-outlined { font-size: 1rem; color: #94a3b8; }
  .rhcs-video-no-data { padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.875rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .rhcs-video-no-data .material-symbols-outlined { font-size: 2rem; color: #cbd5e1; }
`;

const ALL_STATUTS = [
  { value: 'EN_COURS_EXAMEN',    label: "En cours d'examen" },
  { value: 'PRESELECTIONNE_CV',  label: 'Présélectionné (CV)' },
  { value: 'ELIMINE_CV',         label: 'Éliminé (CV)' },
  { value: 'ACCEPTE_QUIZ',       label: 'Accepté phase quiz' },
  { value: 'ELIMINE_QUIZ',       label: 'Éliminé (Quiz)' },
  { value: 'ENTRETIEN_PLANIFIE', label: 'Entretien planifié' },
  { value: 'ACCEPTE_ENTRETIEN',  label: 'Accepté (Entretien)' },
  { value: 'ELIMINE_ENTRETIEN',  label: 'Éliminé (Entretien)' },
  { value: 'ACCEPTE',            label: 'Accepté définitif' },
  { value: 'REFUSE',             label: 'Refusé' },
];
const LABEL_MAP = Object.fromEntries(ALL_STATUTS.map(s => [s.value, s.label]));
const PAGE_SIZE = 10;
const CIRCUM    = 351.86;
const getInit   = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const CRITERES = [
  { key: 'semantique',  label: 'Sémantique CV',           max: 35 },
  { key: 'competences', label: 'Compétences techniques',  max: 25 },
  { key: 'experience',  label: 'Expérience & projets',    max: 20 },
  { key: 'formation',   label: 'Formation académique',    max: 10 },
  { key: 'structure',   label: 'Structure du CV',          max:  5 },
  { key: 'lettre',      label: 'Lettre de motivation',    max:  5 },
];

const barColor = (val, max) => {
  const p = (val / max) * 100;
  return p >= 70 ? '#059669' : p >= 40 ? '#f59e0b' : '#ef4444';
};

const fmtDate     = (v) => v ? new Date(v).toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'}) : '—';
const fmtDateTime = (v) => v ? new Date(v).toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const fmtDuration = (sec) => { if (!sec) return '—'; return `${Math.floor(sec/60)}min ${sec%60}s`; };

const parseRapport = (txt = '') => {
  const r = { pts_forts: [], pts_faibles: [], resume: '' };
  if (!txt) return r;
  let section = null;
  txt.split('\n').forEach(line => {
    const l = line.trim();
    if (!l) return;
    if (l === 'POINTS FORTS :' || l === 'POINTS FORTS:')     { section = 'forts';   return; }
    if (l === 'POINTS FAIBLES :' || l === 'POINTS FAIBLES:') { section = 'faibles'; return; }
    if (l.startsWith('Score :') || l.startsWith('Recommandation :') ||
        l.startsWith('Similarité') || l.startsWith('FORMULE') || l.startsWith('BERT :')) {
      if (l.startsWith('Score :')) r.resume = l;
      section = null; return;
    }
    if ((l.startsWith('•') || l.startsWith('-')) && section) {
      const text = l.replace(/^[•-]\s*/, '').trim();
      if (text) {
        if (section === 'forts')   r.pts_forts.push(text);
        if (section === 'faibles') r.pts_faibles.push(text);
      }
    }
  });
  if (!r.resume) {
    const m = txt.match(/Score\s*:\s*(\d+\/\d+)\s*\(([^)]+)\)/);
    if (m) r.resume = `Score global : ${m[1]} — Compatibilité ${m[2]}`;
  }
  return r;
};

// ─── Quiz + Video popup ────────────────────────────────────────────────────
const QuizVideoModal = ({ data, onClose }) => {
  const { scoreQuiz, mentionQuiz, quizPasseLe, videoUrl,
          recordingDurationSec, recordingUploadedAt,
          candidatNom, candidatPhoto } = data;
  const quizPct = scoreQuiz != null ? Math.round((scoreQuiz / 50) * 100) : null;

  return (
    <div className="rhcs-overlay" style={{zIndex: 300}}>
      <div className="rhcs-overlay-bg" onClick={onClose}/>
      <div className="rhcs-qv-modal">
        <div className="rhcs-modal-header">
          <div className="rhcs-modal-header-left">
            <div className="rhcs-modal-avatar">
              {candidatPhoto ? <img src={candidatPhoto} alt=""/> : getInit(candidatNom || '')}
            </div>
            <div>
              <p className="rhcs-modal-name">{candidatNom || '—'}</p>
              <p className="rhcs-modal-id">Quiz & Enregistrement vidéo</p>
            </div>
          </div>
          <button className="rhcs-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="rhcs-modal-body">
          {/* Quiz */}
          <div className="rhcs-quiz-section">
            <div className="rhcs-quiz-sec-header">
              <div className="rhcs-quiz-sec-left">
                <span className="material-symbols-outlined">quiz</span>
                <div>
                  <p className="rhcs-quiz-sec-title">Quiz Technique</p>
                  <p className="rhcs-quiz-sec-sub">
                    {scoreQuiz != null ? `Passé le ${fmtDateTime(quizPasseLe)}` : 'Quiz non encore passé'}
                  </p>
                </div>
              </div>
              {scoreQuiz != null && (
                <div className="rhcs-quiz-score-pill">
                  <div className="big">{scoreQuiz}<span style={{fontSize:'1rem',opacity:0.6}}>/50</span></div>
                  <div className="small">{mentionQuiz || 'Score'}</div>
                </div>
              )}
            </div>
            {scoreQuiz != null ? (
              <div className="rhcs-quiz-sec-body">
                <div className="rhcs-quiz-info-row">
                  <div className="rhcs-quiz-info-cell">
                    <div className="qlabel">Note</div>
                    <div className="qvalue" style={{color:'#7c3aed'}}>{scoreQuiz}/50</div>
                  </div>
                  <div className="rhcs-quiz-info-cell">
                    <div className="qlabel">Pourcentage</div>
                    <div className="qvalue">{quizPct}%</div>
                  </div>
                  <div className="rhcs-quiz-info-cell">
                    <div className="qlabel">Mention</div>
                    <div className="qvalue" style={{fontSize:'0.875rem',
                      color: mentionQuiz==='Excellent'?'#059669':mentionQuiz==='Très bien'?'#0284c7':
                             mentionQuiz==='Bien'?'#7c3aed':mentionQuiz==='Passable'?'#f59e0b':'#ef4444'
                    }}>{mentionQuiz||'—'}</div>
                  </div>
                </div>
                <div>
                  <div className="rhcs-quiz-bar-header">
                    <span className="rhcs-quiz-bar-label">Progression</span>
                    <span className="rhcs-quiz-bar-val">{quizPct}%</span>
                  </div>
                  <div className="rhcs-quiz-progress">
                    <div className="rhcs-quiz-progress-fill" style={{
                      width:`${quizPct}%`,
                      background: quizPct>=70?'#059669':quizPct>=50?'#f59e0b':'#ef4444'
                    }}/>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rhcs-quiz-no-data">Le candidat n'a pas encore passé le quiz.</div>
            )}
          </div>
          {/* Vidéo */}
          <div className="rhcs-video-section">
            <div className="rhcs-video-header">
              <div className="rhcs-video-header-left">
                <span className="material-symbols-outlined">videocam</span>
                <span>Enregistrement vidéo du quiz</span>
              </div>
            </div>
            {videoUrl ? (
              <div className="rhcs-video-body">
                <div className="rhcs-video-player">
                  <video controls preload="metadata" src={videoUrl}>
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                </div>
                <div className="rhcs-video-meta">
                  {recordingDurationSec != null && (
                    <span className="rhcs-video-meta-item">
                      <span className="material-symbols-outlined">timer</span>
                      Durée : {fmtDuration(recordingDurationSec)}
                    </span>
                  )}
                  {recordingUploadedAt && (
                    <span className="rhcs-video-meta-item">
                      <span className="material-symbols-outlined">cloud_upload</span>
                      Uploadé le {fmtDate(recordingUploadedAt)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rhcs-video-no-data">
                <span className="material-symbols-outlined">videocam_off</span>
                <p>Aucun enregistrement vidéo disponible.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Composant principal ───────────────────────────────────────────────────
const RHCandidaturesSujet = ({ sujet, onBack }) => {
  const [candidatures,   setCandidatures]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [search,         setSearch]         = useState('');
  const [filterStatut,   setFilterStatut]   = useState('');
  const [page,           setPage]           = useState(1);
  const [toast,          setToast]          = useState(null);
  const [detail,         setDetail]         = useState(null);
  const [modalLoading,   setModalLoading]   = useState(false);
  const [showCv,         setShowCv]         = useState(false);
  const [quizVideoModal, setQuizVideoModal] = useState(null);

  const fetchCandidatures = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.get(`/api/candidatures/sujet/${sujet.id}`);
      setCandidatures(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement.');
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchCandidatures(); }, [sujet.id]);

  const showToastFn = (msg, type = 'success') => {
    setToast({msg, type}); setTimeout(() => setToast(null), 3500);
  };

  const openModal = async (app) => {
    setDetail(null); setShowCv(false); setModalLoading(true);
    try {
      const { data } = await axios.get(`/api/candidatures/${app.id}`);
      setDetail(data);
    } catch { showToastFn('Erreur chargement dossier', 'error'); }
    finally { setModalLoading(false); }
  };
  const closeModal = () => { setDetail(null); setShowCv(false); };

  const openQuizVideo = (e, app) => {
    e.stopPropagation();
    setQuizVideoModal({
      candidatNom:          app.candidatNom         || '—',
      candidatPhoto:        app.candidatPhoto        || null,
      scoreQuiz:            app.scoreQuiz            ?? null,
      mentionQuiz:          app.mentionQuiz          ?? null,
      quizPasseLe:          app.quizPasseLe          ?? null,
      videoUrl:             app.recordingUrl         ?? null,
      recordingDurationSec: app.recordingDurationSec ?? null,
      recordingUploadedAt:  app.recordingUploadedAt  ?? null,
    });
  };

  useEffect(() => {
    const fn = e => {
      if (e.key === 'Escape') {
        if (quizVideoModal) { setQuizVideoModal(null); return; }
        closeModal(); setShowCv(false);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [quizVideoModal]);

  const filtered = useMemo(() => {
    let list = [...candidatures];
    if (filterStatut) list = list.filter(c => c.statut === filterStatut);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.candidatNom?.toLowerCase().includes(q) ||
        c.candidatEmail?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidatures, filterStatut, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const countBy    = (s) => candidatures.filter(c => c.statut === s).length;
  const total      = candidatures.length;
  const selec      = candidatures.filter(c => ['PRESELECTIONNE_CV','ACCEPTE_QUIZ','ACCEPTE_ENTRETIEN','ACCEPTE'].includes(c.statut)).length;
  const elim       = candidatures.filter(c => c.statut?.startsWith('ELIMINE') || c.statut === 'REFUSE').length;

  // ── Modal data ──────────────────────────────────────────────────────────
  const score    = detail?.scoreAi?.scoreAi ?? null;
  const scorePct = score != null ? Math.min(Math.round(score), 100) : null;
  const offset   = scorePct != null ? CIRCUM - (scorePct/100)*CIRCUM : CIRCUM;
  const det      = detail?.scoreAi?.detail || null;
  const rap      = parseRapport(detail?.scoreAi?.rapport);
  const profil   = detail?.profil || {};
  const photoUrl = detail?.candidat?.photoUrl || null;
  const cvUrl    = profil?.cv || null;
  const cvName   = cvUrl ? cvUrl.split('/').pop().split('?')[0] : 'CV.pdf';

  return (
    <>
      <style>{styles}</style>
      <div className="rhcs-root">

        {/* Toast */}
        {toast && (
          <div className={`rhcs-toast ${toast.type}`}>
            <span className="material-symbols-outlined">{toast.type==='success'?'check_circle':'error'}</span>
            {toast.msg}
          </div>
        )}

        {/* Quiz + Video popup */}
        {quizVideoModal && (
          <QuizVideoModal data={quizVideoModal} onClose={() => setQuizVideoModal(null)}/>
        )}

        {/* CV popup */}
        {showCv && cvUrl && (
          <div className="rhcs-cv-overlay" onClick={() => setShowCv(false)}>
            <div className="rhcs-cv-popup" onClick={e => e.stopPropagation()}>
              <div className="rhcs-cv-popup-header">
                <div className="rhcs-cv-popup-title">
                  <span className="material-symbols-outlined">picture_as_pdf</span>{cvName}
                </div>
                <button className="rhcs-cv-popup-close" onClick={() => setShowCv(false)}>
                  <span className="material-symbols-outlined" style={{fontSize:'1.125rem'}}>close</span>
                </button>
              </div>
              <div className="rhcs-cv-popup-body"><iframe src={cvUrl} title="CV"/></div>
              <div className="rhcs-cv-popup-footer">
                <a href={cvUrl} download={cvName} className="rhcs-cv-popup-dl">
                  <span className="material-symbols-outlined">download</span>Télécharger
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Modal détail */}
        {(detail || modalLoading) && (
          <div className="rhcs-overlay">
            <div className="rhcs-overlay-bg" onClick={closeModal}/>
            <div className="rhcs-modal">
              <div className="rhcs-modal-header">
                <div className="rhcs-modal-header-left">
                  <div className="rhcs-modal-avatar">
                    {photoUrl ? <img src={photoUrl} alt=""/> : getInit(detail?.candidat?.nom||'')}
                  </div>
                  <div>
                    <p className="rhcs-modal-name">{detail?.candidat?.nom||'—'}</p>
                    <p className="rhcs-modal-id">#{detail?.id} · {detail?.candidat?.email||''}</p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                  {detail && <span className={`rhcs-badge ${detail.statut}`}>{LABEL_MAP[detail.statut]||detail.statut}</span>}
                  <button className="rhcs-modal-close" onClick={closeModal}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <div className="rhcs-modal-body">
                {modalLoading ? (
                  <div className="rhcs-loading">
                    <span className="material-symbols-outlined rhcs-spin">progress_activity</span>
                    Chargement du dossier...
                  </div>
                ) : detail && (<>
                  {/* Infos + score wheel */}
                  <div className="rhcs-modal-top">
                    <div className="rhcs-info-card">
                      <p className="rhcs-info-card-title">
                        <span className="material-symbols-outlined">badge</span>Informations candidat
                      </p>
                      <div className="rhcs-info-grid">
                        {[
                          ['Email',               detail.candidat?.email],
                          ['Nationalité',         profil?.nationalite],
                          ['Université',          profil?.universite],
                          ['Spécialité',          profil?.specialite],
                          ["Niveau d'études",     profil?.niveauInstructionActuel],
                          ['Formation actuelle',  profil?.cursusActuel],
                          ['Moy. dernière année', profil?.moyDerAnnee!=null?`${profil.moyDerAnnee}/20`:null],
                          ['Moy. avant-dernière', profil?.moyAvantDerAnnee!=null?`${profil.moyAvantDerAnnee}/20`:null],
                        ].map(([l,v]) => (
                          <div key={l} className="rhcs-info-field">
                            <label>{l}</label><p>{v||'—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rhcs-score-card">
                      <p className="rhcs-score-card-label">Score IA de correspondance</p>
                      {scorePct != null ? (<>
                        <div className="rhcs-score-wheel">
                          <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="64" cy="64" r="56" fill="transparent" stroke="#f1f5f9" strokeWidth="8"/>
                            <circle cx="64" cy="64" r="56" fill="transparent" stroke="#003d7a" strokeWidth="8"
                              strokeDasharray={CIRCUM} strokeDashoffset={offset} strokeLinecap="round"/>
                          </svg>
                          <div style={{position:'absolute',textAlign:'center'}}>
                            <p className="rhcs-score-wheel-val">{scorePct}</p>
                            <p style={{fontSize:'0.6875rem',color:'#94a3b8',fontWeight:600}}>/100</p>
                          </div>
                        </div>
                        {detail?.scoreAi?.compatibilite && (
                          <span style={{marginTop:'0.75rem',fontSize:'0.75rem',fontWeight:700,background:'rgba(0,61,122,0.08)',color:'#003d7a',padding:'0.25rem 0.875rem',borderRadius:'9999px'}}>
                            {detail.scoreAi.compatibilite}
                          </span>
                        )}
                      </>) : <p style={{fontSize:'0.875rem',color:'#94a3b8',marginTop:'1rem'}}>Score non disponible</p>}
                    </div>
                  </div>

                  {/* Sujet */}
                  <div className="rhcs-sujet-banner-modal">
                    <div className="rhcs-sujet-banner-icon"><span className="material-symbols-outlined">work</span></div>
                    <div style={{flex:1}}>
                      <p className="rhcs-sujet-eyebrow-m">Sujet de stage postulé</p>
                      <p className="rhcs-sujet-titre-m">{detail.sujet?.titre||sujet.titre||'—'}</p>
                      <div className="rhcs-sujet-meta-m">
                        {(detail.sujet?.departement||sujet.departement) && <span><span className="material-symbols-outlined">corporate_fare</span>{detail.sujet?.departement||sujet.departement}</span>}
                        {(detail.sujet?.duree||sujet.duree) && <span><span className="material-symbols-outlined">schedule</span>{detail.sujet?.duree||sujet.duree}</span>}
                        <span><span className="material-symbols-outlined">calendar_today</span>Déposé le {detail.dateDepot||'—'}</span>
                      </div>
                      {Array.isArray(detail.sujet?.competences) && detail.sujet.competences.length>0 && (
                        <div className="rhcs-comp-tags">
                          {detail.sujet.competences.map((c,i) => <span key={i} className="rhcs-comp-tag">{c}</span>)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Analyse IA + critères */}
                  <div className="rhcs-ai-grid">
                    <div>
                      <p className="rhcs-ai-title">
                        <span className="material-symbols-outlined">analytics</span>Rapport d'analyse IA
                      </p>
                      {detail.scoreAi ? (() => {
                        const { pts_forts, pts_faibles, resume } = rap;
                        return (<>
                          {resume && (
                            <div style={{background:'rgba(0,61,122,0.04)',border:'1px solid rgba(0,61,122,0.12)',borderRadius:'0.625rem',padding:'0.875rem 1rem',marginBottom:'1rem',fontSize:'0.8125rem',color:'#334155',lineHeight:1.65}}>
                              <span style={{fontWeight:700,color:'#003d7a',marginRight:'0.375rem'}}>Résumé :</span>{resume}
                            </div>
                          )}
                          <div className="rhcs-strengths">
                            <p className="rhcs-strengths-title"><span className="material-symbols-outlined">check_circle</span>Points forts</p>
                            {pts_forts.length>0 ? pts_forts.map((p,i)=><div key={i} className="rhcs-insight-item"><span className="rhcs-dot-green">•</span>{p}</div>)
                              : <div className="rhcs-insight-item"><span className="rhcs-dot-green">•</span>Dossier complet soumis.</div>}
                          </div>
                          <div className="rhcs-weaknesses">
                            <p className="rhcs-weaknesses-title"><span className="material-symbols-outlined">warning</span>Points d'attention</p>
                            {pts_faibles.length>0 ? pts_faibles.map((p,i)=><div key={i} className="rhcs-insight-item"><span className="rhcs-dot-amber">•</span>{p}</div>)
                              : <div className="rhcs-insight-item"><span className="rhcs-dot-amber">•</span>Vérifier l'adéquation du cursus.</div>}
                          </div>
                        </>);
                      })() : <p style={{fontSize:'0.875rem',color:'#94a3b8',fontStyle:'italic'}}>Scoring IA en cours...</p>}
                    </div>
                    <div className="rhcs-criteria-card">
                      <p style={{fontSize:'0.875rem',fontWeight:700,color:'#0f172a',marginBottom:'1.5rem'}}>Scores détaillés</p>
                      {det ? (<>
                        {CRITERES.map(cr => {
                          const val = det[cr.key] ?? 0;
                          return (
                            <div key={cr.key} className="rhcs-criteria-item">
                              <div className="rhcs-criteria-row">
                                <span className="rhcs-criteria-label">{cr.label}</span>
                                <span className="rhcs-criteria-val">{val}/{cr.max}</span>
                              </div>
                              <div className="rhcs-criteria-bar">
                                <div className="rhcs-criteria-fill" style={{width:`${Math.min((val/cr.max)*100,100)}%`,background:barColor(val,cr.max)}}/>
                              </div>
                            </div>
                          );
                        })}
                        <div className="rhcs-score-total">
                          <span className="rhcs-score-total-label">Score total</span>
                          <span className="rhcs-score-total-val">{score}/100</span>
                        </div>
                      </>) : <p style={{fontSize:'0.875rem',color:'#94a3b8',fontStyle:'italic'}}>{detail.scoreAi?'Détail non disponible.':'Scoring IA en cours...'}</p>}
                    </div>
                  </div>

                  {/* Lettre */}
                  <div className="rhcs-lettre-box">
                    <p className="rhcs-lettre-title">Lettre de motivation</p>
                    <p className="rhcs-lettre-text">{detail.lettreMotivation||'—'}</p>
                  </div>

                  {/* ✅ Section Entretien */}
                  {(detail.scoreEntretien != null || detail.entretienStatut) && (
                    <div className="rhcs-entretien-section">
                      <div className="rhcs-ent-header">
                        <p className="rhcs-ent-title">
                          <span className="material-symbols-outlined">videocam</span>
                          Entretien
                        </p>
                        {detail.scoreEntretien != null && (
                          <div className="rhcs-ent-note-pill">
                            <span className="rhcs-ent-note-big">{detail.scoreEntretien}</span>
                            <span className="rhcs-ent-note-unit">/10</span>
                          </div>
                        )}
                      </div>

                      <div className="rhcs-ent-grid">
                        <div className="rhcs-ent-field">
                          <label>Statut</label>
                          <p>
                            <span className={`rhcs-ent-badge-status ${detail.entretienStatut||''}`}>
                              {detail.entretienStatut || '—'}
                            </span>
                          </p>
                        </div>
                        <div className="rhcs-ent-field">
                          <label>Date</label>
                          <p>{detail.dateEntretien || '—'}</p>
                        </div>
                        <div className="rhcs-ent-field">
                          <label>Heure début</label>
                          <p>{detail.entretienHeureDebut || '—'}</p>
                        </div>
                        <div className="rhcs-ent-field">
                          <label>Heure fin</label>
                          <p>{detail.entretienHeureFin || '—'}</p>
                        </div>
                      </div>

                      <div>
                        <label style={{fontSize:'0.5625rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',color:'#94a3b8',display:'block',marginBottom:'0.5rem'}}>
                          Remarques du RH
                        </label>
                        <div className="rhcs-ent-notes">
                          {detail.notesRh && detail.notesRh.trim()
                            ? detail.notesRh
                            : <span className="rhcs-ent-notes-empty">Aucune remarque saisie.</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </>)}
              </div>

              <div className="rhcs-modal-footer">
                <div className="rhcs-footer-left">
                  {cvUrl && (
                    <button className="rhcs-footer-action-btn cv" onClick={() => setShowCv(true)}>
                      <span className="material-symbols-outlined">picture_as_pdf</span>Voir le CV
                    </button>
                  )}
                  {detail?.scoreQuiz != null && (
                    <button
                      className="rhcs-footer-action-btn"
                      style={{color:'#7c3aed',borderColor:'rgba(124,58,237,0.25)',background:'rgba(124,58,237,0.05)'}}
                      onClick={() => setQuizVideoModal({
                        candidatNom:          detail.candidat?.nom         || '—',
                        candidatPhoto:        detail.candidat?.photoUrl    || null,
                        scoreQuiz:            detail.scoreQuiz             ?? null,
                        mentionQuiz:          detail.mentionQuiz           ?? null,
                        quizPasseLe:          detail.quizPasseLe           ?? null,
                        videoUrl:             detail.recordingUrl          ?? null,
                        recordingDurationSec: detail.recordingDurationSec  ?? null,
                        recordingUploadedAt:  detail.recordingUploadedAt   ?? null,
                      })}
                    >
                      <span className="material-symbols-outlined">quiz</span>
                      Quiz &amp; Vidéo
                    </button>
                  )}
                </div>
                <div><button className="rhcs-btn-back" onClick={closeModal}>Fermer</button></div>
              </div>
            </div>
          </div>
        )}

        {/* Bouton retour */}
        <button className="rhcs-back" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          Retour aux sujets
        </button>

        {/* Bannière sujet */}
        <div className="rhcs-sujet-banner">
          <div>
            <p className="rhcs-sujet-eyebrow">Sujet de stage · REF: {sujet.codeSujet}</p>
            <p className="rhcs-sujet-titre">{sujet.titre}</p>
            <div className="rhcs-sujet-meta">
              {sujet.departement && <span className="rhcs-sujet-meta-item"><span className="material-symbols-outlined">corporate_fare</span>{sujet.departement}</span>}
              {sujet.duree && <span className="rhcs-sujet-meta-item"><span className="material-symbols-outlined">schedule</span>{sujet.duree}</span>}
              {sujet.niveauEtudes && <span className="rhcs-sujet-meta-item"><span className="material-symbols-outlined">school</span>{sujet.niveauEtudes}</span>}
            </div>
          </div>
          <div className="rhcs-sujet-stats">
            <div className="rhcs-stat-box"><p className="rhcs-stat-num">{total}</p><p className="rhcs-stat-lbl">Total</p></div>
            <div className="rhcs-stat-box"><p className="rhcs-stat-num">{selec}</p><p className="rhcs-stat-lbl">Sélectionnés</p></div>
            <div className="rhcs-stat-box"><p className="rhcs-stat-num">{elim}</p><p className="rhcs-stat-lbl">Éliminés</p></div>
          </div>
        </div>

        {error && <div className="rhcs-error"><span className="material-symbols-outlined">error</span>{error}</div>}

        {/* Toolbar */}
        <div className="rhcs-toolbar">
          <div className="rhcs-toolbar-row">
            <div className="rhcs-search-wrap">
              <span className="material-symbols-outlined">search</span>
              <input className="rhcs-search" placeholder="Rechercher un candidat..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
            </div>
            <select className={`rhcs-select${filterStatut?' active':''}`} value={filterStatut}
              onChange={e => { setFilterStatut(e.target.value); setPage(1); }}>
              <option value="">Tous les statuts</option>
              {ALL_STATUTS.map(s => <option key={s.value} value={s.value}>{s.label} ({countBy(s.value)})</option>)}
            </select>
            <button className="rhcs-filter-btn" onClick={fetchCandidatures}>
              <span className="material-symbols-outlined">refresh</span>Actualiser
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="rhcs-loading">
            <span className="material-symbols-outlined rhcs-spin">progress_activity</span>
            Chargement des candidatures...
          </div>
        ) : (
          <div className="rhcs-table-wrap">
            <table className="rhcs-table">
              <thead className="rhcs-thead">
                <tr>
                  <th>Candidat</th>
                  <th>Score IA</th>
                  <th>Score Quiz</th>
                  <th>Score Entretien</th>
                  <th>Date dépôt</th>
                  <th>Statut</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody className="rhcs-tbody">
                {paged.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="rhcs-empty">
                      <span className="material-symbols-outlined">inbox</span>
                      <p>Aucune candidature{filterStatut ? ' pour ce statut' : ''}</p>
                    </div>
                  </td></tr>
                ) : paged.map(c => {
                  const pct   = c.scoreAi != null ? Math.min(Math.round(c.scoreAi), 100) : null;
                  const photo = c.candidatPhoto || null;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="rhcs-candidate">
                          <div className="rhcs-avatar" style={photo?{backgroundImage:`url(${photo})`,backgroundSize:'cover'}:{}}>
                            {!photo && getInit(c.candidatNom)}
                          </div>
                          <div>
                            <p className="rhcs-cand-name">{c.candidatNom||'—'}</p>
                            <p className="rhcs-cand-email">{c.candidatEmail||''}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {pct != null ? (
                          <div className="rhcs-score-wrap">
                            <div className="rhcs-score-bar"><div className="rhcs-score-fill" style={{width:`${pct}%`}}/></div>
                            <span className="rhcs-score-val">{pct}</span>
                          </div>
                        ) : <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>—</span>}
                      </td>
                      <td>
                        {c.scoreQuiz != null ? (
                          <button className="rhcs-quiz-badge-btn"
                            onClick={(e) => openQuizVideo(e, c)}
                            title="Voir quiz et vidéo">
                            <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>quiz</span>
                            {c.scoreQuiz}/50
                          </button>
                        ) : <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>—</span>}
                      </td>

                      {/* ── ✅ Score Entretien (note /10) ── */}
                      <td>
                        {c.scoreEntretien != null ? (
                          <span className="rhcs-entretien-badge" title="Note d'entretien">
                            <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>videocam</span>
                            {c.scoreEntretien}/10
                          </span>
                        ) : <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>—</span>}
                      </td>

                      <td><span style={{fontSize:'0.875rem',color:'#475569'}}>{c.dateDepot||'—'}</span></td>
                      <td><span className={`rhcs-badge ${c.statut}`}>{LABEL_MAP[c.statut]||c.statut}</span></td>
                      <td className="right">
                        <button className="rhcs-detail-link" onClick={() => openModal(c)}>Détails →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="rhcs-footer">
              <p className="rhcs-footer-info">
                {filtered.length===0?'0 candidature':`${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE,filtered.length)} sur ${filtered.length} candidature${filtered.length>1?'s':''}`}
              </p>
              <div className="rhcs-pages">
                <button className="rhcs-page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>
                  <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_left</span>
                </button>
                {Array.from({length:Math.min(totalPages,5)},(_,i)=>{
                  const p=totalPages<=5?i+1:page<=3?i+1:page>=totalPages-2?totalPages-4+i:page-2+i;
                  return <button key={p} className={`rhcs-page-btn${page===p?' active':''}`} onClick={()=>setPage(p)}>{p}</button>;
                })}
                <button className="rhcs-page-btn" disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>
                  <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RHCandidaturesSujet;