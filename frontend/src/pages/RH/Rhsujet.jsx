import { useState, useEffect } from 'react';
import axios from 'axios';
import RHNouveauSujet from './Rhnouveausujet';
import RHModifierSujet from './Rhmodifiersujet';
import RHQuizEditor from './Rhquizgestion';
import RHCandidaturesSujet from './RHCandidaturesSujet';

const styles = `
  .rhs-root * { box-sizing: border-box; }
  .rhs-root { font-family: 'Public Sans', sans-serif; }
  .rhs-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; font-size: 22px; vertical-align: middle; }
body {
  margin: 0;
  padding: 0;
}
  .rhs-title { font-size: 2.5rem; font-weight: 900; color: #003d7a; letter-spacing: -0.05em; margin-bottom: 1rem; }
  .rhs-title-bar { width: 5rem; height: 0.375rem; background: #003d7a; border-radius: 9999px; margin-bottom: 1.5rem; }

  .rhs-toolbar { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2.5rem; }
  @media (min-width: 768px) { .rhs-toolbar { flex-direction: row; } }
  .rhs-search-wrap { flex: 1; position: relative; }
  .rhs-search-wrap .material-symbols-outlined { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.375rem; pointer-events: none; }
  .rhs-search { width: 100%; padding: 0.875rem 1rem 0.875rem 3rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhs-search:focus { border-color: #003d7a; box-shadow: 0 0 0 3px rgba(0,61,122,0.1); }
  .rhs-search::placeholder { color: #94a3b8; }
  .rhs-toolbar-btns { display: flex; gap: 0.75rem; }
  .rhs-filter-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.875rem 1.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; font-family: 'Public Sans', sans-serif; white-space: nowrap; transition: background 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .rhs-filter-btn:hover { background: #f8fafc; }
  .rhs-filter-btn .material-symbols-outlined { font-size: 1.125rem; }
  .rhs-new-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.875rem 1.5rem; border: none; border-radius: 0.75rem; background: linear-gradient(135deg, #003d7a 0%, #0056b3 100%); color: #fff; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; font-family: 'Public Sans', sans-serif; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,61,122,0.2); transition: opacity 0.15s; }
  .rhs-new-btn:hover { opacity: 0.9; }
  .rhs-new-btn .material-symbols-outlined { font-size: 1.125rem; }

  .rhs-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
  @media (min-width: 1024px) { .rhs-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1600px) { .rhs-grid { grid-template-columns: repeat(3, 1fr); } }

  .rhs-create-card { background: rgba(255,255,255,0.4); border-radius: 1rem; border: 2px dashed #cbd5e1; min-height: 25rem; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; padding: 2rem; gap: 1rem; font-family: 'Public Sans', sans-serif; width: 100%; }
  .rhs-create-card:hover { border-color: rgba(0,61,122,0.5); background: #fff; }
  .rhs-create-icon { width: 4rem; height: 4rem; border-radius: 9999px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; transition: all 0.3s; }
  .rhs-create-icon .material-symbols-outlined { font-size: 1.875rem; }
  .rhs-create-card:hover .rhs-create-icon { background: rgba(0,61,122,0.1); color: #003d7a; }
  .rhs-create-label { font-size: 0.875rem; font-weight: 700; color: #64748b; letter-spacing: 0.025em; transition: color 0.3s; }
  .rhs-create-card:hover .rhs-create-label { color: #003d7a; }

  .rhs-card { background: #fff; border-radius: 1rem; border: 1px solid #f1f5f9; box-shadow: 0 10px 25px -5px rgba(0,61,122,0.08), 0 8px 10px -6px rgba(0,61,122,0.05); display: flex; flex-direction: column; overflow: hidden; transition: transform 0.3s, box-shadow 0.3s; }
  .rhs-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,61,122,0.1), 0 10px 10px -5px rgba(0,61,122,0.04); }
  .rhs-card-body { padding: 2rem; display: flex; flex-direction: column; flex: 1; }
  .rhs-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
  .rhs-badge-publie { padding: 0.25rem 0.75rem; background: #ecfdf5; color: #059669; font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 9999px; }
  .rhs-badge-archive { padding: 0.25rem 0.75rem; background: #f1f5f9; color: #64748b; font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 9999px; }
  .rhs-badge-empty { height: 1.5rem; }
  .rhs-ref { font-size: 0.625rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.1em; }
  .rhs-card-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem; line-height: 1.3; }
  .rhs-card-desc { font-size: 0.875rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.6; font-weight: 400; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .rhs-card-stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .rhs-stat-chip { display: flex; align-items: center; gap: 0.375rem; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 0.5rem; padding: 0.375rem 0.625rem; font-size: 0.6875rem; font-weight: 700; color: #475569; }
  .rhs-stat-chip .material-symbols-outlined { font-size: 0.875rem; color: #003d7a; }
  .rhs-card-meta { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; flex: 1; }
  .rhs-meta-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; }
  .rhs-meta-item .material-symbols-outlined { color: rgba(0,61,122,0.6); font-size: 1.375rem; }

  /* Footer avec les boutons */
  .rhs-card-footer { display: flex; align-items: center; gap: 0.5rem; padding-top: 1.5rem; border-top: 1px solid #f8fafc; flex-wrap: wrap; }
  .rhs-btn-candidats { flex: 1; min-width: 120px; background: linear-gradient(135deg, #003d7a 0%, #0056b3 100%); color: #fff; border: none; border-radius: 0.75rem; padding: 0.875rem 1rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; font-family: 'Public Sans', sans-serif; box-shadow: 0 4px 6px -1px rgba(0,61,122,0.15); transition: opacity 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.375rem; }
  .rhs-btn-candidats:hover { opacity: 0.9; }
  .rhs-btn-candidats .material-symbols-outlined { font-size: 1rem; }

  /* Bouton Voir Quiz */
  .rhs-btn-quiz { flex: 1; min-width: 120px; background: linear-gradient(135deg, #0e7490 0%, #0891b2 100%); color: #fff; border: none; border-radius: 0.75rem; padding: 0.875rem 1rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; font-family: 'Public Sans', sans-serif; box-shadow: 0 4px 6px -1px rgba(14,116,144,0.2); transition: opacity 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.375rem; }
  .rhs-btn-quiz:hover { opacity: 0.9; }
  .rhs-btn-quiz .material-symbols-outlined { font-size: 1rem; }

  .rhs-btn-edit { padding: 0.875rem; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 0.75rem; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; line-height: 1; }
  .rhs-btn-edit:hover { background: #f1f5f9; }
  .rhs-btn-edit .material-symbols-outlined { font-size: 1.125rem; display: block; }
  .rhs-btn-publish { padding: 0.875rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.75rem; color: #16a34a; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; line-height: 1; }
  .rhs-btn-publish:hover { background: #dcfce7; }
  .rhs-btn-publish .material-symbols-outlined { font-size: 1.125rem; display: block; }
  .rhs-btn-modifier { padding: 0.875rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 0.75rem; color: #b45309; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; line-height: 1; }
  .rhs-btn-modifier:hover { background: #fef3c7; }
  .rhs-btn-modifier .material-symbols-outlined { font-size: 1.125rem; display: block; }
  .rhs-btn-delete { padding: 0.875rem; background: #fff5f5; border: 1px solid #fee2e2; border-radius: 0.75rem; color: #ef4444; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; line-height: 1; }
  .rhs-btn-delete:hover { background: #fee2e2; }
  .rhs-btn-delete .material-symbols-outlined { font-size: 1.125rem; display: block; }

  @keyframes rhs-spin { to { transform: rotate(360deg); } }
  .rhs-loading { display: flex; align-items: center; justify-content: center; padding: 5rem; gap: 0.75rem; color: #64748b; font-size: 0.875rem; font-weight: 600; }
  .rhs-spin { animation: rhs-spin 0.8s linear infinite; color: #003d7a; }

  .rhs-error { background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; padding: 1rem 1.5rem; border-radius: 0.75rem; margin-bottom: 1.5rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }

  .rhs-empty { text-align: center; padding: 4rem 2rem; color: #94a3b8; }
  .rhs-empty .material-symbols-outlined { font-size: 3rem; display: block; margin-bottom: 1rem; color: #cbd5e1; }
  .rhs-empty p { font-size: 0.875rem; font-weight: 600; }

  .rhs-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px); }
  .rhs-modal { background: #fff; border-radius: 0.75rem; padding: 2rem; max-width: 24rem; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
  .rhs-modal h3 { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
  .rhs-modal p { font-size: 0.875rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.6; }
  .rhs-modal-btns { display: flex; gap: 0.75rem; justify-content: flex-end; }
  .rhs-modal-cancel { padding: 0.625rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .rhs-modal-confirm { padding: 0.625rem 1.25rem; background: #ef4444; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; color: #fff; cursor: pointer; font-family: 'Public Sans', sans-serif; }
  .rhs-modal-confirm:hover { opacity: 0.9; }

  .rhs-pagination { margin-top: 4rem; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 2.5rem; padding-bottom: 5rem; }
  .rhs-pagination-info { font-size: 0.6875rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
  .rhs-pagination-btns { display: flex; gap: 0.75rem; }
  .rhs-page-btn { padding: 0.75rem 1.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
  .rhs-page-btn:hover:not(:disabled) { background: #f8fafc; }
  .rhs-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  @keyframes rhs-toast-in { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
  .rhs-toast { position: fixed; bottom: 2rem; right: 2rem; z-index: 999; background: #0f172a; color: #fff; padding: 1rem 1.5rem; border-radius: 0.75rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 600; font-family: 'Public Sans', sans-serif; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); animation: rhs-toast-in 0.3s ease; }
  .rhs-toast .material-symbols-outlined { font-size: 1.25rem; }
  .rhs-toast.success .material-symbols-outlined { color: #22c55e; }
  .rhs-toast.error   .material-symbols-outlined { color: #ef4444; }
`;

