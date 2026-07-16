import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const styles = `
*{box-sizing:border-box;margin:0;padding:0;}
.rqe-root{font-family:'Public Sans',sans-serif;background:#f1f5f9;color:#0f172a;min-height:100vh;}
.rqe-root .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;vertical-align:middle;font-size:1.25rem;}
.rqe-back{display:inline-flex;align-items:center;gap:.5rem;background:none;border:none;cursor:pointer;font-family:'Public Sans',sans-serif;font-size:.875rem;font-weight:700;color:#64748b;margin-bottom:1.25rem;padding:0;transition:color .15s;}
.rqe-back:hover{color:#003d7a;}
.rqe-back .material-symbols-outlined{font-size:1.125rem;}
.rqe-banner{background:linear-gradient(135deg,#003d7a,#0056b3);border-radius:1rem;padding:1.5rem 2rem;color:#fff;margin-bottom:1.75rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
.rqe-banner-eyebrow{font-size:.625rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.6);margin-bottom:.375rem;}
.rqe-banner-titre{font-size:1.5rem;font-weight:900;letter-spacing:-.02em;margin-bottom:.5rem;}
.rqe-banner-meta{display:flex;flex-wrap:wrap;gap:1rem;}
.rqe-banner-meta-item{display:flex;align-items:center;gap:.375rem;font-size:.8125rem;color:rgba(255,255,255,.75);font-weight:500;}
.rqe-banner-meta-item .material-symbols-outlined{font-size:1rem;}
.rqe-banner-right{display:flex;gap:.875rem;flex-shrink:0;flex-wrap:wrap;}
.rqe-stat-box{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15);border-radius:.75rem;padding:.875rem 1.25rem;text-align:center;min-width:5rem;}
.rqe-stat-num{font-size:1.75rem;font-weight:900;line-height:1;}
.rqe-stat-lbl{font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.6);margin-top:.25rem;}
.app{max-width:1200px;margin:0 auto;}
.grid{display:grid;grid-template-columns:1fr 280px;gap:1.5rem;}
.card{background:#fff;border-radius:.875rem;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.q-body{padding:1.5rem;}
.q-label{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;display:block;margin-bottom:.625rem;}
.q-textarea{width:100%;padding:1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:.625rem;font-size:.9375rem;font-weight:600;font-family:'Public Sans',sans-serif;color:#0f172a;resize:none;outline:none;line-height:1.6;transition:border-color .15s;}
.q-textarea:focus{border-color:#003d7a;box-shadow:0 0 0 3px rgba(0,61,122,.07);background:#fff;}
.q-textarea.error{border-color:#ef4444;background:#fff8f8;}
.q-enonce-error{display:flex;align-items:center;gap:.375rem;font-size:.75rem;color:#ef4444;font-weight:600;margin-top:.375rem;}
.q-enonce-error .material-symbols-outlined{font-size:.875rem;}
.img-zone{border:2px dashed #e2e8f0;border-radius:.75rem;padding:1.5rem;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:1.25rem;}
.img-zone:hover{border-color:#003d7a;background:rgba(0,61,122,.03);}
.img-zone.has-img{border-style:solid;border-color:#003d7a;background:rgba(0,61,122,.03);padding:.75rem;}
.img-preview{max-width:100%;max-height:200px;border-radius:.5rem;object-fit:contain;}
.img-zone-text{font-size:.8125rem;color:#94a3b8;font-weight:600;margin-top:.5rem;}
.img-zone-icon{font-size:2rem!important;color:#cbd5e1;}
.img-actions{display:flex;gap:.5rem;margin-top:.625rem;justify-content:center;}
.btn-img-remove{padding:.375rem .875rem;background:#fef2f2;border:1px solid #fecaca;border-radius:.375rem;color:#dc2626;font-size:.75rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;display:flex;align-items:center;gap:.375rem;}
.btn-img-remove .material-symbols-outlined{font-size:.875rem;}
.options-section{margin-top:1.5rem;}
.option-row{display:flex;align-items:center;gap:.875rem;padding:.875rem 1.125rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:.625rem;margin-bottom:.625rem;transition:border-color .15s;}
.option-row.correct{background:rgba(0,61,122,.04);border-color:rgba(0,61,122,.3);}
.option-radio{width:1rem;height:1rem;accent-color:#003d7a;flex-shrink:0;cursor:pointer;}
.option-input{flex:1;background:transparent;border:none;outline:none;font-size:.875rem;font-family:'Public Sans',sans-serif;color:#0f172a;font-weight:500;}
.option-input::placeholder{color:#cbd5e1;}
.option-badge{font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#cbd5e1;white-space:nowrap;}
.option-badge.is-correct{color:#059669;background:#ecfdf5;padding:.125rem .375rem;border-radius:.25rem;}
.card-footer{display:flex;align-items:center;justify-content:space-between;padding:.875rem 1.5rem;border-top:1px solid #f1f5f9;background:#fafbfc;border-radius:0 0 .875rem .875rem;flex-wrap:wrap;gap:.75rem;}
.footer-info{display:flex;align-items:center;gap:.5rem;font-size:.6875rem;color:#94a3b8;font-style:italic;}
.footer-actions{display:flex;gap:.625rem;flex-wrap:wrap;}
.btn-save{padding:.5625rem 1.25rem;background:#003d7a;color:#fff;border:none;border-radius:.5rem;font-size:.75rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;box-shadow:0 2px 6px rgba(0,61,122,.2);display:flex;align-items:center;gap:.375rem;}
.btn-save:hover{opacity:.88;}
.btn-save:disabled{opacity:.45;cursor:not-allowed;}
.btn-save .material-symbols-outlined{font-size:.875rem;}
.btn-delete-q{padding:.5rem .875rem;background:#fef2f2;border:1px solid #fecaca;border-radius:.5rem;color:#dc2626;font-size:.75rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;display:flex;align-items:center;gap:.375rem;}
.btn-delete-q:hover{background:#fee2e2;}
.btn-delete-q:disabled{opacity:.4;cursor:not-allowed;}
.btn-delete-q .material-symbols-outlined{font-size:.875rem;}
.btn-add-q{padding:.5rem 1rem;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:.5rem;color:#059669;font-size:.75rem;font-weight:700;cursor:pointer;font-family:'Public Sans',sans-serif;display:flex;align-items:center;gap:.375rem;}
.btn-add-q:hover{background:#d1fae5;}
.btn-add-q:disabled{opacity:.4;cursor:not-allowed;}
.btn-add-q .material-symbols-outlined{font-size:.875rem;}
.q-nav{display:flex;justify-content:space-between;margin-top:1rem;}
.btn-nav{display:flex;align-items:center;gap:.5rem;padding:.625rem 1.25rem;background:#fff;border:1px solid #e2e8f0;border-radius:.625rem;font-size:.8125rem;font-weight:700;color:#0f172a;cursor:pointer;font-family:'Public Sans',sans-serif;transition:all .15s;}
.btn-nav:hover{border-color:#003d7a;color:#003d7a;background:#f8fafc;}
.btn-nav:disabled{opacity:.4;cursor:not-allowed;}
.btn-nav .material-symbols-outlined{font-size:1rem;}
.bank-card{padding:1.25rem;}
.bank-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;}
.bank-title{font-size:.6875rem;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#0f172a;}
.bank-badge{padding:.2rem .5rem;border-radius:.25rem;font-size:.5625rem;font-weight:700;}
.bank-badge.ok{background:#002b57;color:#fff;}
.bank-badge.warn{background:#fbbf24;color:#0f172a;}
.bank-badge.full{background:#ef4444;color:#fff;}
.bank-progress{width:100%;height:.3rem;background:#e2e8f0;border-radius:9999px;overflow:hidden;margin-bottom:1rem;}
.bank-progress-fill{height:100%;background:#003d7a;border-radius:9999px;transition:width .4s ease;}
.q-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:.375rem;}
.q-cell{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:.375rem;font-size:.6rem;font-weight:700;cursor:pointer;border:none;font-family:'Public Sans',sans-serif;transition:all .15s;position:relative;}
.q-cell.done{background:#003d7a;color:#fff;}
.q-cell.current{background:#fff;border:2px solid #003d7a;color:#003d7a;font-weight:900;box-shadow:0 0 0 3px rgba(0,61,122,.1);}
.q-cell.empty{background:#e2e8f0;color:#94a3b8;}
.q-cell.hasimg::after{content:'🖼';position:absolute;top:-3px;right:-3px;font-size:.5rem;}
.legend{margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9;display:flex;flex-direction:column;gap:.5rem;}
.legend-item{display:flex;align-items:center;gap:.625rem;font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;}
.legend-dot{width:.625rem;height:.625rem;border-radius:.25rem;}
.legend-dot.done{background:#003d7a;}
.legend-dot.current{background:#fff;border:2px solid #003d7a;}
.legend-dot.empty{background:#e2e8f0;}
.mgmt-card{background:#002b57;border-radius:.875rem;padding:1.25rem;color:#fff;}
.mgmt-icon .material-symbols-outlined{font-size:1.5rem;color:#a8c8ff;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;}
.mgmt-title{font-size:.875rem;font-weight:700;margin:.625rem 0 .5rem;}
.mgmt-body{font-size:.6875rem;color:rgba(168,200,255,.7);line-height:1.6;}
.rqe-overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:100;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);}
.rqe-modal{background:#fff;border-radius:.875rem;padding:2rem;max-width:22rem;width:100%;box-shadow:0 25px 50px rgba(0,0,0,.25);}
.rqe-modal h3{font-size:1.125rem;font-weight:700;color:#0f172a;margin-bottom:.5rem;}
.rqe-modal p{font-size:.875rem;color:#64748b;margin-bottom:1.5rem;line-height:1.6;}
.rqe-modal-btns{display:flex;gap:.75rem;justify-content:flex-end;}
.rqe-modal-cancel{padding:.625rem 1.25rem;background:#fff;border:1px solid #e2e8f0;border-radius:.5rem;font-size:.875rem;font-weight:600;color:#475569;cursor:pointer;font-family:'Public Sans',sans-serif;}
.rqe-modal-confirm{padding:.625rem 1.25rem;background:#ef4444;border:none;border-radius:.5rem;font-size:.875rem;font-weight:700;color:#fff;cursor:pointer;font-family:'Public Sans',sans-serif;}
@keyframes spin{to{transform:rotate(360deg)}}
.loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5rem;gap:1rem;color:#94a3b8;font-size:.875rem;}
.spin{animation:spin .8s linear infinite;color:#003d7a;}
.err-box{background:#fee2e2;border:1px solid #fca5a5;color:#b91c1c;padding:1rem 1.5rem;border-radius:.75rem;margin-bottom:1.5rem;font-size:.875rem;display:flex;align-items:center;gap:.5rem;}
@keyframes toastin{from{opacity:0;transform:translateY(1rem)}to{opacity:1;transform:translateY(0)}}
.toast{position:fixed;bottom:1.5rem;right:1.5rem;z-index:999;background:#0f172a;color:#fff;padding:.875rem 1.25rem;border-radius:.75rem;display:flex;align-items:center;gap:.625rem;font-size:.8125rem;font-weight:600;box-shadow:0 20px 25px -5px rgba(0,0,0,.25);animation:toastin .3s ease;font-family:'Public Sans',sans-serif;}
.toast.success .material-symbols-outlined{color:#22c55e;}
.toast.error .material-symbols-outlined{color:#ef4444;}
`;

