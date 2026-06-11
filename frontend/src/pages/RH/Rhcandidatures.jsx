import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const styles = `
  .rhc-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .rhc-root { font-family: 'Public Sans', sans-serif; }
  .rhc-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
  body { margin: 0; padding: 0; }

  .rhc-title { font-size: 2.5rem; font-weight: 900; color: #003d7a; letter-spacing: -0.05em; margin-bottom: 1rem; }
  .rhc-title-bar { width: 5rem; height: 0.375rem; background: #003d7a; border-radius: 9999px; margin-bottom: 1.5rem; }
  .rhc-subtitle { font-size: 0.9375rem; color: #64748b; margin-bottom: 2rem; font-weight: 500; }

  .rhc-toolbar { display: flex; flex-direction: column; gap: 0.875rem; margin-bottom: 1.5rem; }
  .rhc-toolbar-row1 { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
  .rhc-toolbar-row2 { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
  .rhc-search-wrap { flex: 1; min-width: 200px; position: relative; }
  .rhc-search-wrap .material-symbols-outlined { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.25rem; pointer-events: none; }
  .rhc-search { width: 100%; padding: 0.75rem 1rem 0.75rem 3rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhc-search:focus { border-color: #003d7a; box-shadow: 0 0 0 3px rgba(0,61,122,0.1); }
  .rhc-search::placeholder { color: #94a3b8; }
  .rhc-select { padding: 0.75rem 2rem 0.75rem 0.875rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.8125rem; font-family: 'Public Sans', sans-serif; color: #0f172a; outline: none; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04); appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M1 1l5 5 5-5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; min-width: 160px; }
  .rhc-select:focus { border-color: #003d7a; }
  .rhc-select.active { border-color: #003d7a; background-color: rgba(0,61,122,0.04); color: #003d7a; font-weight: 700; }
  .rhc-filter-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; font-family: 'Public Sans', sans-serif; white-space: nowrap; transition: background 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhc-filter-btn:hover { background: #f8fafc; }
  .rhc-filter-btn .material-symbols-outlined { font-size: 1.125rem; }
  .rhc-filter-btn.active { background: rgba(0,61,122,0.06); border-color: #003d7a; color: #003d7a; }
  .rhc-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .rhc-chip { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; background: rgba(0,61,122,0.08); border: 1px solid rgba(0,61,122,0.2); border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; color: #003d7a; }
  .rhc-chip button { background: none; border: none; cursor: pointer; color: #003d7a; display: flex; padding: 0; }
  .rhc-chip button .material-symbols-outlined { font-size: 0.875rem; }

  .rhc-tabs { display: flex; border-bottom: 1px solid #e2e8f0; margin-bottom: 1.5rem; gap: 0; }
  .rhc-tab { padding: 0.875rem 1.25rem; font-size: 0.8125rem; font-weight: 700; color: #64748b; cursor: pointer; background: none; border: none; font-family: 'Public Sans', sans-serif; white-space: nowrap; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; margin-bottom: -1px; display: flex; align-items: center; gap: 0.375rem; }
  .rhc-tab:hover { color: #003d7a; }
  .rhc-tab.active { color: #003d7a; border-bottom-color: #003d7a; }
  .rhc-tab-count { background: #f1f5f9; color: #64748b; border-radius: 9999px; padding: 0.1rem 0.5rem; font-size: 0.625rem; font-weight: 800; }
  .rhc-tab.active .rhc-tab-count { background: rgba(0,61,122,0.1); color: #003d7a; }

  .rhc-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; }
  .rhc-table { width: 100%; text-align: left; border-collapse: collapse; }
  .rhc-thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .rhc-thead th { padding: 1rem 1.5rem; font-size: 0.625rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
  .rhc-thead th.right { text-align: right; }
  .rhc-tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
  .rhc-tbody tr:last-child { border-bottom: none; }
  .rhc-tbody tr:hover { background: #f8fafc; }
  .rhc-tbody td { padding: 1rem 1.5rem; vertical-align: middle; }
  .rhc-tbody td.right { text-align: right; }
  .rhc-candidate { display: flex; align-items: center; gap: 0.75rem; }
  .rhc-avatar { width: 2.25rem; height: 2.25rem; border-radius: 9999px; background: rgba(0,61,122,0.1); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; color: #003d7a; font-weight: 700; font-size: 0.6875rem; flex-shrink: 0; overflow: hidden; }
  .rhc-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 9999px; }
  .rhc-cand-name { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .rhc-cand-email { font-size: 0.75rem; color: #94a3b8; margin-top: 0.1rem; }
  .rhc-sujet-title { font-size: 0.875rem; color: #475569; font-weight: 500; }
  .rhc-sujet-dept { font-size: 0.6875rem; color: #94a3b8; margin-top: 0.15rem; }
  .rhc-score-wrap { display: flex; align-items: center; gap: 0.75rem; }
  .rhc-score-bar { width: 5rem; height: 0.3125rem; background: #e2e8f0; border-radius: 9999px; overflow: hidden; flex-shrink: 0; }
  .rhc-score-fill { height: 100%; background: #003d7a; border-radius: 9999px; }
  .rhc-score-val { font-size: 0.8125rem; font-weight: 700; color: #334155; min-width: 2rem; }

  .rhc-badge { display: inline-flex; align-items: center; padding: 0.2rem 0.625rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; white-space: nowrap; }
  .rhc-badge.EN_COURS_EXAMEN     { background: rgba(37,99,235,0.08);  color: #1d4ed8; }
  .rhc-badge.PRESELECTIONNE_CV   { background: rgba(5,150,105,0.08);  color: #059669; }
  .rhc-badge.ELIMINE_CV          { background: rgba(239,68,68,0.08);  color: #dc2626; }
  .rhc-badge.ENTRETIEN_PLANIFIE  { background: rgba(245,158,11,0.1);  color: #b45309; }
  .rhc-badge.ACCEPTE_QUIZ        { background: rgba(124,58,237,0.1);  color: #7c3aed; }
  .rhc-badge.ELIMINE_QUIZ        { background: rgba(239,68,68,0.08);  color: #dc2626; }
  .rhc-badge.ACCEPTE_ENTRETIEN   { background: rgba(5,150,105,0.1);   color: #059669; }
  .rhc-badge.ELIMINE_ENTRETIEN   { background: rgba(239,68,68,0.08);  color: #dc2626; }
  .rhc-badge.ACCEPTE             { background: rgba(5,150,105,0.12);  color: #059669; }
  .rhc-badge.REFUSE              { background: rgba(239,68,68,0.1);   color: #dc2626; }

  .rhc-quiz-badge-btn { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 0.375rem; font-size: 0.6875rem; font-weight: 700; background: rgba(124,58,237,0.08); color: #003d7a; border: 1px solid rgba(124,58,237,0.2); cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; }
  .rhc-quiz-badge-btn:hover { background: rgba(124,58,237,0.15); }

  /* ✅ Badge entretien (note /10) */
  .rhc-entretien-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 0.375rem; font-size: 0.6875rem; font-weight: 700; background: rgba(5,150,105,0.08); color: #059669; border: 1px solid rgba(5,150,105,0.2); }
  .rhc-entretien-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhc-ent-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem; }
  .rhc-ent-title { font-size: 0.875rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; }
  .rhc-ent-title .material-symbols-outlined { color: #059669; }
  .rhc-ent-note-pill { display: flex; align-items: baseline; gap: 0.25rem; background: rgba(5,150,105,0.08); border: 1px solid rgba(5,150,105,0.25); border-radius: 0.75rem; padding: 0.5rem 1rem; }
  .rhc-ent-note-big { font-size: 1.75rem; font-weight: 900; color: #059669; line-height: 1; }
  .rhc-ent-note-unit { font-size: 0.875rem; color: #94a3b8; }
  .rhc-ent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
  .rhc-ent-field label { font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; display: block; margin-bottom: 0.25rem; }
  .rhc-ent-field p { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .rhc-ent-badge-status { display: inline-flex; align-items: center; padding: 0.2rem 0.625rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; }
  .rhc-ent-badge-status.TERMINE { background: rgba(5,150,105,0.1); color: #059669; }
  .rhc-ent-badge-status.PLANIFIE { background: rgba(245,158,11,0.1); color: #b45309; }
  .rhc-ent-badge-status.EN_COURS { background: rgba(37,99,235,0.08); color: #1d4ed8; }
  .rhc-ent-notes { background: rgba(0,61,122,0.03); border: 1px solid rgba(0,61,122,0.12); border-radius: 0.625rem; padding: 1rem; font-size: 0.8125rem; color: #334155; line-height: 1.65; white-space: pre-wrap; }
  .rhc-ent-notes-empty { color: #94a3b8; font-style: italic; }

  .rhc-detail-link { color: #003d7a; font-size: 0.8125rem; font-weight: 700; background: none; border: none; cursor: pointer; font-family: 'Public Sans', sans-serif; padding: 0.375rem 0.875rem; border-radius: 0.5rem; transition: background 0.15s; }
  .rhc-detail-link:hover { background: rgba(0,61,122,0.06); }

  .rhc-footer { padding: 1rem 1.5rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
  .rhc-footer-info { font-size: 0.75rem; color: #64748b; font-weight: 600; }
  .rhc-pages { display: flex; gap: 0.375rem; }
  .rhc-page-btn { width: 2rem; height: 2rem; border-radius: 0.375rem; border: 1px solid #e2e8f0; background: #fff; font-size: 0.75rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
  .rhc-page-btn:hover:not(:disabled):not(.active) { background: #f1f5f9; }
  .rhc-page-btn.active { background: #003d7a; color: #fff; border-color: #003d7a; }
  .rhc-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  @keyframes rhc-spin { to { transform: rotate(360deg); } }
  .rhc-spin { animation: rhc-spin 0.8s linear infinite; color: #003d7a; }
  .rhc-loading { display: flex; align-items: center; justify-content: center; padding: 5rem; gap: 0.75rem; color: #64748b; font-size: 0.875rem; font-weight: 600; }
  .rhc-error { background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; padding: 1rem 1.5rem; border-radius: 0.75rem; margin-bottom: 1.5rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
  .rhc-empty { text-align: center; padding: 5rem 2rem; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .rhc-empty .material-symbols-outlined { font-size: 3rem; color: #cbd5e1; }

  @keyframes rhc-toast-in { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
  .rhc-toast { position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; background: #0f172a; color: #fff; padding: 1rem 1.5rem; border-radius: 0.75rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 600; font-family: 'Public Sans', sans-serif; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); animation: rhc-toast-in 0.3s ease; }
  .rhc-toast .material-symbols-outlined { font-size: 1.25rem; }
  .rhc-toast.success .material-symbols-outlined { color: #22c55e; }
  .rhc-toast.error   .material-symbols-outlined { color: #ef4444; }

  .rhc-overlay { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .rhc-overlay-bg { position: absolute; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); }
  .rhc-modal { position: relative; background: #fff; width: 100%; max-width: 56rem; max-height: 95vh; display: flex; flex-direction: column; border-radius: 1rem; box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden; }
  .rhc-modal-header { background: linear-gradient(135deg, #003d7a 0%, #0056b3 100%); padding: 1.5rem 2rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .rhc-modal-header-left { display: flex; align-items: center; gap: 1rem; }
  .rhc-modal-avatar { width: 3rem; height: 3rem; border-radius: 9999px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 1rem; flex-shrink: 0; overflow: hidden; }
  .rhc-modal-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 9999px; }
  .rhc-modal-name { font-size: 1.25rem; font-weight: 900; color: #fff; }
  .rhc-modal-id   { font-size: 0.8125rem; color: rgba(255,255,255,0.65); margin-top: 0.15rem; }
  .rhc-modal-close { padding: 0.375rem; background: rgba(255,255,255,0.1); border: none; border-radius: 9999px; cursor: pointer; color: rgba(255,255,255,0.7); transition: all 0.15s; display: flex; }
  .rhc-modal-close:hover { background: rgba(255,255,255,0.2); color: #fff; }
  .rhc-modal-close .material-symbols-outlined { font-size: 1.25rem; }
  .rhc-modal-body { flex: 1; overflow-y: auto; background: #f8fafc; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .rhc-modal-top { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
  @media (min-width: 768px) { .rhc-modal-top { grid-template-columns: 2fr 1fr; } }
  .rhc-info-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhc-info-card-title { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
  .rhc-info-card-title .material-symbols-outlined { font-size: 1rem; color: #003d7a; }
  .rhc-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .rhc-info-field label { font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; display: block; margin-bottom: 0.25rem; }
  .rhc-info-field p { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .rhc-score-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .rhc-score-card-label { font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 1.25rem; }
  .rhc-score-wheel { position: relative; width: 8rem; height: 8rem; display: flex; align-items: center; justify-content: center; }
  .rhc-score-wheel svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  .rhc-score-wheel-val { font-size: 2rem; font-weight: 900; color: #003d7a; line-height: 1; }
  .rhc-sujet-banner { background: rgba(0,61,122,0.04); border: 1px solid rgba(0,61,122,0.15); border-radius: 0.75rem; padding: 1.25rem 1.5rem; display: flex; align-items: flex-start; gap: 1rem; }
  .rhc-sujet-banner-icon { width: 2.75rem; height: 2.75rem; border-radius: 0.5rem; background: #003d7a; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rhc-sujet-banner-icon .material-symbols-outlined { font-size: 1.25rem; }
  .rhc-sujet-eyebrow { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #003d7a; margin-bottom: 0.3rem; }
  .rhc-sujet-titre { font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; line-height: 1.35; }
  .rhc-sujet-meta { display: flex; flex-wrap: wrap; gap: 1rem; }
  .rhc-sujet-meta span { font-size: 0.8125rem; color: #475569; display: flex; align-items: center; gap: 0.375rem; font-weight: 500; }
  .rhc-sujet-meta .material-symbols-outlined { font-size: 1rem; color: #94a3b8; }
  .rhc-comp-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.75rem; }
  .rhc-comp-tag { font-size: 0.6875rem; font-weight: 600; background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; padding: 0.2rem 0.625rem; border-radius: 9999px; }
  .rhc-ai-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
  @media (min-width: 768px) { .rhc-ai-grid { grid-template-columns: 1fr 1fr; } }
  .rhc-ai-title { font-size: 0.875rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
  .rhc-ai-title .material-symbols-outlined { color: #003d7a; }
  .rhc-strengths { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1rem; }
  .rhc-strengths-title { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #15803d; display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.875rem; }
  .rhc-weaknesses { background: #fffbeb; border: 1px solid #fde68a; border-radius: 0.75rem; padding: 1.25rem; }
  .rhc-weaknesses-title { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #b45309; display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.875rem; }
  .rhc-insight-item { font-size: 0.875rem; color: #334155; display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; line-height: 1.55; }
  .rhc-dot-green { color: #16a34a; font-weight: 800; flex-shrink: 0; }
  .rhc-dot-amber { color: #d97706; font-weight: 800; flex-shrink: 0; }

  .rhc-criteria-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhc-criteria-item { margin-bottom: 1.375rem; }
  .rhc-criteria-item:last-child { margin-bottom: 0; }
  .rhc-criteria-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .rhc-criteria-label { font-size: 0.75rem; font-weight: 700; color: #475569; }
  .rhc-criteria-val { font-size: 0.875rem; font-weight: 900; color: #003d7a; }
  .rhc-criteria-bar { width: 100%; height: 0.625rem; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
  .rhc-criteria-fill { height: 100%; border-radius: 9999px; }
  .rhc-score-total { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1rem; background: rgba(0,61,122,0.06); border-radius: 0.5rem; margin-top: 1rem; }
  .rhc-score-total-label { font-size: 0.8125rem; font-weight: 700; color: #003d7a; }
  .rhc-score-total-val { font-size: 1.5rem; font-weight: 900; color: #003d7a; }

  /* ── Quiz/Video popup (smaller modal) ── */
  .rhc-qv-modal { position: relative; background: #fff; width: 100%; max-width: 42rem; max-height: 95vh; display: flex; flex-direction: column; border-radius: 1rem; box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden; }

  .rhc-quiz-section { background: linear-gradient(135deg, #1e0a3c, #2d1060); border-radius: 0.75rem; overflow: hidden; }
  .rhc-quiz-sec-header { padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
  .rhc-quiz-sec-left { display: flex; align-items: center; gap: 0.75rem; }
  .rhc-quiz-sec-left .material-symbols-outlined { font-size: 1.5rem; color: #c4b5fd; }
  .rhc-quiz-sec-title { font-size: 0.9375rem; font-weight: 800; color: #fff; }
  .rhc-quiz-sec-sub { font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 0.125rem; }
  .rhc-quiz-score-pill { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 0.75rem; padding: 0.625rem 1.125rem; text-align: center; }
  .rhc-quiz-score-pill .big { font-size: 1.75rem; font-weight: 900; color: #fff; line-height: 1; }
  .rhc-quiz-score-pill .small { font-size: 0.5625rem; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.08em; }
  .rhc-quiz-sec-body { background: #fff; border-top: 1px solid rgba(124,58,237,0.15); padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .rhc-quiz-info-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.75rem; }
  .rhc-quiz-info-cell { text-align: center; padding: 0.75rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #f1f5f9; }
  .rhc-quiz-info-cell .qlabel { font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.25rem; }
  .rhc-quiz-info-cell .qvalue { font-size: 1rem; font-weight: 900; color: #0f172a; }
  .rhc-quiz-bar-wrap { }
  .rhc-quiz-bar-header { display: flex; justify-content: space-between; margin-bottom: 0.375rem; }
  .rhc-quiz-bar-label { font-size: 0.75rem; font-weight: 700; color: #475569; }
  .rhc-quiz-bar-val { font-size: 0.75rem; font-weight: 700; color: #7c3aed; }
  .rhc-quiz-progress { width: 100%; height: 0.5rem; background: #e2e8f0; border-radius: 9999px; overflow: hidden; }
  .rhc-quiz-progress-fill { height: 100%; border-radius: 9999px; transition: width 0.6s ease; }
  .rhc-quiz-no-data { padding: 1.5rem; text-align: center; color: rgba(255,255,255,0.5); font-size: 0.875rem; font-style: italic; }

  .rhc-video-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhc-video-header { background: #0f172a; padding: 0.875rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
  .rhc-video-header-left { display: flex; align-items: center; gap: 0.625rem; }
  .rhc-video-header-left .material-symbols-outlined { color: #94a3b8; font-size: 1.125rem; }
  .rhc-video-header-left span { font-size: 0.875rem; font-weight: 700; color: #fff; }
  .rhc-video-body { padding: 1.25rem; }
  .rhc-video-player { width: 100%; border-radius: 0.625rem; overflow: hidden; background: #000; aspect-ratio: 16/9; }
  .rhc-video-player video { width: 100%; height: 100%; object-fit: contain; display: block; }
  .rhc-video-meta { display: flex; gap: 1.25rem; margin-top: 0.875rem; flex-wrap: wrap; align-items: center; }
  .rhc-video-meta-item { font-size: 0.75rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 0.375rem; }
  .rhc-video-meta-item .material-symbols-outlined { font-size: 1rem; color: #94a3b8; }
  .rhc-video-no-data { padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.875rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .rhc-video-no-data .material-symbols-outlined { font-size: 2rem; color: #cbd5e1; }

  .rhc-cv-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .rhc-cv-popup { background: #fff; border-radius: 0.875rem; width: 100%; max-width: 56rem; height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
  .rhc-cv-popup-header { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.25rem; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
  .rhc-cv-popup-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9375rem; font-weight: 700; color: #0f172a; }
  .rhc-cv-popup-close { width: 2rem; height: 2rem; border: none; background: #f1f5f9; border-radius: 0.375rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .rhc-cv-popup-body { flex: 1; overflow: hidden; }
  .rhc-cv-popup-body iframe { width: 100%; height: 100%; border: none; }
  .rhc-cv-popup-footer { padding: 0.75rem 1.25rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; flex-shrink: 0; }
  .rhc-cv-popup-dl { padding: 0.5rem 1.25rem; background: #003d7a; color: #fff; border: none; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.375rem; text-decoration: none; }

  .rhc-lettre-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; }
  .rhc-lettre-title { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.875rem; }
  .rhc-lettre-text { font-size: 0.875rem; color: #475569; line-height: 1.75; border-left: 3px solid #003d7a; padding-left: 1rem; font-style: italic; white-space: pre-line; }

  .rhc-modal-footer { padding: 1.25rem 2rem; border-top: 1px solid #e2e8f0; background: #fff; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; flex-wrap: wrap; gap: 0.75rem; }
  .rhc-footer-left { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
  .rhc-footer-action-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; border: 1px solid; transition: all 0.15s; text-decoration: none; }
  .rhc-footer-action-btn.cv { color: #003d7a; border-color: rgba(0,61,122,0.25); background: rgba(0,61,122,0.05); }
  .rhc-footer-action-btn.cv:hover { background: rgba(0,61,122,0.1); }
  .rhc-btn-back { padding: 0.625rem 1.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #fff; font-size: 0.875rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; }
`;