const RHSujets = () => {
  const [sujets, setSujets]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editSujet, setEditSujet]   = useState(null);
  const [quizSujet, setQuizSujet]   = useState(null); // ← sujet dont on veut voir le quiz
  const [toast, setToast]           = useState(null);
  const [confirmId, setConfirmId]   = useState(null);
const [candidatsSujet, setCandidatsSujet] = useState(null);

  // ── GET /api/sujets/all ──────────────────────────────────────────────────
  const fetchSujets = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/sujets/all');
      setSujets(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des sujets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSujets(); }, []);

  // ── DELETE ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await axios.delete(`/api/sujets/${confirmId}`);
      setSujets(prev => prev.filter(s => s.id !== confirmId));
      showToast('Sujet supprimé avec succès', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la suppression.', 'error');
    } finally {
      setConfirmId(null);
    }
  };

  // ── ARCHIVER ─────────────────────────────────────────────────────────────
  const handleArchiver = async (id) => {
    try {
      const { data } = await axios.patch(`/api/sujets/${id}/archiver`);
      setSujets(prev => prev.map(s => s.id === id ? data : s));
      showToast('Sujet archivé', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || "Erreur lors de l'archivage.", 'error');
    }
  };

  // ── PUBLIER ──────────────────────────────────────────────────────────────
  const handlePublier = async (id) => {
    try {
      const { data } = await axios.patch(`/api/sujets/${id}/publier`);
      setSujets(prev => prev.map(s => s.id === id ? data : s));
      showToast('Sujet publié avec succès', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la publication.', 'error');
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = sujets.filter(s =>
    s.titre?.toLowerCase().includes(search.toLowerCase()) ||
    s.departement?.toLowerCase().includes(search.toLowerCase()) ||
    s.codeSujet?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSuccess = () => {
    setShowForm(false);
    showToast('Sujet créé avec succès !', 'success');
    fetchSujets();
  };

  const handleModifierSuccess = () => {
    setEditSujet(null);
    showToast('Sujet modifié avec succès !', 'success');
    fetchSujets();
  };

  // ── Vues déléguées ───────────────────────────────────────────────────────
  if (showForm) {
    return <RHNouveauSujet onCancel={() => setShowForm(false)} onSuccess={handleSuccess} />;
  }

  if (editSujet) {
    return <RHModifierSujet sujet={editSujet} onCancel={() => setEditSujet(null)} onSuccess={handleModifierSuccess} />;
  }

  // ── Vue Quiz Editor pour un sujet précis ─────────────────────────────────
  if (quizSujet) {
  return (
    <RHQuizEditor
      sujet={quizSujet}   // ← objet complet au lieu de sujetId + sujetTitre
      onBack={() => setQuizSujet(null)}
    />
  );
}
if (candidatsSujet) {
  return <RHCandidaturesSujet sujet={candidatsSujet} onBack={() => setCandidatsSujet(null)} />;
}
  // ── Vue liste ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="rhs-root">

        {toast && (
          <div className={`rhs-toast ${toast.type}`}>
            <span className="material-symbols-outlined">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {toast.msg}
          </div>
        )}

        {confirmId && (
          <div className="rhs-overlay">
            <div className="rhs-modal">
              <h3>Confirmer la suppression</h3>
              <p>Cette action est irréversible. Le sujet sera définitivement supprimé.</p>
              <div className="rhs-modal-btns">
                <button className="rhs-modal-cancel" onClick={() => setConfirmId(null)}>Annuler</button>
                <button className="rhs-modal-confirm" onClick={handleDelete}>Supprimer</button>
              </div>
            </div>
          </div>
        )}

        <h2 className="rhs-title">Sujets de Stage</h2>
        <div className="rhs-title-bar" />

        {/* Toolbar */}
        <div className="rhs-toolbar">
          <div className="rhs-search-wrap">
            <span className="material-symbols-outlined">search</span>
            <input
              className="rhs-search"
              placeholder="Rechercher un sujet, un département, un code..."
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="rhs-toolbar-btns">
            <button className="rhs-filter-btn" onClick={fetchSujets}>
              <span className="material-symbols-outlined">refresh</span>
              Actualiser
            </button>
            <button className="rhs-new-btn" onClick={() => setShowForm(true)}>
              <span className="material-symbols-outlined">add</span>
              Nouveau Sujet
            </button>
          </div>
        </div>

        {error && (
          <div className="rhs-error">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {loading ? (
          <div className="rhs-loading">
            <span className="material-symbols-outlined rhs-spin">progress_activity</span>
            Chargement des sujets...
          </div>
        ) : (
          <>
            <div className="rhs-grid">
              {/* Create card */}
              <button className="rhs-create-card" onClick={() => setShowForm(true)}>
                <div className="rhs-create-icon">
                  <span className="material-symbols-outlined">add</span>
                </div>
                <span className="rhs-create-label">Créer un nouveau sujet de stage</span>
              </button>

              {filtered.length === 0 && (
                <div className="rhs-empty">
                  <span className="material-symbols-outlined">description</span>
                  <p>Aucun sujet trouvé</p>
                </div>
              )}

              {filtered.map((s) => (
                <div key={s.id} className="rhs-card">
                  <div className="rhs-card-body">

                    <div className="rhs-card-top">
                      {s.statut === 'PUBLIE'  && <span className="rhs-badge-publie">Publié</span>}
                      {s.statut === 'ARCHIVE' && <span className="rhs-badge-archive">Archivé</span>}
                      {!s.statut             && <div className="rhs-badge-empty" />}
                      <span className="rhs-ref">REF: {s.codeSujet}</span>
                    </div>

                    <h3 className="rhs-card-title">{s.titre}</h3>
                    <p className="rhs-card-desc">{s.description}</p>

                    <div className="rhs-card-stats">
                      <div className="rhs-stat-chip">
                        <span className="material-symbols-outlined">group</span>
                        {s.nbStagiaires} stagiaire{s.nbStagiaires > 1 ? 's' : ''}
                      </div>
                      <div className="rhs-stat-chip">
                        <span className="material-symbols-outlined">school</span>
                        {s.niveauEtudes}
                      </div>
                    </div>

                    <div className="rhs-card-meta">
                      <div className="rhs-meta-item">
                        <span className="material-symbols-outlined">hub</span>
                        <span>{s.departement}</span>
                      </div>
                      <div className="rhs-meta-item">
                        <span className="material-symbols-outlined">schedule</span>
                        <span>{s.duree}</span>
                      </div>
                      <div className="rhs-meta-item">
                        <span className="material-symbols-outlined">psychology</span>
                        <span>{s.specialite}</span>
                      </div>
                    </div>

                    <div className="rhs-card-footer">
                      {/* Voir candidats */}
                      <button className="rhs-btn-candidats" onClick={() => setCandidatsSujet(s)}>
  <span className="material-symbols-outlined">group</span>
  Candidats
</button>

                      {/* ← Nouveau bouton Voir Quiz */}
                      <button
                        className="rhs-btn-quiz"
                        title="Voir / éditer le quiz"
                        onClick={() => setQuizSujet(s)}
                      >
                        <span className="material-symbols-outlined">quiz</span>
                        Voir Quiz
                      </button>

                      {/* Modifier */}
                      <button
                        className="rhs-btn-modifier"
                        title="Modifier"
                        onClick={() => setEditSujet(s)}
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>

                      {/* Archiver / Republier */}
                      {s.statut === 'PUBLIE' && (
                        <button
                          className="rhs-btn-edit"
                          title="Archiver"
                          onClick={() => handleArchiver(s.id)}
                        >
                          <span className="material-symbols-outlined">archive</span>
                        </button>
                      )}
                      {s.statut === 'ARCHIVE' && (
                        <button
                          className="rhs-btn-publish"
                          title="Republier"
                          onClick={() => handlePublier(s.id)}
                        >
                          <span className="material-symbols-outlined">unarchive</span>
                        </button>
                      )}

                      {/* Supprimer */}
                      <button
                        className="rhs-btn-delete"
                        title="Supprimer"
                        onClick={() => setConfirmId(s.id)}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {filtered.length > 0 && (
              <div className="rhs-pagination">
                <p className="rhs-pagination-info">
                  {filtered.length} sujet{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
                </p>
                <div className="rhs-pagination-btns">
                  <button className="rhs-page-btn" disabled>Précédent</button>
                  <button className="rhs-page-btn" disabled>Suivant</button>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </>
  );
};

export default RHSujets;