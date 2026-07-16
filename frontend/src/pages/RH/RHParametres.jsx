import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const styles = `
  .rhp-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .rhp-root { font-family: 'Public Sans', sans-serif; color: #0f172a; }
  .rhp-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
body {
  margin: 0;
  padding: 0;
}
  /* ── TITRE ── */
  .rhp-title { font-size: 2.5rem; font-weight: 900; color: #003d7a; letter-spacing: -0.05em; margin-bottom: 0.5rem; text-transform: uppercase; }
  .rhp-subtitle { font-size: 0.9375rem; color: #64748b; font-weight: 500; margin-bottom: 2rem; }

  /* ── GRID ── */
  .rhp-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
  @media (max-width: 900px) { .rhp-grid { grid-template-columns: 1fr; } }

  /* ── CARDS ── */
  .rhp-card { background: #fff; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; }
  .rhp-card-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; background: #f8fafc; display: flex; align-items: center; gap: 0.625rem; }
  .rhp-card-header h3 { font-size: 1rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; }
  .rhp-card-header .material-symbols-outlined { color: #003d7a; font-size: 1.25rem; }
  .rhp-card-body { padding: 1.5rem; }

  /* ── PROFIL CARD (gauche) ── */
  .rhp-profile-card { display: flex; flex-direction: column; gap: 1.5rem; }
  .rhp-avatar-section { display: flex; flex-direction: column; align-items: center; padding: 2rem 1.5rem; text-align: center; }
  .rhp-avatar-wrap { position: relative; margin-bottom: 1.25rem; }
  .rhp-avatar { width: 8rem; height: 8rem; border-radius: 9999px; object-fit: cover; border: 4px solid #e2e8f0; display: block; background: #f1f5f9; }
  .rhp-avatar-placeholder { width: 8rem; height: 8rem; border-radius: 9999px; border: 4px solid #e2e8f0; background: rgba(0,61,122,0.08); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 800; color: #003d7a; }
  .rhp-avatar-btn { position: absolute; bottom: 4px; right: 4px; width: 2.25rem; height: 2.25rem; border-radius: 9999px; background: #003d7a; color: #fff; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,61,122,0.25); transition: opacity 0.15s; }
  .rhp-avatar-btn:hover { opacity: 0.9; }
  .rhp-avatar-btn .material-symbols-outlined { font-size: 1rem; }
  .rhp-name { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; }
  .rhp-role { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 1rem; }
  .rhp-status { padding: 0.25rem 0.875rem; background: #f0fdf4; color: #059669; font-size: 0.625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 0.375rem; }

  /* Quick stats */
  .rhp-quick-stats { padding: 1.25rem 1.5rem; border-top: 1px solid #f1f5f9; }
  .rhp-quick-stats h4 { font-size: 0.625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #f1f5f9; }
  .rhp-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; }
  .rhp-stat-row:not(:last-child) { border-bottom: 1px solid #f8fafc; }
  .rhp-stat-label { font-size: 0.875rem; color: #64748b; }
  .rhp-stat-val { font-size: 0.875rem; font-weight: 700; color: #0f172a; }

  /* ── FORM ── */
  .rhp-section { display: flex; flex-direction: column; gap: 1.5rem; }
  .rhp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
  @media (max-width: 600px) { .rhp-form-grid { grid-template-columns: 1fr; } }
  .rhp-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .rhp-field label { font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
  .rhp-input, .rhp-select { width: 100%; padding: 0.75rem 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; font-family: 'Public Sans', sans-serif; color: #0f172a; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
  .rhp-input:focus, .rhp-select:focus { border-color: #003d7a; box-shadow: 0 0 0 2px rgba(0,61,122,0.1); }
  .rhp-input::placeholder { color: #94a3b8; }

  /* Password wrap */
  .rhp-pw-wrap { position: relative; display: flex; align-items: center; }
  .rhp-pw-wrap .rhp-input { padding-right: 2.75rem; }
  .rhp-pw-eye { position: absolute; right: 0.75rem; background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; transition: color 0.15s; padding: 0; }
  .rhp-pw-eye:hover { color: #475569; }
  .rhp-pw-eye .material-symbols-outlined { font-size: 1.125rem; }

  /* 2FA toggle */
  .rhp-2fa { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.625rem; }
  .rhp-2fa-left { display: flex; align-items: center; gap: 0.875rem; }
  .rhp-2fa-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: rgba(0,61,122,0.08); display: flex; align-items: center; justify-content: center; }
  .rhp-2fa-icon .material-symbols-outlined { color: #003d7a; font-size: 1.25rem; }
  .rhp-2fa-title { font-size: 0.875rem; font-weight: 700; color: #0f172a; }
  .rhp-2fa-desc { font-size: 0.75rem; color: #64748b; margin-top: 0.1rem; }
  .rhp-toggle { position: relative; width: 2.75rem; height: 1.5rem; flex-shrink: 0; }
  .rhp-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .rhp-toggle-track { position: absolute; inset: 0; background: #e2e8f0; border-radius: 9999px; cursor: pointer; transition: background 0.2s; }
  .rhp-toggle input:checked + .rhp-toggle-track { background: #003d7a; }
  .rhp-toggle-thumb { position: absolute; top: 2px; left: 2px; width: 1.25rem; height: 1.25rem; background: #fff; border-radius: 9999px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); pointer-events: none; }
  .rhp-toggle input:checked ~ .rhp-toggle-thumb { transform: translateX(1.25rem); }

  /* Footer actions */
  .rhp-footer-note { display: flex; align-items: center; gap: 0.5rem; padding: 0.875rem 1.25rem; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 0.6875rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; }
  .rhp-footer-note .material-symbols-outlined { font-size: 1rem; }
  .rhp-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.875rem; padding-top: 0.5rem; }
  .rhp-btn-cancel { padding: 0.625rem 1.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #fff; font-size: 0.875rem; font-weight: 700; color: #64748b; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; }
  .rhp-btn-cancel:hover { background: #f8fafc; }
  .rhp-btn-save { padding: 0.625rem 2rem; border: none; border-radius: 0.5rem; background: #003d7a; color: #fff; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; box-shadow: 0 4px 12px rgba(0,61,122,0.2); transition: opacity 0.15s; }
  .rhp-btn-save:hover { opacity: 0.9; }
  .rhp-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Toast */
  @keyframes rhp-toast { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
  .rhp-toast { position: fixed; bottom: 2rem; right: 2rem; z-index: 999; background: #0f172a; color: #fff; padding: 1rem 1.5rem; border-radius: 0.75rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 600; font-family: 'Public Sans', sans-serif; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); animation: rhp-toast 0.3s ease; }
  .rhp-toast .material-symbols-outlined { font-size: 1.25rem; }
  .rhp-toast.success .material-symbols-outlined { color: #22c55e; }
  .rhp-toast.error   .material-symbols-outlined { color: #ef4444; }

  /* Loading spinner */
  @keyframes rhp-spin { to { transform: rotate(360deg); } }
  .rhp-spin { animation: rhp-spin 0.8s linear infinite; display: inline-block; }
`;

