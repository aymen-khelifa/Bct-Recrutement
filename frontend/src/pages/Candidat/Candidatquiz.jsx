import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const STORAGE_KEY          = (sid) => `quiz_rep_${sid}`;
const MAX_TAB_EXITS        = 3;
const MAX_FACE_WARNS       = 3;
const FACE_CHECK_INTERVAL  = 8000;
const FACE_MATCH_THRESHOLD = 0.55;
const FRAMES_BEFORE_WARN   = 2;

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --pr:#003d7a;--pr-dim:#002b57;--pr-fix:#d6e3ff;--pr-tint:rgba(0,61,122,.06);
  --bg:#f1f5f9;--surf:#ffffff;--brd:#e2e8f0;
  --tx:#0f172a;--tx2:#475569;--txd:#94a3b8;
  --grn:#059669;--grn-bg:#ecfdf5;
  --red:#ef4444;--red-bg:#fef2f2;
  --org:#d97706;--org-bg:#fffbeb;
  --r:.875rem;--sh:0 1px 3px rgba(0,0,0,.06),0 4px 12px rgba(0,61,122,.06);
}
  .qz-face-card-header-icon-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
body{font-family:'Public Sans',sans-serif;background:var(--bg);color:var(--tx);}
.qz-page{user-select:none;-webkit-user-select:none;}
.ms{font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;vertical-align:middle;font-size:1.25rem;font-style:normal;line-height:1;}
.ms.fill{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;}
.qz-page{padding:1.5rem 2rem;min-height:100vh;}
.qz-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 288px;gap:1.5rem;}
.qz-left{display:flex;flex-direction:column;gap:1.25rem;}
.qz-right{display:flex;flex-direction:column;gap:1.25rem;}
.qz-topbar{display:flex;align-items:center;justify-content:space-between;background:var(--surf);border:1px solid var(--brd);border-radius:var(--r);padding:.875rem 1.5rem;box-shadow:var(--sh);}
.qz-brand{font-size:.8125rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:var(--pr);}
.qz-topbar-right{display:flex;align-items:center;gap:.875rem;}
.qz-cam-widget{position:relative;width:100%;background:#000;border-radius:.75rem;overflow:hidden;border:2px solid var(--brd);transition:border-color .3s;}
.qz-cam-widget.matched{border-color:var(--grn);}
.qz-cam-widget.unmatched{border-color:var(--org);}
.qz-cam-widget video{width:100%;display:block;border-radius:.625rem;}
.qz-cam-widget canvas{position:absolute;top:0;left:0;width:100%;height:100%;}
.qz-cam-badge{position:absolute;bottom:.5rem;left:.5rem;display:flex;align-items:center;gap:.375rem;background:rgba(0,0,0,.6);color:#fff;font-size:.625rem;font-weight:700;padding:.25rem .625rem;border-radius:.375rem;backdrop-filter:blur(4px);}
.qz-cam-badge.ok{color:#22c55e;} .qz-cam-badge.warn{color:#fbbf24;} .qz-cam-badge.err{color:#ef4444;}
.qz-cam-score{position:absolute;top:.5rem;right:.5rem;background:rgba(0,0,0,.65);color:#fff;font-size:.5625rem;font-weight:700;padding:.2rem .5rem;border-radius:.3rem;backdrop-filter:blur(4px);}
.qz-cam-off{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem;background:#1e293b;border-radius:.75rem;color:#fff;gap:.75rem;border:2px solid #ef4444;}
.qz-cam-off .ms{font-size:2rem!important;color:#ef4444;}
.qz-face-warns{background:var(--org-bg);border:1.5px solid #fde68a;border-radius:.75rem;padding:.875rem 1.25rem;}
.qz-face-warns-title{font-size:.6875rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:var(--org);margin-bottom:.5rem;display:flex;align-items:center;gap:.375rem;}
.qz-face-pips{display:flex;gap:.375rem;}
.qz-face-pip{width:1.25rem;height:1.25rem;border-radius:50%;border:2px solid var(--org);}
.qz-face-pip.on{background:var(--org);}
.qz-timer{display:flex;align-items:center;gap:.5rem;padding:.375rem 1rem;border-radius:.5rem;font-size:.9375rem;font-weight:800;border:1.5px solid var(--brd);background:var(--bg);color:var(--pr);transition:all .3s;font-variant-numeric:tabular-nums;}
.qz-timer.warning{color:var(--org);border-color:#fde68a;background:var(--org-bg);}
.qz-timer.urgent{color:var(--red);border-color:#fca5a5;background:var(--red-bg);animation:qz-pulse 1s ease infinite;}
@keyframes qz-pulse{0%,100%{opacity:1}50%{opacity:.6}}
.qz-tabs{display:flex;align-items:center;gap:.375rem;padding:.375rem .875rem;border-radius:.5rem;font-size:.75rem;font-weight:700;border:1.5px solid var(--brd);background:var(--bg);color:var(--tx2);transition:all .3s;}
.qz-tabs.warn{color:var(--org);border-color:#fde68a;background:var(--org-bg);}
.qz-tabs.danger{color:var(--red);border-color:#fca5a5;background:var(--red-bg);animation:qz-pulse 1s ease infinite;}
.qz-pips{display:flex;gap:.2rem;margin-left:.25rem;}
.qz-pip{width:.5rem;height:.5rem;border-radius:50%;border:1.5px solid currentColor;}
.qz-pip.on{background:currentColor;}
.qz-av{width:2rem;height:2rem;border-radius:50%;background:var(--pr-fix);border:1.5px solid var(--brd);display:flex;align-items:center;justify-content:center;font-size:.625rem;font-weight:800;color:var(--pr);}
.qz-warn{display:flex;align-items:center;gap:.75rem;padding:.875rem 1.5rem;background:var(--org-bg);border:1.5px solid #fde68a;border-radius:var(--r);font-size:.8125rem;font-weight:600;color:var(--org);animation:qz-slide .2s ease;}
@keyframes qz-slide{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.qz-warn-x{margin-left:auto;background:none;border:none;cursor:pointer;color:var(--org);padding:.25rem;display:flex;}
.qz-cam-banner{display:flex;align-items:center;gap:.75rem;padding:.875rem 1.5rem;background:var(--red-bg);border:2px solid #fca5a5;border-radius:var(--r);font-size:.8125rem;font-weight:700;color:var(--red);animation:qz-slide .2s ease;}
.qz-prog{background:var(--surf);border:1px solid var(--brd);border-radius:var(--r);padding:1.125rem 1.5rem;box-shadow:var(--sh);}
.qz-prog-top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:.625rem;}
.qz-prog-lbl{font-size:.875rem;font-weight:700;color:var(--tx);}
.qz-prog-pct{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--txd);}
.qz-track{width:100%;height:.4375rem;background:var(--bg);border-radius:9999px;overflow:hidden;}
.qz-fill{height:100%;background:var(--pr);border-radius:9999px;transition:width .5s ease;}
.qz-card{background:var(--surf);border:1px solid var(--brd);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);}
.qz-card-body{padding:2rem;}
.qz-compl{display:inline-flex;align-items:center;gap:.375rem;font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--grn);background:var(--grn-bg);padding:.25rem .75rem;border-radius:.375rem;margin-bottom:1.25rem;}
.qz-qnum{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--txd);margin-bottom:.75rem;}
.qz-qtxt{font-size:1.0625rem;font-weight:700;line-height:1.6;color:var(--tx);margin-bottom:1.75rem;}
.qz-qimg{margin:-.75rem 0 1.5rem;display:flex;justify-content:center;}
.qz-qimg img{max-width:100%;max-height:280px;border-radius:.625rem;object-fit:contain;border:1px solid var(--brd);box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:zoom-in;transition:opacity .15s;}
.qz-qimg img:hover{opacity:.9;}
.qz-opts{display:flex;flex-direction:column;gap:.75rem;}
.qz-opt{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;border:2px solid var(--brd);border-radius:.75rem;cursor:pointer;transition:border-color .15s,background .15s,transform .1s;background:var(--surf);position:relative;}
.qz-opt:hover{border-color:rgba(0,61,122,.3);background:var(--pr-tint);}
.qz-opt.sel{border-color:var(--pr);background:var(--pr-tint);}
.qz-opt:active{transform:scale(.99);}
.qz-opt-lt{width:1.75rem;height:1.75rem;border-radius:50%;background:var(--bg);border:1px solid var(--brd);display:flex;align-items:center;justify-content:center;font-size:.6875rem;font-weight:800;color:var(--tx2);flex-shrink:0;transition:background .15s,color .15s,border-color .15s;}
.qz-opt.sel .qz-opt-lt{background:var(--pr);color:#fff;border-color:var(--pr);}
.qz-opt-tx{flex:1;font-size:.875rem;font-weight:500;color:var(--tx);line-height:1.5;}
.qz-opt.sel .qz-opt-tx{font-weight:700;color:var(--pr);}
.qz-opt-ck{color:var(--pr);display:none;flex-shrink:0;}
.qz-opt.sel .qz-opt-ck{display:block;}
.qz-ai{background:#f8fafc;border-top:1px solid var(--brd);padding:.875rem 2rem;display:flex;align-items:center;gap:.75rem;}
.qz-ai-tx{font-size:.75rem;color:var(--tx2);font-style:italic;}
.qz-nav{display:flex;justify-content:space-between;align-items:center;}
.qz-btn-prev{display:flex;align-items:center;gap:.5rem;padding:.75rem 1.25rem;background:var(--surf);border:1px solid var(--brd);border-radius:.625rem;font-size:.8125rem;font-weight:700;color:var(--tx);cursor:pointer;font-family:'Public Sans',sans-serif;transition:all .15s;}
.qz-btn-prev:hover{border-color:var(--pr);color:var(--pr);background:var(--pr-tint);}
.qz-btn-prev:disabled{opacity:.35;cursor:not-allowed;}
.qz-nav-r{display:flex;gap:.75rem;align-items:center;}
.qz-btn-skip{padding:.75rem 1rem;background:transparent;border:none;font-size:.8125rem;font-weight:700;color:var(--tx2);cursor:pointer;font-family:'Public Sans',sans-serif;transition:color .15s;}
.qz-btn-skip:hover{color:var(--pr);}
.qz-btn-next{display:flex;align-items:center;gap:.5rem;padding:.75rem 1.5rem;background:var(--pr);color:#fff;border:none;border-radius:.625rem;font-size:.8125rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;box-shadow:0 4px 12px rgba(0,61,122,.25);transition:opacity .15s,transform .1s;}
.qz-btn-next:hover{opacity:.9;} .qz-btn-next:active{transform:scale(.97);}
.qz-btn-sub{padding:.75rem 1.5rem;background:var(--grn);color:#fff;border:none;border-radius:.625rem;font-size:.8125rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;box-shadow:0 4px 12px rgba(5,150,105,.3);transition:opacity .15s;}
.qz-btn-sub:hover{opacity:.9;} .qz-btn-sub:disabled{opacity:.5;cursor:not-allowed;}
.qz-grid-card{background:var(--surf);border:1px solid var(--brd);border-radius:var(--r);padding:1.25rem;box-shadow:var(--sh);}
.qz-grid-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;}
.qz-grid-ttl{font-size:.6875rem;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:var(--tx);}
.qz-grid-bdg{background:var(--pr-dim);color:#fff;padding:.2rem .5rem;border-radius:.25rem;font-size:.5625rem;font-weight:700;}
.qz-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:.375rem;}
.qz-cell{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:.375rem;font-size:.6rem;font-weight:700;cursor:pointer;border:none;font-family:'Public Sans',sans-serif;transition:all .15s;position:relative;}
.qz-cell.answered{background:var(--pr);color:#fff;}
.qz-cell.answered:hover{filter:brightness(1.12);}
.qz-cell.current{background:var(--surf);border:2px solid var(--pr);color:var(--pr);font-weight:900;box-shadow:0 0 0 3px rgba(0,61,122,.1);}
.qz-cell.flagged,.qz-cell.unvisited{background:var(--bg);color:var(--tx2);}
.qz-cell.flagged:hover,.qz-cell.unvisited:hover{background:var(--brd);}
.qz-fdot{position:absolute;top:-1px;right:-1px;width:6px;height:6px;background:var(--red);border-radius:50%;}
.qz-lgnd{margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9;display:flex;flex-direction:column;gap:.5rem;}
.qz-li{display:flex;align-items:center;gap:.625rem;font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--txd);}
.qz-ld{width:.625rem;height:.625rem;border-radius:.25rem;}
.qz-ld.a{background:var(--pr);} .qz-ld.c{background:var(--surf);border:2px solid var(--pr);} .qz-ld.e{background:var(--bg);border:1px solid var(--brd);}
.qz-info{background:var(--pr-dim);border-radius:var(--r);padding:1.25rem;color:#fff;}
.qz-info .ms{color:#a8c8ff;font-size:1.375rem;}
.qz-info h5{font-size:.875rem;font-weight:700;margin:.5rem 0 .5rem;}
.qz-info p{font-size:.6875rem;color:rgba(168,200,255,.75);line-height:1.65;}
.qz-btn-flag{width:100%;display:flex;align-items:center;justify-content:center;gap:.5rem;padding:.875rem;background:var(--surf);border:1px solid var(--brd);border-radius:.625rem;font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--tx2);cursor:pointer;font-family:'Public Sans',sans-serif;transition:all .15s;}
.qz-btn-flag:hover,.qz-btn-flag.on{border-color:var(--red);color:var(--red);background:var(--red-bg);}

/* ── FaceCheckScreen : popup fixe + dark BCT ────────────────────── */
.qz-face-screen{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,.92);padding:1rem;}
.qz-face-card{background:#0f172a;border:1px solid #1e293b;border-radius:1.25rem;width:100%;max-width:36rem;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,.55);max-height:92vh;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;}
.qz-face-card::-webkit-scrollbar{display:none}
.qz-face-card-header{background:linear-gradient(135deg,#001529,#003d7a);padding:1.5rem;color:#fff;}
.qz-face-card-header-icon{width:3rem;height:3rem;background:rgba(0,61,122,.4);border:1px solid rgba(0,100,200,.5);border-radius:.875rem;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;}
.qz-face-card-header-icon .ms{font-size:1.5rem;color:#93c5fd;}
.qz-face-card-header h2{font-size:1.25rem;font-weight:900;margin-bottom:.375rem;}
.qz-face-card-header p{font-size:.875rem;color:rgba(255,255,255,.65);}
.qz-face-card-body{padding:1.5rem;background:#0f172a;}
.qz-face-video-wrap{position:relative;background:#000;border-radius:.75rem;overflow:hidden;margin-bottom:1.25rem;border:2px solid #1e3a5f;}
.qz-face-video-wrap video{width:100%;display:block;}
.qz-face-video-wrap canvas{position:absolute;top:0;left:0;width:100%;height:100%;}
.qz-face-status{display:flex;align-items:center;gap:.75rem;padding:.875rem 1rem;border-radius:.75rem;margin-bottom:1rem;font-size:.8125rem;font-weight:600;}
.qz-face-status.idle{background:#0a1628;border:1px solid #1e293b;color:#64748b;}
.qz-face-status.ok{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);color:#4ade80;}
.qz-face-status.err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#f87171;}
.qz-face-status.loading{background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);color:#60a5fa;}
.qz-face-attempts{display:flex;gap:.375rem;margin-bottom:1.25rem;}
.qz-face-attempt-dot{flex:1;height:.5rem;border-radius:9999px;background:#1e293b;border:1.5px solid #1e293b;transition:all .2s;}
.qz-face-attempt-dot.used{background:var(--red);border-color:var(--red);}
.qz-face-card-footer{padding:1rem 1.5rem;border-top:1px solid #1e293b;display:flex;flex-direction:column;gap:.625rem;background:#0f172a;}
.qz-face-btn-verify{flex:1;padding:.875rem;background:#003d7a;color:#fff;border:none;border-radius:.625rem;font-size:.9375rem;font-weight:800;cursor:pointer;font-family:'Public Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:.5rem;transition:all .2s;}
.qz-face-btn-verify:hover{background:#002b57;}
.qz-face-btn-verify:disabled{opacity:.4;cursor:not-allowed;}
.qz-face-btn-back{width:100%;padding:.625rem;background:transparent;border:1px solid #1e293b;border-radius:.625rem;font-size:.8125rem;font-weight:700;color:#475569;cursor:pointer;font-family:'Public Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:.375rem;transition:border-color .2s,color .2s;}
.qz-face-btn-back:hover{border-color:#334155;color:#94a3b8;}
.qz-face-cam-denied{display:flex;flex-direction:column;align-items:center;padding:2rem;background:#0a1628;border:1px solid rgba(239,68,68,.25);border-radius:.75rem;color:#fff;gap:1rem;text-align:center;}
.qz-face-cam-denied .ms{font-size:3rem;color:#ef4444;}
/* ────────────────────────────────────────────────────────────────── */

.qz-full{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:2rem;text-align:center;gap:1.5rem;background:var(--bg);}
.qz-fi{font-size:4rem!important;} .qz-fi.gr{color:var(--grn);} .qz-fi.rd{color:var(--red);} .qz-fi.bl{color:var(--pr);}
.qz-ftitle{font-size:2rem;font-weight:900;text-transform:uppercase;letter-spacing:-.03em;color:var(--tx);}
.qz-fsub{font-size:1rem;color:var(--tx2);max-width:34rem;line-height:1.65;}
.qz-score-row{display:flex;gap:1.5rem;flex-wrap:wrap;justify-content:center;}
.qz-score-box{display:flex;flex-direction:column;align-items:center;background:var(--surf);border:1px solid var(--brd);border-radius:var(--r);padding:1.75rem 2.5rem;box-shadow:var(--sh);gap:.25rem;}
.qz-snum{font-size:3rem;font-weight:900;color:var(--pr);letter-spacing:-.05em;}
.qz-slbl{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--txd);}
@keyframes qz-spin{to{transform:rotate(360deg)}}
.qz-spin{animation:qz-spin .8s linear infinite;color:var(--pr);}
.qz-err{background:var(--red-bg);border:1px solid #fca5a5;color:#b91c1c;padding:1rem 1.5rem;border-radius:.75rem;font-size:.875rem;display:flex;align-items:center;gap:.5rem;}
@keyframes qz-ti{from{opacity:0;transform:translateY(1rem)}to{opacity:1;transform:translateY(0)}}
.qz-toast{position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:var(--tx);color:#fff;padding:.875rem 1.25rem;border-radius:.75rem;display:flex;align-items:center;gap:.625rem;font-size:.8125rem;font-weight:600;box-shadow:0 20px 25px -5px rgba(0,0,0,.3);animation:qz-ti .3s ease;font-family:'Public Sans',sans-serif;max-width:26rem;}
.qz-toast.success .ms{color:#22c55e;} .qz-toast.error .ms{color:var(--red);} .qz-toast.warn .ms{color:#fbbf24;}
.qz-fs-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.97);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;text-align:center;padding:2rem;}
.qz-fs-overlay-icon{width:5rem;height:5rem;background:rgba(0,61,122,.3);border:2px solid rgba(0,61,122,.6);border-radius:1.25rem;display:flex;align-items:center;justify-content:center;animation:qz-pulse 1.5s ease infinite;}
.qz-fs-overlay-icon .ms{font-size:2.5rem;color:#60a5fa;}
.qz-fs-overlay h2{font-size:1.5rem;font-weight:900;color:#fff;letter-spacing:-.02em;}
.qz-fs-overlay p{font-size:.9375rem;color:rgba(255,255,255,.6);max-width:28rem;line-height:1.65;}
.qz-fs-overlay-btn{display:flex;align-items:center;gap:.625rem;padding:.875rem 2rem;background:var(--pr);color:#fff;border:none;border-radius:.75rem;font-size:1rem;font-weight:800;cursor:pointer;font-family:'Public Sans',sans-serif;box-shadow:0 8px 24px rgba(0,61,122,.5);transition:all .2s;}
.qz-fs-overlay-btn:hover{background:#0056b3;transform:translateY(-2px);}
.qz-fs-overlay-btn .ms{font-size:1.25rem;}
.qz-fs-overlay-warn{font-size:.75rem;color:rgba(239,68,68,.7);margin-top:.5rem;}
`;

const LETTERS = ['A','B','C','D','E'];
const fmt = (s) => `${String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')}:${String(Math.max(0,s)%60).padStart(2,'0')}`;
const Icon = ({ name, filled=false, className='', style={} }) => (
  <i className={`ms${filled?' fill':''}${className?' '+className:''}`} style={style}>{name}</i>
);
const Pips = ({ count, max }) => (
  <span className="qz-pips">
    {Array.from({length:max}).map((_,i)=>(
      <span key={i} className={`qz-pip${i<count?' on':''}`}/>
    ))}
  </span>
);

const Lightbox = ({ src, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!src) return null;
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:99998,background:'rgba(15,23,42,.95)',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',backdropFilter:'blur(6px)',cursor:'zoom-out'}}>
      <div onClick={e=>e.stopPropagation()} style={{position:'relative',maxWidth:'90vw',maxHeight:'90vh'}}>
        <img src={src} alt="Aperçu" style={{maxWidth:'90vw',maxHeight:'85vh',borderRadius:'1rem',objectFit:'contain',boxShadow:'0 25px 60px rgba(0,0,0,.5)',display:'block'}}/>
        <button onClick={onClose} style={{position:'absolute',top:'-1rem',right:'-1rem',width:'2.25rem',height:'2.25rem',borderRadius:'50%',background:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(0,0,0,.3)'}}>
          <i className="ms" style={{fontSize:'1.125rem',verticalAlign:'middle'}}>close</i>
        </button>
        <p style={{textAlign:'center',marginTop:'.75rem',fontSize:'.75rem',color:'rgba(255,255,255,.5)',fontWeight:600}}>Appuyez sur Échap ou cliquez en dehors pour fermer</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  HOOK PLEIN ÉCRAN
// ─────────────────────────────────────────────────────────────────────────────
const useFullscreen = (active) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fsRetryRef  = useRef(null);
  const allowExitFs = useRef(false);

  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if      (el.requestFullscreen)            await el.requestFullscreen();
      else if (el.webkitRequestFullscreen)      await el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen)         await el.mozRequestFullScreen();
      else if (el.msRequestFullscreen)          await el.msRequestFullscreen();
    } catch(e) { console.warn('[FS] Fullscreen refusé:', e.message); }
  }, []);

  const exitFullscreen = useCallback(() => {
    allowExitFs.current = true;
    clearTimeout(fsRetryRef.current);
    try {
      if      (document.exitFullscreen)            document.exitFullscreen();
      else if (document.webkitExitFullscreen)      document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen)       document.mozCancelFullScreen();
      else if (document.msExitFullscreen)          document.msExitFullscreen();
    } catch(e) {e}
  }, []);

  useEffect(() => {
    if (!active) return;
    allowExitFs.current = false;
    const onFsChange = () => { const isFull = !!document.fullscreenElement; setIsFullscreen(isFull); };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const blockKeys = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); clearTimeout(fsRetryRef.current); fsRetryRef.current = setTimeout(() => enterFullscreen(), 150); return false; }
      if (e.key === 'F5') { e.preventDefault(); e.stopPropagation(); return false; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.key === 'F11') { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.altKey) { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.key === 'Meta' || e.key === 'OS') { e.preventDefault(); e.stopPropagation(); return false; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.key === 'Backspace' && e.target === document.body) { e.preventDefault(); e.stopPropagation(); return false; }
    };
    document.addEventListener('keydown', blockKeys, true);
    return () => document.removeEventListener('keydown', blockKeys, true);
  }, [active, enterFullscreen]);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = 'Le quiz est en cours. Si vous quittez, vos réponses seront perdues.'; return e.returnValue; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  return { isFullscreen, enterFullscreen, exitFullscreen };
};

// ─────────────────────────────────────────────────────────────────────────────
//  FaceCheckScreen — + prop onBack + bouton Retour dans le footer
// ─────────────────────────────────────────────────────────────────────────────
const FaceCheckScreen = ({ userId, sujetId, onVerified, onBack }) => {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const faceApiRef = useRef(null);

  const [camStatus,  setCamStatus]  = useState('requesting');
  const [faceStatus, setFaceStatus] = useState('idle');
  const [faceMsg,    setFaceMsg]    = useState('Pointez votre visage vers la caméra');
  const [attempts,   setAttempts]   = useState(0);
  const [blocked,    setBlocked]    = useState(false);
  const [verifying,  setVerifying]  = useState(false);
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!window.faceapi) {
        try { await import('face-api.js').then(m => { window.faceapi = m; }); }
        catch(e) { console.warn('face-api.js non disponible',e); }
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        setCamStatus('ok');
        requestAnimationFrame(() => {
          if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
        });
        if (window.faceapi) {
          try { await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models'); faceApiRef.current = true; }
          catch(e) { console.warn('[FaceCheck] Modèles face-api non disponibles',e); }
        }
      } catch(e) { if (mounted) setCamStatus('denied',e); }
    };
    init();
    return () => { mounted = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const captureFrame = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return c.toDataURL('image/jpeg', 0.85);
  };

  const verifierVisageLocal = async () => {
    const video = videoRef.current;
    if (!window.faceapi || !faceApiRef.current || !video || !video.videoWidth) return { ok: true, reason: null };
    try {
      const det = await window.faceapi.detectSingleFace(video, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.55 }));
      if (!det) return { ok: false, reason: 'Aucun visage détecté — Positionnez votre visage face à la caméra' };
      const ratio = (det.box.width * det.box.height) / (video.videoWidth * video.videoHeight);
      if (ratio < 0.04) return { ok: false, reason: 'Rapprochez-vous de la caméra — votre visage est trop petit' };
      return { ok: true, reason: null };
    } catch(e) { return { ok: true, reason: null,e }; }
  };

  const handleVerify = async () => {
    if (verifying || blocked || attempts >= MAX_ATTEMPTS) return;
    setFaceStatus('loading'); setFaceMsg('Vérification de la caméra...');
    const localCheck = await verifierVisageLocal();
    if (!localCheck.ok) { setFaceStatus('err'); setFaceMsg(`❌ ${localCheck.reason}`); return; }
    const webcamImage = captureFrame();
    if (!webcamImage) { setFaceStatus('err'); setFaceMsg('Impossible de capturer une image.'); return; }
    setVerifying(true); setFaceStatus('loading'); setFaceMsg('Vérification en cours...');
    try {
      const res = await axios.post(`/api/face/verify/${sujetId}`, { candidateId: userId, webcamImage }, { validateStatus: () => true });
      const data = res.data || {}, status = res.status;
      if (data.attemptsLeft !== undefined) setAttempts(MAX_ATTEMPTS - data.attemptsLeft);
      if (status === 429 || data.blocked) { setBlocked(true); setFaceStatus('err'); setFaceMsg('🔒 Session bloquée — 5 tentatives épuisées. Contactez l\'équipe RH.'); return; }
      if (data.verified) {
        setFaceStatus('ok'); setFaceMsg('✅ Identité vérifiée ');
        setTimeout(() => onVerified(), 1500); return;
      }
      const left = data.attemptsLeft ?? (MAX_ATTEMPTS - (MAX_ATTEMPTS - attempts) - 1);
      const conf = Math.round(data.confidence ?? 0);
      let errMsg = 'Visage non reconnu — Réessayez face à la caméra.';
      if (conf > 0 && conf < 40) errMsg = 'Trop loin ou mal éclairé — Rapprochez-vous.';
      else if (data.message && !data.verified) errMsg = data.message;
      else if (data.error) errMsg = data.error;
      setFaceStatus('err');
      if (left > 0) setFaceMsg(`❌ ${errMsg} (${left} tentative${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''})`);
      else { setFaceMsg('❌ Plus de tentatives. Contactez l\'équipe RH.'); setBlocked(true); }
    } catch(e) {
      setFaceStatus('err'); setAttempts(a => Math.min(MAX_ATTEMPTS, a + 1));
      setFaceMsg('Erreur réseau — Vérifiez votre connexion et réessayez.',e);
    } finally { setVerifying(false); }
  };

  // ── Caméra refusée ────────────────────────────────────────────────
  if (camStatus === 'denied') return (
    <div className="qz-face-screen"><div className="qz-face-card">
      <div className="qz-face-card-header">
        <div className="qz-face-card-header-icon"><Icon name="videocam_off"/></div>
        <h2>Caméra requise</h2>
        <p>L'accès à la caméra est obligatoire pour passer le quiz.</p>
      </div>
      <div className="qz-face-card-body">
        <div className="qz-face-cam-denied">
          <Icon name="no_photography"/>
          <p style={{fontWeight:700,fontSize:'1rem'}}>Accès caméra refusé</p>
          <p style={{fontSize:'.875rem',color:'rgba(255,255,255,.7)',lineHeight:1.6}}>Autorisez la caméra dans les paramètres de votre navigateur puis actualisez.</p>
          <button onClick={() => window.location.reload()} style={{padding:'.625rem 1.5rem',background:'#003d7a',color:'#fff',border:'none',borderRadius:'.5rem',fontWeight:700,cursor:'pointer',fontFamily:'Public Sans,sans-serif'}}>Réessayer</button>
        </div>
      </div>
      {/* ── Bouton Retour ── */}
      <div className="qz-face-card-footer">
        {onBack && <button className="qz-face-btn-back" onClick={onBack}><Icon name="arrow_back" style={{fontSize:'1rem'}}/>Retour</button>}
      </div>
    </div></div>
  );

  const attemptsLeft = MAX_ATTEMPTS - attempts;

  // ── Écran principal ───────────────────────────────────────────────
  return (
    <div className="qz-face-screen"><div className="qz-face-card">
   <div className="qz-face-card-header">
  <div className="qz-face-card-header-icon-title">
    <div className="qz-face-card-header-icon"><Icon name="face"/></div>
    <h2>Vérification d'identité</h2>
  </div>
  <p>Avant de commencer le quiz, vérifiez votre identité via votre caméra.</p>
</div>
      <div className="qz-face-card-body">
        {camStatus === 'requesting' ? (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'3rem',background:'#0a1628',borderRadius:'.75rem',marginBottom:'1.25rem',flexDirection:'column',gap:'1rem',color:'#64748b'}}>
            <Icon name="progress_activity" className="qz-spin" style={{color:'#3b82f6'}}/><p style={{fontSize:'.875rem'}}>Ouverture de la caméra...</p>
          </div>
        ) : (
          <div className="qz-face-video-wrap" style={{marginBottom:'1.25rem'}}>
            <video ref={videoRef} autoPlay muted playsInline onLoadedMetadata={() => videoRef.current?.play().catch(()=>{})} style={{width:'100%',display:'block',borderRadius:'.625rem',transform:'scaleX(-1)'}}/>
            <canvas ref={canvasRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}}/>
          </div>
        )}
        <div className={`qz-face-status ${faceStatus}`}>
          <Icon name={faceStatus==='ok'?'check_circle':faceStatus==='err'?'error':faceStatus==='loading'?'progress_activity':'face'} filled={faceStatus==='ok'}/>
          <span>{faceMsg}</span>
        </div>
        <div style={{marginBottom:'1.25rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.5rem'}}>
            <p style={{fontSize:'.6875rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color: attemptsLeft <= 1 ? '#ef4444' : '#475569'}}>
              {attemptsLeft > 0 ? `${attemptsLeft} tentative${attemptsLeft > 1 ? 's' : ''} restante${attemptsLeft > 1 ? 's' : ''}` : 'Aucune tentative restante'}
            </p>
            <p style={{fontSize:'.6875rem',color:'#475569'}}>{attempts}/{MAX_ATTEMPTS} utilisée{attempts > 1 ? 's' : ''}</p>
          </div>
          <div className="qz-face-attempts">
            {Array.from({length:MAX_ATTEMPTS}).map((_,i) => (
              <div key={i} className={`qz-face-attempt-dot${i < attempts ? ' used' : ''}`} style={i < attempts ? {background: attempts >= MAX_ATTEMPTS ? '#ef4444' : '#f97316'} : {}}/>
            ))}
          </div>
        </div>
        {!blocked && (<div style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.625rem .875rem',background:'#0a1628',border:'1px solid #1e293b',borderRadius:'.625rem',marginBottom:'.75rem',fontSize:'.6875rem',color:'#475569'}}><Icon name="info" style={{fontSize:'1rem',color:'#3b82f6'}}/><span>Si votre visage n'est pas détecté au clic, aucune tentative n'est consommée.</span></div>)}
        {blocked && (<div className="qz-err" style={{marginBottom:'1rem',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',color:'#f87171'}}><Icon name="block"/>Session bloquée — 5 tentatives épuisées. Contactez l'équipe RH.</div>)}
        
      </div>
      {/* ── Footer : vérifier + retour ── */}
      <div className="qz-face-card-footer">
        <button className="qz-face-btn-verify" onClick={handleVerify} disabled={verifying || blocked || camStatus !== 'ok' || attempts >= MAX_ATTEMPTS}>
          {verifying ? <><Icon name="progress_activity" className="qz-spin" style={{fontSize:'1rem',marginRight:'.25rem',color:'#fff'}}/>Vérification...</> : <><Icon name="face"/>Vérifier mon identité</>}
        </button>
        {onBack && <button className="qz-face-btn-back" onClick={onBack}><Icon name="arrow_back" style={{fontSize:'1rem'}}/>Retour</button>}
      </div>
    </div></div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  useScreenRecorder
// ─────────────────────────────────────────────────────────────────────────────
const useScreenRecorder = ({ userId, quizId, candidatureId, onScreenStopped }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const screenStreamRef  = useRef(null);
  const rafRef           = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setUploadError(null); chunksRef.current = [];
      let screenStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: 'screen', width: 1920, height: 1080, frameRate: 15 }, audio: true });
      } catch(e) { console.warn('[Recorder] Partage écran refusé:', e.message); return { refused: true }; }
      screenStreamRef.current = screenStream;
      screenStream.getVideoTracks()[0].onended = () => { console.warn('[Recorder] Partage écran arrêté'); setIsRecording(false); if (onScreenStopped) onScreenStopped(); };
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const recorder = new MediaRecorder(screenStream, { mimeType, videoBitsPerSecond: 1_500_000 });
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current = recorder; recorder.start(5000); setIsRecording(true);
      console.log('[Recorder] ✅ Enregistrement démarré');
      const partialUploadInterval = setInterval(async () => {
        if (chunksRef.current.length === 0 || mediaRecorderRef.current?.state !== 'recording') return;
        const currentChunks = [...chunksRef.current]; chunksRef.current = [];
        const blob = new Blob(currentChunks, { type: 'video/webm' });
        if (blob.size < 50000) return;
        const _uid = _userIdRef.current, _qid = _quizIdRef.current, _cid = _candidatureIdRef.current;
        if (!_uid || !_qid) return;
        try {
          const formData = new FormData();
          formData.append('video', blob, `quiz_${_qid}_${_uid}_partial_${Date.now()}.webm`);
          formData.append('userId', String(_uid)); formData.append('quizId', String(_qid));
          if (_cid) formData.append('candidatureId', String(_cid));
          await axios.post('/api/recording/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 });
        } catch(e) { chunksRef.current = [...currentChunks, ...chunksRef.current]; console.warn('[Recorder] Upload partiel échoué:', e.message); }
      }, 30_000);
      screenStreamRef._partialInterval = partialUploadInterval;
      return { refused: false };
    } catch(e) { console.warn('[Recorder] Erreur:', e.message); setUploadError('Erreur enregistrement.'); setIsRecording(false); return { refused: true }; }
  }, [onScreenStopped]);

  const _candidatureIdRef = useRef(candidatureId);
  const _quizIdRef        = useRef(quizId);
  const _userIdRef        = useRef(userId);
  useEffect(() => { _candidatureIdRef.current = candidatureId; }, [candidatureId]);
  useEffect(() => { _quizIdRef.current = quizId; }, [quizId]);
  useEffect(() => { _userIdRef.current = userId; }, [userId]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        if (screenStreamRef._partialInterval) { clearInterval(screenStreamRef._partialInterval); screenStreamRef._partialInterval = null; }
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        if (chunksRef.current.length === 0) { resolve(null); return; }
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const _uid = _userIdRef.current, _qid = _quizIdRef.current, _cid = _candidatureIdRef.current;
        console.log(`[Recorder] Blob ${(blob.size/1024/1024).toFixed(1)}MB — upload... candidatureId=${_cid}`);
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('video', blob, `quiz_${_qid}_${_uid}_${Date.now()}.webm`);
          formData.append('userId', String(_uid)); formData.append('quizId', String(_qid));
          if (_cid) formData.append('candidatureId', String(_cid));
          const { data } = await axios.post('/api/recording/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300_000 });
          console.log('[Recorder] ✅ Uploadé:', data.url); resolve(data.url);
        } catch(e) { console.error('[Recorder] Erreur upload:', e.message); setUploadError('Erreur upload vidéo.'); resolve(null); }
        finally { setIsUploading(false); chunksRef.current = []; }
      };
      mediaRecorderRef.current.stop();
    });
  }, []);

  return { isRecording, isUploading, uploadError, startRecording, stopRecording };
};

// ── face-api.js modèles quiz ──────────────────────────────────────────────────
const useFaceApi = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fa = window.faceapi || await import('face-api.js').then(m => { window.faceapi = m; return m; });
        window._faceapi = fa;
        await Promise.all([
          fa.nets.ssdMobilenetv1.loadFromUri('/models'),
          fa.nets.faceLandmark68Net.loadFromUri('/models'),
          fa.nets.faceRecognitionNet.loadFromUri('/models'),
          fa.nets.tinyFaceDetector.loadFromUri('/models'),
        ]);
        if (!cancelled) { setReady(true); console.log('[face-api] modèles quiz prêts ✅'); }
      } catch(e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, []);
  return { ready, error };
};

const computeDescriptor = async (imgSrc) => {
  const fa = window._faceapi;
  if (!fa) throw new Error('face-api non chargé');
  const img = await new Promise((res, rej) => {
    const el = new window.Image(); el.crossOrigin = 'anonymous';
    el.onload = () => res(el); el.onerror = () => rej(new Error('Photo profil illisible'));
    el.src = imgSrc;
  });
  const det = await fa.detectSingleFace(img, new fa.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
  if (!det) throw new Error('Aucun visage dans la photo profil');
  return det.descriptor;
};

const matchFace = async (videoEl, refDesc) => {
  const fa = window._faceapi;
  if (!fa || !videoEl || !videoEl.videoWidth) return { matched:false, distance:1, detected:false };
  try {
    const det = await fa.detectSingleFace(videoEl, new fa.TinyFaceDetectorOptions({ inputSize:224, scoreThreshold:0.4 })).withFaceLandmarks().withFaceDescriptor();
    if (!det) return { matched:false, distance:1, detected:false };
    const dist = fa.euclideanDistance(refDesc, det.descriptor);
    return { matched: dist < FACE_MATCH_THRESHOLD, distance: parseFloat(dist.toFixed(3)), detected:true };
  } catch { return { matched:false, distance:1, detected:false }; }
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const CandidatQuiz = () => {
  const { sujetId: sidParam } = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const candidatureId = location.state?.candidatureId ?? null;
  const sujetId = Number(sidParam);
  const userId  = user?.id ?? null;
  const initials = user ? `${user.prenom?.[0]??''}${user.nom?.[0]??''}`.toUpperCase() : 'CA';
  const SK = STORAGE_KEY(sujetId);

  const { error: faceApiError } = useFaceApi();
  const goBack = () => candidatureId ? navigate(`/candidat/candidatures/${candidatureId}`) : navigate('/candidat/candidatures');

  const [phase,           setPhase]           = useState('loading');
  const [quizId,          setQuizId]          = useState(null);
  const [questions,       setQuestions]       = useState([]);
  const [current,         setCurrent]         = useState(0);
  const [timeLeft,        setTimeLeft]        = useState(30*60);
  const [submitting,      setSubmitting]      = useState(false);
  const [result,          setResult]          = useState(null);
  const [toast,           setToast]           = useState(null);
  const [tabExits,        setTabExits]        = useState(0);
  const [showWarn,        setShowWarn]        = useState(false);
  const [flagged,         setFlagged]         = useState(new Set());
  const [errMsg,          setErrMsg]          = useState('');
  const [ineligMsg,       setIneligMsg]       = useState('');
  const [faceWarns,       setFaceWarns]       = useState(0);
  const [camOff,          setCamOff]          = useState(false);
  const [faceOk,          setFaceOk]          = useState(true);
  const [faceDistance,    setFaceDistance]    = useState(null);
  const [faceDetected,    setFaceDetected]    = useState(true);
  const [showFaceWarn,    setShowFaceWarn]    = useState(false);
  const [faceWarnMsg,     setFaceWarnMsg]     = useState('');
  const [descriptorReady, setDescriptorReady] = useState(false);
  const [lightboxImg,     setLightboxImg]     = useState(null);

  const isQuizActive = phase === 'quiz';
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(isQuizActive);
  const stopRecordingRef = useRef(null);

  const handleScreenStopped = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    showToast('⛔ Partage d\'écran arrêté — Session clôturée ! Score : 0', 'error');
    setPhase('terminated'); clearInterval(timerRef.current); stopFM(); exitFullscreen();
    const _quizId = quizIdRef.current, _userId = userIdRef.current;
    if (_quizId && _userId) {
      sessionStorage.removeItem(STORAGE_KEY(sujetId));
      axios.post(`/api/quiz/${_quizId}/submit`, { userId: _userId, reponses: {} }).catch(e => console.warn('[ScreenStopped] submit erreur:', e.message));
    }
    stopRecordingRef.current?.().catch(() => {});
  }, [sujetId]);

  const { isRecording, isUploading, startRecording, stopRecording } = useScreenRecorder({ userId, quizId, candidatureId, onScreenStopped: handleScreenStopped });
  useEffect(() => { stopRecordingRef.current = stopRecording; }, [stopRecording]);

  const quizVideoRef     = useRef(null);
  const quizStreamRef    = useRef(null);
  const faceCheckTimer   = useRef(null);
  const faceWarnsRef     = useRef(0);
  const noMatchFramesRef = useRef(0);
  const referenceDescRef = useRef(null);
  const timerRef         = useRef(null);
  const submittedRef     = useRef(false);
  const tabRef           = useRef(0);
  const quizIdRef        = useRef(null);
  const userIdRef        = useRef(null);
  const candidatureIdRef = useRef(candidatureId);

  const [reponses, setReponses] = useState(() => {
    try { const s=sessionStorage.getItem(SK); return s?JSON.parse(s):{}; } catch { return {}; }
  });
  const saveRep = (qid, oid) => setReponses(prev => { const n={...prev,[qid]:oid}; sessionStorage.setItem(SK,JSON.stringify(n)); return n; });
  const clearRep = () => { setReponses({}); sessionStorage.removeItem(SK); };

  useEffect(() => { quizIdRef.current = quizId; }, [quizId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { candidatureIdRef.current = candidatureId; }, [candidatureId]);

  const showToast = useCallback((msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); },[]);

  useEffect(() => {
    const b = e => { e.preventDefault(); return false; };
    ['copy','paste','cut','selectstart','contextmenu'].forEach(ev=>document.addEventListener(ev,b));
    return () => ['copy','paste','cut','selectstart','contextmenu'].forEach(ev=>document.removeEventListener(ev,b));
  },[]);

  useEffect(() => {
    if (phase !== 'quiz') return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '⚠️ Si vous quittez, votre session sera clôturée et votre score sera 0.'; return e.returnValue; };
    const onUnload = () => {
      if (!submittedRef.current) {
        const _quizId = quizIdRef.current, _userId = userIdRef.current, _candidatureId = candidatureIdRef.current;
        if (!_quizId || !_userId) return;
        navigator.sendBeacon(`/api/quiz/${_quizId}/submit`, new Blob([JSON.stringify({ userId:_userId, reponses:{}, forcedExit:true, candidatureId:_candidatureId })], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('unload', onUnload);
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); window.removeEventListener('unload', onUnload); };
  }, [phase, quizId, userId]);

  const sendEvent = useCallback((type, detail = {}) => {
    if (!quizId || !userId) return;
    axios.post(`/api/quiz/${quizId}/event`, { userId, type, timestamp: new Date().toISOString(), ...detail }).catch(() => {});
  }, [quizId, userId]);

  useEffect(() => {
    if (phase!=='quiz') return;
    const h = () => {
      if (!document.hidden) return;
      sendEvent('TAB_SWITCH', { tabExits: tabRef.current + 1 });
      const n=tabRef.current+1; tabRef.current=n; setTabExits(n); setShowWarn(true);
      if (n>=MAX_TAB_EXITS) {
        showToast(`Session terminée : ${MAX_TAB_EXITS} sorties d'onglet détectées.`,'error');
        setPhase('terminated'); clearInterval(timerRef.current); stopFM(); exitFullscreen();
        if (!submittedRef.current) { submittedRef.current=true; doSubmit(true); }
      } else { showToast(`⚠️ Sortie d'onglet ${n}/${MAX_TAB_EXITS}. Encore ${MAX_TAB_EXITS-n} avant clôture.`,'warn'); }
    };
    document.addEventListener('visibilitychange',h);
    return ()=>document.removeEventListener('visibilitychange',h);
  },[phase, sendEvent]);

  useEffect(() => {
    if (!sujetId||!userId) return;
    axios.get(`/api/quiz/sujet/${sujetId}`)
      .then(({data})=>{ setQuizId(data.id); setPhase('checking'); })
      .catch(e=>{ setErrMsg(e.response?.data?.message||'Chargement impossible.'); setPhase('error'); });
  },[sujetId,userId]);

  useEffect(() => {
    if (!quizId||phase!=='checking') return;
    axios.get(`/api/quiz/${quizId}/eligibilite`,{params:{userId}})
      .then(({data})=>{ if (!data.eligible){setIneligMsg(data.reason||'Accès refusé.');setPhase('ineligible');}else setPhase('face_check'); })
      .catch(e=>{ setErrMsg(e.response?.data?.message||'Erreur vérification.'); setPhase('error'); });
  },[quizId,phase]);

  const handleFaceVerified = async () => {
    try {
      const {data}=await axios.post(`/api/quiz/${quizId}/start`,{userId});
      setQuestions(data.questions||[]); setTimeLeft(data.remainingSeconds??30*60);
      const recResult = await startRecording(null);
      if (recResult?.refused) {
        showToast('❌ Partage d\'écran obligatoire pour commencer le quiz.', 'error');
        setErrMsg('Le partage d\'écran est obligatoire pour passer le quiz. Veuillez l\'autoriser.');
        setPhase('error'); return;
      }
      setPhase('quiz'); await enterFullscreen(); await startFM();
    } catch(e) {
      const msg=e.response?.data?.message||'Démarrage impossible.';
      if (msg.toLowerCase().includes('tentative')||msg.toLowerCase().includes('déjà')) { setIneligMsg(msg); setPhase('ineligible'); }
      else { setErrMsg(msg); setPhase('error'); }
    }
  };

  const startFM = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false });
      quizStreamRef.current = stream; setCamOff(false); noMatchFramesRef.current = 0;
      const attachVideo = () => new Promise((resolve) => {
        const tryAttach = () => {
          if (quizVideoRef.current) { quizVideoRef.current.srcObject = stream; quizVideoRef.current.play().then(resolve).catch(resolve); }
          else setTimeout(tryAttach, 100);
        };
        tryAttach();
      });
      await attachVideo();
      loadDesc();
      setTimeout(() => { checkFace(); faceCheckTimer.current = setInterval(checkFace, FACE_CHECK_INTERVAL); }, 5000);
    } catch (error) { console.error(error); setCamOff(true); showToast('⛔ Caméra désactivée — Session suspendue !', 'error'); }
  };

  const stopFM = () => {
    if (faceCheckTimer.current) clearInterval(faceCheckTimer.current);
    if (quizStreamRef.current) quizStreamRef.current.getTracks().forEach(t=>t.stop());
  };

  const loadDesc = async () => {
    let w=0;
    while (!window._faceapi && w<15000) { await new Promise(r=>setTimeout(r,500)); w+=500; }
    try {
      const res = await axios.get(`/api/face/photo/${userId}`, { withCredentials: true });
      const b64 = res.data?.base64Image;
      if (!b64) throw new Error('Photo manquante');
      referenceDescRef.current = await computeDescriptor(b64);
      setDescriptorReady(true);
      console.log('[FaceMonitor] descriptor 128D prêt ✅');
    } catch(e) { console.warn('[FaceMonitor]', e.message); setDescriptorReady(false); }
  };

  const checkFace = async () => {
    if (!quizStreamRef.current) return;
    const tracks=quizStreamRef.current.getVideoTracks();
    if (!tracks.length||tracks[0].readyState!=='live') { setCamOff(true); showToast('⛔ Caméra désactivée — Session suspendue !','error'); clearInterval(faceCheckTimer.current); return; }
    const v=quizVideoRef.current;
    if (!v||!v.videoWidth||!window._faceapi) return;
    if (referenceDescRef.current) {
      const r=await matchFace(v,referenceDescRef.current);
      setFaceDetected(r.detected); setFaceDistance(r.distance);
      if (!r.detected||!r.matched) {
        noMatchFramesRef.current+=1;
        if (noMatchFramesRef.current>=FRAMES_BEFORE_WARN) { noMatchFramesRef.current=0; setFaceOk(false); warnFace(!r.detected?'Visage non détecté — Restez face à la caméra !':'Visage non reconnu — Êtes-vous bien devant la caméra ?'); }
      } else { noMatchFramesRef.current=0; setFaceOk(true); if(faceWarnsRef.current===0)setShowFaceWarn(false); }
    } else {
      const fa=window._faceapi;
      const det=await fa.detectSingleFace(v,new fa.TinyFaceDetectorOptions({inputSize:224,scoreThreshold:0.4}));
      setFaceDetected(!!det);
      if (!det) { noMatchFramesRef.current+=1; if(noMatchFramesRef.current>=FRAMES_BEFORE_WARN){noMatchFramesRef.current=0;setFaceOk(false);warnFace('Visage non détecté — Restez face à la caméra !');} }
      else { noMatchFramesRef.current=0; setFaceOk(true); }
    }
  };

  const warnFace = (msg) => {
    faceWarnsRef.current+=1; setFaceWarns(faceWarnsRef.current); setFaceWarnMsg(msg); setShowFaceWarn(true);
    showToast(`⚠️ ${msg} (${faceWarnsRef.current}/${MAX_FACE_WARNS})`,'warn');
    if (faceWarnsRef.current>=MAX_FACE_WARNS) {
      showToast("Session terminée : trop d'avertissements visage.",'error');
      setPhase('terminated'); clearInterval(timerRef.current); stopFM(); exitFullscreen();
      if (!submittedRef.current) { submittedRef.current=true; doSubmit(true); }
    }
  };

  useEffect(()=>{ if(phase==='submitted'||phase==='terminated'){ stopFM(); exitFullscreen(); } },[phase]);

  useEffect(()=>{
    if(phase!=='quiz') return;
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){ clearInterval(timerRef.current); stopFM(); exitFullscreen(); if(!submittedRef.current){submittedRef.current=true;doSubmit(true);} return 0; }
        return t-1;
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[phase]);

  const doSubmit = useCallback(async (auto=false)=>{
    if(submitting)return; setSubmitting(true); clearInterval(timerRef.current); stopFM(); exitFullscreen();
    try { await stopRecording(); } catch(e) { console.warn('[doSubmit] stopRecording:', e.message); }
    const reps=JSON.parse(sessionStorage.getItem(SK)||'{}');
    try{
      const{data}=await axios.post(`/api/quiz/${quizId}/submit`,{userId,reponses:reps});
      clearRep(); setResult(data); setPhase('submitted');
      if(!auto)showToast('Quiz soumis avec succès !');
    }catch(e){
      const msg=e.response?.data?.message||'Erreur soumission.';
      if(msg.toLowerCase().includes('délai')||msg.toLowerCase().includes('déjà')){setIneligMsg(msg);setPhase('ineligible');}
      else showToast(msg,'error');
    }finally{setSubmitting(false);}
  },[quizId,userId,submitting,SK,stopRecording]);

  const toggleFlag=()=>setFlagged(p=>{const n=new Set(p);n.has(current)?n.delete(current):n.add(current);return n;});

  const total=questions.length, answered=Object.keys(reponses).length, q=questions[current];
  const tcls=timeLeft<=5*60?'urgent':timeLeft<=10*60?'warning':'';
  const tabcls=tabExits===0?'':tabExits>=MAX_TAB_EXITS-1?'danger':'warn';
  const camCls=faceOk?'matched':faceWarns>0?'unmatched':'';
  const distLabel=faceDistance!==null?`${Math.round((1-faceDistance)*100)}% similaire`:descriptorReady?'Calcul...':'Détection';

  if(phase==='loading'||phase==='checking') return(<><style>{styles}</style><div className="qz-full"><Icon name="progress_activity" className="qz-spin qz-fi bl"/><p style={{color:'var(--tx2)',fontWeight:600}}>{phase==='checking'?'Vérification éligibilité...':'Chargement...'}</p></div></>);
  if(phase==='error') return(<><style>{styles}</style><div className="qz-full"><Icon name="error" filled className="qz-fi rd"/><h1 className="qz-ftitle">Erreur</h1><p className="qz-fsub">{errMsg}</p><button onClick={goBack} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.75rem 1.5rem',background:'#fff',border:'1px solid var(--brd)',borderRadius:'.625rem',cursor:'pointer',fontSize:'.875rem',fontWeight:700,color:'var(--tx)',fontFamily:'Public Sans,sans-serif',marginTop:'.5rem'}}><Icon name="arrow_back"/> Retour</button></div></>);
  if(phase==='ineligible') return(<><style>{styles}</style><div className="qz-full"><Icon name="block" filled className="qz-fi rd"/><h1 className="qz-ftitle">Accès Refusé</h1><p className="qz-fsub">{ineligMsg}</p><p style={{fontSize:'.8125rem',color:'var(--txd)'}}>Contactez l'équipe RH pour toute question.</p><button onClick={goBack} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.75rem 1.5rem',background:'#fff',border:'1px solid var(--brd)',borderRadius:'.625rem',cursor:'pointer',fontSize:'.875rem',fontWeight:700,color:'var(--tx)',fontFamily:'Public Sans,sans-serif',marginTop:'.5rem'}}><Icon name="arrow_back"/> Retour à ma candidature</button></div></>);

  // ── onBack={goBack} passé au FaceCheckScreen ──────────────────────
  if(phase==='face_check') return(<><style>{styles}</style><FaceCheckScreen userId={userId} sujetId={candidatureId||sujetId} onVerified={handleFaceVerified} onBack={goBack}/></>);

  if(phase==='terminated') return(<><style>{styles}</style><div className="qz-full"><Icon name="gpp_bad" filled className="qz-fi rd"/><h1 className="qz-ftitle">Session Clôturée</h1><p className="qz-fsub">Votre session a été automatiquement clôturée et vos réponses soumises.</p><p style={{fontSize:'.8125rem',color:'var(--txd)'}}>Contactez l'équipe RH pour toute question.</p></div></>);
  if(phase==='submitted'&&result) return(<><style>{styles}</style><div className="qz-full"><Icon name="check_circle" filled className="qz-fi gr"/><h1 className="qz-ftitle">Quiz Soumis !</h1><p className="qz-fsub">Vos réponses ont été enregistrées et transmises à l'équipe RH.</p><div className="qz-score-row"><div className="qz-score-box"><span className="qz-snum">{result.score??'—'}<span style={{fontSize:'1.5rem',color:'var(--txd)',fontWeight:600}}>/50</span></span><span className="qz-slbl">Score</span>{result.mention&&<span style={{marginTop:'.5rem',padding:'.25rem .875rem',background:'var(--grn-bg)',color:'var(--grn)',borderRadius:'9999px',fontSize:'.75rem',fontWeight:700}}>{result.mention}</span>}</div><div className="qz-score-box"><span className="qz-snum">{result.scorePourcentage??'—'}<span style={{fontSize:'1.5rem',color:'var(--txd)',fontWeight:600}}>%</span></span><span className="qz-slbl">Pourcentage</span></div><div className="qz-score-box"><span className="qz-snum">{result.correctAnswers??'—'}/{result.totalQuestions??total}</span><span className="qz-slbl">Bonnes réponses</span></div></div><button onClick={goBack} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.75rem 1.5rem',background:'var(--pr)',color:'#fff',border:'none',borderRadius:'.625rem',cursor:'pointer',fontSize:'.875rem',fontWeight:700,fontFamily:'Public Sans,sans-serif',boxShadow:'0 4px 12px rgba(0,61,122,.25)',marginTop:'.5rem'}}><Icon name="arrow_back"/> Retour à ma candidature</button></div></>);

  return (
    <><style>{styles}</style>
    {toast&&<div className={`qz-toast ${toast.type}`}><Icon name={toast.type==='success'?'check_circle':toast.type==='warn'?'warning':'error'} filled={toast.type==='success'}/>{toast.msg}</div>}
    {lightboxImg && <Lightbox src={lightboxImg} onClose={() => setLightboxImg(null)}/>}

    <div className="qz-page">
      {!isFullscreen && phase==='quiz' && (
        <div className="qz-fs-overlay">
          <div className="qz-fs-overlay-icon"><Icon name="fullscreen"/></div>
          <h2>Retournez en plein écran</h2>
          <p>Le quiz doit obligatoirement se dérouler en plein écran.<br/>Cliquez sur le bouton ci-dessous pour reprendre.</p>
          <button className="qz-fs-overlay-btn" onClick={enterFullscreen}><Icon name="fullscreen"/>Reprendre en plein écran</button>
          <p className="qz-fs-overlay-warn">⚠️ Toute tentative de sortie répétée sera signalée à l'équipe RH.</p>
        </div>
      )}

      <div className="qz-inner">
        <div className="qz-left">
          <div className="qz-topbar">
            <span className="qz-brand">Évaluation Technique</span>
            <div className="qz-topbar-right">
              {isRecording && (<div style={{display:'flex',alignItems:'center',gap:'.375rem',padding:'.25rem .625rem',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:'.375rem',fontSize:'.625rem',fontWeight:700,color:'#ef4444'}}><span style={{width:'.5rem',height:'.5rem',borderRadius:'50%',background:'#ef4444',animation:'qz-pulse 1s ease infinite',display:'inline-block'}}/>REC</div>)}
              {isUploading && (<div style={{display:'flex',alignItems:'center',gap:'.375rem',padding:'.25rem .625rem',background:'rgba(0,61,122,.08)',border:'1px solid var(--brd)',borderRadius:'.375rem',fontSize:'.625rem',fontWeight:700,color:'var(--pr)'}}><Icon name="progress_activity" className="qz-spin" style={{fontSize:'.875rem'}}/>Sauvegarde vidéo...</div>)}
              {tabExits>0&&<div className={`qz-tabs ${tabcls}`}><Icon name="tab_unselected" style={{fontSize:'1rem'}}/>{tabExits}/{MAX_TAB_EXITS}<Pips count={tabExits} max={MAX_TAB_EXITS}/></div>}
              <div className={`qz-timer ${tcls}`}><Icon name="timer"/> {fmt(timeLeft)}</div>
              <div className="qz-av">{initials}</div>
            </div>
          </div>

          {camOff&&<div className="qz-cam-banner"><Icon name="videocam_off" filled/><div><strong>Caméra désactivée !</strong><span style={{marginLeft:'.5rem',fontWeight:400}}>Réactivez votre caméra pour continuer. Rechargez si nécessaire.</span></div></div>}
          {showWarn&&tabExits<MAX_TAB_EXITS&&<div className="qz-warn"><Icon name="warning" filled/><span>Sortie d'onglet ({tabExits}/{MAX_TAB_EXITS}). {MAX_TAB_EXITS-tabExits===1?'Encore une sortie et votre session sera clôturée !':`Encore ${MAX_TAB_EXITS-tabExits} sortie(s) avant clôture automatique.`}</span><button className="qz-warn-x" onClick={()=>setShowWarn(false)}><Icon name="close"/></button></div>}
          {showFaceWarn&&faceWarns<MAX_FACE_WARNS&&<div className="qz-warn"><Icon name="face" filled/><span>{faceWarnMsg}&nbsp;({faceWarns}/{MAX_FACE_WARNS}). {MAX_FACE_WARNS-faceWarns===1?'Dernier avertissement avant clôture !':`Encore ${MAX_FACE_WARNS-faceWarns} avertissement(s).`}</span><button className="qz-warn-x" onClick={()=>setShowFaceWarn(false)}><Icon name="close"/></button></div>}

          <div className="qz-prog">
            <div className="qz-prog-top"><span className="qz-prog-lbl">Question {current+1} sur {total}</span><span className="qz-prog-pct">{answered}/{total} répondue{answered>1?'s':''}</span></div>
            <div className="qz-track"><div className="qz-fill" style={{width:`${total>0?Math.round(answered/total*100):0}%`}}/></div>
          </div>

          {q?(<div className="qz-card"><div className="qz-card-body">
            <p className="qz-qnum">Question {current+1} / {total}</p>
            <span className="qz-compl"><Icon name="school" style={{fontSize:'.9rem'}}/>{q.difficulte||'Intermédiaire'}</span>
            <p className="qz-qtxt">{q.texte}</p>
            {q.imageUrl && (
              <div className="qz-qimg">
                <img src={q.imageUrl} alt="Illustration de la question" onClick={() => setLightboxImg(q.imageUrl)} title="Cliquez pour agrandir"/>
              </div>
            )}
            <div className="qz-opts">
              {(q.options||[]).map((opt,idx)=>{
                const sel=reponses[q.id]===opt.id;
                return(
                  <div key={opt.id} className={`qz-opt${sel?' sel':''}`} onClick={()=>saveRep(q.id,opt.id)}>
                    <span className="qz-opt-lt">{LETTERS[idx]}</span>
                    <span className="qz-opt-tx">{opt.texte}</span>
                    <span className="qz-opt-ck"><Icon name="check_circle" filled/></span>
                  </div>
                );
              })}
            </div>
          </div><div className="qz-ai"><Icon name="auto_awesome" style={{color:'var(--txd)',fontSize:'1rem'}}/><p className="qz-ai-tx">Lisez attentivement chaque option. Vous pouvez revenir sur vos réponses avant la soumission finale.</p></div></div>):(<div className="qz-err"><Icon name="warning"/> Question introuvable.</div>)}

          <div className="qz-nav">
            <button className="qz-btn-prev" disabled={current===0} onClick={()=>setCurrent(c=>Math.max(0,c-1))}><Icon name="arrow_back"/> Précédent</button>
            <div className="qz-nav-r">
              <button className="qz-btn-skip" onClick={()=>setCurrent(c=>Math.min(total-1,c+1))}>Sauter la question</button>
              {current<total-1
                ?<button className="qz-btn-next" onClick={()=>setCurrent(c=>c+1)}>Suivant <Icon name="arrow_forward"/></button>
                :<button className="qz-btn-sub" onClick={()=>{submittedRef.current=true;doSubmit(false);}} disabled={submitting||camOff}>{submitting?'Soumission...':`Soumettre (${answered}/${total})`}</button>}
            </div>
          </div>
        </div>

        <div className="qz-right">
          <div>
            <p style={{fontSize:'.6875rem',fontWeight:900,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--txd)',marginBottom:'.5rem',display:'flex',alignItems:'center',gap:'.375rem'}}>
              <Icon name="videocam" style={{fontSize:'1rem',color:'var(--pr)'}}/>Surveillance identité
              <span style={{marginLeft:'auto',fontSize:'.5rem',fontWeight:700,background:descriptorReady?'var(--grn-bg)':'var(--pr-fix)',color:descriptorReady?'var(--grn)':'var(--pr)',padding:'.1rem .4rem',borderRadius:'.25rem'}}>{descriptorReady?'128D':'LOCAL'}</span>
            </p>
            {camOff?(<div className="qz-cam-off"><Icon name="videocam_off"/><p style={{fontSize:'.875rem',fontWeight:700}}>Caméra désactivée</p><p style={{fontSize:'.75rem',color:'rgba(255,255,255,.65)',textAlign:'center'}}>Réactivez immédiatement.</p></div>):(
              <div className={`qz-cam-widget ${camCls}`}>
                <video ref={quizVideoRef} autoPlay muted playsInline onLoadedMetadata={()=>quizVideoRef.current?.play().catch(()=>{})} style={{width:'100%',display:'block',borderRadius:'.625rem',transform:'scaleX(-1)'}}/>
                <div className={`qz-cam-badge ${faceOk?'ok':faceWarns>0?'warn':'ok'}`}><Icon name={faceDetected?(faceOk?'check_circle':'warning'):'person_off'} style={{fontSize:'.75rem'}}/>{!faceDetected?'Absent':faceOk?'Identifié':'Non reconnu'}</div>
                {faceDistance!==null&&<div className="qz-cam-score">{distLabel}</div>}
              </div>
            )}
            {!descriptorReady&&!camOff&&<p style={{fontSize:'.5625rem',color:'var(--txd)',marginTop:'.375rem',display:'flex',alignItems:'center',gap:'.25rem'}}><Icon name="progress_activity" className="qz-spin" style={{fontSize:'.75rem'}}/>Chargement référence biométrique...</p>}
            {faceApiError&&<p style={{fontSize:'.5625rem',color:'var(--org)',marginTop:'.375rem'}}>Modèles introuvables dans /public/models/</p>}
          </div>

          {faceWarns>0&&(<div className="qz-face-warns"><p className="qz-face-warns-title"><Icon name="warning" style={{fontSize:'1rem'}}/>Avertissements visage</p><div className="qz-face-pips">{Array.from({length:MAX_FACE_WARNS}).map((_,i)=>(<div key={i} className={`qz-face-pip${i<faceWarns?' on':''}`}/>))}</div><p style={{fontSize:'.75rem',color:'var(--org)',marginTop:'.5rem',fontWeight:600}}>{MAX_FACE_WARNS-faceWarns} avertissement(s) restant(s)</p></div>)}

          <div className="qz-grid-card">
            <div className="qz-grid-hdr"><span className="qz-grid-ttl">Navigation</span><span className="qz-grid-bdg">{total} Q</span></div>
            <div className="qz-grid">{questions.map((qq,i)=>{const isAns=reponses[qq.id]!==undefined,isCur=i===current,isFlg=flagged.has(i);const cls=isCur?'current':isAns?'answered':isFlg?'flagged':'unvisited';return(<button key={qq.id} className={`qz-cell ${cls}`} onClick={()=>setCurrent(i)}>{i+1}{isFlg&&!isCur&&<span className="qz-fdot"/>}</button>);})}</div>
            <div className="qz-lgnd"><div className="qz-li"><div className="qz-ld a"/> Répondu</div><div className="qz-li"><div className="qz-ld c"/> En cours</div><div className="qz-li"><div className="qz-ld e"/> Non visité</div></div>
          </div>

          <div className="qz-info">
            <Icon name="info" filled/>
            <h5>Règlement de l'examen</h5>
            <p>Navigation libre. Une seule tentative. Copier-coller désactivé. {MAX_TAB_EXITS} sorties d'onglet = clôture. Caméra obligatoire. {MAX_FACE_WARNS} avertissements visage = clôture. Quiz en plein écran obligatoire. Partage d'écran obligatoire.</p>
          </div>

          <div style={{paddingTop:'1rem',borderTop:'1px solid var(--brd)'}}>
            <button className={`qz-btn-flag${flagged.has(current)?' on':''}`} onClick={toggleFlag}>
              <Icon name="flag" filled={flagged.has(current)}/>{flagged.has(current)?'Signalé — Retirer':'Signaler cette question'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CandidatQuiz;