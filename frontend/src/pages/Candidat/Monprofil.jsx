import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import debounce from 'lodash.debounce';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');

  .mp-root *, .mp-root *::before, .mp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .mp-root { font-family: 'Public Sans', sans-serif; background: #f5f7f8; min-height: 100vh; color: #0f172a; }

  .mp-main { max-width:62rem; margin:0 auto; padding:2.5rem 1.5rem 4rem; }

  .mp-page-header { border-left:4px solid #003d7a; padding-left:1.25rem; margin-bottom:2.25rem; }
  .mp-page-header h1 { font-size:1.875rem; font-weight:900; color:#0f172a; letter-spacing:-.02em; }
  .mp-page-header p  { font-size:1rem; color:#64748b; margin-top:.375rem; line-height:1.6; }

  .mp-section { background:#fff; border:1px solid #e2e8f0; border-radius:.75rem; padding:1.75rem; margin-bottom:1.5rem; box-shadow:0 1px 4px rgba(0,0,0,.04); }
  .mp-section-title { display:flex; align-items:center; gap:.5rem; font-size:1.125rem; font-weight:700; color:#003d7a; margin-bottom:1.5rem; }
  .mp-section-title .material-symbols-outlined { font-size:1.25rem; }

  .mp-avatar-row { display:flex; align-items:center; gap:1.75rem; margin-bottom:1.75rem; padding-bottom:1.75rem; border-bottom:1px solid #f1f5f9; flex-wrap:wrap; }
  .mp-avatar-wrap { position:relative; flex-shrink:0; }
  .mp-avatar { width:5.5rem; height:5.5rem; border-radius:50%; object-fit:cover; border:3px solid #e2e8f0; display:block; }
  .mp-avatar-placeholder { width:5.5rem; height:5.5rem; border-radius:50%; background:linear-gradient(135deg,#003d7a,#0066cc); display:flex; align-items:center; justify-content:center; border:3px solid #e2e8f0; }
  .mp-avatar-placeholder span { font-size:1.75rem; color:#fff; font-weight:700; }
  .mp-avatar-edit-btn { position:absolute; bottom:0; right:0; width:1.875rem; height:1.875rem; border-radius:50%; background:#003d7a; border:2px solid #fff; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s; }
  .mp-avatar-edit-btn:hover { background:#002a5c; }
  .mp-avatar-edit-btn .material-symbols-outlined { font-size:.875rem; }
  .mp-avatar-info h3 { font-size:1.125rem; font-weight:700; color:#0f172a; }
  .mp-avatar-info p  { font-size:.875rem; color:#64748b; margin-top:.2rem; }
  .mp-avatar-hint { font-size:.75rem; color:#94a3b8; margin-top:.375rem; }
  .mc-breadcrumb { font-size:.85rem; color:#64748b; display:flex; align-items:center; gap:.35rem; margin-bottom:1rem; }
  .mc-breadcrumb span:last-child { color:#0f172a; font-weight:600; }
  .mc-breadcrumb .material-symbols-outlined { font-size:1rem; }

  .mp-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
  @media (max-width:640px) { .mp-grid-2 { grid-template-columns:1fr; } }

  .mp-field { display:flex; flex-direction:column; gap:.375rem; }
  .mp-label { font-size:.8125rem; font-weight:600; color:#475569; }
  .mp-label .req { color:#dc2626; margin-left:2px; }
  .mp-input, .mp-select { width:100%; padding:.75rem .875rem; border:1px solid #cbd5e1; border-radius:.5rem; font-size:.875rem; font-family:'Public Sans',sans-serif; color:#0f172a; background:#f8fafc; outline:none; transition:border-color .15s,box-shadow .15s,background .15s; }
  .mp-input:focus, .mp-select:focus { border-color:#003d7a; background:#fff; box-shadow:0 0 0 3px rgba(0,61,122,.09); }
  .mp-input.err, .mp-select.err { border-color:#dc2626; box-shadow:0 0 0 3px rgba(220,38,38,.08); }
  .mp-input:disabled { opacity:.6; cursor:not-allowed; }
  .mp-select { appearance:none; cursor:pointer; }

  .mp-input-wrap { position:relative; }
  .mp-input-wrap .mp-input { padding-right:2.75rem; }
  .mp-input-unit { position:absolute; right:.75rem; top:50%; transform:translateY(-50%); font-size:.8125rem; color:#94a3b8; font-weight:600; pointer-events:none; }

  .mp-tel-wrap { display:flex; align-items:stretch; }
  .mp-tel-prefix { padding:.75rem .875rem; background:#f1f5f9; border:1px solid #cbd5e1; border-right:none; border-radius:.5rem 0 0 .5rem; font-size:.875rem; color:#475569; font-weight:600; white-space:nowrap; display:flex; align-items:center; }
  .mp-tel-wrap .mp-input-tel { flex:1; border-radius:0; }
  .mp-tel-wrap .mp-input-tel.last { border-radius:0 .5rem .5rem 0; }
  .mp-tel-edit-btn { padding:0 .875rem; border-radius:0 .5rem .5rem 0; border:1px solid #cbd5e1; border-left:none; background:#fff; font-size:.75rem; font-weight:700; color:#003d7a; cursor:pointer; white-space:nowrap; transition:background .15s; font-family:'Public Sans',sans-serif; display:flex; align-items:center; gap:.25rem; }
  .mp-tel-edit-btn:hover { background:#eff6ff; }
  .mp-tel-hint { font-size:.72rem; color:#94a3b8; margin-top:.25rem; }
  .mp-tel-ok   { font-size:.72rem; color:#059669; margin-top:.25rem; display:flex; align-items:center; gap:.2rem; font-weight:600; }

  .mp-upload-zone { border:2px dashed #cbd5e1; border-radius:.625rem; padding:2rem 1.5rem; background:#f8fafc; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.625rem; cursor:pointer; transition:border-color .2s,background .2s; text-align:center; }
  .mp-upload-zone:hover, .mp-upload-zone.dragover { border-color:#003d7a; background:#eff6ff; }
  .mp-upload-zone .material-symbols-outlined { font-size:2.25rem; color:#94a3b8; }
  .mp-upload-zone p { font-size:.875rem; color:#64748b; font-weight:500; }
  .mp-upload-zone span { font-size:.75rem; color:#94a3b8; }

  .mp-cv-card { display:flex; align-items:center; gap:1rem; padding:1.125rem 1.25rem; border:1px solid rgba(0,61,122,.18); border-radius:.75rem; background:rgba(0,61,122,.04); }
  .mp-cv-icon { width:2.75rem; height:2.75rem; border-radius:.5rem; background:#003d7a; color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 10px rgba(0,61,122,.3); }
  .mp-cv-icon .material-symbols-outlined { font-size:1.25rem; }
  .mp-cv-info { flex:1; min-width:0; }
  .mp-cv-name { font-size:.875rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mp-cv-meta { font-size:.75rem; color:#64748b; display:flex; align-items:center; gap:.375rem; margin-top:.15rem; }
  .mp-cv-meta .material-symbols-outlined { font-size:.875rem; color:#22c55e; }
  .mp-cv-actions { display:flex; align-items:center; gap:.5rem; flex-shrink:0; }
  .mp-cv-view-btn { height:2.25rem; padding:0 .875rem; border-radius:.5rem; border:1px solid #003d7a; background:#fff; color:#003d7a; font-size:.75rem; font-weight:700; display:flex; align-items:center; gap:.25rem; cursor:pointer; transition:background .15s; font-family:'Public Sans',sans-serif; }
  .mp-cv-view-btn:hover { background:#eff6ff; }
  .mp-cv-view-btn .material-symbols-outlined { font-size:.875rem; }
  .mp-cv-delete { width:2.25rem; height:2.25rem; border-radius:50%; border:none; background:transparent; color:#94a3b8; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s,color .15s; }
  .mp-cv-delete:hover { background:#fee2e2; color:#dc2626; }

  .mp-field-err { font-size:.75rem; color:#dc2626; display:flex; align-items:center; gap:.2rem; margin-top:.125rem; }
  .mp-field-err .material-symbols-outlined { font-size:.875rem; }

  @keyframes mp-toast-in { from{opacity:0;transform:translateY(1rem)} to{opacity:1;transform:translateY(0)} }
  .mp-toast { position:fixed; bottom:2rem; right:2rem; z-index:9999; padding:.875rem 1.25rem; border-radius:.625rem; display:flex; align-items:center; gap:.75rem; font-size:.875rem; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,.15); animation:mp-toast-in .25s ease; max-width:22rem; }
  .mp-toast.success { background:#059669; color:#fff; }
  .mp-toast.error   { background:#dc2626; color:#fff; }
  .mp-toast .material-symbols-outlined { font-size:1.125rem; flex-shrink:0; }

  @keyframes mp-spin { to{transform:rotate(360deg)} }
  .mp-spin { animation:mp-spin .8s linear infinite; display:inline-block; }

  .mp-footer-actions { display:flex; align-items:center; justify-content:flex-end; gap:.75rem; padding-top:.5rem; }
  .mp-btn-primary { padding:.6875rem 2rem; border-radius:.5rem; border:none; background:#003d7a; color:#fff; font-size:.875rem; font-weight:700; cursor:pointer; font-family:'Public Sans',sans-serif; display:flex; align-items:center; gap:.5rem; transition:background .15s,opacity .15s; box-shadow:0 4px 14px rgba(0,61,122,.25); }
  .mp-btn-primary:hover:not(:disabled) { background:#002a5c; }
  .mp-btn-primary:disabled { opacity:.6; cursor:not-allowed; }

  .mp-page-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6rem 2rem; gap:1rem; color:#94a3b8; }
  .mp-page-loading .material-symbols-outlined { font-size:2.5rem; color:#003d7a; }

  .mp-popup-overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
  .mp-popup { background:#fff; border-radius:.875rem; width:100%; max-width:56rem; height:85vh; display:flex; flex-direction:column; box-shadow:0 25px 60px rgba(0,0,0,.35); overflow:hidden; }
  .mp-popup-header { display:flex; align-items:center; justify-content:space-between; padding:.875rem 1.25rem; border-bottom:1px solid #e2e8f0; flex-shrink:0; }
  .mp-popup-title { display:flex; align-items:center; gap:.5rem; font-size:.9375rem; font-weight:700; color:#0f172a; }
  .mp-popup-title .material-symbols-outlined { color:#003d7a; font-size:1.25rem; }
  .mp-popup-close { width:2rem; height:2rem; border-radius:.375rem; border:none; background:#f1f5f9; color:#475569; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s; }
  .mp-popup-close:hover { background:#e2e8f0; }
  .mp-popup-close .material-symbols-outlined { font-size:1.125rem; }
  .mp-popup-body { flex:1; overflow:hidden; position:relative; }
  .mp-popup-body iframe { width:100%; height:100%; border:none; }
  .mp-popup-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:.75rem; color:#64748b; font-size:.875rem; }
  .mp-popup-loading .material-symbols-outlined { font-size:1.75rem; color:#003d7a; animation:mp-spin .8s linear infinite; }
  .mp-popup-no-preview { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:1rem; color:#94a3b8; }
  .mp-popup-no-preview .material-symbols-outlined { font-size:3rem; color:#cbd5e1; }
  .mp-popup-footer { padding:.75rem 1.25rem; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:.75rem; flex-shrink:0; }
  .mp-popup-dl-btn { padding:.5rem 1.25rem; border-radius:.5rem; border:none; background:#003d7a; color:#fff; font-size:.8125rem; font-weight:700; display:flex; align-items:center; gap:.375rem; cursor:pointer; font-family:'Public Sans',sans-serif; transition:background .15s; text-decoration:none; }
  .mp-popup-dl-btn:hover { background:#002a5c; }
  .mp-popup-dl-btn .material-symbols-outlined { font-size:1rem; }
`;

const formatBytes = (b) => b < 1024*1024 ? `${(b/1024).toFixed(0)} KB` : `${(b/(1024*1024)).toFixed(1)} MB`;

const cvFileName = (url) => {
  if (!url) return '';
  try {
    return new URL(url).pathname.split('/').pop();
  } catch {
    return url.split('/').pop();
  }
};

const NIVEAUX = ['Bac+2 (BTS / DUT)','Licence (Bac+3)','Master 1 (Bac+4)','Master 2 (Bac+5)','Ingénieur','Doctorat'];
const validatePhone = (val) => {
  if (!val) return null;
  if (!/^\d{8}$/.test(val)) return '8 chiffres requis (ex: 22333444)';
  return null;
};

const MonProfil = () => {
  const fileInputRef  = useRef(null);
  const photoInputRef = useRef(null);

  const [user,     setUser]     = useState({ name:'', email:'', phoneNumber:'', photoUrl:'' });
  const [userForm, setUserForm] = useState({ name:'', phoneNumber:'' });
  const [phoneEditMode, setPhoneEditMode] = useState(false);

  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [profil, setProfil] = useState({
    specialite:'', universite:'', nationalite:'', cursusActuel:'',
    niveauInstructionActuel:'', moyDerAnnee:'', moyAvantDerAnnee:'',
    typeDocumentIdentite:'CIN', numeroDocument:'',
  });
  const [cvExistant, setCvExistant] = useState('');
  const [cvFile,     setCvFile]     = useState(null);
  const [dragover,   setDragover]   = useState(false);

  const [popup,        setPopup]        = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);

  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type='success') => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data: u } = await axios.get('/api/auth/whoami');
        setUser(u);
        setUserForm({ name: u.name||'', phoneNumber: u.phoneNumber||'' });
        setPhoneEditMode(!u.phoneNumber);
        try {
          const { data: p } = await axios.get('/api/profil/me');
          setProfil({
            specialite:              p.specialite              || '',
            universite:              p.universite              || '',
            nationalite:             p.nationalite             || '',
            cursusActuel:            p.cursusActuel            || '',
            niveauInstructionActuel: p.niveauInstructionActuel || '',
            moyDerAnnee:             p.moyDerAnnee      ? String(p.moyDerAnnee)      : '',
            moyAvantDerAnnee:        p.moyAvantDerAnnee ? String(p.moyAvantDerAnnee) : '',
            typeDocumentIdentite:    p.typeDocumentIdentite    || 'CIN',
            numeroDocument:          p.numeroDocument          || '',
          });
          setCvExistant(p.cv || '');
        } catch { /* profil vide — normal */ }
      } catch {
        showToast('Impossible de charger le profil', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closePopup(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── openCv — fetch blob depuis le proxy Spring Boot → blob URL pour iframe ──
  const openCv = async () => {
    if (!cvExistant) return;
    const name  = cvFileName(cvExistant);
    const isPdf = name.toLowerCase().endsWith('.pdf');

    setPopup({ viewUrl: null, downloadUrl: '/api/files/cv/me/dl', name, isPdf });
    setPopupLoading(true);

    try {
      const res = await axios.get('/api/files/cv/me', {
        responseType: 'blob',
        withCredentials: true,
      });
      const blob    = new Blob([res.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      setPopup(prev => ({ ...prev, viewUrl: blobUrl }));
    } catch(e) {
      console.error('[openCv]', e.message);
      setPopup(prev => ({ ...prev, viewUrl: null }));
    } finally {
      setPopupLoading(false);
    }
  };

  // ── downloadCv — téléchargement via axios (envoie le cookie JWT) ──────────
  const downloadCv = async () => {
    try {
      const res = await axios.get('/api/files/cv/me/dl', {
        responseType: 'blob',
        withCredentials: true,
      });
      const blob    = new Blob([res.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      a.href        = blobUrl;
      a.download    = popup?.name || 'cv.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch(e) {
      console.error('[downloadCv]', e.message);
      showToast('Erreur téléchargement CV', 'error');
    }
  };

  const closePopup = () => {
    if (popup?.viewUrl && popup.viewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(popup.viewUrl);
    }
    setPopup(null);
    setPopupLoading(false);
  };

  const clrErr = (k) => setErrors(e => { const c={...e}; delete c[k]; return c; });
  const handleUserChange   = (e) => { const {name,value}=e.target; setUserForm(f=>({...f,[name]:value})); clrErr(name); };
  const handleProfilChange = (e) => { const {name,value}=e.target; setProfil(f=>({...f,[name]:value})); clrErr(name); };

  // ── Compression image avant upload (800px max, JPEG 82%) ────────────────
  const compressImage = (file, maxPx = 800, quality = 0.82) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxPx) {
          height = Math.round((height / width) * maxPx); width = maxPx;
        } else if (height > maxPx) {
          width = Math.round((width / height) * maxPx); height = maxPx;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg', quality
        );
      };
      img.src = URL.createObjectURL(file);
    });

  const handlePhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Format image non accepté','error'); return; }
    if (file.size > 3*1024*1024)         { showToast('Image trop lourde (max 3 MB)','error'); return; }
    // Compresser avant envoi → upload x10 plus rapide
    const compressed = await compressImage(file);
    setPhotoFile(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
  };

  const handleCvFile = (file) => {
    if (!file) return;
    const ok = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!ok.includes(file.type)) { showToast('Format non accepté. Utilisez PDF ou Word.','error'); return; }
    if (file.size > 20*1024*1024) { showToast('Fichier trop volumineux (max 20 MB)','error'); return; }
    setCvFile(file);
    setCvExistant('');
  };

  const removeCv = () => { setCvFile(null); setCvExistant(''); setPopup(null); };

  const handlePhoneChange = (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 8);
    setUserForm(f => ({ ...f, phoneNumber: d }));
    clrErr('phoneNumber');
    if (d.length === 8) debounceCheckPhone(d);
  };

  const debounceCheckPhone = useRef(
    debounce(async (phone) => {
      try {
        const res = await fetch(`/api/auth/check-phone?phone=${phone}`);
        const data = await res.json();
        if (data.exists) setErrors(prev => ({ ...prev, phoneNumber: "Ce numéro de téléphone est déjà utilisé" }));
      } catch (err) { console.error(err); }
    }, 500)
  ).current;

  const validateAll = () => {
    const errs = {};
    if (!userForm.name.trim()) errs.name = 'Champ requis';
    const phoneErr = validatePhone(userForm.phoneNumber);
    if (phoneErr) errs.phoneNumber = phoneErr;
    if (!userForm.phoneNumber || !userForm.phoneNumber.trim()) errs.phoneNumber = 'Numéro de téléphone requis';
    if (!profil.specialite.trim())       errs.specialite              = 'Champ requis';
    if (!profil.universite.trim())       errs.universite              = 'Champ requis';
    if (!profil.nationalite.trim())      errs.nationalite             = 'Champ requis';
    if (!profil.cursusActuel.trim())     errs.cursusActuel            = 'Champ requis';
    if (!profil.niveauInstructionActuel) errs.niveauInstructionActuel = 'Champ requis';
    if (!profil.numeroDocument.trim()) {
      errs.numeroDocument = 'Champ requis';
    } else {
      const num = profil.numeroDocument.trim();
      if (profil.typeDocumentIdentite==='CIN' && !/^\d{8}$/.test(num))
        errs.numeroDocument = 'Le CIN doit contenir exactement 8 chiffres';
      else if (profil.typeDocumentIdentite==='PASSEPORT' && !/^[A-Z]{2}\d{7}$/i.test(num))
        errs.numeroDocument = '2 lettres + 7 chiffres (ex: AB1234567)';
    }
    const m1=parseFloat(profil.moyDerAnnee), m2=parseFloat(profil.moyAvantDerAnnee);
    if (isNaN(m1)||m1<0||m1>20) errs.moyDerAnnee      = 'Entre 0 et 20';
    if (isNaN(m2)||m2<0||m2>20) errs.moyAvantDerAnnee = 'Entre 0 et 20';
    return errs;
  };

  const saveCompte = async () => {
    const fd = new FormData();
    fd.append('name',        userForm.name.trim());
    fd.append('phoneNumber', userForm.phoneNumber.trim());
    if (photoFile) fd.append('photo', photoFile);
    const { data } = await axios.patch('/api/auth/me', fd, { headers:{'Content-Type':'multipart/form-data'} });
    setUser(data);
    setUserForm({ name: data.name||'', phoneNumber: data.phoneNumber||'' });
    setPhotoFile(null);
    setPhoneEditMode(false);
  };

  const saveProfil = async () => {
    const fd = new FormData();
    Object.entries(profil).forEach(([k,v]) => { if (v !== '') fd.append(k, v); });
    if (cvFile) fd.append('cvFile', cvFile);
    const { data } = await axios.post('/api/profil/me', fd, { headers:{'Content-Type':'multipart/form-data'} });
    setCvExistant(data.cv || '');
    setCvFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateAll();
    if (!cvFile && !cvExistant) errs.cv = 'Veuillez joindre votre CV';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await saveCompte();
      await saveProfil();
      showToast('Candidature soumise avec succès !');
      setTimeout(() => location.reload(), 500);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la soumission', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initiales     = (user.name?.[0] || '?').toUpperCase();
  const rawPhoto      = user.photoUrl || user.photo_url || '';
  const avatarSrc     = photoPreview || rawPhoto || null;
  const hasCv         = cvFile || cvExistant;
  const cvDisplayName = cvFile ? cvFile.name : cvFileName(cvExistant);
  const cvMeta        = cvFile ? `${formatBytes(cvFile.size)} · Prêt à envoyer` : 'Téléchargé avec succès';
  const phoneValid    = phoneEditMode && /^\d{8}$/.test(userForm.phoneNumber);

  return (
    <>
      <style>{styles}</style>
      <div className="mp-root">

        {popup && (
          <div className="mp-popup-overlay" onClick={closePopup}>
            <div className="mp-popup" onClick={e => e.stopPropagation()}>
              <div className="mp-popup-header">
                <div className="mp-popup-title">
                  <span className="material-symbols-outlined">
                    {popup.isPdf ? 'picture_as_pdf' : 'description'}
                  </span>
                  {popup.name}
                </div>
                <button type="button" className="mp-popup-close" onClick={closePopup}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mp-popup-body">
                {popup.isPdf ? (
                  popupLoading ? (
                    <div className="mp-popup-loading">
                      <span className="material-symbols-outlined">progress_activity</span>
                      Chargement du document...
                    </div>
                  ) : popup.viewUrl ? (
                    <iframe src={popup.viewUrl} title={popup.name} />
                  ) : (
                    <div className="mp-popup-no-preview">
                      <span className="material-symbols-outlined">error_outline</span>
                      <p style={{fontSize:'0.875rem',color:'#64748b'}}>Impossible de charger le document.</p>
                    </div>
                  )
                ) : (
                  <div className="mp-popup-no-preview">
                    <span className="material-symbols-outlined">description</span>
                    <p style={{fontSize:'0.875rem',color:'#64748b'}}>Aperçu non disponible pour les fichiers Word.</p>
                    <button type="button" onClick={downloadCv}
                       style={{color:'#003d7a',fontWeight:700,fontSize:'0.875rem',background:'none',border:'none',cursor:'pointer',fontFamily:'Public Sans,sans-serif'}}>
                      Télécharger le fichier
                    </button>
                  </div>
                )}
              </div>

              <div className="mp-popup-footer">
                <button type="button" onClick={downloadCv} className="mp-popup-dl-btn">
                  <span className="material-symbols-outlined">download</span>
                  Télécharger
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className={`mp-toast ${toast.type}`}>
            <span className="material-symbols-outlined">{toast.type==='success'?'check_circle':'error'}</span>
            {toast.msg}
          </div>
        )}

        <main className="mp-main">
          <div className="mc-breadcrumb">
            Tableau de bord
            <span className="material-symbols-outlined">chevron_right</span>
            <span>Mon profil</span>
          </div>
          <div className="mp-page-header">
            <h1>Compléter votre profil</h1>
            <p>Veuillez finaliser votre candidature en renseignant vos informations académiques et professionnelles.</p>
          </div>

          {loading ? (
            <div className="mp-page-loading">
              <span className="material-symbols-outlined mp-spin">progress_activity</span>
              <p>Chargement...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>

              <section className="mp-section">
                <h3 className="mp-section-title">
                  <span className="material-symbols-outlined">person</span>
                  Informations Générales &amp; Identité
                </h3>

                <div className="mp-avatar-row">
                  <div className="mp-avatar-wrap">
                    {avatarSrc
                      ? <img src={avatarSrc} alt="avatar" className="mp-avatar"/>
                      : <div className="mp-avatar-placeholder"><span>{initiales}</span></div>
                    }
                    <button type="button" className="mp-avatar-edit-btn"
                      onClick={()=>photoInputRef.current?.click()} title="Changer la photo">
                      <span className="material-symbols-outlined">photo_camera</span>
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" style={{display:'none'}}
                      onChange={e=>handlePhoto(e.target.files?.[0])}/>
                  </div>
                  <div className="mp-avatar-info">
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                    <p className="mp-avatar-hint">
                      {photoFile
                        ? <><span style={{color:'#003d7a',fontWeight:600}}>{photoFile.name}</span> — cliquez Soumettre pour sauvegarder</>
                        : "Cliquez sur l'icône caméra pour changer votre photo (JPG/PNG, max 3 MB)"
                      }
                    </p>
                  </div>
                </div>

                <div className="mp-grid-2">
                  <div className="mp-field" style={{gridColumn:'1 / -1'}}>
                    <label className="mp-label">Nom complet <span className="req">*</span></label>
                    <input className={`mp-input${errors.name?' err':''}`} name="name"
                      value={userForm.name} onChange={handleUserChange} placeholder="ex: Ahmed Ben Salem"/>
                    {errors.name && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.name}</span>}
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">Email</label>
                    <input className="mp-input" value={user.email} disabled/>
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">Numéro de téléphone</label>
                    <div className="mp-tel-wrap">
                      <span className="mp-tel-prefix">+216</span>
                      <input
                        className={`mp-input mp-input-tel${phoneEditMode?' last':''}${errors.phoneNumber?' err':''}`}
                        name="phoneNumber" inputMode="numeric" maxLength={8}
                        value={userForm.phoneNumber} onChange={handlePhoneChange}
                        readOnly={!phoneEditMode}
                        placeholder={phoneEditMode?'ex: 22333444':'—'}
                        style={!phoneEditMode?{opacity:.75,cursor:'default',background:'#f1f5f9',borderRadius:'0 .5rem .5rem 0'}:{}}
                      />
                      {!phoneEditMode && (
                        <button type="button" className="mp-tel-edit-btn" onClick={()=>setPhoneEditMode(true)}>
                          <span className="material-symbols-outlined" style={{fontSize:'.875rem'}}>edit</span>Modifier
                        </button>
                      )}
                    </div>
                    {errors.phoneNumber && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.phoneNumber}</span>}
                    {phoneValid && !errors.phoneNumber && <span className="mp-tel-ok"><span className="material-symbols-outlined" style={{fontSize:'.875rem'}}>check_circle</span>Format valide</span>}
                    {phoneEditMode && <span className="mp-tel-hint">8 chiffres sans espaces ni tirets</span>}
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">Spécialité <span className="req">*</span></label>
                    <input className={`mp-input${errors.specialite?' err':''}`} name="specialite"
                      value={profil.specialite} onChange={handleProfilChange} placeholder="ex: Informatique, Finance..."/>
                    {errors.specialite && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.specialite}</span>}
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">Nationalité <span className="req">*</span></label>
                    <input className={`mp-input${errors.nationalite?' err':''}`} name="nationalite"
                      value={profil.nationalite} onChange={handleProfilChange} placeholder="ex: Tunisienne"/>
                    {errors.nationalite && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.nationalite}</span>}
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">Type de document d'identité <span className="req">*</span></label>
                    <select className="mp-select" name="typeDocumentIdentite"
                      value={profil.typeDocumentIdentite} onChange={handleProfilChange}>
                      <option value="CIN">CIN</option>
                      <option value="PASSEPORT">Passeport</option>
                    </select>
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">
                      Numéro {profil.typeDocumentIdentite==='CIN'?'CIN':'Passeport'} <span className="req">*</span>
                    </label>
                    <input className={`mp-input${errors.numeroDocument?' err':''}`} name="numeroDocument"
                      value={profil.numeroDocument} onChange={handleProfilChange}
                      placeholder={profil.typeDocumentIdentite==='CIN'?'ex: 08123456':'ex: AB1234567'}/>
                    {errors.numeroDocument && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.numeroDocument}</span>}
                  </div>
                </div>
              </section>

              <section className="mp-section">
                <h3 className="mp-section-title">
                  <span className="material-symbols-outlined">school</span>
                  Parcours Académique
                </h3>
                <div className="mp-grid-2">
                  <div className="mp-field">
                    <label className="mp-label">Université / École <span className="req">*</span></label>
                    <input className={`mp-input${errors.universite?' err':''}`} name="universite"
                      value={profil.universite} onChange={handleProfilChange} placeholder="ex: ENSI, FST, IHEC..."/>
                    {errors.universite && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.universite}</span>}
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">Formation actuelle <span className="req">*</span></label>
                    <input className={`mp-input${errors.cursusActuel?' err':''}`} name="cursusActuel"
                      value={profil.cursusActuel} onChange={handleProfilChange} placeholder="ex: Master Informatique"/>
                    {errors.cursusActuel && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.cursusActuel}</span>}
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">Niveau d'études <span className="req">*</span></label>
                    <select className={`mp-select${errors.niveauInstructionActuel?' err':''}`}
                      name="niveauInstructionActuel" value={profil.niveauInstructionActuel} onChange={handleProfilChange}>
                      <option value="">-- Sélectionner --</option>
                      {NIVEAUX.map(n=><option key={n} value={n}>{n}</option>)}
                    </select>
                    {errors.niveauInstructionActuel && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.niveauInstructionActuel}</span>}
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">Moyenne — année dernière <span className="req">*</span></label>
                    <div className="mp-input-wrap">
                      <input className={`mp-input${errors.moyDerAnnee?' err':''}`} name="moyDerAnnee"
                        type="number" min="0" max="20" step="0.01"
                        value={profil.moyDerAnnee} onChange={handleProfilChange} placeholder="0.00"/>
                      <span className="mp-input-unit">/20</span>
                    </div>
                    {errors.moyDerAnnee && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.moyDerAnnee}</span>}
                  </div>

                  <div className="mp-field">
                    <label className="mp-label">Moyenne — année précédente <span className="req">*</span></label>
                    <div className="mp-input-wrap">
                      <input className={`mp-input${errors.moyAvantDerAnnee?' err':''}`} name="moyAvantDerAnnee"
                        type="number" min="0" max="20" step="0.01"
                        value={profil.moyAvantDerAnnee} onChange={handleProfilChange} placeholder="0.00"/>
                      <span className="mp-input-unit">/20</span>
                    </div>
                    {errors.moyAvantDerAnnee && <span className="mp-field-err"><span className="material-symbols-outlined">error</span>{errors.moyAvantDerAnnee}</span>}
                  </div>
                </div>
              </section>

              <section className="mp-section">
                <h3 className="mp-section-title">
                  <span className="material-symbols-outlined">description</span>
                  Documents de Candidature
                </h3>
                <div className="mp-field">
                  <label className="mp-label">Curriculum Vitae (CV) <span className="req">*</span></label>
                  {hasCv ? (
                    <div className="mp-cv-card">
                      <div className="mp-cv-icon">
                        <span className="material-symbols-outlined">picture_as_pdf</span>
                      </div>
                      <div className="mp-cv-info">
                        <p className="mp-cv-name">{cvDisplayName}</p>
                        <p className="mp-cv-meta">
                          <span className="material-symbols-outlined">check_circle</span>
                          {cvFile ? formatBytes(cvFile.size)+' · ' : ''}{cvMeta}
                        </p>
                      </div>
                      <div className="mp-cv-actions">
                        {cvExistant && (
                          <button type="button" className="mp-cv-view-btn" onClick={openCv}>
                            <span className="material-symbols-outlined">visibility</span>Voir
                          </button>
                        )}
                        <button type="button" className="mp-cv-view-btn"
                          onClick={()=>fileInputRef.current?.click()}
                          style={{borderColor:'#64748b',color:'#64748b'}}>
                          <span className="material-symbols-outlined">upload</span>Remplacer
                        </button>
                        <button type="button" className="mp-cv-delete" onClick={removeCv} title="Supprimer">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`mp-upload-zone${dragover?' dragover':''}`}
                      onClick={()=>fileInputRef.current?.click()}
                      onDragOver={e=>{e.preventDefault();setDragover(true)}}
                      onDragLeave={()=>setDragover(false)}
                      onDrop={e=>{e.preventDefault();setDragover(false);handleCvFile(e.dataTransfer.files?.[0])}}>
                      <span className="material-symbols-outlined">upload_file</span>
                      <p>Glissez votre CV ici ou <strong style={{color:'#003d7a'}}>cliquez pour parcourir</strong></p>
                      <span>PDF ou Word · max 20 MB</span>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{display:'none'}}
                    onChange={e=>{handleCvFile(e.target.files?.[0]); e.target.value='';}}/>
                  {errors.cv && (
                    <span className="mp-field-err" style={{marginTop:'.25rem'}}>
                      <span className="material-symbols-outlined">error</span>{errors.cv}
                    </span>
                  )}
                </div>
              </section>

              <div className="mp-footer-actions">
                <button type="submit" className="mp-btn-primary" disabled={saving}>
                  {saving
                    ? <><span className="material-symbols-outlined mp-spin" style={{fontSize:'1rem'}}>progress_activity</span>Envoi en cours...</>
                    : <><span className="material-symbols-outlined" style={{fontSize:'1rem'}}>send</span>Soumettre ma candidature</>
                  }
                </button>
              </div>

            </form>
          )}
        </main>
      </div>
    </>
  );
};

export default MonProfil;