const ALL_STATUTS = [
  { value: 'EN_COURS_EXAMEN',    label: "En cours d'examen" },
  { value: 'PRESELECTIONNE_CV',  label: 'Présélectionné (CV)' },
  { value: 'ELIMINE_CV',         label: 'Éliminé (CV)' },
  { value: 'ACCEPTE_QUIZ',       label: 'Accepté phase quiz' },
  { value: 'ELIMINE_QUIZ',       label: 'Éliminé (Quiz)' },
  { value: 'ENTRETIEN_PLANIFIE',  label: 'Entretien planifié ' },
  { value: 'ACCEPTE',            label: 'Accepté définitif' },
  { value: 'REFUSE',             label: 'Refusé' },
];
const LABEL_MAP = Object.fromEntries(ALL_STATUTS.map(s => [s.value, s.label]));

const TABS = [
  { key: 'all',       label: 'Tous' },
  { key: 'analyse',   label: 'Analyse CV',      statuts: ['EN_COURS_EXAMEN','PRESELECTIONNE_CV','ELIMINE_CV'] },
  { key: 'quiz',      label: 'Quiz',             statuts: ['ACCEPTE_QUIZ','ELIMINE_QUIZ'] },
  { key: 'entretien', label: 'Entretiens',       statuts: ['ENTRETIEN_PLANIFIE','ACCEPTE_ENTRETIEN','ELIMINE_ENTRETIEN'] },
  { key: 'finale',    label: 'Sélection finale', statuts: ['ACCEPTE','REFUSE'] },
];