const LABELS  = ['A','B','C'];
const MAX_Q   = 50;

// ✅ Cloudinary — URL directe, pas de manipulation de chemin
// Si c'est un blob local (preview avant upload) → l'afficher directement
// Si c'est une URL Cloudinary https:// → l'afficher directement
// Les anciens fichiers locaux ne sont plus supportés
const getImageSrc = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('blob:'))  return imageUrl;   // preview local avant upload
  if (imageUrl.startsWith('http'))   return imageUrl;   // ✅ URL Cloudinary
  return null; // ancien fichier local → ignorer
};

const makeEmptyQuestion = () => ({
  id: null, texte: '', difficulte: 'Intermédiaire',
  bonneReponse: 0, imageUrl: null, imageFile: null, removeImage: false,
  options: [{id:null,texte:''},{id:null,texte:''},{id:null,texte:''}],
  saved: false,
});

const fromBackend = (q) => {
  const opts       = q.options || [];
  const hasCorrect = opts.some(o => o.correcte !== undefined);
  const correctIdx = hasCorrect ? opts.findIndex(o => o.correcte === true) : 0;
  return {
    id:           q.id,
    texte:        q.texte      || '',
    difficulte:   q.difficulte || 'Intermédiaire',
    // ✅ URL Cloudinary stockée directement — pas de manipulation
    imageUrl:     q.imageUrl   || null,
    imageFile:    null,
    removeImage:  false,
    bonneReponse: correctIdx >= 0 ? correctIdx : 0,
    options:      opts.map(o => ({id: o.id, texte: o.texte || ''})),
    saved:        true,
  };
};

