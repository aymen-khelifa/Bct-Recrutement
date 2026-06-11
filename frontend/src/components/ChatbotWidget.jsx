import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const styles = `
  .cbw-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .cbw-root { font-family: 'Public Sans', sans-serif; }
  .cbw-root .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }

  /* Bulle flottante */
  .cbw-fab {
    position: fixed; bottom: 1.75rem; right: 1.75rem; z-index: 9998;
    width: 3.75rem; height: 3.75rem; border-radius: 9999px; border: none; cursor: pointer;
    background: linear-gradient(135deg, #001b3d, #003d7a); color: #fff;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 10px 30px rgba(0,27,61,.35); transition: transform .2s, box-shadow .2s;
  }
  .cbw-fab:hover { transform: scale(1.08); box-shadow: 0 14px 36px rgba(0,27,61,.45); }
  .cbw-fab .material-symbols-outlined { font-size: 1.75rem; }

  /* Fenêtre de chat */
  @keyframes cbw-in { from { opacity: 0; transform: translateY(1.5rem) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .cbw-panel {
    position: fixed; bottom: 1.75rem; right: 1.75rem; z-index: 9999;
    width: 24rem; max-width: calc(100vw - 2rem); height: 33rem; max-height: calc(100vh - 3rem);
    background: #fff; border-radius: 1.25rem; box-shadow: 0 25px 60px rgba(0,0,0,.28);
    display: flex; flex-direction: column; overflow: hidden; animation: cbw-in .25s ease;
    border: 1px solid #e2e8f0;
  }
  .cbw-header { background: linear-gradient(135deg, #001b3d, #003d7a); padding: 1.125rem 1.25rem; display: flex; align-items: center; gap: .75rem; flex-shrink: 0; }
  .cbw-header-icon { width: 2.25rem; height: 2.25rem; border-radius: 9999px; background: rgba(255,255,255,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .cbw-header-icon .material-symbols-outlined { color: #fff; font-size: 1.25rem; }
  .cbw-header-txt { flex: 1; }
  .cbw-header-title { font-size: .9375rem; font-weight: 800; color: #fff; line-height: 1.2; }
  .cbw-header-sub { font-size: .6875rem; color: rgba(255,255,255,.7); display: flex; align-items: center; gap: .25rem; }
  .cbw-header-dot { width: .4375rem; height: .4375rem; border-radius: 9999px; background: #22c55e; }
  .cbw-close { background: rgba(255,255,255,.12); border: none; color: #fff; cursor: pointer; width: 1.875rem; height: 1.875rem; border-radius: .5rem; display: flex; align-items: center; justify-content: center; }
  .cbw-close:hover { background: rgba(255,255,255,.22); }
  .cbw-close .material-symbols-outlined { font-size: 1.125rem; }

  /* Corps messages */
  .cbw-body { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: .875rem; background: #f8fafc; }
  .cbw-body::-webkit-scrollbar { width: 5px; }
  .cbw-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

  .cbw-msg { max-width: 85%; padding: .75rem 1rem; border-radius: 1rem; font-size: .8125rem; line-height: 1.55; white-space: pre-wrap; word-wrap: break-word; }
  .cbw-msg.user { align-self: flex-end; background: #003d7a; color: #fff; border-bottom-right-radius: .25rem; }
  .cbw-msg.bot { align-self: flex-start; background: #fff; color: #1e293b; border: 1px solid #e2e8f0; border-bottom-left-radius: .25rem; }

  .cbw-welcome { text-align: center; padding: 1.5rem 1rem; color: #64748b; }
  .cbw-welcome .material-symbols-outlined { font-size: 2.5rem; color: #003d7a; opacity: .3; display: block; margin-bottom: .5rem; }
  .cbw-welcome p { font-size: .8125rem; line-height: 1.55; }
  .cbw-suggestions { display: flex; flex-direction: column; gap: .5rem; margin-top: 1rem; }
  .cbw-suggestion { padding: .625rem .875rem; background: #fff; border: 1px solid #e2e8f0; border-radius: .625rem; font-size: .75rem; color: #475569; cursor: pointer; text-align: left; font-family: 'Public Sans', sans-serif; transition: all .15s; }
  .cbw-suggestion:hover { border-color: #003d7a; color: #003d7a; background: #f0f7ff; }

  /* Typing */
  .cbw-typing { align-self: flex-start; background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; border-bottom-left-radius: .25rem; padding: .875rem 1rem; display: flex; gap: .25rem; }
  .cbw-typing span { width: .4375rem; height: .4375rem; border-radius: 9999px; background: #94a3b8; animation: cbw-bounce 1.2s infinite; }
  .cbw-typing span:nth-child(2) { animation-delay: .2s; }
  .cbw-typing span:nth-child(3) { animation-delay: .4s; }
  @keyframes cbw-bounce { 0%,60%,100% { transform: translateY(0); opacity: .5; } 30% { transform: translateY(-.3rem); opacity: 1; } }

  /* Input */
  .cbw-input-wrap { flex-shrink: 0; padding: .875rem 1rem; border-top: 1px solid #e2e8f0; background: #fff; display: flex; gap: .5rem; align-items: flex-end; }
  .cbw-input { flex: 1; resize: none; border: 1px solid #e2e8f0; border-radius: .75rem; padding: .625rem .875rem; font-size: .8125rem; font-family: 'Public Sans', sans-serif; color: #0f172a; outline: none; max-height: 5rem; line-height: 1.4; transition: border-color .15s; }
  .cbw-input:focus { border-color: #003d7a; }
  .cbw-send { flex-shrink: 0; width: 2.375rem; height: 2.375rem; border-radius: .75rem; border: none; background: #003d7a; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity .15s; }
  .cbw-send:hover:not(:disabled) { opacity: .9; }
  .cbw-send:disabled { opacity: .4; cursor: not-allowed; }
  .cbw-send .material-symbols-outlined { font-size: 1.25rem; }
`;

