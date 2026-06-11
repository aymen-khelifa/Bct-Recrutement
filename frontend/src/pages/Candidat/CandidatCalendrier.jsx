import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const styles = `
  .cc-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .cc-root { font-family: 'Public Sans', sans-serif; color: #0f172a; }
  .cc-root .ms { font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align: middle; font-size: 1.25rem; font-style: normal; line-height: 1; }

  .cc-header { margin-bottom: 2rem; }
  .cc-title { font-size: 2rem; font-weight: 900; color: #003d7a; letter-spacing: -0.04em; text-transform: uppercase; margin-bottom: 0.375rem; }
  .cc-bar { width: 4rem; height: 0.3rem; background: #003d7a; border-radius: 9999px; margin-bottom: 1rem; }
  .cc-subtitle { font-size: 0.9375rem; color: #64748b; font-weight: 500; }

  .cc-main { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; }
  @media (max-width: 900px) { .cc-main { grid-template-columns: 1fr; } }

  /* CALENDRIER */
  .cc-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .cc-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
  .cc-month-label { font-size: 1rem; font-weight: 900; color: #003d7a; text-transform: uppercase; }
  .cc-nav-btn { width: 2rem; height: 2rem; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
  .cc-nav-btn:hover { background: #f1f5f9; border-color: #003d7a; }
  .cc-nav-btn .ms { font-size: 1.125rem; color: #475569; }
  .cc-day-headers { display: grid; grid-template-columns: repeat(7,1fr); background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .cc-day-hdr { padding: .625rem; text-align: center; font-size: .5625rem; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; color: #64748b; }
  .cc-day-hdr.we { color: #ef4444; }
  .cc-grid { display: grid; grid-template-columns: repeat(7,1fr); }
  .cc-cell { min-height: 80px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: .5rem; }
  .cc-cell:nth-child(7n) { border-right: none; }
  .cc-cell.other { background: #fafafa; }
  .cc-cell.today { background: rgba(0,61,122,.04); outline: 2px solid #003d7a; outline-offset: -2px; }
  .cc-cell.we-cell { background: #f8fafc; }
  .cc-cell-num { font-size: .75rem; font-weight: 700; color: #334155; margin-bottom: .25rem; }
  .cc-cell.other .cc-cell-num { color: #cbd5e1; }
  .cc-cell.today .cc-cell-num { color: #003d7a; font-weight: 900; }
  .cc-cell.we-cell .cc-cell-num { color: #ef4444; }
  .cc-today-lbl { font-size: .4375rem; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; color: #003d7a; margin-bottom: .2rem; }
  .cc-ev { font-size: .5625rem; font-weight: 700; padding: .1875rem .375rem; border-radius: .25rem; margin-bottom: .125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; border-left: 2px solid #059669; background: rgba(5,150,105,.08); color: #059669; transition: background .12s; }
  .cc-ev:hover { background: rgba(5,150,105,.18); }
  .cc-ev.past { border-color: #94a3b8; background: rgba(148,163,184,.08); color: #94a3b8; }
  .cc-ev.termine { border-color: #64748b; background: rgba(100,116,139,.08); color: #64748b; }

  /* DROITE */
  .cc-right { display: flex; flex-direction: column; gap: 1rem; }

  /* DETAIL CARD */
  .cc-detail { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .cc-detail-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
  .cc-detail-eyebrow { font-size: .5625rem; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; color: #64748b; margin-bottom: .375rem; }
  .cc-detail-date { font-size: 1rem; font-weight: 900; color: #0f172a; }
  .cc-detail-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: .875rem; max-height: 420px; overflow-y: auto; }
  .cc-detail-body::-webkit-scrollbar { width: 4px; }
  .cc-detail-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

  .cc-ev-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #059669; border-radius: .75rem; padding: .875rem; }
  .cc-ev-card.past { border-left-color: #94a3b8; }
  .cc-ev-card.termine { border-left-color: #64748b; }
  .cc-ev-time { font-size: .6875rem; font-weight: 700; color: #059669; margin-bottom: .25rem; }
  .cc-ev-card.past .cc-ev-time { color: #94a3b8; }
  .cc-ev-card.termine .cc-ev-time { color: #64748b; }
  .cc-ev-title { font-size: .875rem; font-weight: 700; color: #0f172a; margin-bottom: .125rem; }
  .cc-ev-sub { font-size: .6875rem; color: #64748b; margin-bottom: .625rem; }
  .cc-rejoindre-btn { display: flex; align-items: center; gap: .375rem; padding: .4375rem .875rem; background: #059669; color: #fff; border: none; border-radius: .5rem; font-size: .625rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans',sans-serif; transition: opacity .15s; text-transform: uppercase; letter-spacing: .06em; }
  .cc-rejoindre-btn:hover { opacity: .85; }
  .cc-rejoindre-btn .ms { font-size: .875rem; }
  .cc-status-badge { display: inline-flex; align-items: center; gap: .25rem; font-size: .5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; padding: .2rem .5rem; border-radius: 9999px; }
  .cc-status-badge.planifie { background: rgba(5,150,105,.1); color: #059669; }
  .cc-status-badge.termine { background: rgba(100,116,139,.1); color: #64748b; }
  .cc-empty { padding: 2rem; text-align: center; color: #94a3b8; font-size: .875rem; display: flex; flex-direction: column; align-items: center; gap: .5rem; }
  .cc-empty .ms { font-size: 2.5rem; color: #cbd5e1; }

  /* PROCHAIN */
  .cc-next { background: linear-gradient(135deg, #003d7a, #0056b3); border-radius: 1rem; padding: 1.5rem; color: #fff; }
  .cc-next-lbl { font-size: .5625rem; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; color: rgba(168,200,255,.8); margin-bottom: .75rem; }
  .cc-next-title { font-size: 1rem; font-weight: 700; margin-bottom: .375rem; }
  .cc-next-sub { font-size: .8125rem; color: rgba(255,255,255,.6); margin-bottom: 1rem; }
  .cc-next-time { display: flex; align-items: center; gap: .5rem; font-size: .8125rem; font-weight: 700; margin-bottom: 1rem; }
  .cc-next-time .ms { font-size: 1rem; color: #93c5fd; }
  .cc-next-btn { width: 100%; padding: .75rem; background: #fff; color: #003d7a; border: none; border-radius: .625rem; font-size: .8125rem; font-weight: 700; cursor: pointer; font-family: 'Public Sans',sans-serif; display: flex; align-items: center; justify-content: center; gap: .5rem; transition: background .15s; }
  .cc-next-btn:hover { background: #dbeafe; }
  .cc-next-none { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; text-align: center; color: #94a3b8; font-size: .875rem; }

  @keyframes cc-spin { to { transform: rotate(360deg); } }
  .cc-spin { animation: cc-spin .8s linear infinite; }
  .cc-loading { display: flex; align-items: center; justify-content: center; padding: 4rem; gap: .75rem; color: #64748b; font-size: .875rem; }
`;