const Icon = ({ name, style={}, className='' }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

// ✅ Lightbox — popup image plein écran au clic
const Lightbox = ({ src, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed',inset:0,zIndex:9999,
        background:'rgba(15,23,42,.92)',
        display:'flex',alignItems:'center',justifyContent:'center',
        padding:'2rem',backdropFilter:'blur(6px)',cursor:'zoom-out',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{position:'relative',maxWidth:'90vw',maxHeight:'90vh'}}>
        <img
          src={src} alt="Aperçu"
          style={{
            maxWidth:'90vw',maxHeight:'85vh',
            borderRadius:'1rem',objectFit:'contain',
            boxShadow:'0 25px 60px rgba(0,0,0,.5)',
            display:'block',
          }}
        />
        <button
          onClick={onClose}
          style={{
            position:'absolute',top:'-1rem',right:'-1rem',
            width:'2.25rem',height:'2.25rem',borderRadius:'50%',
            background:'#fff',border:'none',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 4px 12px rgba(0,0,0,.3)',
          }}
        >
          <span className="material-symbols-outlined" style={{fontSize:'1.125rem',verticalAlign:'middle'}}>close</span>
        </button>
        <p style={{textAlign:'center',marginTop:'.75rem',fontSize:'.75rem',color:'rgba(255,255,255,.5)',fontWeight:600}}>
          Appuyez sur Échap ou cliquez en dehors pour fermer
        </p>
      </div>
    </div>
  );
};

