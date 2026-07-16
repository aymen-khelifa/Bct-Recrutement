import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const styles = `
  .admu-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .admu-root { font-family: 'Public Sans', sans-serif; }
  .admu-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
  body { margin: 0; padding: 0; }

  .admu-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
  .admu-title { font-size: 2.5rem; font-weight: 900; color: #001b3d; letter-spacing: -0.05em; margin-bottom: 0.375rem; }
  .admu-title-bar { width: 5rem; height: 0.375rem; background: #001b3d; border-radius: 9999px; margin-bottom: 0.75rem; }
  .admu-subtitle { font-size: 0.9375rem; color: #64748b; font-weight: 500; }
  .admu-add-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: #001b3d; color: #fff; border: none; border-radius: 0.625rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,27,61,.2); white-space: nowrap; }
  .admu-add-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .admu-add-btn .material-symbols-outlined { font-size: 1.125rem; }

  /* TOOLBAR */
  .admu-toolbar { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; margin-bottom: 1.5rem; }
  .admu-search-wrap { flex: 1; min-width: 200px; position: relative; }
  .admu-search-wrap .material-symbols-outlined { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.25rem; pointer-events: none; }
  .admu-search { width: 100%; padding: 0.75rem 1rem 0.75rem 3rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; outline: none; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .admu-search:focus { border-color: #001b3d; }
  .admu-select { padding: 0.75rem 2rem 0.75rem 0.875rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.8125rem; font-family: 'Public Sans', sans-serif; color: #0f172a; outline: none; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04); appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M1 1l5 5 5-5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; min-width: 150px; }

  /* TABLE */
  .admu-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; }
  .admu-table { width: 100%; text-align: left; border-collapse: collapse; }
  .admu-thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .admu-thead th { padding: 1rem 1.5rem; font-size: 0.625rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
  .admu-thead th.right { text-align: right; }
  .admu-tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
  .admu-tbody tr:last-child { border-bottom: none; }
  .admu-tbody tr:hover { background: #f8fafc; }
  .admu-tbody td { padding: 1rem 1.5rem; vertical-align: middle; }
  .admu-tbody td.right { text-align: right; }
  .admu-user { display: flex; align-items: center; gap: 0.75rem; }
  .admu-avatar { width: 2.25rem; height: 2.25rem; border-radius: 9999px; background: rgba(0,27,61,0.1); display: flex; align-items: center; justify-content: center; color: #001b3d; font-weight: 700; font-size: 0.6875rem; flex-shrink: 0; overflow: hidden; }
  .admu-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 9999px; }
  .admu-name { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
  .admu-email { font-size: 0.75rem; color: #94a3b8; margin-top: 0.1rem; }

  .admu-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.625rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; }
  .admu-badge.ROLE_ADMIN    { background: rgba(245,158,11,0.12); color: #b45309; }
  .admu-badge.ROLE_RH       { background: rgba(0,61,122,0.1);   color: #003d7a; }
  .admu-badge.ROLE_CANDIDAT { background: rgba(5,150,105,0.1);  color: #059669; }
  .admu-badge .material-symbols-outlined { font-size: 0.8125rem; }

  .admu-status { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 700; }
  .admu-status.on  { color: #059669; }
  .admu-status.off { color: #94a3b8; }
  .admu-status-dot { width: 0.5rem; height: 0.5rem; border-radius: 9999px; }
  .admu-status.on  .admu-status-dot { background: #10b981; }
  .admu-status.off .admu-status-dot { background: #cbd5e1; }

  .admu-act-btn { width: 2rem; height: 2rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; margin-left: 0.375rem; }
  .admu-act-btn:hover { background: #f1f5f9; }
  .admu-act-btn .material-symbols-outlined { font-size: 1rem; color: #475569; }
  .admu-act-btn.danger:hover { background: #fee2e2; border-color: #fca5a5; }
  .admu-act-btn.danger:hover .material-symbols-outlined { color: #dc2626; }

  .admu-empty { text-align: center; padding: 4rem 2rem; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .admu-empty .material-symbols-outlined { font-size: 3rem; color: #cbd5e1; }
  @keyframes admu-spin { to { transform: rotate(360deg); } }
  .admu-spin { animation: admu-spin 0.8s linear infinite; color: #001b3d; }
  .admu-loading { display: flex; align-items: center; justify-content: center; padding: 4rem; gap: 0.75rem; color: #64748b; font-weight: 600; }

  /* MODAL AJOUT RH */
  .admu-overlay { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .admu-overlay-bg { position: absolute; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); }
  .admu-modal { position: relative; background: #fff; border-radius: 1rem; width: 100%; max-width: 30rem; box-shadow: 0 25px 60px rgba(0,0,0,.3); overflow: hidden; }
  .admu-modal-header { background: linear-gradient(135deg, #001b3d, #003d7a); padding: 1.5rem 2rem; position: relative; }
  .admu-modal-title { font-size: 1.0625rem; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: -0.01em; }
  .admu-modal-sub { font-size: 0.8125rem; color: rgba(255,255,255,.7); margin-top: 0.25rem; }
  .admu-modal-close { position: absolute; top: 1.25rem; right: 1.5rem; width: 2rem; height: 2rem; border-radius: 0.5rem; border: none; background: rgba(255,255,255,.15); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .admu-modal-close:hover { background: rgba(255,255,255,.25); }
  .admu-modal-body { padding: 1.75rem 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .admu-field label { display: block; font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 0.5rem; }
  .admu-input-wrap { position: relative; }
  .admu-input-wrap .material-symbols-outlined { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.125rem; }
  .admu-input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.875rem; border: 1px solid #e2e8f0; border-radius: 0.625rem; background: #f8fafc; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; outline: none; transition: all 0.15s; }
  .admu-input:focus { border-color: #001b3d; box-shadow: 0 0 0 2px rgba(0,27,61,.12); }
  .admu-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 480px) { .admu-grid2 { grid-template-columns: 1fr; } }
  .admu-info-box { background: rgba(0,27,61,0.04); border-left: 4px solid #001b3d; border-radius: 0.5rem; padding: 0.875rem 1rem; display: flex; gap: 0.75rem; }
  .admu-info-box .material-symbols-outlined { color: #001b3d; font-size: 1.125rem; flex-shrink: 0; }
  .admu-info-box p { font-size: 0.75rem; color: #475569; line-height: 1.55; }
  .admu-modal-footer { padding: 1.25rem 2rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.75rem; }
  .admu-btn-cancel { padding: 0.625rem 1.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .admu-btn-save { padding: 0.625rem 1.5rem; background: #001b3d; color: #fff; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans', sans-serif; display: flex; align-items: center; gap: 0.5rem; transition: opacity 0.15s; }
  .admu-btn-save:hover:not(:disabled) { opacity: 0.88; }
  .admu-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

  @keyframes admu-toast-in { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
  .admu-toast { position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; background: #0f172a; color: #fff; padding: 1rem 1.5rem; border-radius: 0.75rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 600; font-family: 'Public Sans', sans-serif; box-shadow: 0 20px 25px -5px rgba(0,0,0,.3); animation: admu-toast-in 0.3s ease; }
  .admu-toast .material-symbols-outlined { font-size: 1.25rem; }
  .admu-toast.success .material-symbols-outlined { color: #22c55e; }
  .admu-toast.error   .material-symbols-outlined { color: #ef4444; }
`;