const PAGE_SIZE = 10;
const CIRCUM    = 351.86;
const getInit   = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const parseRapport = (txt = '') => {
  const r = { pts_forts: [], pts_faibles: [], resume: '' };
  if (!txt) return r;
  let section = null;
  txt.split('\n').forEach(line => {
    const l = line.trim();
    if (!l) return;
    if (l === 'POINTS FORTS :' || l === 'POINTS FORTS:')    { section = 'forts';   return; }
    if (l === 'POINTS FAIBLES :' || l === 'POINTS FAIBLES:'){ section = 'faibles'; return; }
    if (
      l.startsWith('Score :') || l.startsWith('Recommandation :') ||
      l.startsWith('Similarité') || l.startsWith('Email :') ||
      l.startsWith('Langue') || l.startsWith('FORMULE') ||
      l.startsWith('Modèle') || l.startsWith('BERT :')
    ) {
      if (l.startsWith('Score :')) r.resume = l;
      section = null;
      return;
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

const CRITERES = [
  { key:'semantique',  label:'Sémantique CV',           max:35 },
  { key:'competences', label:'Compétences techniques',  max:25 },
  { key:'experience',  label:'Expérience & projets',    max:20 },
  { key:'formation',   label:'Formation académique',    max:10 },
  { key:'structure',   label:'Structure du CV',          max:5  },
  { key:'lettre',      label:'Lettre de motivation',    max:5  },
];
const barColor = (val, max) => {
  const p = (val / max) * 100;
  return p >= 70 ? '#059669' : p >= 40 ? '#f59e0b' : '#ef4444';
};

const fmtDate     = (v) => v ? new Date(v).toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'}) : '—';
const fmtDateTime = (v) => v ? new Date(v).toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const fmtDuration = (sec) => { if (!sec) return '—'; return `${Math.floor(sec/60)}min ${sec%60}s`; };

// ═══════════════════════════════════════════════════════════════════════════
// Quiz + Video popup (standalone, triggered from table row)
// ═══════════════════════════════════════════════════════════════════════════
const QuizVideoModal = ({ data, onClose }) => {
  const { scoreQuiz, quizPasseLe, videoUrl,
          recordingDurationSec, recordingUploadedAt,
          candidatNom, candidatPhoto } = data;


  return (
    <div className="rhc-overlay" style={{zIndex: 300}}>
      <div className="rhc-overlay-bg" onClick={onClose}/>
      <div className="rhc-qv-modal">

        {/* Header */}
        <div className="rhc-modal-header">
          <div className="rhc-modal-header-left">
            <div className="rhc-modal-avatar">
              {candidatPhoto
                ? <img src={candidatPhoto} alt=""/>
                : getInit(candidatNom || '')}
            </div>
            <div>
              <p className="rhc-modal-name">{candidatNom || '—'}</p>
              <p className="rhc-modal-id">Quiz & Enregistrement vidéo</p>
            </div>
          </div>
          <button className="rhc-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="rhc-modal-body">

          {/* Section Quiz */}
          <div className="rhc-quiz-section">
            <div className="rhc-quiz-sec-header">
              <div className="rhc-quiz-sec-left">
                <span className="material-symbols-outlined">quiz</span>
                <div>
                  <p className="rhc-quiz-sec-title">Quiz Technique</p>
                  <p className="rhc-quiz-sec-sub">
                    {scoreQuiz != null
                      ? `Passé le ${fmtDateTime(quizPasseLe)}`
                      : 'Quiz non encore passé'}
                  </p>
                </div>
              </div>
              {scoreQuiz != null && (
                <div className="rhc-quiz-score-pill">
                  <div className="big">{scoreQuiz}<span style={{fontSize:'1rem',opacity:0.6}}>/50</span></div>
                  
                </div>
              )}
            </div>

            {scoreQuiz != null ? (
              <div className="rhc-quiz-sec-body">
               
              </div>
            ) : (
              <div className="rhc-quiz-no-data">Le candidat n'a pas encore passé le quiz.</div>
            )}
          </div>

          {/* Section Vidéo */}
          <div className="rhc-video-section">
            <div className="rhc-video-header">
              <div className="rhc-video-header-left">
                <span className="material-symbols-outlined">videocam</span>
                <span>Enregistrement vidéo du quiz</span>
              </div>
             
            </div>
            {videoUrl ? (
              <div className="rhc-video-body">
                <div className="rhc-video-player">
                  <video controls preload="metadata" src={videoUrl}>
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                </div>
                <div className="rhc-video-meta">
                  {recordingDurationSec != null && (
                    <span className="rhc-video-meta-item">
                      <span className="material-symbols-outlined">timer</span>
                      Durée : {fmtDuration(recordingDurationSec)}
                    </span>
                  )}
                  {recordingUploadedAt && (
                    <span className="rhc-video-meta-item">
                      <span className="material-symbols-outlined">cloud_upload</span>
                      Uploadé le {fmtDate(recordingUploadedAt)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rhc-video-no-data">
                <span className="material-symbols-outlined">videocam_off</span>
                <p>Aucun enregistrement vidéo disponible pour ce candidat.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
     
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
const RHCandidatures = () => {
  const [candidatures,   setCandidatures]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [search,         setSearch]         = useState('');
  const [filterStatut,   setFilterStatut]   = useState('');
  const [filterSujet,    setFilterSujet]    = useState('');
  const [activeTab,      setActiveTab]      = useState('all');
  const [page,           setPage]           = useState(1);
  const [toast,          setToast]          = useState(null);
  const [detail,         setDetail]         = useState(null);
  const [modalLoading,   setModalLoading]   = useState(false);
  const [showCv,         setShowCv]         = useState(false);
  const [quizVideoModal, setQuizVideoModal] = useState(null);

  const fetchCandidatures = async () => {
    setLoading(true); setError('');
    try { const { data } = await axios.get('/api/candidatures'); setCandidatures(data); }
    catch (err) { setError(err.response?.data?.message || 'Erreur de chargement.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchCandidatures(); }, []);

  const sujetOptions = useMemo(() => {
    const map = new Map();
    candidatures.forEach(c => {
      const id    = c.sujetId    ?? c.sujet?.id;
      const titre = c.sujetTitre ?? c.sujet?.titre;
      if (id && titre) map.set(String(id), titre);
    });
    return Array.from(map.entries()).map(([id, titre]) => ({ id, titre }));
  }, [candidatures]);

  const filtered = useMemo(() => {
    let list = [...candidatures];
    const tab = TABS.find(t => t.key === activeTab);
    if (tab?.statuts) list = list.filter(c => tab.statuts.includes(c.statut));
    if (filterStatut) list = list.filter(c => c.statut === filterStatut);
    if (filterSujet)  list = list.filter(c => String(c.sujetId ?? c.sujet?.id) === filterSujet);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.candidatNom     || c.candidat?.nom)?.toLowerCase().includes(q) ||
        (c.candidatEmail   || c.candidat?.email)?.toLowerCase().includes(q) ||
        (c.sujetTitre      || c.sujet?.titre)?.toLowerCase().includes(q) ||
        (c.sujetDepartement|| c.sujet?.departement)?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidatures, activeTab, filterStatut, filterSujet, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const tabCount   = key => {
    const t = TABS.find(t => t.key === key);
    if (!t?.statuts) return candidatures.length;
    return candidatures.filter(c => t.statuts.includes(c.statut)).length;
  };
  const hasActive = filterStatut || filterSujet || search.trim();
  const resetF    = () => { setSearch(''); setFilterStatut(''); setFilterSujet(''); setPage(1); };

  const showToastFn = (msg, type = 'success') => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3500);
  };

  const openModal = async (app) => {
    setDetail(null); setShowCv(false); setModalLoading(true);
    try {
      const { data } = await axios.get(`/api/candidatures/${app.id}`);
      setDetail(data);
    } catch {
      showToastFn('Erreur chargement dossier', 'error');
    } finally {
      setModalLoading(false);
    }
  };
  const closeModal = () => { setDetail(null); setShowCv(false); };

  useEffect(() => {
    const fn = e => {
      if (e.key === 'Escape') {
        if (quizVideoModal) { setQuizVideoModal(null); return; }
        closeModal();
        setShowCv(false);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [quizVideoModal]);

  // ── Modal detail data ──────────────────────────────────────────────────
  const score     = detail?.scoreAi?.scoreAi ?? null;
  const scorePct  = score != null ? Math.min(Math.round(score), 100) : null;
  const offset    = scorePct != null ? CIRCUM - (scorePct/100)*CIRCUM : CIRCUM;
  const det       = detail?.scoreAi?.detail || null;
  const rap       = parseRapport(detail?.scoreAi?.rapport);
  const profil    = detail?.profil || {};
  const photoUrl  = detail?.candidat?.photoUrl || profil?.photoUrl || null;
  const cvUrl     = profil?.cv || null;
  const cvName    = cvUrl ? cvUrl.split('/').pop().split('?')[0] : 'CV.pdf';

  return (
    <>
      <style>{styles}</style>
      <div className="rhc-root">

        {/* Toast */}
        {toast && (
          <div className={`rhc-toast ${toast.type}`}>
            <span className="material-symbols-outlined">{toast.type==='success'?'check_circle':'error'}</span>
            {toast.msg}
          </div>
        )}

        {/* ══ Quiz + Video popup ══ */}
        {quizVideoModal && (
          <QuizVideoModal
            data={quizVideoModal}
            onClose={() => setQuizVideoModal(null)}
          />
        )}

        {/* ══ CV POPUP iframe ══ */}
        {showCv && cvUrl && (
          <div className="rhc-cv-overlay" onClick={() => setShowCv(false)}>
            <div className="rhc-cv-popup" onClick={e => e.stopPropagation()}>
              <div className="rhc-cv-popup-header">
                <div className="rhc-cv-popup-title">
                  <span className="material-symbols-outlined">picture_as_pdf</span>{cvName}
                </div>
                <button className="rhc-cv-popup-close" onClick={() => setShowCv(false)}>
                  <span className="material-symbols-outlined" style={{fontSize:'1.125rem'}}>close</span>
                </button>
              </div>
              <div className="rhc-cv-popup-body">
                <iframe src={cvUrl} title="CV"/>
              </div>
              <div className="rhc-cv-popup-footer">
                <a href={cvUrl} download={cvName} className="rhc-cv-popup-dl">
                  <span className="material-symbols-outlined">download</span>Télécharger
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL DÉTAIL ══ */}
        {(detail || modalLoading) && (
          <div className="rhc-overlay">
            <div className="rhc-overlay-bg" onClick={closeModal}/>
            <div className="rhc-modal">

              {/* Header */}
              <div className="rhc-modal-header">
                <div className="rhc-modal-header-left">
                  <div className="rhc-modal-avatar">
                    {photoUrl ? <img src={photoUrl} alt=""/> : getInit(detail?.candidat?.nom||'')}
                  </div>
                  <div>
                    <p className="rhc-modal-name">{detail?.candidat?.nom||'—'}</p>
                    <p className="rhc-modal-id">#{detail?.id} · {detail?.candidat?.email||''}</p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                  {detail && <span style={{display:'flex',alignItems:'center',gap:'1rem', backgroundColor:'white'}} className={`rhc-badge ${detail.statut}`}>{LABEL_MAP[detail.statut]||detail.statut}</span>}
                  <button className="rhc-modal-close" onClick={closeModal}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="rhc-modal-body">
                {modalLoading ? (
                  <div className="rhc-loading">
                    <span className="material-symbols-outlined rhc-spin">progress_activity</span>
                    Chargement du dossier...
                  </div>
                ) : detail && (<>

                  {/* Infos + score wheel */}
                  <div className="rhc-modal-top">
                    <div className="rhc-info-card">
                      <p className="rhc-info-card-title">
                        <span className="material-symbols-outlined">badge</span>Informations candidat
                      </p>
                      <div className="rhc-info-grid">
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
                          <div key={l} className="rhc-info-field">
                            <label>{l}</label><p>{v||'—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rhc-score-card">
                      <p className="rhc-score-card-label">Score IA de correspondance</p>
                      {scorePct != null ? (<>
                        <div className="rhc-score-wheel">
                          <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="64" cy="64" r="56" fill="transparent" stroke="#f1f5f9" strokeWidth="8"/>
                            <circle cx="64" cy="64" r="56" fill="transparent" stroke="#003d7a" strokeWidth="8"
                              strokeDasharray={CIRCUM} strokeDashoffset={offset} strokeLinecap="round"/>
                          </svg>
                          <div style={{position:'absolute',textAlign:'center'}}>
                            <p className="rhc-score-wheel-val">{scorePct}</p>
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
                  <div className="rhc-sujet-banner">
                    <div className="rhc-sujet-banner-icon"><span className="material-symbols-outlined">work</span></div>
                    <div style={{flex:1}}>
                      <p className="rhc-sujet-eyebrow">Sujet de stage postulé</p>
                      <p className="rhc-sujet-titre">{detail.sujet?.titre||'—'}</p>
                      <div className="rhc-sujet-meta">
                        {detail.sujet?.departement && <span><span className="material-symbols-outlined">corporate_fare</span>{detail.sujet.departement}</span>}
                        {detail.sujet?.duree && <span><span className="material-symbols-outlined">schedule</span>{detail.sujet.duree}</span>}
                        <span><span className="material-symbols-outlined">calendar_today</span>Déposé le {detail.dateDepot||'—'}</span>
                      </div>
                      {Array.isArray(detail.sujet?.competences) && detail.sujet.competences.length>0 && (
                        <div className="rhc-comp-tags">
                          {detail.sujet.competences.map((c,i) => <span key={i} className="rhc-comp-tag">{c}</span>)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Analyse IA + critères */}
                  <div className="rhc-ai-grid">
                    <div>
                      <p className="rhc-ai-title">
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
                          <div className="rhc-strengths">
                            <p className="rhc-strengths-title"><span className="material-symbols-outlined">check_circle</span>Points forts</p>
                            {pts_forts.length > 0
                              ? pts_forts.map((p,i) => <div key={i} className="rhc-insight-item"><span className="rhc-dot-green">•</span>{p}</div>)
                              : <div className="rhc-insight-item"><span className="rhc-dot-green">•</span>Dossier complet soumis.</div>}
                          </div>
                          <div className="rhc-weaknesses">
                            <p className="rhc-weaknesses-title"><span className="material-symbols-outlined">warning</span>Points d'attention</p>
                            {pts_faibles.length > 0
                              ? pts_faibles.map((p,i) => <div key={i} className="rhc-insight-item"><span className="rhc-dot-amber">•</span>{p}</div>)
                              : <div className="rhc-insight-item"><span className="rhc-dot-amber">•</span>Vérifier l'adéquation du cursus.</div>}
                          </div>
                        </>);
                      })() : <p style={{fontSize:'0.875rem',color:'#94a3b8',fontStyle:'italic'}}>Scoring IA en cours...</p>}
                    </div>

                      <div className="rhc-criteria-card">
                      <p style={{fontSize:'0.875rem',fontWeight:700,color:'#0f172a',marginBottom:'1.5rem'}}>Scores détaillés</p>
                      {det ? (<>
                        {CRITERES.map(cr => {
                          const val = det[cr.key] ?? 0;
                          return (
                            <div key={cr.key} className="rhc-criteria-item">
                              <div className="rhc-criteria-row">
                                <span className="rhc-criteria-label">{cr.label}</span>
                                <span className="rhc-criteria-val">{val}/{cr.max}</span>
                              </div>
                              <div className="rhc-criteria-bar">
                                <div className="rhc-criteria-fill" style={{width:`${Math.min((val/cr.max)*100,100)}%`,background:barColor(val,cr.max)}}/>
                              </div>
                            </div>
                          );
                        })}
                        <div className="rhc-score-total">
                          <span className="rhc-score-total-label">Score total</span>
                          <span className="rhc-score-total-val">{score}/100</span>
                        </div>
                      </>) : <p style={{fontSize:'0.875rem',color:'#94a3b8',fontStyle:'italic'}}>{detail.scoreAi?'Détail non disponible.':'Scoring IA en cours...'}</p>}
                    </div>
                  </div>

                  {/* Lettre de motivation */}
                  <div className="rhc-lettre-box">
                    <p className="rhc-lettre-title">Lettre de motivation</p>
                    <p className="rhc-lettre-text">{detail.lettreMotivation||'—'}</p>
                  </div>

                  {/* ✅ Section Entretien */}
                  {(detail.scoreEntretien != null || detail.entretienStatut) && (
                    <div className="rhc-entretien-section">
                      <div className="rhc-ent-header">
                        <p className="rhc-ent-title">
                          <span className="material-symbols-outlined">videocam</span>
                          Entretien
                        </p>
                        {detail.scoreEntretien != null && (
                          <div className="rhc-ent-note-pill">
                            <span className="rhc-ent-note-big">{detail.scoreEntretien}</span>
                            <span className="rhc-ent-note-unit">/10</span>
                          </div>
                        )}
                      </div>

                      <div className="rhc-ent-grid">
                        <div className="rhc-ent-field">
                          <label>Statut</label>
                          <p>
                            <span className={`rhc-ent-badge-status ${detail.entretienStatut||''}`}>
                              {detail.entretienStatut || '—'}
                            </span>
                          </p>
                        </div>
                        <div className="rhc-ent-field">
                          <label>Date</label>
                          <p>{detail.dateEntretien || '—'}</p>
                        </div>
                        <div className="rhc-ent-field">
                          <label>Heure début</label>
                          <p>{detail.entretienHeureDebut || '—'}</p>
                        </div>
                        <div className="rhc-ent-field">
                          <label>Heure fin</label>
                          <p>{detail.entretienHeureFin || '—'}</p>
                        </div>
                      </div>

                      <div>
                        <label style={{fontSize:'0.5625rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',color:'#94a3b8',display:'block',marginBottom:'0.5rem'}}>
                          Remarques du RH
                        </label>
                        <div className="rhc-ent-notes">
                          {detail.notesRh && detail.notesRh.trim()
                            ? detail.notesRh
                            : <span className="rhc-ent-notes-empty">Aucune remarque saisie.</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </>)}
              </div>

              {/* Footer — CV + Quiz/Vidéo */}
              <div className="rhc-modal-footer">
                <div className="rhc-footer-left">
                  {cvUrl && (
                    <button className="rhc-footer-action-btn cv" onClick={() => setShowCv(true)}>
                      <span className="material-symbols-outlined">picture_as_pdf</span>
                      Voir le CV
                    </button>
                  )}
                  {detail?.scoreQuiz != null && (
                    <button
                      className="rhc-footer-action-btn"
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
                <div><button className="rhc-btn-back" onClick={closeModal}>Fermer</button></div>
              </div>
            </div>
          </div>
        )}

        {/* ══ PAGE ══ */}
        <h2 className="rhc-title">Candidatures</h2>
        <div className="rhc-title-bar"/>
        <p className="rhc-subtitle">Gérez et suivez toutes les candidatures de stagiaires.</p>

        {error && <div className="rhc-error"><span className="material-symbols-outlined">error</span>{error}</div>}

        {/* Toolbar */}
        <div className="rhc-toolbar">
          <div className="rhc-toolbar-row1">
            <div className="rhc-search-wrap">
              <span className="material-symbols-outlined">search</span>
              <input className="rhc-search" placeholder="Rechercher un candidat, email, sujet..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
            </div>
            <button className="rhc-filter-btn" onClick={() => { fetchCandidatures(); setPage(1); }}>
              <span className="material-symbols-outlined">refresh</span>Actualiser
            </button>
            {hasActive && (
              <button className="rhc-filter-btn active" onClick={resetF}>
                <span className="material-symbols-outlined">filter_list_off</span>Effacer filtres
              </button>
            )}
          </div>
          <div className="rhc-toolbar-row2">
            <select className={`rhc-select${filterStatut?' active':''}`} value={filterStatut}
              onChange={e => { setFilterStatut(e.target.value); setPage(1); }}>
              <option value="">Tous les statuts</option>
              {ALL_STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className={`rhc-select${filterSujet?' active':''}`} value={filterSujet}
              onChange={e => { setFilterSujet(e.target.value); setPage(1); }}>
              <option value="">Tous les sujets</option>
              {sujetOptions.map(s => <option key={s.id} value={s.id}>{s.titre}</option>)}
            </select>
            <span style={{fontSize:'0.75rem',color:'#94a3b8',fontWeight:600}}>
              {filtered.length} résultat{filtered.length!==1?'s':''}
            </span>
          </div>
        </div>

        {/* Chips */}
        {hasActive && (
          <div className="rhc-chips">
            {search && (
              <span className="rhc-chip">
                <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>search</span>
                "{search}"
                <button onClick={() => { setSearch(''); setPage(1); }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </span>
            )}
            {filterStatut && (
              <span className="rhc-chip">
                <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>flag</span>
                {LABEL_MAP[filterStatut]}
                <button onClick={() => { setFilterStatut(''); setPage(1); }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </span>
            )}
            {filterSujet && (
              <span className="rhc-chip">
                <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>work</span>
                {sujetOptions.find(s => s.id === filterSujet)?.titre || filterSujet}
                <button onClick={() => { setFilterSujet(''); setPage(1); }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </span>
            )}
          </div>
        )}

        {/* Onglets */}
        <div className="rhc-tabs">
          {TABS.map(tab => (
            <button key={tab.key} className={`rhc-tab${activeTab===tab.key?' active':''}`}
              onClick={() => { setActiveTab(tab.key); setPage(1); setFilterStatut(''); }}>
              {tab.label}
              <span className="rhc-tab-count">{tabCount(tab.key)}</span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="rhc-loading">
            <span className="material-symbols-outlined rhc-spin">progress_activity</span>
            Chargement des candidatures...
          </div>
        ) : (
          <div className="rhc-table-wrap">
            <table className="rhc-table">
              <thead className="rhc-thead">
                <tr>
                  <th>Candidat</th>
                  <th>Sujet de stage</th>
                  <th>Score IA</th>
                  <th>Score Quiz</th>
                  <th>Score Entretien</th>
                  <th>Statut</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody className="rhc-tbody">
                {paged.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="rhc-empty">
                      <span className="material-symbols-outlined">inbox</span>
                      <p>Aucune candidature trouvée</p>
                      {hasActive && (
                        <button className="rhc-filter-btn" onClick={resetF} style={{marginTop:'0.5rem'}}>
                          Effacer les filtres
                        </button>
                      )}
                    </div>
                  </td></tr>
                ) : paged.map(app => {
                  const rawScore = app.scoreAi;
                  const s = typeof rawScore === 'number' ? rawScore
                           : typeof rawScore === 'object' ? (rawScore?.scoreAi ?? null)
                           : null;
                  const pct  = s != null ? Math.min(Math.round(s), 100) : null;
                  const photo = app.candidatPhoto || app.candidat?.photoUrl || null;
                  return (
                    <tr key={app.id}>
                      <td>
                        <div className="rhc-candidate">
                          <div className="rhc-avatar"
                            style={photo ? {backgroundImage:`url(${photo})`,backgroundSize:'cover'} : {}}>
                            {!photo && getInit(app.candidatNom)}
                          </div>
                          <div>
                            <p className="rhc-cand-name">{app.candidatNom || app.candidat?.nom || '—'}</p>
                            <p className="rhc-cand-email">{app.candidatEmail || app.candidat?.email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="rhc-sujet-title">{app.sujetTitre || app.sujet?.titre || '—'}</p>
                        {(app.sujetDepartement || app.sujet?.departement) && (
                          <p className="rhc-sujet-dept">{app.sujetDepartement || app.sujet?.departement}</p>
                        )}
                      </td>
                      <td>
                        {pct != null ? (
                          <div className="rhc-score-wrap">
                            <div className="rhc-score-bar">
                              <div className="rhc-score-fill" style={{width:`${pct}%`}}/>
                            </div>
                            <span className="rhc-score-val">{pct}</span>
                          </div>
                        ) : <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>—</span>}
                      </td>

                      {/* ── Score Quiz : bouton cliquable → QuizVideoModal ── */}
                      <td>
                        {app.scoreQuiz != null ? (
                          <button
                            className="rhc-quiz-badge-btn"
                            title="Voir quiz et vidéo"
                          >
                            <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>quiz</span>
                            {app.scoreQuiz}/50
                          </button>
                        ) : (
                          <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>—</span>
                        )}
                      </td>

                      {/* ── ✅ Score Entretien (note /10) ── */}
                      <td>
                        {app.scoreEntretien != null ? (
                          <span className="rhc-entretien-badge" title="Note d'entretien">
                            <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>videocam</span>
                            {app.scoreEntretien}/10
                          </span>
                        ) : (
                          <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>—</span>
                        )}
                      </td>

                      <td>
                        <span className={`rhc-badge ${app.statut}`}>
                          {LABEL_MAP[app.statut]||app.statut}
                        </span>
                      </td>
                      <td className="right">
                        <button className="rhc-detail-link" onClick={() => openModal(app)}>
                          Détails →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="rhc-footer">
              <p className="rhc-footer-info">
                {filtered.length === 0
                  ? '0 candidature'
                  : `${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE,filtered.length)} sur ${filtered.length} candidature${filtered.length>1?'s':''}`}
              </p>
              <div className="rhc-pages">
                <button className="rhc-page-btn" disabled={page===1} onClick={() => setPage(p => p-1)}>
                  <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_left</span>
                </button>
                {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                  const p = totalPages<=5 ? i+1 : page<=3 ? i+1 : page>=totalPages-2 ? totalPages-4+i : page-2+i;
                  return (
                    <button key={p} className={`rhc-page-btn${page===p?' active':''}`} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  );
                })}
                <button className="rhc-page-btn" disabled={page>=totalPages} onClick={() => setPage(p => p+1)}>
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

export default RHCandidatures;