const RHQuizEditor = ({ sujet, onBack }) => {
  const sujetId    = sujet?.id;
  const sujetTitre = sujet?.titre || 'Sujet';

  const [quizId,      setQuizId]      = useState(null);
  const [questions,   setQuestions]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [current,     setCurrent]     = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [,            setDeleting]    = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [toast,       setToast]       = useState(null);
  const [enonceError, setEnonceError] = useState(false);
  const [lightboxSrc,  setLightboxSrc]  = useState(null);
  const fileRef = useRef(null);

  const showToast = (msg, type='success') => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!sujetId) return;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const { data: quiz } = await axios.get(`/api/quiz/sujet/${sujetId}`);
        setQuizId(quiz.id);
        let raw = quiz.questions || [];
        if (raw.length === 0 && quiz.id) {
          const { data: qs } = await axios.get(`/api/quiz/${quiz.id}/questions-full`);
          raw = Array.isArray(qs) ? qs : [];
        }
        setQuestions(raw.length ? raw.map(fromBackend) : [makeEmptyQuestion()]);
        setCurrent(0);
      } catch (err) {
        if (err.response?.status === 404) setQuestions([makeEmptyQuestion()]);
        else setError(err.response?.data?.message || 'Impossible de charger le quiz.');
      } finally { setLoading(false); }
    };
    load();
  }, [sujetId]);

  const q          = questions[current] || makeEmptyQuestion();
  const total      = questions.length;
  const done       = questions.filter(qq => qq.saved).length;
  const pct        = total > 0 ? Math.round(done / total * 100) : 0;
  const counterCls = total >= MAX_Q ? 'full' : total >= MAX_Q - 5 ? 'warn' : 'ok';
  // ✅ Image à afficher — URL Cloudinary ou blob preview
  const imageSrc   = getImageSrc(q.imageUrl);

  const updateQ      = patch => setQuestions(qs => qs.map((item,i) => i===current ? {...item,...patch} : item));
  const updateOption = (idx, texte) => { const opts=[...q.options]; opts[idx]={...opts[idx],texte}; updateQ({options:opts}); };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Blob URL pour la preview — sera uploadée vers Cloudinary via QuizService
    const preview = URL.createObjectURL(file);
    updateQ({ imageFile: file, imageUrl: preview, removeImage: false });
  };

  const handleRemoveImage = () => {
    // Libérer le blob URL si c'est un preview local
    if (q.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(q.imageUrl);
    updateQ({ imageFile: null, imageUrl: null, removeImage: true });
    if (fileRef.current) fileRef.current.value = '';
  };

  const saveQuestion = async () => {
    if (!q.texte?.trim()) {
      setEnonceError(true);
      showToast("L'énoncé de la question est obligatoire.", 'error');
      return;
    }
    setEnonceError(false);
    if (q.options.some(o => !o.texte.trim())) {
      showToast('Toutes les options doivent être remplies', 'error'); return;
    }

    setSaving(true);
    try {
      const payload = {
        texte:      q.texte,
        difficulte: q.difficulte,
        imageUrl:   q.removeImage ? 'REMOVE' : undefined,
        options:    q.options.map((o, idx) => ({
          id:       o.id || undefined,
          texte:    o.texte,
          correcte: idx === q.bonneReponse,
        })),
      };

      const formData = new FormData();
      formData.append('question', JSON.stringify(payload));
      if (q.imageFile) formData.append('image', q.imageFile);

      let data;
      if (q.id) {
        ({ data } = await axios.put(`/api/quiz/question/${q.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }));
      } else {
        if (!quizId) { showToast('Quiz introuvable', 'error'); return; }
        ({ data } = await axios.post(`/api/quiz/${quizId}/question`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }));
      }

      // ✅ fromBackend récupère l'URL Cloudinary retournée par Spring Boot
      const updated = fromBackend(data);
      setQuestions(qs => qs.map((item, i) => i === current ? updated : item));
      showToast(q.id ? 'Question modifiée ✓' : 'Question ajoutée ✓');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la sauvegarde', 'error');
    } finally { setSaving(false); }
  };

  const handleAddQuestion = () => {
    if (total >= MAX_Q) { showToast(`Le quiz est complet (${MAX_Q} questions).`, 'error'); return; }
    setQuestions(qs => [...qs, makeEmptyQuestion()]);
    setCurrent(questions.length);
  };

  const handleDeleteConfirm = async () => {
    setConfirmDel(false);
    if (!q.id) {
      setQuestions(qs => qs.filter((_, i) => i !== current));
      setCurrent(Math.max(0, current - 1));
      showToast('Question retirée');
      return;
    }
    setDeleting(true);
    try {
      await axios.delete(`/api/quiz/question/${q.id}`);
      setQuestions(qs => qs.filter((_, i) => i !== current));
      setCurrent(Math.max(0, current - 1));
      showToast('Question supprimée ✓');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally { setDeleting(false); }
  };

  if (loading) return (
    <><style>{styles}</style>
    <div className="loading"><Icon name="progress_activity" className="spin"/><p>Chargement...</p></div>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="rqe-root">

        {/* ✅ Lightbox popup image */}
        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)}/>}

        {toast && (
          <div className={`toast ${toast.type}`}>
            <Icon name={toast.type==='success'?'check_circle':'error'}/>{toast.msg}
          </div>
        )}

        {confirmDel && (
          <div className="rqe-overlay">
            <div className="rqe-modal">
              <h3>Supprimer la question ?</h3>
              <p>Cette action est irréversible. La question #{current+1} sera définitivement supprimée du quiz.</p>
              <div className="rqe-modal-btns">
                <button className="rqe-modal-cancel" onClick={() => setConfirmDel(false)}>Annuler</button>
                <button className="rqe-modal-confirm" onClick={handleDeleteConfirm}>Supprimer</button>
              </div>
            </div>
          </div>
        )}

        <main className="app">
          <button className="rqe-back" onClick={onBack}>
            <Icon name="arrow_back"/>Retour aux sujets
          </button>

          <div className="rqe-banner">
            <div>
              <p className="rqe-banner-eyebrow">
                Sujet de stage{sujet?.codeSujet ? ` · REF: ${sujet.codeSujet}` : ''}
              </p>
              <p className="rqe-banner-titre">{sujetTitre}</p>
              <div className="rqe-banner-meta">
                {sujet?.departement  && <span className="rqe-banner-meta-item"><Icon name="corporate_fare"/>{sujet.departement}</span>}
                {sujet?.duree        && <span className="rqe-banner-meta-item"><Icon name="schedule"/>{sujet.duree}</span>}
                {sujet?.niveauEtudes && <span className="rqe-banner-meta-item"><Icon name="school"/>{sujet.niveauEtudes}</span>}
              </div>
            </div>
            <div className="rqe-banner-right">
              <div className="rqe-stat-box"><p className="rqe-stat-num">{total}</p><p className="rqe-stat-lbl">Questions</p></div>
              <div className="rqe-stat-box"><p className="rqe-stat-num">{MAX_Q - total}</p><p className="rqe-stat-lbl">Restantes</p></div>
              <div className="rqe-stat-box"><p className="rqe-stat-num">{pct}%</p><p className="rqe-stat-lbl">Modifiées</p></div>
            </div>
          </div>

          {error && <div className="err-box"><Icon name="error"/>{error}</div>}

          <div className="grid">
            <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              <div className="card">
                <div className="q-body">

                  <label className="q-label">
                    Énoncé de la question <span style={{color:'#ef4444'}}>*</span>
                  </label>
                  <textarea
                    className={`q-textarea${enonceError?' error':''}`}
                    rows={3}
                    placeholder="Saisissez l'intitulé de la question..."
                    value={q.texte}
                    onChange={e => { updateQ({texte:e.target.value}); if(e.target.value.trim()) setEnonceError(false); }}
                  />
                  {enonceError && (
                    <p className="q-enonce-error">
                      <span className="material-symbols-outlined">error</span>
                      L'énoncé est obligatoire. Veuillez saisir le texte de la question.
                    </p>
                  )}

                  {/* ── Zone image — Cloudinary ── */}
                  <div style={{marginTop:'1.25rem'}}>
                    <label className="q-label">Image de la question (optionnel)</label>
                    <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
                      onChange={handleImageChange}/>
                    <div
                      className={`img-zone ${imageSrc ? 'has-img' : ''}`}
                      onClick={() => !imageSrc && fileRef.current?.click()}
                    >
                      {imageSrc ? (
                        <>
                          {/* ✅ URL Cloudinary directe — pas de manipulation */}
                          {/* ✅ Image centrée — clic → lightbox */}
                          <div style={{display:'flex',justifyContent:'center',width:'100%'}}>
                            <img
                              src={imageSrc} alt="Question" className="img-preview"
                              onClick={e => { e.stopPropagation(); setLightboxSrc(imageSrc); }}
                              style={{cursor:'zoom-in',maxWidth:'100%',maxHeight:'200px',display:'block',margin:'0 auto',borderRadius:'.5rem',objectFit:'contain'}}
                            />
                          </div>
                          <p style={{fontSize:'.625rem',color:'#94a3b8',marginTop:'.375rem',fontWeight:600,textAlign:'center'}}>
                            Cliquez sur l'image pour agrandir
                          </p>
                          <div className="img-actions">
                            <button type="button"
                              onClick={e => {e.stopPropagation(); fileRef.current?.click();}}
                              style={{padding:'.375rem .875rem',background:'rgba(0,61,122,.08)',border:'1px solid rgba(0,61,122,.2)',borderRadius:'.375rem',color:'#003d7a',fontSize:'.75rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'.375rem'}}>
                              <Icon name="swap_horiz" style={{fontSize:'.875rem'}}/>Changer
                            </button>
                            <button type="button" className="btn-img-remove"
                              onClick={e => {e.stopPropagation(); handleRemoveImage();}}>
                              <Icon name="delete"/>Supprimer l'image
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Icon name="add_photo_alternate" className="img-zone-icon"/>
                          <p className="img-zone-text">Cliquez pour ajouter une image (JPG, PNG, GIF...)</p>
                          <p style={{fontSize:'.6875rem',color:'#cbd5e1',marginTop:'.25rem'}}>
                            Uploadée automatiquement vers Cloudinary
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="options-section">
                    <label className="q-label">Options de réponse — sélectionnez la correcte</label>
                    {q.options.map((opt, idx) => {
                      const isCorrect = q.bonneReponse === idx;
                      return (
                        <div key={opt.id ?? idx} className={`option-row${isCorrect?' correct':''}`}>
                          <input type="radio" className="option-radio"
                            name={`q-${current}`} checked={isCorrect}
                            onChange={() => updateQ({bonneReponse:idx})}/>
                          <input type="text" className="option-input"
                            placeholder={`Option ${LABELS[idx]}...`}
                            value={opt.texte}
                            onChange={e => updateOption(idx, e.target.value)}/>
                          <span className={`option-badge${isCorrect?' is-correct':''}`}>
                            {isCorrect ? '✓ Correcte' : `Option ${LABELS[idx]}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card-footer">
                  <div className="footer-info">
                    <Icon name="info"/>
                    {q.id ? `ID #${q.id}` : 'Nouvelle question'}
                    {imageSrc ? ' · 🖼 Image Cloudinary' : ''}
                  </div>
                  <div className="footer-actions">
                 
                    <button className="btn-save" onClick={saveQuestion} disabled={saving}>
                      {saving
                        ? <><Icon name="progress_activity" className="spin"/>Enregistrement...</>
                        : <><Icon name="save"/>{q.id ? 'Modifier' : 'Ajouter'}</>
                      }
                    </button>
                  </div>
                </div>
              </div>

              <div className="q-nav">
                <button className="btn-nav" disabled={current===0}
                  onClick={() => setCurrent(c => Math.max(0,c-1))}>
                  <Icon name="arrow_back"/>Précédente
                </button>
                <button className="btn-nav" disabled={current===total-1}
                  onClick={() => setCurrent(c => Math.min(total-1,c+1))}>
                  Suivante<Icon name="arrow_forward"/>
                </button>
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              <div className="card bank-card">
                <div className="bank-header">
                  <span className="bank-title">Banque de Questions</span>
                  <span className={`bank-badge ${counterCls}`}>{total}/{MAX_Q}</span>
                </div>
                <div className="bank-progress">
                  <div className="bank-progress-fill" style={{width:`${(total/MAX_Q)*100}%`}}/>
                </div>
                <div className="q-grid">
                  {questions.map((qq,i) => {
                    const cls = i===current ? 'current' : qq.saved ? 'done' : 'empty';
                    const hasImg = !!getImageSrc(qq.imageUrl);
                    return (
                      <button key={i}
                        className={`q-cell ${cls}${hasImg?' hasimg':''}`}
                        onClick={() => setCurrent(i)}>
                        {i+1}
                      </button>
                    );
                  })}
                </div>
                <div className="legend">
                  <div className="legend-item"><div className="legend-dot done"/>Sauvegardée</div>
                  <div className="legend-item"><div className="legend-dot current"/>En cours</div>
                  <div className="legend-item"><div className="legend-dot empty"/>Non sauvegardée</div>
                  <div className="legend-item"><span style={{fontSize:'.75rem'}}>🖼</span>Image Cloudinary</div>
                </div>
                <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid #f1f5f9'}}>
                  <button className="btn-add-q"
                    style={{width:'100%',justifyContent:'center'}}
                    onClick={handleAddQuestion}
                    disabled={total >= MAX_Q}>
                    <Icon name="add_circle"/>
                    {total >= MAX_Q ? 'Quiz complet (50/50)' : `Ajouter une question (${total}/${MAX_Q})`}
                  </button>
                </div>
              </div>

              <div className="mgmt-card">
                <div className="mgmt-icon"><Icon name="inventory_2"/></div>
                <h5 className="mgmt-title">Gestion du quiz</h5>
                <p className="mgmt-body">
                  Le quiz doit contenir exactement 50 questions.<br/><br/>
                  <strong style={{color:'#a8c8ff'}}>Ajouter</strong> → bouton vert ci-dessus<br/>
                  <strong style={{color:'#a8c8ff'}}>Modifier</strong> → éditer et cliquer "Modifier"<br/>
                  <strong style={{color:'#a8c8ff'}}>Supprimer</strong> → bouton rouge dans la carte<br/>
                  <strong style={{color:'#a8c8ff'}}>Image</strong> → uploadée automatiquement vers Cloudinary
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default RHQuizEditor;