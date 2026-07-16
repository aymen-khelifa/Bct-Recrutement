import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .dc-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .dc-root { font-family: 'Public Sans', sans-serif; background: #f5f7f8; color: #0f172a; min-height: 100vh; }
  .dc-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }

  /* NAV */
  .dc-nav { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #e2e8f0; }
  .dc-nav-inner { max-width: 64rem; margin: 0 auto; padding: 0 1.5rem; display: flex; justify-content: space-between; align-items: center; height: 4rem; }
  .dc-brand { display: flex; align-items: center; gap: 0.625rem; }
  .dc-brand-icon { width: 2rem; height: 2rem; background: #003d7a; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: #fff; }
  .dc-brand-icon .material-symbols-outlined { font-size: 1.125rem; }
  .dc-brand-name { font-size: 1rem; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
  .dc-nav-links { display: none; }
  @media (min-width: 768px) { .dc-nav-links { display: flex; gap: 1.5rem; } }
  .dc-nav-links a { font-size: 0.875rem; font-weight: 500; color: #64748b; text-decoration: none; padding: 0.5rem 0.75rem; transition: color 0.2s; }
  .dc-nav-links a.active { color: #003d7a; border-bottom: 2px solid #003d7a; font-weight: 700; }
  .dc-nav-links a:hover { color: #003d7a; }
  .dc-nav-right { display: flex; align-items: center; gap: 0.75rem; }
  .dc-nav-icon-btn { width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: #f1f5f9; border: none; display: flex; align-items: center; justify-content: center; color: #64748b; cursor: pointer; transition: background 0.2s; }
  .dc-nav-icon-btn:hover { background: #e2e8f0; }
  .dc-nav-icon-btn .material-symbols-outlined { font-size: 1.25rem; }
  .dc-user-chip { background: rgba(0,61,122,0.08); border: 1px solid rgba(0,61,122,0.15); border-radius: 9999px; padding: 0.25rem 0.875rem 0.25rem 0.25rem; display: flex; align-items: center; gap: 0.5rem; }
  .dc-user-chip-avatar { width: 2rem; height: 2rem; border-radius: 9999px; background: #003d7a; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.75rem; font-weight: 700; }
  .dc-user-chip-name { font-size: 0.8125rem; font-weight: 600; color: #0f172a; display: none; }
  @media (min-width: 640px) { .dc-user-chip-name { display: block; } }

  /* MAIN */
  .dc-main { max-width: 64rem; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }

  /* WELCOME */
  .dc-welcome { margin-bottom: 2rem; }
  .dc-welcome h1 { font-size: 2.25rem; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; }
  .dc-welcome p { font-size: 1rem; color: #64748b; margin-top: 0.5rem; line-height: 1.6; }

  /* STEPPER */
  .dc-stepper-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.875rem; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04); overflow-x: auto; }
  .dc-stepper-title { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin-bottom: 2.5rem; }
  .dc-stepper { position: relative; display: flex; align-items: flex-start; justify-content: space-between; min-width: 600px; padding: 1.5rem 1rem 0; }
  .dc-stepper-line { position: absolute; top: 1.5rem; left: 0; width: 100%; height: 2px; background: #e2e8f0; z-index: 0; }
  .dc-stepper-progress { position: absolute; top: 1.5rem; left: 0; height: 2px; z-index: 0; transition: width 0.5s ease; }
  .dc-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; background: #fff; padding: 0 0.75rem; }
  .dc-step-circle { width: 3rem; height: 3rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .dc-step-circle.done    { background: #059669; color: #fff; box-shadow: 0 4px 12px rgba(5,150,105,0.25); }
  .dc-step-circle.done-red { background: #dc2626; color: #fff; box-shadow: 0 4px 12px rgba(220,38,38,0.25); }
  .dc-step-circle.active  { background: #fff; border: 3px solid #003d7a; color: #003d7a; box-shadow: 0 0 0 4px rgba(0,61,122,0.1); }
  .dc-step-circle.active .material-symbols-outlined { animation: pulse-icon 1.5s ease-in-out infinite; }
  @keyframes pulse-icon { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .dc-step-circle.pending { background: #f8fafc; border: 2px solid #e2e8f0; color: #94a3b8; }
  .dc-step-circle.amber   { background: rgba(245,158,11,0.05); border: 2px solid rgba(245,158,11,0.4); color: #d97706; }
  .dc-step-circle.purple  { background: rgba(124,58,237,0.05); border: 2px solid rgba(124,58,237,0.4); color: #7c3aed; animation: pulse-quiz 1.5s ease-in-out infinite; }
  @keyframes pulse-quiz { 0%,100% { box-shadow: 0 0 0 rgba(124,58,237,0.3); } 50% { box-shadow: 0 0 12px rgba(124,58,237,0.5); } }
  .dc-step-circle .material-symbols-outlined { font-size: 1.375rem; }
  .dc-step-label { font-size: 0.6875rem; font-weight: 700; text-align: center; color: #0f172a; line-height: 1.3; max-width: 5rem; }
  .dc-step-label.active  { color: #003d7a; }
  .dc-step-label.refused { color: #dc2626; }
  .dc-step-label.quiz    { color: #7c3aed; }
  .dc-step-label.pending { color: #94a3b8; font-weight: 500; font-style: italic; }
  .dc-step-sub { font-size: 0.5625rem; color: #94a3b8; font-style: italic; text-align: center; }
  .dc-step-sub.active-sub { color: rgba(0,61,122,0.7); font-weight: 700; font-style: normal; }
  .dc-step-sub.refused-sub { color: #dc2626; font-weight: 700; font-style: normal; }
  .dc-step-sub.quiz-sub { color: #7c3aed; font-weight: 700; font-style: normal; }

  /* GRID */
  .dc-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
  @media (min-width: 1024px) { .dc-grid { grid-template-columns: 1fr 340px; } }

  /* CARDS */
  .dc-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.875rem; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }

  /* STATUS BANNER */
  .dc-banner { border-radius: 0.875rem; padding: 1.375rem; display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
  .dc-banner.blue   { background: rgba(0,61,122,0.04);   border: 1px solid rgba(0,61,122,0.15); }
  .dc-banner.amber  { background: rgba(245,158,11,0.04); border: 1px solid rgba(245,158,11,0.2); }
  .dc-banner.green  { background: rgba(5,150,105,0.04);  border: 1px solid rgba(5,150,105,0.2); }
  .dc-banner.red    { background: rgba(220,38,38,0.04);  border: 1px solid rgba(220,38,38,0.15); }
  .dc-banner.purple { background: rgba(124,58,237,0.04); border: 1px solid rgba(124,58,237,0.2); }
  .dc-banner-icon { width: 3rem; height: 3rem; border-radius: 0.625rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; }
  .dc-banner-icon.blue   { background: #003d7a; }
  .dc-banner-icon.amber  { background: #d97706; }
  .dc-banner-icon.green  { background: #059669; }
  .dc-banner-icon.red    { background: #dc2626; }
  .dc-banner-icon.purple { background: #7c3aed; }
  .dc-banner-icon .material-symbols-outlined { font-size: 1.5rem; }
  .dc-banner-tag { display: inline-flex; align-items: center; padding: 0.2rem 0.625rem; border-radius: 0.25rem; font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.375rem; }
  .dc-banner-tag.blue   { background: rgba(37,99,235,0.1); color: #2563eb; border: 1px solid rgba(37,99,235,0.2); }
  .dc-banner-tag.amber  { background: rgba(245,158,11,0.1); color: #d97706; border: 1px solid rgba(245,158,11,0.2); }
  .dc-banner-tag.green  { background: rgba(5,150,105,0.1);  color: #059669; border: 1px solid rgba(5,150,105,0.2); }
  .dc-banner-tag.red    { background: rgba(220,38,38,0.1);  color: #dc2626; border: 1px solid rgba(220,38,38,0.2); }
  .dc-banner-tag.purple { background: rgba(124,58,237,0.1); color: #7c3aed; border: 1px solid rgba(124,58,237,0.2); }
  .dc-banner-title.blue   { font-size: 1.125rem; font-weight: 800; color: #003d7a; margin-bottom: 0.5rem; }
  .dc-banner-title.amber  { font-size: 1.125rem; font-weight: 800; color: #d97706; margin-bottom: 0.5rem; }
  .dc-banner-title.green  { font-size: 1.125rem; font-weight: 800; color: #059669; margin-bottom: 0.5rem; }
  .dc-banner-title.red    { font-size: 1.125rem; font-weight: 800; color: #dc2626; margin-bottom: 0.5rem; }
  .dc-banner-title.purple { font-size: 1.125rem; font-weight: 800; color: #7c3aed; margin-bottom: 0.5rem; }
  .dc-banner p { font-size: 0.875rem; color: #475569; line-height: 1.65; }

  /* REFUSE CARD */
  .dc-refused-card { background: linear-gradient(135deg, #1e0505, #3b0f0f); border: 1px solid rgba(220,38,38,0.3); border-radius: 0.875rem; padding: 2rem; color: #fff; position: relative; overflow: hidden; margin-bottom: 1.5rem; }
  .dc-refused-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at bottom right, rgba(220,38,38,0.15), transparent 60%); }
  .dc-refused-card > * { position: relative; z-index: 1; }
  .dc-refused-tag { display: inline-flex; padding: 0.2rem 0.625rem; border-radius: 0.25rem; font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(220,38,38,0.2); color: #fca5a5; border: 1px solid rgba(220,38,38,0.3); margin-bottom: 0.75rem; }
  .dc-refused-title { font-size: 1.375rem; font-weight: 900; margin-bottom: 0.625rem; }
  .dc-refused-sub { font-size: 0.9375rem; color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 1.5rem; }
  .dc-refused-cta { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .dc-refused-btn-primary { padding: 0.5625rem 1.25rem; background: #fff; color: #dc2626; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.375rem; }
  .dc-refused-btn-primary .material-symbols-outlined { font-size: 1rem; }
  .dc-refused-btn-secondary { padding: 0.5625rem 1.25rem; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.375rem; }
  .dc-refused-btn-secondary .material-symbols-outlined { font-size: 1rem; }

  /* ACCEPTE FINAL CARD */
  .dc-accepted-card { background: linear-gradient(135deg, #022c1a, #064e2e); border: 1px solid rgba(5,150,105,0.3); border-radius: 0.875rem; padding: 2rem; color: #fff; position: relative; overflow: hidden; margin-bottom: 1.5rem; }
  .dc-accepted-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at top left, rgba(5,150,105,0.2), transparent 60%); }
  .dc-accepted-card > * { position: relative; z-index: 1; }
  .dc-accepted-tag { display: inline-flex; padding: 0.2rem 0.625rem; border-radius: 0.25rem; font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(5,150,105,0.25); color: #6ee7b7; border: 1px solid rgba(5,150,105,0.4); margin-bottom: 0.75rem; }
  .dc-accepted-title { font-size: 1.375rem; font-weight: 900; margin-bottom: 0.625rem; }
  .dc-accepted-sub { font-size: 0.9375rem; color: rgba(255,255,255,0.75); line-height: 1.6; margin-bottom: 1.5rem; }
  .dc-accepted-btn { padding: 0.5625rem 1.5rem; background: #fff; color: #059669; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: inline-flex; align-items: center; gap: 0.375rem; }
  .dc-accepted-btn .material-symbols-outlined { font-size: 1rem; }

  /* QUIZ CARD */
  .dc-quiz-card { background: linear-gradient(135deg, #1e0a3c, #2d1060); border: 1px solid rgba(124,58,237,0.35); border-radius: 0.875rem; padding: 1.5rem; color: #fff; position: relative; overflow: hidden; box-shadow: 0 0 0 4px rgba(124,58,237,0.08); }
  .dc-quiz-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at top right, rgba(124,58,237,0.25), transparent 60%); }
  .dc-quiz-card > * { position: relative; z-index: 1; }
  .dc-quiz-card-bg { position: absolute; top: 0; right: 0; padding: 1rem; opacity: 0.07; }
  .dc-quiz-card-bg .material-symbols-outlined { font-size: 6rem !important; }
  .dc-quiz-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.875rem; }
  .dc-quiz-header-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.5); }
  .dc-quiz-tag { padding: 0.2rem 0.5rem; background: rgba(124,58,237,0.2); color: #c4b5fd; font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; border-radius: 0.25rem; border: 1px solid rgba(124,58,237,0.35); }
  .dc-quiz-title { font-size: 1.125rem; font-weight: 800; margin-bottom: 0.375rem; }
  .dc-quiz-sub { font-size: 0.8125rem; color: rgba(255,255,255,0.65); margin-bottom: 0.625rem; line-height: 1.5; }
  .dc-quiz-meta { display: flex; gap: 1.25rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
  .dc-quiz-meta-item { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; color: rgba(255,255,255,0.6); }
  .dc-quiz-meta-item .material-symbols-outlined { font-size: 0.875rem; color: #a78bfa; }
  .dc-quiz-btn { width: 100%; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; border: none; border-radius: 0.5rem; padding: 0.75rem; font-size: 0.9375rem; font-weight: 800; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s; box-shadow: 0 4px 15px rgba(124,58,237,0.4); }
  .dc-quiz-btn:hover { background: linear-gradient(135deg, #6d28d9, #5b21b6); box-shadow: 0 6px 20px rgba(124,58,237,0.55); transform: translateY(-1px); }
  .dc-quiz-btn .material-symbols-outlined { font-size: 1.25rem; }
  .dc-quiz-note { font-size: 0.625rem; color: rgba(255,255,255,0.4); text-align: center; margin-top: 0.75rem; font-style: italic; }

  /* SCORE QUIZ card */
  .dc-score-card { background: linear-gradient(135deg, #022c1a, #064e2e); border: 1px solid rgba(5,150,105,0.3); border-radius: 0.875rem; padding: 1.5rem; color: #fff; }
  .dc-score-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .dc-score-tag { padding: 0.2rem 0.5rem; background: rgba(5,150,105,0.2); color: #6ee7b7; font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; border-radius: 0.25rem; border: 1px solid rgba(5,150,105,0.35); }
  .dc-score-big { font-size: 3.5rem; font-weight: 900; color: #6ee7b7; letter-spacing: -0.05em; line-height: 1; }
  .dc-score-label { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 0.25rem; }
  .dc-score-mention { display: inline-block; padding: 0.25rem 0.75rem; background: rgba(255,255,255,0.1); border-radius: 0.375rem; font-size: 0.8125rem; font-weight: 700; margin-top: 0.75rem; }

  /* FACE VERIFICATION BTN */
  .dc-face-btn { width:100%; padding:.75rem; background:linear-gradient(135deg,#003d7a,#0056b3); color:#fff; border:none; border-radius:.5rem; font-size:.9375rem; font-weight:800; cursor:pointer; font-family:'Public Sans',sans-serif; display:flex; align-items:center; justify-content:center; gap:.5rem; margin-top:.75rem; box-shadow:0 4px 15px rgba(0,61,122,.3); transition:all .2s; }
  .dc-face-btn:hover { opacity:.9; transform:translateY(-1px); }
  .dc-face-btn .material-symbols-outlined { font-size:1.25rem; }
  .dc-face-verified { display:flex; align-items:center; gap:.5rem; padding:.625rem 1rem; background:rgba(5,150,105,.1); border:1px solid rgba(5,150,105,.3); border-radius:.5rem; color:#059669; font-size:.875rem; font-weight:700; margin-top:.75rem; }
  .dc-face-verified .material-symbols-outlined { font-size:1.125rem; }

  /* INTERVIEW CARD */
  .dc-interview-card { background: #0f172a; border-radius: 0.875rem; padding: 1.5rem; color: #fff; position: relative; overflow: hidden; border: 1px solid rgba(245,158,11,0.3); box-shadow: 0 0 0 4px rgba(245,158,11,0.08); }
  .dc-interview-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at top right, rgba(245,158,11,0.12), transparent 60%); }
  .dc-interview-card > * { position: relative; z-index: 1; }
  .dc-interview-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
  .dc-interview-header-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
  .dc-interview-tag { padding: 0.2rem 0.5rem; background: rgba(245,158,11,0.15); color: #f59e0b; font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; border-radius: 0.25rem; border: 1px solid rgba(245,158,11,0.3); }
  .dc-interview-title { font-size: 1.125rem; font-weight: 800; margin-bottom: 0.5rem; }
  .dc-interview-time { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #94a3b8; margin-bottom: 1.5rem; }
  .dc-interview-time .material-symbols-outlined { font-size: 1rem; }
  .dc-interview-btn-primary { width: 100%; background: #003d7a; color: #fff; border: none; border-radius: 0.5rem; padding: 0.6875rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .dc-interview-btn-primary .material-symbols-outlined { font-size: 1.25rem; }
  .dc-interview-note { font-size: 0.625rem; color: #475569; text-align: center; margin-top: 1rem; font-style: italic; }

  /* DOCS */
  .dc-doc-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .dc-doc-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border-radius: 0.5rem; background: #f8fafc; border: 1px solid transparent; transition: all 0.15s; }
  .dc-doc-item:hover { background: #f1f5f9; border-color: #e2e8f0; }
  .dc-doc-left { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
  .dc-doc-left .material-symbols-outlined { font-size: 1.5rem; flex-shrink: 0; }
  .dc-doc-name { font-size: 0.8125rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dc-doc-sub { font-size: 0.625rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.1rem; }
  .dc-doc-actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
  .dc-doc-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0.25rem; border-radius: 0.375rem; display: flex; }
  .dc-doc-btn:hover { color: #003d7a; background: rgba(0,61,122,0.06); }
  .dc-doc-btn .material-symbols-outlined { font-size: 1.125rem; }

  /* TIMELINE */
  .dc-timeline { display: flex; flex-direction: column; }
  .dc-tl-item { display: flex; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; }
  .dc-tl-item:last-child { border-bottom: none; padding-bottom: 0; }
  .dc-tl-date { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; width: 5.5rem; flex-shrink: 0; padding-top: 0.125rem; }
  .dc-tl-content p:first-child { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .dc-tl-content p:last-child { font-size: 0.8125rem; color: #64748b; margin-top: 0.2rem; }

  /* POPUP DOCUMENT */
  .dc-popup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .dc-popup { background: #fff; border-radius: 0.875rem; width: 100%; max-width: 56rem; height: 85vh; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.35); overflow: hidden; }
  .dc-popup-header { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.25rem; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
  .dc-popup-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9375rem; font-weight: 700; color: #0f172a; }
  .dc-popup-title .material-symbols-outlined { color: #003d7a; font-size: 1.25rem; }
  .dc-popup-close { width: 2rem; height: 2rem; border-radius: 0.375rem; border: none; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .dc-popup-close .material-symbols-outlined { font-size: 1.125rem; }
  .dc-popup-body { flex: 1; overflow: hidden; position: relative; }
  .dc-popup-body iframe { width: 100%; height: 100%; border: none; }
  .dc-popup-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 0.75rem; color: #64748b; font-size: 0.875rem; }
  .dc-popup-loading .material-symbols-outlined { font-size: 1.75rem; color: #003d7a; animation: dc-spin 0.8s linear infinite; }
  .dc-popup-no-preview { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 1rem; color: #94a3b8; }
  .dc-popup-no-preview .material-symbols-outlined { font-size: 3rem; color: #cbd5e1; }
  .dc-popup-footer { padding: 0.75rem 1.25rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.75rem; flex-shrink: 0; }
  .dc-popup-dl-btn { padding: 0.5rem 1.25rem; border-radius: 0.5rem; border: none; background: #003d7a; color: #fff; font-size: 0.8125rem; font-weight: 700; display: flex; align-items: center; gap: 0.375rem; cursor: pointer; font-family: 'Public Sans', sans-serif; text-decoration: none; }
  .dc-popup-dl-btn .material-symbols-outlined { font-size: 1rem; }

  /* POPUP QUIZ CONFIRMATION */
  @keyframes dc-quiz-conf-in { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
  .dc-qconf-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.7); backdrop-filter: blur(6px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  .dc-qconf-modal { background: #fff; border-radius: 1.25rem; width: 100%; max-width: 42rem; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(124,58,237,0.15); animation: dc-quiz-conf-in 0.22s ease; }
  .dc-qconf-header { background: linear-gradient(135deg, #1e0a3c, #2d1060); padding: 2rem 2rem 1.5rem; color: #fff; position: relative; overflow: hidden; }
  .dc-qconf-header::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at top right, rgba(124,58,237,0.3), transparent 65%); }
  .dc-qconf-header > * { position: relative; z-index: 1; }
  .dc-qconf-icon { width: 3.5rem; height: 3.5rem; background: rgba(124,58,237,0.3); border: 1px solid rgba(124,58,237,0.5); border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
  .dc-qconf-icon .material-symbols-outlined { font-size: 1.75rem; color: #c4b5fd; }
  .dc-qconf-title { font-size: 1.375rem; font-weight: 900; margin-bottom: 0.375rem; }
  .dc-qconf-sub { font-size: 0.875rem; color: rgba(255,255,255,0.65); }
  .dc-qconf-body { padding: 1.5rem 2rem; }
  .dc-qconf-rules { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
  .dc-qconf-rule { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; }
  .dc-qconf-rule-icon { width: 2rem; height: 2rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .dc-qconf-rule-icon.purple { background: rgba(124,58,237,0.1); }
  .dc-qconf-rule-icon.blue   { background: rgba(0,61,122,0.08); }
  .dc-qconf-rule-icon.red    { background: rgba(239,68,68,0.08); }
  .dc-qconf-rule-icon .material-symbols-outlined { font-size: 1rem; }
  .dc-qconf-rule-icon.purple .material-symbols-outlined { color: #7c3aed; }
  .dc-qconf-rule-icon.blue   .material-symbols-outlined { color: #003d7a; }
  .dc-qconf-rule-icon.red    .material-symbols-outlined { color: #ef4444; }
  .dc-qconf-rule-text strong { display: block; font-size: 0.8125rem; font-weight: 700; color: #0f172a; margin-bottom: 0.125rem; }
  .dc-qconf-rule-text span { font-size: 0.75rem; color: #64748b; line-height: 1.5; }
  .dc-qconf-warn { display: flex; align-items: center; gap: 0.625rem; padding: 0.75rem 1rem; background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2); border-radius: 0.625rem; font-size: 0.75rem; color: #b91c1c; font-weight: 600; margin-bottom: 1.5rem; }
  .dc-qconf-warn .material-symbols-outlined { font-size: 1rem; color: #ef4444; flex-shrink: 0; }
  .dc-qconf-footer { display: flex; gap: 0.75rem; padding: 0 2rem 2rem; }
  .dc-qconf-cancel { flex: 1; padding: 0.75rem; background: #f1f5f9; color: #475569; border: none; border-radius: 0.625rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; }
  .dc-qconf-cancel:hover { background: #e2e8f0; }
  .dc-qconf-start { flex: 2; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; border: none; border-radius: 0.625rem; font-size: 0.9375rem; font-weight: 800; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 15px rgba(124,58,237,0.35); transition: all 0.2s; }
  .dc-qconf-start:hover { background: linear-gradient(135deg, #6d28d9, #5b21b6); box-shadow: 0 6px 20px rgba(124,58,237,0.5); transform: translateY(-1px); }
  .dc-qconf-start .material-symbols-outlined { font-size: 1.25rem; }

  /* POPUP LETTRE DE MOTIVATION */
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  @keyframes dc-lm-in { from { opacity:0; transform:translateY(0.75rem) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
  .dc-lm-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  .dc-lm-modal { background: #fff; border-radius: 1rem; width: 100%; max-width: 40rem; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px rgba(0,0,0,0.2); overflow: hidden; animation: dc-lm-in 0.22s ease; }
  .dc-lm-header { padding: 1.5rem 1.5rem 1rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-shrink: 0; }
  .dc-lm-header h2 { font-family: 'Sora', sans-serif; font-size: 1.125rem; font-weight: 700; color: #0f172a; line-height: 1.35; }
  .dc-lm-header p  { font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .dc-lm-close { padding: 0.375rem; border: none; background: #f1f5f9; border-radius: 0.5rem; cursor: pointer; color: #475569; flex-shrink: 0; display: flex; }
  .dc-lm-close:hover { background: #e2e8f0; }
  .dc-lm-close .material-symbols-outlined { font-size: 1.125rem; display: block; }
  .dc-lm-body { padding: 1.5rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 1.25rem; }
  .dc-lm-pill { background: #f0f4fb; border-radius: 0.625rem; padding: 0.75rem 1rem; display: flex; gap: 1.5rem; flex-wrap: wrap; }
  .dc-lm-pill-item { display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; color: #475569; font-weight: 500; }
  .dc-lm-pill-item .material-symbols-outlined { font-size: 0.875rem; color: #1a3c6e; }
  .dc-lm-lettre-block { display: flex; flex-direction: column; }
  .dc-lm-lettre-label { font-size: 0.8125rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; }
  .dc-lm-lettre-label .material-symbols-outlined { font-size: 1rem; color: #1a3c6e; }
  .dc-lm-lettre-hint { font-size: 0.75rem; color: #64748b; line-height: 1.55; margin-bottom: 0.75rem; }
  .dc-lm-textarea { width: 100%; min-height: 14rem; padding: 0.875rem; border: 1.5px solid #e2e8f0; border-radius: 0.625rem; font-size: 0.875rem; color: #0f172a; line-height: 1.65; background: #f8fafc; resize: none; outline: none; cursor: default; }
  .dc-lm-lettre-meta { display: flex; align-items: center; justify-content: flex-end; margin-top: 0.5rem; }
  .dc-lm-char-count { font-size: 0.75rem; font-weight: 600; color: #059669; }
  .dc-lm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #94a3b8; text-align: center; }
  .dc-lm-empty .material-symbols-outlined { font-size: 3rem; color: #cbd5e1; }
  .dc-lm-footer { padding: 1rem 1.5rem; border-top: 1px solid #f1f5f9; display: flex; gap: 0.75rem; flex-shrink: 0; justify-content: flex-end; align-items: center; }
  .dc-lm-footer-info { font-size: 0.75rem; color: #94a3b8; flex: 1; display: flex; align-items: center; gap: 0.375rem; }
  .dc-lm-footer-info .material-symbols-outlined { font-size: 0.875rem; }
  .dc-lm-footer-btn { background: #fff; color: #475569; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.625rem 1.25rem; font-size: 0.8125rem; font-weight: 600; cursor: pointer; }

  /* MISC */
  .dc-section-title { font-size: 1rem; font-weight: 800; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
  .dc-section-title .material-symbols-outlined { color: #003d7a; font-size: 1.125rem; }
  .dc-back-btn { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.875rem; font-weight: 600; color: #64748b; background: none; border: none; cursor: pointer; font-family: 'Public Sans', sans-serif; margin-bottom: 1.5rem; transition: color 0.2s; padding: 0; }
  .dc-back-btn:hover { color: #003d7a; }
  .dc-back-btn .material-symbols-outlined { font-size: 1.125rem; }
  @keyframes dc-spin { to { transform: rotate(360deg); } }
  .dc-spin { animation: dc-spin 0.8s linear infinite; color: #003d7a; font-size: 2rem !important; }
  .dc-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6rem; gap: 1rem; color: #94a3b8; }
`;

// ── Stepper helpers ────────────────────────────────────────────────────────
const getStepperState = (statut) => {
  switch (statut) {
    // Étape 0=candidature, 1=analyseIA, 2=quiz, 3=entretien, 4=décision
    case 'EN_COURS_EXAMEN':    return ['done', 'active',   'pending',   'pending', 'pending'];
    case 'PRESELECTIONNE_CV':  return ['done', 'done',     'purple',    'pending', 'pending']; // quiz disponible
    case 'ELIMINE_CV':         return ['done', 'done-red', 'pending',   'pending', 'pending'];
    case 'ACCEPTE_QUIZ':       return ['done', 'done',     'done',      'pending', 'pending']; // quiz passé, attente entretien
    case 'ELIMINE_QUIZ':       return ['done', 'done',     'done-red',  'pending', 'pending']; // quiz échoué
    case 'ENTRETIEN_PLANIFIE': return ['done', 'done',     'done',      'amber',   'pending']; // entretien planifié
    case 'ACCEPTE':            return ['done', 'done',     'done',      'done',    'done'];
    case 'REFUSE':             return ['done', 'done',     'done',      'done',    'done-red'];
    default:                   return ['done', 'active',   'pending',   'pending', 'pending'];
  }
};

const getProgressWidth = (statut) => {
  const map = {
    EN_COURS_EXAMEN:    '25%',
    PRESELECTIONNE_CV:  '45%',
    ELIMINE_CV:         '40%',
    ACCEPTE_QUIZ:       '62%',
    ELIMINE_QUIZ:       '62%',
    ENTRETIEN_PLANIFIE: '75%',
    ACCEPTE:            '100%',
    REFUSE:             '100%',
  };
  return map[statut] || '10%';
};

const getProgressColor = (statut) => {
  if (['REFUSE', 'ELIMINE_CV', 'ELIMINE_QUIZ'].includes(statut)) return '#dc2626';
  return '#003d7a';
};

const STEPS = [
  { icon:'check_circle',   label:'Candidature\nenvoyée',
    sub:{ done:'✓ Complété', active:'En cours', pending:'À venir' } },
  { icon:'analytics',      label:'Analyse IA',
    sub:{ done:'✓ Complété', active:'Étape actuelle', pending:'À venir', 'done-red':'✗ Refusé' } },
  { icon:'quiz',           label:'Quiz\ntechnique',
    sub:{ done:'✓ Complété', active:'À passer', pending:'À venir', purple:'Étape actuelle', 'done-red':'✗ Éliminé' } },
  { icon:'calendar_today', label:'Entretien\nprévu',
    sub:{ done:'✓ Complété', active:'Planifié', pending:'À venir', amber:'Étape actuelle' } },
  { icon:'verified',       label:'Décision\nfinale',
    sub:{ done:'✓ Accepté', active:'Résultat', pending:'À venir', 'done-red':'✗ Refusé' } },
];

const getStepLabelCls = (st) => {
  if (st === 'active' || st === 'amber') return 'active';
  if (st === 'purple')   return 'quiz';
  if (st === 'done-red') return 'refused';
  if (st === 'pending')  return 'pending';
  return '';
};
const getStepSubCls = (st) => {
  if (st === 'active' || st === 'amber') return 'active-sub';
  if (st === 'purple')   return 'quiz-sub';
  if (st === 'done-red') return 'refused-sub';
  return '';
};

const getBannerInfo = (statut) => {
  switch (statut) {
    case 'EN_COURS_EXAMEN':
      return { color:'blue', icon:'hourglass_empty', tag:'EN COURS', title:'Analyse IA en cours',
               text:"Notre système d'intelligence artificielle analyse actuellement votre dossier. Vous serez notifié dès que les résultats seront disponibles." };
    case 'PRESELECTIONNE_CV':
      return { color:'green', icon:'check_circle', tag:'PRÉSELECTIONNÉ', title:'CV présélectionné — Quiz disponible',
               text:"Bonne nouvelle ! Votre CV a été présélectionné. Passez maintenant le quiz technique pour continuer le processus." };
    case 'ELIMINE_CV':
      return { color:'red', icon:'cancel', tag:'ÉLIMINÉ CV', title:'Candidature non retenue — CV',
               text:"Après analyse de votre CV, votre candidature n'a pas été retenue pour ce poste." };
    case 'ACCEPTE_QUIZ':
      return { color:'green', icon:'check_circle', tag:'QUIZ VALIDÉ', title:'Quiz réussi — Entretien à venir',
               text:"Félicitations ! Vous avez réussi le quiz technique. Notre équipe planifiera prochainement votre entretien RH." };
    case 'ELIMINE_QUIZ':
      return { color:'red', icon:'cancel', tag:'ÉLIMINÉ QUIZ', title:'Score insuffisant au quiz',
               text:"Votre score au quiz technique n'a pas atteint le seuil requis pour continuer le processus de recrutement." };
    case 'ENTRETIEN_PLANIFIE':
      return { color:'amber', icon:'event', tag:'ENTRETIEN PLANIFIÉ', title:'Entretien planifié',
               text:"Un entretien a été planifié avec notre équipe de recrutement. Vérifiez la date et préparez vos questions." };
    case 'ACCEPTE':
      return { color:'green', icon:'task_alt', tag:'ACCEPTÉ', title:'Candidature acceptée !',
               text:"Félicitations ! Notre équipe RH vous contactera prochainement pour les modalités d'intégration." };
    case 'REFUSE': return null;
    default:
      return { color:'blue', icon:'schedule', tag:'EN ATTENTE', title:'Candidature en attente',
               text:"Votre candidature est en cours d'examen par notre équipe." };
  }
};

// Description courte du statut pour la timeline
const getStatusDesc = (statut) => {
  switch (statut) {
    case 'EN_COURS_EXAMEN':    return "Votre dossier est en cours d'analyse par notre IA.";
    case 'PRESELECTIONNE_CV':  return "Votre CV a été présélectionné. Le quiz technique est disponible.";
    case 'ELIMINE_CV':         return "Votre dossier n'a pas été retenu après analyse du CV.";
    case 'ACCEPTE_QUIZ':       return "Votre quiz a été validé. L'entretien sera planifié prochainement.";
    case 'ELIMINE_QUIZ':       return "Votre score au quiz n'a pas atteint le seuil requis.";
    case 'ENTRETIEN_PLANIFIE': return "Un entretien a été planifié avec l'équipe RH.";
    default:                   return "Votre dossier est en cours d'évaluation.";
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Popup quiz confirmation
// ─────────────────────────────────────────────────────────────────────────────
const QuizConfirmPopup = ({ sujetTitre, onConfirm, onCancel }) => (
  <div className="dc-qconf-overlay" onClick={onCancel}>
    <div className="dc-qconf-modal" onClick={e => e.stopPropagation()}>
      <div className="dc-qconf-header">
        <p className="dc-qconf-title">Commencer le Quiz Technique</p>
        <p className="dc-qconf-sub">{sujetTitre}</p>
      </div>
      <div className="dc-qconf-body">
        <div className="dc-qconf-rules">
          <div className="dc-qconf-rule">
            <div className="dc-qconf-rule-icon purple"><span className="material-symbols-outlined">timer</span></div>
            <div className="dc-qconf-rule-text"><strong>30 minutes chrono</strong><span>Le minuteur démarre dès que vous cliquez sur "Commencer".</span></div>
          </div>
          <div className="dc-qconf-rule">
            <div className="dc-qconf-rule-icon blue"><span className="material-symbols-outlined">help_outline</span></div>
            <div className="dc-qconf-rule-text"><strong>50 questions QCM</strong><span>Questions techniques adaptées au poste.</span></div>
          </div>
          <div className="dc-qconf-rule">
            <div className="dc-qconf-rule-icon red"><span className="material-symbols-outlined">tab_unselected</span></div>
            <div className="dc-qconf-rule-text"><strong>Ne changez pas d'onglet</strong><span>3 sorties d'onglet détectées = session clôturée</span></div>
          </div>
          <div className="dc-qconf-rule">
            <div className="dc-qconf-rule-icon purple"><span className="material-symbols-outlined">videocam</span></div>
            <div className="dc-qconf-rule-text"><strong>Caméra obligatoire (5 tentatives pour la vérification faciale)</strong><span>Vous devez autoriser l'accès à votre caméra.</span></div>
          </div>
          <div className="dc-qconf-rule">
            <div className="dc-qconf-rule-icon blue"><span className="material-symbols-outlined">screen_share</span></div>
            <div className="dc-qconf-rule-text"><strong>Partage d'écran obligatoire</strong><span>Vous devez partager votre écran pour démarrer le quiz.</span></div>
          </div>
        </div>
        <div className="dc-qconf-warn">
          <span className="material-symbols-outlined">warning</span>
          Une seule tentative autorisée. Cette action est irréversible.
        </div>
      </div>
      <div className="dc-qconf-footer">
        <button className="dc-qconf-cancel" onClick={onCancel}>Annuler</button>
        <button className="dc-qconf-start" onClick={onConfirm}>
          <span className="material-symbols-outlined">play_arrow</span>Commencer le quiz
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Composant principal
// ─────────────────────────────────────────────────────────────────────────────
const DetailCandidature = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user,    setUser]    = useState(null);
  const [app,     setApp]     = useState(null);
  const [cv,      setCv]      = useState(null);
  const [loading, setLoading] = useState(true);

  const [popup,        setPopup]        = useState(null);
  const [popupBlob,    setPopupBlob]    = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [lmPopup,      setLmPopup]      = useState(false);
  const [quizPopup,    setQuizPopup]    = useState(false);
  const [showFace,     setShowFace]     = useState(false);
  const [, setFaceVerified] = useState(false);

  useEffect(() => { axios.get('/api/auth/whoami').then(r => setUser(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (id) {
      axios.get(`/api/candidatures/${id}/details`).then(r => setApp(r.data)).catch(() => {}).finally(() => setLoading(false));
    } else setLoading(false);
  }, [id]);
  useEffect(() => { axios.get('/api/profil/me').then(r => setCv(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { closePopup(); setQuizPopup(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openDoc = async (url, name) => {
    const isPdf = name.toLowerCase().endsWith('.pdf');
    setPopup({ url, name, isPdf }); setPopupBlob(null);
    if (isPdf) {
      setPopupLoading(true);
      try {
        const res = await axios.get(url, { responseType: 'blob', withCredentials: true });
        setPopupBlob(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })));
      } catch { setPopupBlob(null); }
      finally { setPopupLoading(false); }
    }
  };
  const closePopup = () => { setPopup(null); setPopupBlob(null); };

  const handleStartQuiz = () => {
    setQuizPopup(false);
    navigate(`/candidat/quiz/${app.sujetId}`, { state: { candidatureId: Number(id) } });
  };

  const userName      = user?.name || '—';
  const stepStates    = app ? getStepperState(app.statut) : [];
  const progressW     = app ? getProgressWidth(app.statut) : '10%';
  const progressColor = app ? getProgressColor(app.statut) : '#003d7a';
  const bannerInfo    = app ? getBannerInfo(app.statut) : null;

  const cvPath = cv?.cv || null;
  const cvName = cvPath ? (() => { try { return new URL(cvPath).pathname.split('/').pop(); } catch { return cvPath.split('/').pop(); } })() : null;
  const cvUrl  = cvPath ? '/api/files/cv/me' : null;
  const lmText = app?.lettreMotivation || null;

  // ── Logique d'affichage par statut ────────────────────────────────
  // Quiz démarrable : seulement si PRESELECTIONNE_CV et pas encore de score
  const quizDone     = app?.scoreQuiz != null;
  const canStartQuiz = app?.statut === 'PRESELECTIONNE_CV' && !quizDone;

  // Score quiz visible : ACCEPTE_QUIZ, ELIMINE_QUIZ, ENTRETIEN_PLANIFIE, ACCEPTE, REFUSE
  const STATUTS_WITH_QUIZ_SCORE = ['ACCEPTE_QUIZ','ELIMINE_QUIZ','ENTRETIEN_PLANIFIE','ACCEPTE','REFUSE'];
  const showQuizScore = quizDone && STATUTS_WITH_QUIZ_SCORE.includes(app?.statut);

  // Score entretien visible : ACCEPTE, REFUSE (si le champ existe)
  const showEntretienScore = app?.scoreEntretien != null && ['ACCEPTE','REFUSE'].includes(app?.statut);

  // Couleurs du score quiz selon statut
  const quizScoreColor = app?.statut === 'ELIMINE_QUIZ' ? '#f87171' : '#6ee7b7';
  const quizScoreBg    = app?.statut === 'ELIMINE_QUIZ'
    ? 'linear-gradient(135deg,#1e0505,#3b0f0f)'
    : 'linear-gradient(135deg,#022c1a,#064e2e)';
  const quizScoreBorder = app?.statut === 'ELIMINE_QUIZ'
    ? '1px solid rgba(220,38,38,0.3)'
    : '1px solid rgba(5,150,105,0.3)';
  const quizScoreTagStyle = app?.statut === 'ELIMINE_QUIZ'
    ? { background:'rgba(220,38,38,0.2)', color:'#fca5a5', border:'1px solid rgba(220,38,38,0.35)' }
    : {};
  const quizScoreTagLabel  = app?.statut === 'ELIMINE_QUIZ' ? 'QUIZ ÉCHOUÉ' : 'QUIZ PASSÉ';
  const quizScoreTagIcon   = app?.statut === 'ELIMINE_QUIZ' ? 'cancel' : 'verified';
  const quizScoreIconColor = quizScoreColor;

  return (
    <>
      <style>{styles}</style>
      <div className="dc-root">

        {/* POPUP CONFIRMATION QUIZ */}
        {quizPopup && (
          <QuizConfirmPopup sujetTitre={app?.sujetTitre} onConfirm={handleStartQuiz} onCancel={() => setQuizPopup(false)}/>
        )}

        {/* POPUP DOCUMENT */}
        {popup && (
          <div className="dc-popup-overlay" onClick={closePopup}>
            <div className="dc-popup" onClick={e => e.stopPropagation()}>
              <div className="dc-popup-header">
                <div className="dc-popup-title">
                  <span className="material-symbols-outlined">{popup.isPdf ? 'picture_as_pdf' : 'description'}</span>
                  {popup.name}
                </div>
                <button type="button" className="dc-popup-close" onClick={closePopup}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="dc-popup-body">
                {popup.isPdf ? (
                  popupLoading ? (
                    <div className="dc-popup-loading"><span className="material-symbols-outlined">progress_activity</span>Chargement...</div>
                  ) : popupBlob ? (
                    <iframe src={popupBlob} title={popup.name}/>
                  ) : (
                    <div className="dc-popup-no-preview"><span className="material-symbols-outlined">error_outline</span><p style={{fontSize:'0.875rem',color:'#64748b'}}>Impossible de charger le document.</p></div>
                  )
                ) : (
                  <div className="dc-popup-no-preview"><span className="material-symbols-outlined">description</span><p style={{fontSize:'0.875rem',color:'#64748b'}}>Aperçu non disponible pour les fichiers Word.</p></div>
                )}
              </div>
              <div className="dc-popup-footer">
                <a href={popupBlob||popup.url} download={popup.name} className="dc-popup-dl-btn">
                  <span className="material-symbols-outlined">download</span>Télécharger
                </a>
              </div>
            </div>
          </div>
        )}

        {/* POPUP VÉRIFICATION FACIALE */}
        {showFace && (
          <FaceVerification
            candidateId={user?.id}
            candidatureId={Number(id)}
            onVerified={() => { setFaceVerified(true); setShowFace(false); }}
            onDenied={(reason) => { setShowFace(false); console.log(reason); }}
            onClose={() => setShowFace(false)}
          />
        )}

        {/* POPUP LETTRE DE MOTIVATION */}
        {lmPopup && (
          <div className="dc-lm-overlay" onClick={() => setLmPopup(false)}>
            <div className="dc-lm-modal" onClick={e => e.stopPropagation()}>
              <div className="dc-lm-header">
                <div>
                  <p>{app?.sujetDepartement || 'Candidature'} · {app?.dateDepot || '—'}</p>
                  <h2>Lettre de motivation — {app?.sujetTitre}</h2>
                </div>
                <button className="dc-lm-close" onClick={() => setLmPopup(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="dc-lm-body">
                <div className="dc-lm-pill">
                  <span className="dc-lm-pill-item"><span className="material-symbols-outlined">corporate_fare</span>{app?.sujetDepartement || '—'}</span>
                  <span className="dc-lm-pill-item"><span className="material-symbols-outlined">calendar_today</span>Soumise le {app?.dateDepot || '—'}</span>
                  {lmText && <span className="dc-lm-pill-item"><span className="material-symbols-outlined">text_fields</span>{lmText.length} caractères</span>}
                </div>
                <div className="dc-lm-lettre-block">
                  <p className="dc-lm-lettre-label"><span className="material-symbols-outlined">edit_note</span>Contenu de la lettre</p>
                  <p className="dc-lm-lettre-hint">Lecture seule — soumise lors de la candidature.</p>
                  {lmText ? (
                    <>
                      <textarea className="dc-lm-textarea" value={lmText} readOnly spellCheck={false}/>
                      <div className="dc-lm-lettre-meta"><span className="dc-lm-char-count">{lmText.length} caractères ✓</span></div>
                    </>
                  ) : (
                    <div className="dc-lm-empty"><span className="material-symbols-outlined">description</span><p>Aucune lettre soumise.</p></div>
                  )}
                </div>
              </div>
              <div className="dc-lm-footer">
                <span className="dc-lm-footer-info"><span className="material-symbols-outlined">lock</span>Document en lecture seule</span>
                <button className="dc-lm-footer-btn" onClick={() => setLmPopup(false)}>Fermer</button>
              </div>
            </div>
          </div>
        )}

        <main className="dc-main">
          <button className="dc-back-btn" onClick={() => navigate('/candidat/candidatures')}>
            <span className="material-symbols-outlined">arrow_back</span>Retour aux candidatures
          </button>

          {loading ? (
            <div className="dc-loading"><span className="material-symbols-outlined dc-spin">progress_activity</span><p>Chargement...</p></div>
          ) : !app ? (
            <div className="dc-loading"><span className="material-symbols-outlined" style={{fontSize:'3rem',color:'#cbd5e1'}}>error_outline</span><p style={{color:'#94a3b8'}}>Candidature introuvable.</p></div>
          ) : (
            <>
              {/* WELCOME */}
              <div className="dc-welcome">
                <h1>Bonjour, {userName.split(' ')[0]} </h1>
                <p>Suivi de votre candidature pour <strong>{app.sujetTitre}</strong>{app.sujetDepartement ? ` — ${app.sujetDepartement}` : ''}.</p>
              </div>

              {/* STEPPER */}
              <div className="dc-stepper-card">
                <p className="dc-stepper-title">Votre Parcours de Recrutement</p>
                <div className="dc-stepper">
                  <div className="dc-stepper-line"/>
                  <div className="dc-stepper-progress" style={{width:progressW, background:progressColor}}/>
                  {STEPS.map((s, i) => {
                    const st = stepStates[i] || 'pending';
                    const subText = s.sub[st] || s.sub.pending;
                    return (
                      <div key={i} className="dc-step">
                        <div className={`dc-step-circle ${st}`}>
                          <span className="material-symbols-outlined">{s.icon}</span>
                        </div>
                        <div>
                          {s.label.split('\n').map((line, li) => (
                            <p key={li} className={`dc-step-label ${getStepLabelCls(st)}`}>{line}</p>
                          ))}
                          <p className={`dc-step-sub ${getStepSubCls(st)}`}>{subText}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CARTE REFUS FINAL */}
              {app.statut === 'REFUSE' && (
                <div className="dc-refused-card">
                  <span className="dc-refused-tag">REFUSÉ</span>
                  <p className="dc-refused-title">Candidature non retenue</p>
                  <p className="dc-refused-sub">Nous vous remercions de l'intérêt que vous portez à la Banque Centrale de Tunisie. Nous vous encourageons à postuler à d'autres opportunités.</p>
                  <div className="dc-refused-cta">
                    <button className="dc-refused-btn-primary" onClick={() => navigate('/candidat/offres')}><span className="material-symbols-outlined">search</span>Voir d'autres offres</button>
                    <button className="dc-refused-btn-secondary" onClick={() => navigate('/candidat/profil')}><span className="material-symbols-outlined">edit</span>Améliorer mon profil</button>
                  </div>
                </div>
              )}

              {/* CARTE ACCEPTATION FINALE */}
              {app.statut === 'ACCEPTE' && (
                <div className="dc-accepted-card">
                  <span className="dc-accepted-tag">ACCEPTÉ — DÉFINITIF</span>
                  <p className="dc-accepted-title">🎉 Félicitations ! Vous êtes sélectionné(e) !</p>
                  <p className="dc-accepted-sub">Votre candidature a été définitivement acceptée. Notre équipe RH vous contactera dans les prochains jours.</p>
                  <button className="dc-accepted-btn"><span className="material-symbols-outlined">download</span>Télécharger la lettre d'acceptation</button>
                </div>
              )}

              {/* GRID */}
              <div className="dc-grid">

                {/* ── Colonne gauche ─────────────────────────────────────── */}
                <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>

                  {/* Bannière statut */}
                  {bannerInfo && (
                    <div className={`dc-banner ${bannerInfo.color}`}>
                      <div className={`dc-banner-icon ${bannerInfo.color}`}>
                        <span className="material-symbols-outlined">{bannerInfo.icon}</span>
                      </div>
                      <div>
                        <span className={`dc-banner-tag ${bannerInfo.color}`}>{bannerInfo.tag}</span>
                        <p className={`dc-banner-title ${bannerInfo.color}`}>{bannerInfo.title}</p>
                        <p>{bannerInfo.text}</p>
                      </div>
                    </div>
                  )}

                  {/* Activités récentes */}
                  <div className="dc-card">
                    <p className="dc-section-title">
                      <span className="material-symbols-outlined">history</span>Activités Récentes
                    </p>
                    <div className="dc-timeline">

                      {/* Décision finale — ACCEPTE ou REFUSE */}
                      {(app.statut === 'ACCEPTE' || app.statut === 'REFUSE') && (
                        <div className="dc-tl-item">
                          <span className="dc-tl-date">Récemment</span>
                          <div className="dc-tl-content">
                            <p>Décision finale : <strong style={{color: app.statut==='ACCEPTE'?'#059669':'#dc2626'}}>{app.statut==='ACCEPTE'?'ACCEPTÉ(E)':'REFUSÉ(E)'}</strong></p>
                            <p>{app.statut==='ACCEPTE'?'Votre candidature a été définitivement acceptée.':'Votre candidature n\'a pas été retenue.'}</p>
                          </div>
                        </div>
                      )}

                      {/* Entretien — si planifié ou passé */}
                      {app.dateEntretien && ['ENTRETIEN_PLANIFIE','ACCEPTE','REFUSE'].includes(app.statut) && (
                        <div className="dc-tl-item">
                          <span className="dc-tl-date">
                            {(() => { try { return new Date(app.dateEntretien).toLocaleDateString('fr-FR'); } catch { return app.dateEntretien; } })()}
                          </span>
                          <div className="dc-tl-content">
                            <p>
                              Entretien {app.statut === 'ENTRETIEN_PLANIFIE' ? 'planifié' : 'effectué'}
                              {showEntretienScore ? ` — Score : ${app.scoreEntretien}` : ''}
                            </p>
                            <p>{app.statut === 'ENTRETIEN_PLANIFIE' ? 'Un entretien a été planifié avec l\'équipe RH.' : 'Entretien réalisé avec l\'équipe RH.'}</p>
                          </div>
                        </div>
                      )}

                      {/* Quiz — si passé */}
                      {quizDone && (
                        <div className="dc-tl-item">
                          <span className="dc-tl-date">
                            {app.quizPasseLe ? (() => { try { return new Date(app.quizPasseLe).toLocaleDateString('fr-FR'); } catch { return app.quizPasseLe; } })() : 'Récemment'}
                          </span>
                          <div className="dc-tl-content">
                            <p>Quiz technique soumis — Score : <strong style={{color: app.statut==='ELIMINE_QUIZ'?'#dc2626':'#059669'}}>{app.scoreQuiz}/50</strong></p>
                            <p>Vos réponses ont été enregistrées et transmises à l'équipe RH.</p>
                          </div>
                        </div>
                      )}

                      {/* Statut courant — si pas encore décision finale */}
                      {!['ACCEPTE','REFUSE'].includes(app.statut) && (
                        <div className="dc-tl-item">
                          <span className="dc-tl-date">Aujourd'hui</span>
                          <div className="dc-tl-content">
                            <p>Statut : <strong style={{color: ['ELIMINE_CV','ELIMINE_QUIZ'].includes(app.statut)?'#dc2626':'#2563eb'}}>{app.statut}</strong></p>
                            <p>{getStatusDesc(app.statut)}</p>
                          </div>
                        </div>
                      )}

                      {/* Candidature envoyée — toujours présent */}
                      <div className="dc-tl-item">
                        <span className="dc-tl-date">{app.dateDepot || '—'}</span>
                        <div className="dc-tl-content">
                          <p>Candidature soumise</p>
                          <p>Votre dossier complet a été enregistré dans notre base de données.</p>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* ── Sidebar droite ──────────────────────────────────────── */}
                <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>

                  {/* Score quiz — ACCEPTE_QUIZ, ELIMINE_QUIZ, ENTRETIEN_PLANIFIE, ACCEPTE, REFUSE */}
                  {showQuizScore && (
                    <div className="dc-score-card" style={{background:quizScoreBg, border:quizScoreBorder}}>
                      <div className="dc-score-header">
                        <span className="dc-score-tag" style={quizScoreTagStyle}>{quizScoreTagLabel}</span>
                        <span className="material-symbols-outlined" style={{color:quizScoreIconColor}}>{quizScoreTagIcon}</span>
                      </div>
                      <div className="dc-score-big" style={{color:quizScoreColor}}>
                        {app.scoreQuiz}<span style={{fontSize:'1.5rem',fontWeight:600,color:'rgba(255,255,255,0.4)'}}>/50</span>
                      </div>
                      <div className="dc-score-label">Score technique</div>
                    </div>
                  )}

                  {/* Score entretien — ACCEPTE ou REFUSE */}
                  {showEntretienScore && (
                    <div className="dc-score-card" style={{background:'linear-gradient(135deg,#1a0f00,#3d2200)',border:'1px solid rgba(245,158,11,0.3)'}}>
                      <div className="dc-score-header">
                        <span className="dc-score-tag" style={{background:'rgba(245,158,11,0.2)',color:'#fbbf24',border:'1px solid rgba(245,158,11,0.35)'}}>ENTRETIEN</span>
                        <span className="material-symbols-outlined" style={{color:'#fbbf24'}}>forum</span>
                      </div>
                      <div className="dc-score-big" style={{color:'#fbbf24'}}>
                        {app.scoreEntretien}<span style={{fontSize:'1.5rem',fontWeight:600,color:'rgba(255,255,255,0.4)'}}>/100</span>
                      </div>
                      <div className="dc-score-label">Score entretien</div>
                    </div>
                  )}

                  {/* Bouton démarrer quiz — PRESELECTIONNE_CV uniquement */}
                  {canStartQuiz && (
                    <div className="dc-quiz-card">
                      <div className="dc-quiz-card-bg"><span className="material-symbols-outlined">quiz</span></div>
                      <div className="dc-quiz-header">
                        <span className="dc-quiz-header-label">Action requise</span>
                        <span className="dc-quiz-tag">QUIZ TECHNIQUE</span>
                      </div>
                      <p className="dc-quiz-title">Quiz Technique</p>
                      <p className="dc-quiz-sub">Vous avez été présélectionné(e) ! Passez le quiz technique pour finaliser votre candidature.</p>
                      <div className="dc-quiz-meta">
                        <div className="dc-quiz-meta-item"><span className="material-symbols-outlined">timer</span><span>30 minutes</span></div>
                        <div className="dc-quiz-meta-item"><span className="material-symbols-outlined">help_outline</span><span>50 questions</span></div>
                        <div className="dc-quiz-meta-item"><span className="material-symbols-outlined">bar_chart</span><span>Score /50</span></div>
                      </div>
                      <button className="dc-quiz-btn" onClick={() => setQuizPopup(true)}>
                        <span className="material-symbols-outlined">play_arrow</span>Commencer le quiz
                      </button>
                      <p className="dc-quiz-note">Une seule tentative autorisée. Assurez-vous d'être dans un endroit calme.</p>
                    </div>
                  )}

                  {/* Card entretien — ENTRETIEN_PLANIFIE */}
                  {app.statut === 'ENTRETIEN_PLANIFIE' && (
                    <div className="dc-interview-card">
                      <div className="dc-interview-header">
                        <span className="dc-interview-header-label">Prochain événement</span>
                        <span className="dc-interview-tag">ENTRETIEN</span>
                      </div>
                      <p className="dc-interview-title">Entretien via Google Meet</p>
                      <div className="dc-interview-time">
                        <span className="material-symbols-outlined">calendar_today</span>
                        <span>{app.dateEntretien || 'Date à confirmer'}</span>
                      </div>
                      <button
                        className="dc-interview-btn-primary"
                        style={{marginTop:'.75rem'}}
onClick={() => navigate(`/candidat/entretien/${app.roomToken}`)}                      >
                        <span className="material-symbols-outlined">video_call</span>Rejoindre l'entretien
                      </button>
                      <p className="dc-interview-note">Connectez-vous 5 minutes avant l'heure prévue.</p>
                    </div>
                  )}

                  {/* Documents */}
                  <div className="dc-card">
                    <p className="dc-section-title"><span className="material-symbols-outlined">folder_open</span>Mes Documents</p>
                    <div className="dc-doc-list">
                      {cvUrl ? (
                        <div className="dc-doc-item">
                          <div className="dc-doc-left">
                            <span className="material-symbols-outlined" style={{color:'#ef4444'}}>picture_as_pdf</span>
                            <div style={{minWidth:0}}><p className="dc-doc-name">{cvName}</p><p className="dc-doc-sub">Curriculum Vitae</p></div>
                          </div>
                          <div className="dc-doc-actions">
                            <button className="dc-doc-btn" title="Voir" onClick={() => openDoc(cvUrl, cvName)}><span className="material-symbols-outlined">visibility</span></button>
                            <a href={cvUrl} download={cvName} className="dc-doc-btn" title="Télécharger" style={{display:'flex'}}><span className="material-symbols-outlined">download</span></a>
                          </div>
                        </div>
                      ) : (
                        <div className="dc-doc-item" style={{opacity:0.5}}>
                          <div className="dc-doc-left">
                            <span className="material-symbols-outlined" style={{color:'#94a3b8'}}>picture_as_pdf</span>
                            <div><p className="dc-doc-name" style={{color:'#94a3b8'}}>CV non soumis</p><p className="dc-doc-sub">Curriculum Vitae</p></div>
                          </div>
                        </div>
                      )}
                      <div className="dc-doc-item" style={{opacity: lmText ? 1 : 0.5}}>
                        <div className="dc-doc-left">
                          <span className="material-symbols-outlined" style={{color: lmText ? '#3b82f6' : '#94a3b8'}}>edit_note</span>
                          <div style={{minWidth:0}}>
                            <p className="dc-doc-name" style={{color: lmText ? '#0f172a' : '#94a3b8'}}>Lettre de motivation</p>
                            <p className="dc-doc-sub">{lmText ? `${lmText.length} caractères` : 'Non soumise'}</p>
                          </div>
                        </div>
                        {lmText && (
                          <div className="dc-doc-actions">
                            <button className="dc-doc-btn" title="Lire" onClick={() => setLmPopup(true)}><span className="material-symbols-outlined">visibility</span></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default DetailCandidature;