const SUGGESTIONS = [
  "Combien de candidatures au total ?",
  "Quel sujet a le plus de candidats ?",
  "Quelle est la moyenne des scores quiz ?",
  "Combien d'entretiens sont planifiés ?",
];

const ChatbotWidget = () => {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', content}
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async (texte) => {
    const question = (texte ?? input).trim();
    if (!question || loading) return;

    const nouveaux = [...messages, { role: 'user', content: question }];
    setMessages(nouveaux);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/chatbot/ask', {
        question,
        historique: nouveaux.slice(-6), // contexte récent
      });
      setMessages(m => [...m, { role: 'assistant', content: data.reponse || 'Pas de réponse.' }]);
    } catch (e) {
      const msg = e?.response?.status === 403
        ? "Accès refusé. Réservé au personnel RH et administrateur."
        : "Une erreur est survenue. Réessayez.";
      setMessages(m => [...m, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="cbw-root">
      <style>{styles}</style>

      {/* Bulle flottante */}
      {!open && (
        <button className="cbw-fab" onClick={() => setOpen(true)} title="Assistant RH">
          <span className="material-symbols-outlined">smart_toy</span>
        </button>
      )}

      {/* Fenêtre de chat */}
      {open && (
        <div className="cbw-panel">
          <div className="cbw-header">
            <div className="cbw-header-icon">
              <span className="material-symbols-outlined">smart_toy</span>
            </div>
            <div className="cbw-header-txt">
              <p className="cbw-header-title">Assistant Analytique</p>
              <p className="cbw-header-sub"><span className="cbw-header-dot"/>En ligne · données temps réel</p>
            </div>
            <button className="cbw-close" onClick={() => setOpen(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="cbw-body" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="cbw-welcome">
                <span className="material-symbols-outlined">query_stats</span>
                <p>Posez-moi vos questions sur les chiffres du recrutement : candidatures, scores, entretiens, sujets...</p>
                <div className="cbw-suggestions">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} className="cbw-suggestion" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`cbw-msg ${m.role === 'user' ? 'user' : 'bot'}`}>
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="cbw-typing"><span/><span/><span/></div>
            )}
          </div>

          <div className="cbw-input-wrap">
            <textarea
              ref={inputRef}
              className="cbw-input"
              rows={1}
              placeholder="Écrivez votre question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button className="cbw-send" onClick={() => send()} disabled={loading || !input.trim()}>
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;