const RHParametres = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name:        '',
    email:       '',
    phoneNumber: '',
  });
  const [newPassword,    setNewPassword]    = useState('');
  const [confirmPwd,     setConfirmPwd]     = useState('');
 
  const [saving,         setSaving]         = useState(false);
  const [photoPreview,   setPhotoPreview]   = useState(null);
  const [photoFile,      setPhotoFile]      = useState(null);
  const [toast,          setToast]          = useState(null);
  const fileRef = useRef();

  // Charger les données utilisateur
  useEffect(() => {
    if (user) {
      setForm({
        name:        user.name        || '',
        email:       user.email       || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user]);

  const handleChange = (e) =>
    setForm(p => ({ ...p, [e.target.id]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPwd) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name',        form.name);
      fd.append('phoneNumber', form.phoneNumber);
      if (photoFile) fd.append('photo', photoFile);
      await axios.patch('/api/auth/me', fd);
      showToast('Profil mis à jour avec succès');
      setTimeout(() => location.reload(),500);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initiales = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
const avatarSrc = photoPreview || user?.photoUrl || null;


  return (
    <>
      <style>{styles}</style>
      <div className="rhp-root">

        {/* Toast */}
        {toast && (
          <div className={`rhp-toast ${toast.type}`}>
            <span className="material-symbols-outlined">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {toast.msg}
          </div>
        )}

        {/* Titre */}
        <h1 className="rhp-title">Profile Settings</h1>
        <p className="rhp-subtitle">Manage your recruitment account at Central Bank.</p>

        <form onSubmit={handleSubmit}>
          <div className="rhp-grid">

            {/* ── Colonne gauche : carte profil ── */}
            <div className="rhp-profile-card">

              {/* Avatar + nom */}
              <div className="rhp-card">
                <div className="rhp-avatar-section">
                  <div className="rhp-avatar-wrap">
                    {avatarSrc
                      ? <img src={avatarSrc} alt="Avatar" className="rhp-avatar"/>
                      : <div className="rhp-avatar-placeholder">{initiales(form.name)}</div>
                    }
                    <button type="button" className="rhp-avatar-btn"
                      onClick={() => fileRef.current.click()}>
                      <span className="material-symbols-outlined">photo_camera</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*"
                      style={{ display: 'none' }} onChange={handlePhotoChange}/>
                  </div>
                  <p className="rhp-name">{form.name || '—'}</p>
                  <p className="rhp-role">Responsable RH</p>
                  <span className="rhp-status">Actif</span>
                </div>

                {/* Quick stats */}
                <div className="rhp-quick-stats">
                  <h4>Quick Stats</h4>
                  <div className="rhp-stat-row">
                    <span className="rhp-stat-label">Email</span>
                    <span className="rhp-stat-val">{form.email || '—'}</span>
                  </div>
                  <div className="rhp-stat-row">
                    <span className="rhp-stat-label">Téléphone</span>
                    <span className="rhp-stat-val">{form.phoneNumber || '—'}</span>
                  </div>
                  <div className="rhp-stat-row">
                    <span className="rhp-stat-label">Rôle</span>
                    <span className="rhp-stat-val">RH</span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── Colonne droite : formulaires ── */}
            <div className="rhp-section">

              {/* Informations générales */}
              <div className="rhp-card">
                <div className="rhp-card-header">
                  <h3>
                    <span className="material-symbols-outlined">person</span>
                    General Information
                  </h3>
                </div>
                <div className="rhp-card-body">
                  <div className="rhp-form-grid">
                    <div className="rhp-field">
                      <label htmlFor="name">Full Name</label>
                      <input className="rhp-input" id="name" type="text"
                        placeholder="Nom complet"
                        value={form.name} onChange={handleChange}/>
                    </div>
                    <div className="rhp-field">
                      <label htmlFor="phoneNumber">Phone Number</label>
                      <input className="rhp-input" id="phoneNumber" type="tel"
                        placeholder="+216 XX XXX XXX"
                        value={form.phoneNumber} onChange={handleChange}/>
                    </div>
                    <div className="rhp-field">
                      <label htmlFor="email">Email Address</label>
                      <input className="rhp-input" id="email" type="email"
                        value={form.email} disabled
                        style={{ background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }}/>
                    </div>
                    <div className="rhp-field">
                      <label>Department</label>
                      <select className="rhp-select">
                        <option>Responsable RH</option>
                        <option>Talent Acquisition</option>
                        <option>Employee Relations</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="rhp-footer-note">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  Fields marked as synced with institutional LDAP
                </div>
              </div>

          

              {/* Actions */}
              <div className="rhp-actions">
                <button type="button" className="rhp-btn-cancel"
                  onClick={() => {
                    setNewPassword(''); setConfirmPwd('');
                    setPhotoPreview(null); setPhotoFile(null);
                  }}>
                  Cancel
                </button>
                <button type="submit" className="rhp-btn-save" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined rhp-spin"
                        style={{ fontSize: '1rem', marginRight: '0.375rem' }}>
                        progress_activity
                      </span>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>

            </div>
          </div>
        </form>

      </div>
    </>
  );
};

export default RHParametres;