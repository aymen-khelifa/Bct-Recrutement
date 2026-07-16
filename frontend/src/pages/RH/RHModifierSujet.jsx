import { useState } from 'react';
import axios from 'axios';

const styles = `
  .ns-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .ns-root { font-family: 'Public Sans', sans-serif; }
  .ns-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }

  .ns-header { margin-bottom: 2rem; display: flex; align-items: flex-start; gap: 1rem; }
  .ns-header-text h1 { font-size: 1.875rem; font-weight: 900; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.025em; }
  .ns-header-text p { color: #64748b; font-size: 0.875rem; line-height: 1.6; }
  .ns-back-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #475569; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; white-space: nowrap; margin-top: 0.25rem; }
  .ns-back-btn:hover { background: #f8fafc; }
  .ns-back-btn .material-symbols-outlined { font-size: 1rem; }
body {
  margin: 0;
  padding: 0;
}
  .ns-edit-badge { display: inline-flex; align-items: center; gap: 0.375rem; background: rgba(234,179,8,0.1); color: #b45309; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
  .ns-edit-badge .material-symbols-outlined { font-size: 0.875rem; }

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
  .ns-input[type=number]::-webkit-outer-spin-button, .ns-input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .ns-input[type=number] { -moz-appearance: textfield; }

  .ns-editor { border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; transition: box-shadow 0.2s; }
  .ns-editor:focus-within { box-shadow: 0 0 0 3px rgba(0,61,122,0.1); border-color: #003d7a; }
  .ns-toolbar { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0.5rem; display: flex; gap: 0.25rem; align-items: center; }
  .ns-toolbar-btn { padding: 0.25rem; border-radius: 0.25rem; background: none; border: none; cursor: pointer; color: #475569; transition: background 0.15s; line-height: 1; }
  .ns-toolbar-btn:hover { background: #e2e8f0; }
  .ns-toolbar-btn .material-symbols-outlined { font-size: 1.25rem; display: block; }
  .ns-toolbar-sep { width: 1px; height: 1.25rem; background: #e2e8f0; margin: 0 0.25rem; }
  .ns-textarea { width: 100%; padding: 0.875rem; border: none; outline: none; resize: vertical; font-size: 0.875rem; color: #0f172a; font-family: 'Public Sans', sans-serif; background: #fff; line-height: 1.6; }
  .ns-textarea::placeholder { color: #94a3b8; }

  .ns-tags-wrap { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.625rem 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; min-height: 2.75rem; align-items: center; cursor: text; transition: border-color 0.2s, box-shadow 0.2s; }
  .ns-tags-wrap:focus-within { border-color: #003d7a; box-shadow: 0 0 0 3px rgba(0,61,122,0.1); background: #fff; }
  .ns-tag { display: flex; align-items: center; gap: 0.25rem; background: rgba(0,61,122,0.08); color: #003d7a; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
  .ns-tag-remove { background: none; border: none; cursor: pointer; color: #003d7a; padding: 0; line-height: 1; display: flex; align-items: center; }
  .ns-tag-remove .material-symbols-outlined { font-size: 0.875rem; }
  .ns-tag-input { background: transparent; border: none; outline: none; font-size: 0.875rem; font-family: 'Public Sans', sans-serif; color: #0f172a; min-width: 8rem; flex: 1; }
  .ns-tag-input::placeholder { color: #94a3b8; }

  .ns-footer { padding: 1.25rem 2rem; background: #fff; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.75rem; align-items: stretch; justify-content: flex-end; }
  @media (min-width: 640px) { .ns-footer { flex-direction: row; align-items: center; } }
  .ns-btn-cancel { padding: 0.75rem 2rem; color: #475569; font-weight: 600; font-size: 0.875rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #fff; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: background 0.15s; text-align: center; }
  .ns-btn-cancel:hover { background: #f8fafc; }
  .ns-btn-submit { padding: 0.75rem 2rem; background: linear-gradient(135deg, #003d7a 0%, #0056b3 100%); color: #fff; font-weight: 700; font-size: 0.875rem; border: none; border-radius: 0.5rem; cursor: pointer; font-family: 'Public Sans', sans-serif; box-shadow: 0 4px 6px -1px rgba(0,61,122,0.25); display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: opacity 0.15s; }
  .ns-btn-submit:hover:not(:disabled) { opacity: 0.9; }
  .ns-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .ns-btn-submit .material-symbols-outlined { font-size: 1.125rem; }
  @keyframes ns-spin { to { transform: rotate(360deg); } }
  .ns-spin { animation: ns-spin 0.7s linear infinite; }

  .ns-field-error { font-size: 0.75rem; color: #ef4444; margin-top: 0.25rem; }
  .ns-api-error { background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; padding: 0.875rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; margin: 1.5rem 2rem 0; display: flex; align-items: center; gap: 0.5rem; }
  .ns-note { margin-top: 1.5rem; text-align: center; font-size: 0.6875rem; color: #94a3b8; }
`;

const DEPARTEMENTS = ['Stabilité Financière','Opérations Monétaires','Informatique & Digital','Ressources Humaines','Audit Interne','Politique Monétaire','Statistiques & Data','Gestion des Risques'];
const NIVEAUX      = ['Bac+2 (BTS / DUT)','Licence (Bac+3)','Master 1 (Bac+4)','Master 2 (Bac+5)','Ingénieur','Doctorat'];
const SPECIALITES  = ['Finance & Marchés','Informatique / Data Science','Cybersécurité','Économie','Statistiques','Droit & Conformité','Ressources Humaines','Audit & Contrôle','Autre'];

const RHModifierSujet = ({ sujet, onCancel, onSuccess }) => {
  const [loading, setLoading]   = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');

  // Pré-remplir avec les données existantes
  const [form, setForm] = useState({
    codeSujet:    sujet.codeSujet    || '',
    titre:        sujet.titre        || '',
    departement:  sujet.departement  || DEPARTEMENTS[0],
    duree:        sujet.duree        || '6 mois',
    nbStagiaires: sujet.nbStagiaires || 1,
    niveauEtudes: sujet.niveauEtudes || NIVEAUX[2],
    specialite:   sujet.specialite   || SPECIALITES[0],
    description:  sujet.description  || '',
    competences:  sujet.competences  || [],
  });

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
    setApiError('');
  };

  const addTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      if (!form.competences.includes(tagInput.trim()))
        set('competences', [...form.competences, tagInput.trim()]);
      setTagInput('');
    }
  };
  const removeTag = (tag) => set('competences', form.competences.filter(t => t !== tag));

  const validate = () => {
    const e = {};
    if (!form.codeSujet.trim())   e.codeSujet   = 'Le code du sujet est obligatoire.';
    if (!form.titre.trim())       e.titre       = 'Le titre est obligatoire.';
    if (!form.description.trim()) e.description = 'La description est obligatoire.';
    if (form.nbStagiaires < 1)    e.nbStagiaires = 'Minimum 1 stagiaire.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── PUT /api/rh/sujets/{id} ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await axios.put(`/api/sujets/${sujet.id}`, form);
      onSuccess?.();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Erreur lors de la modification du sujet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ns-root">

        {/* Header avec bouton retour */}
        <div className="ns-header">
          <button className="ns-back-btn" onClick={onCancel}>
            <span className="material-symbols-outlined">arrow_back</span>
            Retour
          </button>
          <div className="ns-header-text">
           
            <h1>Modifier le Sujet de Stage</h1>
            <p>Modifiez les informations du sujet — <strong>{sujet.codeSujet}</strong></p>
          </div>
        </div>

        <div className="ns-card">
          <form onSubmit={handleSubmit} noValidate>

            {/* Erreur API */}
            {apiError && (
              <div className="ns-api-error">
                <span className="material-symbols-outlined">error</span>
                {apiError}
              </div>
            )}

            {/* ── 1. Informations générales ── */}
            <div className="ns-section">
              <div className="ns-section-title">
                <span className="material-symbols-outlined">info</span>
                <h3>Informations Générales</h3>
              </div>
              <div className="ns-grid-2">

                <div>
                  <label className="ns-label" htmlFor="ns-code">Code du sujet <span>*</span></label>
                  <div className="ns-input-icon-wrap">
                    <span className="material-symbols-outlined">tag</span>
                    <input className="ns-input" id="ns-code" type="text" placeholder="ex: BC-24-001"
                      value={form.codeSujet}
                      onChange={e => set('codeSujet', e.target.value.toUpperCase())} />
                  </div>
                  {errors.codeSujet && <p className="ns-field-error">{errors.codeSujet}</p>}
                </div>

                <div>
                  <label className="ns-label" htmlFor="ns-duree">Durée du stage</label>
                  <select className="ns-select" id="ns-duree" value={form.duree} onChange={e => set('duree', e.target.value)}>
                    {['1 mois','2 mois','3 mois','4 mois','5 mois','6 mois'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>

                <div className="ns-span2">
                  <label className="ns-label" htmlFor="ns-titre">Titre du stage <span>*</span></label>
                  <input className="ns-input" id="ns-titre" type="text"
                    placeholder="ex: Analyse des Risques de Marché via Machine Learning"
                    value={form.titre} onChange={e => set('titre', e.target.value)} />
                  {errors.titre && <p className="ns-field-error">{errors.titre}</p>}
                </div>

                <div className="ns-span2">
                  <label className="ns-label" htmlFor="ns-dept">Département</label>
                  <select className="ns-select" id="ns-dept" value={form.departement} onChange={e => set('departement', e.target.value)}>
                    {DEPARTEMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>

              </div>
            </div>

           {/* ── 2. Profil recherché ── */}
<div className="ns-section">
  <div className="ns-section-title">
    <span className="material-symbols-outlined">school</span>
    <h3>Profil Recherché</h3>
  </div>

  <div className="ns-grid-3">
    <div>
      <label className="ns-label" htmlFor="ns-nb">
        Nombre de stagiaires <span>*</span>
      </label>

      <select
        className="ns-select"
        id="ns-nb"
        value={form.nbStagiaires}
        onChange={e => set('nbStagiaires', Number(e.target.value))}
      >
        <option value={1}>1 stagiaire</option>
        <option value={2}>2 stagiaires</option>
        <option value={3}>3 stagiaires</option>
      </select>

      {errors.nbStagiaires && (
        <p className="ns-field-error">{errors.nbStagiaires}</p>
      )}
    </div>

    <div>
      <label className="ns-label" htmlFor="ns-niveau">
        Niveau d'études requis
      </label>
      <select
        className="ns-select"
        id="ns-niveau"
        value={form.niveauEtudes}
        onChange={e => set('niveauEtudes', e.target.value)}
      >
        {NIVEAUX.map(n => <option key={n}>{n}</option>)}
      </select>
    </div>

    <div>
      <label className="ns-label" htmlFor="ns-spe">
        Spécialité
      </label>
      <select
        className="ns-select"
        id="ns-spe"
        value={form.specialite}
        onChange={e => set('specialite', e.target.value)}
      >
        {SPECIALITES.map(s => <option key={s}>{s}</option>)}
      </select>
    </div>
  </div>
</div>

            {/* ── 3. Description ── */}
            <div className="ns-section">
              <div className="ns-section-title">
                <span className="material-symbols-outlined">description</span>
                <h3>Description du Sujet <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>*</span></h3>
              </div>
              <div className="ns-editor">
                <div className="ns-toolbar">
                  {['format_bold','format_italic','format_list_bulleted','format_list_numbered'].map(icon => (
                    <button key={icon} type="button" className="ns-toolbar-btn">
                      <span className="material-symbols-outlined">{icon}</span>
                    </button>
                  ))}
                  <div className="ns-toolbar-sep" />
                  <button type="button" className="ns-toolbar-btn">
                    <span className="material-symbols-outlined">link</span>
                  </button>
                </div>
                <textarea className="ns-textarea" rows={7}
                  placeholder="Décrivez les objectifs, les missions et les livrables attendus..."
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              {errors.description && <p className="ns-field-error" style={{ marginTop: '0.5rem' }}>{errors.description}</p>}
            </div>

            {/* ── 4. Compétences ── */}
            <div className="ns-section" style={{ borderBottom: 'none' }}>
              <div className="ns-section-title">
                <span className="material-symbols-outlined">psychology</span>
                <h3>Compétences Requises</h3>
              </div>
              <div className="ns-tags-wrap" onClick={() => document.getElementById('ns-edit-tag-input').focus()}>
                {form.competences.map(tag => (
                  <span key={tag} className="ns-tag">
                    {tag}
                    <button type="button" className="ns-tag-remove" onClick={() => removeTag(tag)}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </span>
                ))}
                <input id="ns-edit-tag-input" className="ns-tag-input"
                  placeholder="Ajouter une compétence et appuyer sur Entrée..."
                  value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Appuyez sur <strong>Entrée</strong> ou <strong>,</strong> pour ajouter une compétence.
              </p>
            </div>

            {/* ── Footer ── */}
            <div className="ns-footer">
              <button type="button" className="ns-btn-cancel" onClick={onCancel}>Annuler</button>
              <button type="submit" className="ns-btn-submit" disabled={loading}>
                <span className={`material-symbols-outlined${loading ? ' ns-spin' : ''}`}>
                  {loading ? 'progress_activity' : 'save'}
                </span>
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>

          </form>
        </div>

        <p className="ns-note">
          Les modifications seront appliquées immédiatement après enregistrement.
        </p>
      </div>
    </>
  );
};

export default RHModifierSujet;