const MOIS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const CandidatCalendrier = () => {
  const navigate = useNavigate();
  const today = new Date();

  const [annee,       setAnnee]       = useState(today.getFullYear());
  const [mois,        setMois]        = useState(today.getMonth() + 1);
  const [entretiens,  setEntretiens]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get('/api/interviews/mes', { params: { annee, mois } });
        setEntretiens(data);
      } catch { setEntretiens([]); }
      finally { setLoading(false); }
    };
    fetch();
  }, [annee, mois]);

  const calCells = useMemo(() => {
    const p = new Date(annee, mois - 1, 1);
    let off = p.getDay() - 1; if (off < 0) off = 6;
    const nb = new Date(annee, mois, 0).getDate();
    const prev = new Date(annee, mois - 1, 0).getDate();
    const cells = [];
    for (let i = off - 1; i >= 0; i--) cells.push({ day: prev - i, cur: false });
    for (let d = 1; d <= nb; d++) cells.push({ day: d, cur: true });
    let n = 1; while (cells.length < 42) cells.push({ day: n++, cur: false });
    return cells;
  }, [annee, mois]);

  const byDay = useMemo(() => {
    const m = {};
    entretiens.forEach(e => {
      const k = new Date(e.dateDebut).getDate();
      if (!m[k]) m[k] = [];
      m[k].push(e);
    });
    return m;
  }, [entretiens]);

  const selectedEvents = useMemo(() =>
    entretiens.filter(e => {
      const d = new Date(e.dateDebut);
      return d.getDate() === selectedDay && d.getMonth()+1 === mois && d.getFullYear() === annee;
    }).sort((a,b) => new Date(a.dateDebut) - new Date(b.dateDebut))
  , [entretiens, selectedDay, annee, mois]);

  const prochainEntretien = useMemo(() =>
    entretiens
      .filter(e => new Date(e.dateDebut) > new Date() && e.statut === 'PLANIFIE')
      .sort((a,b) => new Date(a.dateDebut) - new Date(b.dateDebut))[0]
  , [entretiens]);

  const isToday = d => d === today.getDate() && mois === today.getMonth()+1 && annee === today.getFullYear();
  const isWE    = i => { const d = i % 7; return d === 5 || d === 6; };
  const isPast  = e => new Date(e.dateFin) < new Date();
  const evCls   = e => e.statut === 'TERMINE' ? 'termine' : isPast(e) ? 'past' : '';

  const prevMois = () => { if(mois===1){setAnnee(a=>a-1);setMois(12);}else setMois(m=>m-1); setSelectedDay(1); };
  const nextMois = () => { if(mois===12){setAnnee(a=>a+1);setMois(1);}else setMois(m=>m+1); setSelectedDay(1); };

  const rejoindre = (roomToken) => navigate(`/candidat/entretien/${roomToken}`);

  const fmtDate = s => new Date(s).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const fmtH    = s => new Date(s).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});

  return (
    <>
      <style>{styles}</style>
      <div className="cc-root">
        <div className="cc-header">
          <h2 className="cc-title">Mes entretiens</h2>
          <div className="cc-bar"/>
          <p className="cc-subtitle">Consultez et rejoignez vos entretiens en ligne.</p>
        </div>

        <div className="cc-main">
          {/* Calendrier */}
          <div className="cc-panel">
            <div className="cc-panel-header">
              <h3 className="cc-month-label">{MOIS_FR[mois-1]} {annee}</h3>
              <div style={{display:'flex',gap:'.375rem'}}>
                <button className="cc-nav-btn" onClick={prevMois}><i className="ms">chevron_left</i></button>
                <button className="cc-nav-btn" onClick={nextMois}><i className="ms">chevron_right</i></button>
              </div>
            </div>
            <div className="cc-day-headers">
              {JOURS_FR.map((j,i) => <div key={j} className={`cc-day-hdr${i>=5?' we':''}`}>{j}</div>)}
            </div>
            {loading ? (
              <div className="cc-loading">
                <i className="ms cc-spin" style={{color:'#003d7a'}}>progress_activity</i>
                Chargement...
              </div>
            ) : (
              <div className="cc-grid">
                {calCells.map((cell, idx) => {
                  const evs = cell.cur ? (byDay[cell.day] || []) : [];
                  const today_ = cell.cur && isToday(cell.day);
                  const sel    = cell.cur && cell.day === selectedDay;
                  const we     = isWE(idx);
                  return (
                    <div key={idx}
                      className={['cc-cell', !cell.cur?'other':'', today_?'today':'', sel&&!today_?'selected':'', we&&cell.cur?'we-cell':''].filter(Boolean).join(' ')}
                      onClick={() => cell.cur && setSelectedDay(cell.day)}
                      style={sel&&!today_?{background:'rgba(0,61,122,.06)'}:{}}
                    >
                      {today_ && <div className="cc-today-lbl">Aujourd'hui</div>}
                      <div className="cc-cell-num">{cell.day}</div>
                      {evs.slice(0,2).map(e => (
                        <div key={e.id} className={`cc-ev ${evCls(e)}`}
                          onClick={ev => { ev.stopPropagation(); rejoindre(e.roomToken); }}>
                          {fmtH(e.dateDebut)} Entretien
                        </div>
                      ))}
                      {evs.length > 2 && <div style={{fontSize:'.5rem',color:'#94a3b8',fontWeight:700}}>+{evs.length-2}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Droite */}
          <div className="cc-right">
            {/* Prochain entretien */}
            {prochainEntretien ? (
              <div className="cc-next">
                <p className="cc-next-lbl">Prochain entretien</p>
                <p className="cc-next-title">{prochainEntretien.sujetTitre}</p>
                <p className="cc-next-sub">{prochainEntretien.sujetDept}</p>
                <div className="cc-next-time">
                  <i className="ms">calendar_today</i>
                  {fmtDate(prochainEntretien.dateDebut)} · {fmtH(prochainEntretien.dateDebut)}
                </div>
                <button className="cc-next-btn" onClick={() => rejoindre(prochainEntretien.roomToken)}>
                  <i className="ms">videocam</i>
                  Rejoindre la salle
                </button>
              </div>
            ) : (
              <div className="cc-next-none">
                <i className="ms" style={{fontSize:'2rem',color:'#cbd5e1',display:'block',marginBottom:'.5rem'}}>event_available</i>
                Aucun entretien à venir
              </div>
            )}

            {/* Agenda du jour sélectionné */}
            <div className="cc-detail">
              <div className="cc-detail-header">
                <p className="cc-detail-eyebrow">
                  {isToday(selectedDay) && mois===today.getMonth()+1 && annee===today.getFullYear()
                    ? "Aujourd'hui" : "Entretiens du"}
                </p>
                <p className="cc-detail-date">
                  {new Date(annee, mois-1, selectedDay).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
                </p>
              </div>
              <div className="cc-detail-body">
                {selectedEvents.length === 0 ? (
                  <div className="cc-empty">
                    <i className="ms">event_busy</i>
                    <p>Aucun entretien ce jour</p>
                  </div>
                ) : selectedEvents.map(e => {
                  const cls = evCls(e);
                  return (
                    <div key={e.id} className={`cc-ev-card ${cls}`}>
                      <div className="cc-ev-time">{fmtH(e.dateDebut)} – {fmtH(e.dateFin)}</div>
                      <p className="cc-ev-title">{e.sujetTitre}</p>
                      <p className="cc-ev-sub">{e.sujetDept}</p>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem'}}>
                        {e.statut === 'TERMINE'
                          ? <span className="cc-status-badge termine"><i className="ms" style={{fontSize:'.75rem'}}>check_circle</i>Terminé</span>
                          : isPast(e)
                            ? <span className="cc-status-badge" style={{background:'rgba(148,163,184,.1)',color:'#94a3b8'}}>Expiré</span>
                            : <button className="cc-rejoindre-btn" onClick={() => rejoindre(e.roomToken)}>
                                <i className="ms">videocam</i>Rejoindre
                              </button>
                        }
                        <span className="cc-status-badge planifie" style={e.statut==='TERMINE'||isPast(e)?{background:'rgba(148,163,184,.1)',color:'#94a3b8'}:{}}>
                          {e.statut === 'TERMINE' ? 'Terminé' : 'Planifié'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CandidatCalendrier;