const ROLE_LABELS = {
  ROLE_ADMIN:    { label: 'Admin',    icon: 'admin_panel_settings' },
  ROLE_RH:       { label: 'RH',       icon: 'badge' },
  ROLE_CANDIDAT: { label: 'Candidat', icon: 'school' },
};
const getInit = (name='') => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric'}) : '—';

const AdminUtilisateurs = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [toast,   setToast]   = useState(null);

  // Modal ajout RH
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' });
  const [saving, setSaving] = useState(false);

  const showToast = (msg, type='success') => {
    setToast({msg, type}); setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/admin/users');
      setUsers(data);
    } catch {
      showToast('Erreur de chargement des utilisateurs', 'error');
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);

  // Ouverture auto du modal si ?nouveau=1 (depuis le dashboard)
  useEffect(() => {
    if (searchParams.get('nouveau') === '1') {
      setModalOpen(true);
      searchParams.delete('nouveau');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openModal = () => {
    setForm({ name:'', email:'', password:'', confirm:'' });
    setModalOpen(true);
  };
  const closeModal = () => { if (!saving) setModalOpen(false); };

  const submitRh = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      showToast('Tous les champs sont obligatoires', 'error'); return;
    }
    if (form.password.length < 8) {
      showToast('Le mot de passe doit faire au moins 8 caractères', 'error'); return;
    }
    if (form.password !== form.confirm) {
      showToast('Les mots de passe ne correspondent pas', 'error'); return;
    }
    setSaving(true);
    try {
      await axios.post('/api/admin/users/rh', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      showToast('Compte RH créé avec succès');
      setModalOpen(false);
      fetchUsers();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally { setSaving(false); }
  };

  const toggleUser = async (u) => {
    try {
      await axios.patch(`/api/admin/users/${u.id}/toggle`);
      showToast(u.enabled ? 'Compte désactivé' : 'Compte activé');
      fetchUsers();
    } catch {
      showToast('Erreur lors de la modification', 'error');
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Supprimer définitivement ${u.name} ?`)) return;
    try {
      await axios.delete(`/api/admin/users/${u.id}`);
      showToast('Utilisateur supprimé');
      fetchUsers();
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      <style>{styles}</style>
      <div className="admu-root">

        {toast && (
          <div className={`admu-toast ${toast.type}`}>
            <span className="material-symbols-outlined">{toast.type==='success'?'check_circle':'error'}</span>
            {toast.msg}
          </div>
        )}

        {/* ── MODAL AJOUT RH ── */}
        {modalOpen && (
          <div className="admu-overlay">
            <div className="admu-overlay-bg" onClick={closeModal}/>
            <div className="admu-modal">
              <div className="admu-modal-header">
                <p className="admu-modal-title">Créer un compte RH</p>
                <p className="admu-modal-sub">Nouveau membre de l'équipe de recrutement</p>
                <button className="admu-modal-close" onClick={closeModal}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="admu-modal-body">
                <div className="admu-field">
                  <label>Nom complet</label>
                  <div className="admu-input-wrap">
                    <span className="material-symbols-outlined">person</span>
                    <input className="admu-input" placeholder="ex: Jean Dupont"
                      value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                  </div>
                </div>
                <div className="admu-field">
                  <label>Email professionnel</label>
                  <div className="admu-input-wrap">
                    <span className="material-symbols-outlined">mail</span>
                    <input className="admu-input" type="email" placeholder="jean.dupont@bct.tn"
                      value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                  </div>
                </div>
                <div className="admu-grid2">
                  <div className="admu-field">
                    <label>Mot de passe</label>
                    <div className="admu-input-wrap">
                      <span className="material-symbols-outlined">lock</span>
                      <input className="admu-input" type="password" placeholder="••••••••"
                        value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="admu-field">
                    <label>Confirmation</label>
                    <div className="admu-input-wrap">
                      <span className="material-symbols-outlined">verified_user</span>
                      <input className="admu-input" type="password" placeholder="••••••••"
                        value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))}/>
                    </div>
                  </div>
                </div>
                <div className="admu-info-box">
                  <span className="material-symbols-outlined">info</span>
                  <p>Ce compte aura accès au module de gestion des candidats et des entretiens. Il sera actif immédiatement.</p>
                </div>
              </div>
              <div className="admu-modal-footer">
                <button className="admu-btn-cancel" onClick={closeModal} disabled={saving}>Annuler</button>
                <button className="admu-btn-save" onClick={submitRh} disabled={saving}>
                  {saving
                    ? <><span className="material-symbols-outlined admu-spin" style={{color:'#fff'}}>progress_activity</span>Création...</>
                    : <><span className="material-symbols-outlined">how_to_reg</span>Créer le compte</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="admu-head">
          <div>
            <h2 className="admu-title">Utilisateurs</h2>
            <div className="admu-title-bar"/>
            <p className="admu-subtitle">Gérez les comptes administrateurs, RH et candidats.</p>
          </div>
          <button className="admu-add-btn" onClick={openModal}>
            <span className="material-symbols-outlined">person_add</span>
            Ajouter un compte RH
          </button>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="admu-toolbar">
          <div className="admu-search-wrap">
            <span className="material-symbols-outlined">search</span>
            <input className="admu-search" placeholder="Rechercher un nom, un email..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="admu-select" value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
            <option value="">Tous les rôles</option>
            <option value="ROLE_ADMIN">Admin</option>
            <option value="ROLE_RH">RH</option>
            <option value="ROLE_CANDIDAT">Candidat</option>
          </select>
          <button className="admu-add-btn" style={{background:'#fff',color:'#001b3d',border:'1px solid #e2e8f0',boxShadow:'none'}} onClick={fetchUsers}>
            <span className="material-symbols-outlined">refresh</span>
            Actualiser
          </button>
        </div>

        {/* ── TABLE ── */}
        {loading ? (
          <div className="admu-loading"><span className="material-symbols-outlined admu-spin">progress_activity</span>Chargement...</div>
        ) : (
          <div className="admu-table-wrap">
            <table className="admu-table">
              <thead className="admu-thead">
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody className="admu-tbody">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="admu-empty">
                      <span className="material-symbols-outlined">group_off</span>
                      <p>Aucun utilisateur trouvé</p>
                    </div>
                  </td></tr>
                ) : filtered.map(u => {
                  const r = ROLE_LABELS[u.role] || { label: u.role, icon: 'person' };
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="admu-user">
                          <div className="admu-avatar">
                            {u.photoUrl ? <img src={u.photoUrl} alt=""/> : getInit(u.name)}
                          </div>
                          <div>
                            <p className="admu-name">{u.name || '—'}</p>
                            <p className="admu-email">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admu-badge ${u.role}`}>
                          <span className="material-symbols-outlined">{r.icon}</span>{r.label}
                        </span>
                      </td>
                      <td>
                        <span className={`admu-status ${u.enabled ? 'on' : 'off'}`}>
                          <span className="admu-status-dot"/>{u.enabled ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td><span style={{fontSize:'0.8125rem',color:'#475569'}}>{fmtDate(u.createdAt)}</span></td>
                      <td className="right">
                        <button
  className="admu-act-btn"
  title={u.enabled ? "Désactiver" : "Activer"}
  onClick={() => toggleUser(u)}
>
  <span
    className="material-symbols-outlined"
    style={{ color: u.enabled ? "green" : "red" }}
  >
    {u.enabled ? "toggle_on" : "toggle_off"}
  </span>
</button>
                        <button className="admu-act-btn danger" title="Supprimer" onClick={() => deleteUser(u)}>
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminUtilisateurs;