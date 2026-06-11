# ═══════════════════════════════════════════════════════════════════════════════
#  ml_router.py — Service Flask UNIFIÉ pour BCT Recrutement
#  Regroupe : Quiz Generator + Face Verification + CV Scorer (BERT) + CV Vector RAG
#  Un seul processus, un seul port (par défaut 5000)
# ═══════════════════════════════════════════════════════════════════════════════

import os
import io
import re
import cv2
import math
import json
import time
import base64
import hashlib
import logging
import argparse
import requests
import tempfile
import unicodedata
from pathlib import Path
from typing  import List
from io      import BytesIO

# ── .env chargé EN PREMIER, avant tout le reste ───────────────────────────────
from dotenv import load_dotenv
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    load_dotenv(_env_file, override=True)
    print(f"[config] ✅ .env chargé depuis {_env_file}")
else:
    load_dotenv(override=True)
    print("[config] Pas de .env — variables système")

# ── Toutes les clés API lues ICI, juste après load_dotenv ─────────────────────
GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
GROQ1_API_KEY   = os.getenv("GROQ1_API_KEY", "")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
CACHE_TTL       = int(os.getenv("CACHE_TTL_SECONDS", 3600))
CLOUDINARY_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_KEY  = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_SEC  = os.getenv("CLOUDINARY_API_SECRET", "")

if not GROQ_API_KEY:
    print("[config] ⚠️  GROQ_API_KEY manquant → /generate désactivé")
else:
    print(f"[config] ✅ GROQ_API_KEY présent (modèle: {GROQ_MODEL})")

# ── Imports restants ───────────────────────────────────────────────────────────
import numpy as np
import pdfplumber
import chromadb
from chromadb.config import Settings
from PIL        import Image
from flask      import Flask, request, jsonify
from flask_cors import CORS

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("ml-router")

# ── Argument CLI ───────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=int(os.getenv("ML_ROUTER_PORT", 5000)))
args, _ = parser.parse_known_args()

# ── Config globale ─────────────────────────────────────────────────────────────
PORT       = args.port
BASE_DIR   = Path(os.path.abspath(__file__)).parent
CHROMA_DIR = str(BASE_DIR / "chroma_cv")
MODEL_DIR  = BASE_DIR / "models" / "bert_bct"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
_score_cache: dict = {}

app = Flask(__name__)
CORS(app)


# ═══════════════════════════════════════════════════════════════════════════════
#  CHARGEMENT DES MODÈLES AU DÉMARRAGE
# ═══════════════════════════════════════════════════════════════════════════════

# ── SentenceTransformer MiniLM (RAG) ──────────────────────────────────────────
log.info("Chargement SentenceTransformer MiniLM...")
from sentence_transformers import SentenceTransformer
_rag_model = SentenceTransformer("sentence-transformers/all-MiniLM-L12-v2")
log.info("✅ MiniLM (RAG) prêt (dim=384)")

# ── BERT fine-tuné (lazy, chargé au premier /score) ───────────────────────────
_bert_model = None
def get_bert():
    global _bert_model
    if _bert_model is None:
        if MODEL_DIR.exists():
            log.info("BERT fine-tuné chargé : %s", MODEL_DIR)
            _bert_model = SentenceTransformer(str(MODEL_DIR))
        else:
            log.warning("Modèle fine-tuné absent → bert-base multilingue")
            _bert_model = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
        try:    dim = _bert_model.get_embedding_dimension()
        except: dim = _bert_model.get_sentence_embedding_dimension()
        log.info("✅ BERT scorer prêt (dim=%d)", dim)
    return _bert_model

# ── ChromaDB ───────────────────────────────────────────────────────────────────
_chroma = chromadb.PersistentClient(
    path=CHROMA_DIR,
    settings=Settings(anonymized_telemetry=False),
)
_col_cv     = _chroma.get_or_create_collection("cvs",              metadata={"hnsw:space": "cosine"})
_col_fiches = _chroma.get_or_create_collection("fiches_candidats", metadata={"hnsw:space": "cosine"})
log.info("✅ ChromaDB prêt — cvs=%d chunks, fiches=%d", _col_cv.count(), _col_fiches.count())

# ── Groq (Quiz Generator) — initialisé avec la clé déjà lue ───────────────────
_groq = None
if not GROQ_API_KEY:
    log.warning("⚠️  GROQ_API_KEY non défini — /generate désactivé")
else:
    from groq import Groq
    _groq = Groq(api_key=GROQ_API_KEY)
    log.info("✅ Client Groq prêt (%s)", GROQ_MODEL)

# ── NLTK (CV Scorer) ───────────────────────────────────────────────────────────
import nltk
for _res in ["stopwords", "punkt", "punkt_tab", "wordnet", "omw-1.4"]:
    try:
        nltk.data.find(f"tokenizers/{_res}" if "punkt" in _res else f"corpora/{_res}")
    except LookupError:
        nltk.download(_res, quiet=True)

from nltk.corpus   import stopwords as nltk_stopwords
from nltk.tokenize import word_tokenize
from nltk.stem     import WordNetLemmatizer

_STOPWORDS  = set(nltk_stopwords.words("french")) | set(nltk_stopwords.words("english"))
_lemmatizer = WordNetLemmatizer()

# ── scikit-learn (TF-IDF) ──────────────────────────────────────────────────────
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise        import cosine_similarity


# ═══════════════════════════════════════════════════════════════════════════════
#  HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":         "ok",
        "services":       ["quiz", "face", "cv-scorer", "cv-vector"],
        "cv_chunks":      _col_cv.count(),
        "fiches":         _col_fiches.count(),
        "groq":           bool(GROQ_API_KEY),
        "bert":           "fine-tuned" if MODEL_DIR.exists() else "base",
        "face_threshold": 0.72,
    }), 200


# ═══════════════════════════════════════════════════════════════════════════════
#  ── SERVICE 1 : CV VECTOR RAG ────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

def _extraire_texte_url(url: str) -> str:
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    texte = ""
    with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
        for page in pdf.pages:
            texte += (page.extract_text() or "") + "\n"
    texte = re.sub(r"[ \t]+", " ", texte)
    return re.sub(r"\n{3,}", "\n\n", texte).strip()


def _chunker(texte: str, taille=600, overlap=100):
    chunks, i = [], 0
    while i < len(texte):
        chunk = texte[i:i + taille].strip()
        if chunk:
            chunks.append(chunk)
        i += taille - overlap
    return chunks


def _embed_rag(textes):
    return [v.tolist() for v in _rag_model.encode(textes, normalize_embeddings=True)]


@app.route("/cv/index", methods=["POST"])
def cv_index():
    data    = request.get_json(force=True) or {}
    cand_id = str(data.get("candidatureId", ""))
    nom     = data.get("candidatNom", "")
    sujet   = data.get("sujetTitre", "")
    cv_url  = data.get("cvUrl", "")
    if not cand_id or not cv_url:
        return jsonify({"error": "candidatureId et cvUrl requis"}), 400
    try:
        texte  = _extraire_texte_url(cv_url)
        if not texte:
            return jsonify({"error": "PDF vide"}), 422
        chunks = _chunker(texte)
        try: _col_cv.delete(where={"candidatureId": cand_id})
        except Exception: pass
        ids   = [f"{cand_id}_{i}" for i in range(len(chunks))]
        metas = [{"candidatureId": cand_id, "candidatNom": nom,
                  "sujetTitre": sujet, "chunkIndex": i} for i in range(len(chunks))]
        _col_cv.add(ids=ids, embeddings=_embed_rag(chunks), documents=chunks, metadatas=metas)
        log.info("CV indexé : %s (#%s) → %d chunks", nom, cand_id, len(chunks))
        return jsonify({"message": "CV indexé", "chunks": len(chunks)}), 200
    except Exception as e:
        log.error("Erreur indexation CV : %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/cv/index-base64", methods=["POST"])
def cv_index_base64():
    data    = request.get_json(force=True) or {}
    cand_id = str(data.get("candidatureId", ""))
    nom     = data.get("candidatNom", "")
    sujet   = data.get("sujetTitre", "")
    pdf_b64 = data.get("pdfBase64", "")
    if not cand_id or not pdf_b64:
        return jsonify({"error": "candidatureId et pdfBase64 requis"}), 400
    try:
        texte = ""
        with pdfplumber.open(io.BytesIO(base64.b64decode(pdf_b64))) as pdf:
            for page in pdf.pages:
                texte += (page.extract_text() or "") + "\n"
        texte  = re.sub(r"[ \t]+", " ", re.sub(r"\n{3,}", "\n\n", texte)).strip()
        chunks = _chunker(texte)
        try: _col_cv.delete(where={"candidatureId": cand_id})
        except Exception: pass
        ids   = [f"{cand_id}_{i}" for i in range(len(chunks))]
        metas = [{"candidatureId": cand_id, "candidatNom": nom,
                  "sujetTitre": sujet, "chunkIndex": i} for i in range(len(chunks))]
        _col_cv.add(ids=ids, embeddings=_embed_rag(chunks), documents=chunks, metadatas=metas)
        return jsonify({"message": "CV indexé (base64)", "chunks": len(chunks)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/candidat/index", methods=["POST"])
def candidat_index():
    data  = request.get_json(force=True) or {}
    cid   = str(data.get("candidatureId", ""))
    nom   = data.get("candidatNom", "")
    texte = data.get("texte", "")
    if not cid or not texte:
        return jsonify({"error": "candidatureId et texte requis"}), 400
    try:
        try: _col_fiches.delete(ids=[f"fiche_{cid}"])
        except Exception: pass
        _col_fiches.add(
            ids=[f"fiche_{cid}"],
            embeddings=_embed_rag([texte]),
            documents=[texte],
            metadatas=[{"candidatureId": cid, "candidatNom": nom}],
        )
        return jsonify({"message": "Fiche indexée"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/candidat/index-batch", methods=["POST"])
def candidat_index_batch():
    data   = request.get_json(force=True) or {}
    fiches = data.get("fiches", [])
    if not fiches:
        return jsonify({"message": "Aucune fiche", "indexees": 0}), 200
    try:
        existing = _col_fiches.get()
        if existing and existing.get("ids"):
            _col_fiches.delete(ids=existing["ids"])
        ids, docs, metas = [], [], []
        for f in fiches:
            cid = str(f.get("candidatureId", ""))
            ids.append(f"fiche_{cid}")
            docs.append(f.get("texte", ""))
            metas.append({"candidatureId": cid, "candidatNom": f.get("candidatNom", "")})
        _col_fiches.add(ids=ids, embeddings=_embed_rag(docs), documents=docs, metadatas=metas)
        log.info("%d fiches indexées", len(ids))
        return jsonify({"message": "Fiches indexées", "indexees": len(ids)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/cv/search", methods=["POST"])
def cv_search():
    data  = request.get_json(force=True) or {}
    query = data.get("query", "").strip()
    top_k = int(data.get("top_k", 5))
    if not query:
        return jsonify({"resultats": []}), 200
    try:
        q_emb     = _embed_rag([query])[0]
        resultats = []
        if _col_fiches.count() > 0:
            rf = _col_fiches.query(query_embeddings=[q_emb],
                                   n_results=min(top_k, _col_fiches.count()))
            for doc, meta, dist in zip(rf["documents"][0], rf["metadatas"][0], rf["distances"][0]):
                resultats.append({"type": "fiche", "extrait": doc,
                                  "candidatNom": meta.get("candidatNom", ""),
                                  "score": round(1 - dist, 3)})
        if _col_cv.count() > 0:
            rc = _col_cv.query(query_embeddings=[q_emb],
                               n_results=min(top_k, _col_cv.count()))
            for doc, meta, dist in zip(rc["documents"][0], rc["metadatas"][0], rc["distances"][0]):
                resultats.append({"type": "cv", "extrait": doc,
                                  "candidatNom": meta.get("candidatNom", ""),
                                  "sujetTitre":  meta.get("sujetTitre", ""),
                                  "score": round(1 - dist, 3)})
        resultats.sort(key=lambda x: x["score"], reverse=True)
        return jsonify({"resultats": resultats[:top_k + 5]}), 200
    except Exception as e:
        return jsonify({"error": str(e), "resultats": []}), 500


@app.route("/cv/<cand_id>", methods=["DELETE"])
def cv_delete(cand_id):
    try:
        _col_cv.delete(where={"candidatureId": str(cand_id)})
        try: _col_fiches.delete(ids=[f"fiche_{cand_id}"])
        except Exception: pass
        return jsonify({"message": "Index supprimé"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/cv/stats", methods=["GET"])
def cv_stats():
    return jsonify({"cv_chunks": _col_cv.count(), "fiches": _col_fiches.count()}), 200


# ═══════════════════════════════════════════════════════════════════════════════
#  ── SERVICE 2 : QUIZ GENERATOR (Groq LLaMA) ─────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

GENERIQUES = {
    "première proposition", "deuxième proposition", "troisième proposition",
    "option a", "option b", "option c", "option 1", "option 2", "option 3",
    "vrai", "faux", "true", "false", "oui", "non", "aucune", "toutes",
    "réponse a", "réponse b", "réponse c",
}


def _quiz_build_prompt(titre, departement, specialite, description, nb, distribution, existing_topics):
    desc        = (description or "")[:300]
    distrib_str = ", ".join(f"{n} {d}" for d, n in distribution)
    avoid_str   = ""
    if existing_topics:
        avoid_str = "\n\nSujets déjà traités — NE PAS répéter :\n" + \
                    "\n".join(f"- {t}" for t in existing_topics[:25])
    return f"""Tu es un expert RH de la Banque Centrale de Tunisie.
Génère EXACTEMENT {nb} questions QCM DIFFÉRENTES en français.

Sujet       : {titre}
Département : {departement}
Spécialité  : {specialite}
Contexte    : {desc}

Distribution : {distrib_str}{avoid_str}

RÈGLES STRICTES :
- EXACTEMENT {nb} questions — pas moins, pas plus
- 3 options CONCRÈTES et TECHNIQUES par question (jamais "Option A", "Vrai/Faux")
- 1 seule réponse correcte (correcte: true)
- Chaque option doit avoir au moins 5 caractères et être une vraie réponse technique

Réponds UNIQUEMENT avec un tableau JSON valide de {nb} éléments.

[
  {{
    "texte": "Question technique précise ?",
    "difficulte": "Débutant",
    "options": [
      {{"texte": "réponse concrète 1", "correcte": false}},
      {{"texte": "réponse concrète 2", "correcte": true}},
      {{"texte": "réponse concrète 3", "correcte": false}}
    ]
  }}
]"""


def _quiz_call_groq(prompt: str) -> str:
    if _groq is None:
        raise RuntimeError("GROQ_API_KEY non configuré")
    completion = _groq.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": (
                "Tu es un expert en QCM bancaires. "
                "Tu réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après. "
                "Tu génères EXACTEMENT le nombre de questions demandé."
            )},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=6000,
    )
    return completion.choices[0].message.content


def _quiz_parse(raw: str, seen_texts: set, souple: bool = False) -> list:
    """souple=True : tolère des options plus courtes pour les passes de complétion."""
    try:
        start = raw.find("["); end = raw.rfind("]")
        if start == -1 or end == -1:
            return []
        data, valid = json.loads(raw[start:end + 1]), []
        min_opt_len = 2 if souple else 5
        for q in data:
            try:
                texte   = str(q.get("texte", "")).strip()
                diff    = str(q.get("difficulte", "Intermédiaire")).strip()
                options = q.get("options", [])
                if not texte or len(texte) < 8: continue
                key = texte.lower()[:60]
                if key in seen_texts: continue
                if len(options) < 2: continue
                # Filtre options
                opts_valides = []
                for o in options:
                    t = str(o.get("texte", "")).strip()
                    if souple:
                        if len(t) >= 2: opts_valides.append(o)
                    else:
                        if t.lower() not in GENERIQUES and len(t) >= min_opt_len:
                            opts_valides.append(o)
                if len(opts_valides) < 2: continue
                opts_valides = opts_valides[:3]
                while len(opts_valides) < 3:
                    opts_valides.append({"texte": f"Autre réponse {len(opts_valides)+1}", "correcte": False})
                # Garantit 1 bonne réponse
                nb_ok = sum(1 for o in opts_valides if o.get("correcte") is True)
                if nb_ok == 0:
                    opts_valides[0]["correcte"] = True
                elif nb_ok > 1:
                    first = True
                    for o in opts_valides:
                        if o.get("correcte"):
                            o["correcte"] = first; first = False
                seen_texts.add(key)
                valid.append({
                    "texte":      texte,
                    "difficulte": diff if diff in ("Débutant","Intermédiaire","Avancé","Expert") else "Intermédiaire",
                    "options": [{"texte": str(o.get("texte","")).strip(),
                                 "correcte": bool(o.get("correcte", False))} for o in opts_valides],
                })
            except Exception:
                continue
        return valid
    except json.JSONDecodeError as e:
        log.error("Quiz JSON invalide : %s", e)
        return []


def _quiz_completer_jusqu_a_50(all_questions, seen_texts, titre, departement, specialite, description):
    """Boucle agressive jusqu'à 50 questions garanties."""
    MAX_ATTEMPTS = 10
    attempt      = 0
    while len(all_questions) < 50 and attempt < MAX_ATTEMPTS:
        manquantes = 50 - len(all_questions)
        log.info("Complétion tentative %d/%d : %d manquantes...", attempt + 1, MAX_ATTEMPTS, manquantes)
        time.sleep(3)
        try:
            existing_topics = [q["texte"][:80] for q in all_questions]
            souple = (attempt % 2 == 1)   # alterne strict / souple
            raw    = _quiz_call_groq(_quiz_build_prompt(
                titre, departement, specialite, description,
                manquantes + 3,           # demande 3 de plus pour compenser les rejets
                [("Intermédiaire", manquantes + 3)],
                existing_topics,
            ))
            extra = _quiz_parse(raw, seen_texts, souple=souple)
            if extra:
                all_questions.extend(extra)
                log.info("Ajoutées : %d | Total: %d", len(extra), len(all_questions))
            else:
                log.warning("Tentative %d : aucune question valide", attempt + 1)
        except Exception as e:
            log.error("Erreur complétion tentative %d : %s", attempt + 1, e)
        attempt += 1

    # Dernier recours : duplication si vraiment impossible d'atteindre 50
    if len(all_questions) < 50:
        manquantes = 50 - len(all_questions)
        log.warning("⚠️ Complétion par duplication (%d questions)", manquantes)
        base = all_questions.copy()
        idx  = 0
        while len(all_questions) < 50:
            q_base = base[idx % len(base)]
            all_questions.append({
                "texte":      q_base["texte"] + f" (variante {idx + 1})",
                "difficulte": q_base["difficulte"],
                "options":    q_base["options"],
            })
            idx += 1

    return all_questions[:50]


@app.route("/generate", methods=["POST"])
def quiz_generate():
    if not GROQ_API_KEY or _groq is None:
        return jsonify({"error": "GROQ_API_KEY non configuré"}), 503

    data        = request.get_json(force=True) or {}
    sujet_id    = data.get("sujetId",     0)
    titre       = data.get("titre",       "Stage bancaire")
    departement = data.get("departement", "Informatique")
    specialite  = data.get("specialite",  "Informatique")
    description = data.get("description", "")
    log.info("[/generate] sujetId=%s | titre=%s", sujet_id, titre)

    all_questions, seen_texts = [], set()

    # Batch 1 : 27 questions (marge pour les rejets)
    log.info("=== Quiz Batch 1/2 ===")
    try:
        raw1   = _quiz_call_groq(_quiz_build_prompt(
            titre, departement, specialite, description,
            27, [("Débutant", 9), ("Intermédiaire", 10), ("Avancé", 5), ("Expert", 3)], []))
        batch1 = _quiz_parse(raw1, seen_texts)
        all_questions.extend(batch1)
        log.info("Batch 1 : %d questions valides", len(batch1))
    except Exception as e:
        log.error("Batch 1 erreur : %s", e)

    log.info("Pause 5s (rate limit Groq)...")
    time.sleep(5)

    # Batch 2 : 27 questions différentes (marge pour les rejets)
    log.info("=== Quiz Batch 2/2 ===")
    try:
        existing_topics = [q["texte"][:80] for q in all_questions]
        raw2   = _quiz_call_groq(_quiz_build_prompt(
            titre, departement, specialite, description,
            27, [("Débutant", 8), ("Intermédiaire", 10), ("Avancé", 6), ("Expert", 3)],
            existing_topics))
        batch2 = _quiz_parse(raw2, seen_texts)
        all_questions.extend(batch2)
        log.info("Batch 2 : %d questions valides | Total: %d", len(batch2), len(all_questions))
    except Exception as e:
        log.error("Batch 2 erreur : %s", e)

    # Complétion si toujours < 50
    if len(all_questions) < 50:
        all_questions = _quiz_completer_jusqu_a_50(
            all_questions, seen_texts, titre, departement, specialite, description)

    # Garantie finale : exactement 50
    all_questions = all_questions[:50]
    log.info("[/generate] ✅ Total final : %d questions.", len(all_questions))
    return jsonify({"sujetId": sujet_id, "count": len(all_questions), "questions": all_questions})


# ═══════════════════════════════════════════════════════════════════════════════
#  ── SERVICE 3 : FACE VERIFICATION (ArcFace + DeepFace) ──────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

FACE_THRESHOLD = 0.72
FACE_MODEL     = "ArcFace"
FACE_METRIC    = "cosine"
FACE_SIGMOID   = 8.0
FACE_DETECTORS = ["retinaface", "opencv", "mtcnn"]


def _b64_to_cv2(b64: str) -> np.ndarray:
    if "," in b64: b64 = b64.split(",")[1]
    img_pil = Image.open(BytesIO(base64.b64decode(b64))).convert("RGB")
    return cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)


def _face_corriger_luminosite(img: np.ndarray) -> np.ndarray:
    lab     = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    if float(np.mean(l)) < 80:
        clip = 3.0 if float(np.mean(l)) < 40 else 2.0
        l    = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)


def _face_corriger_flou(img: np.ndarray) -> np.ndarray:
    if cv2.Laplacian(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var() < 50:
        floute = cv2.GaussianBlur(img, (0, 0), 1.0)
        return cv2.addWeighted(img, 1.5, floute, -0.5, 0)
    return img


def _face_corriger_inclinaison(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    try:
        eyes = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye.xml"
        ).detectMultiScale(gray, 1.1, 5, minSize=(20, 20))
        if len(eyes) >= 2:
            eyes = sorted(eyes, key=lambda e: e[0])
            cx1  = eyes[0][0] + eyes[0][2] // 2; cy1 = eyes[0][1] + eyes[0][3] // 2
            cx2  = eyes[1][0] + eyes[1][2] // 2; cy2 = eyes[1][1] + eyes[1][3] // 2
            angle = math.degrees(math.atan2(cy2 - cy1, cx2 - cx1))
            if 3 < abs(angle) < 20:
                h, w = img.shape[:2]
                M    = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
                return cv2.warpAffine(img, M, (w, h),
                                      flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    except Exception:
        pass
    return img


def _face_zoomer(img: np.ndarray) -> np.ndarray:
    gray  = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    ).detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
    if len(faces) == 1:
        x, y, w, h = faces[0]
        if min(w, h) < 60:
            margin = int(max(w, h) * 0.35)
            x1 = max(0, x - margin); y1 = max(0, y - margin)
            x2 = min(img.shape[1], x + w + margin)
            y2 = min(img.shape[0], y + h + margin)
            return cv2.resize(img[y1:y2, x1:x2], (224, 224), interpolation=cv2.INTER_CUBIC)
    return img


def _face_pretraiter(img: np.ndarray) -> np.ndarray:
    img = _face_zoomer(img)
    img = _face_corriger_inclinaison(img)
    img = _face_corriger_luminosite(img)
    img = _face_corriger_flou(img)
    return img


def _face_valider_qualite(img: np.ndarray, nom: str = "") -> dict:
    h, w   = img.shape[:2]
    gray   = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    bright = float(np.mean(gray))
    lap    = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    std    = float(np.std(gray))
    if w < 60 or h < 60:   return {"valid": False, "reason": f"Image trop petite ({w}×{h})"}
    if bright < 12:         return {"valid": False, "reason": "Image trop sombre — allumez la lumière"}
    if bright > 250:        return {"valid": False, "reason": "Image surexposée"}
    if std < 3:             return {"valid": False, "reason": "Image uniforme — pas de visage visible"}
    if lap < 8:             return {"valid": False, "reason": "Image trop floue — rapprochez-vous"}
    return {"valid": True, "reason": "OK", "brightness": round(bright, 1), "sharpness": round(lap, 1)}


def _face_confiance(distance: float) -> float:
    return round(100.0 / (1.0 + math.exp(FACE_SIGMOID * (distance - FACE_THRESHOLD))), 2)


def _face_niveau(conf: float) -> str:
    if   conf >= 80: return "Très haute"
    elif conf >= 60: return "Haute"
    elif conf >= 40: return "Moyenne"
    elif conf >= 20: return "Basse"
    else:            return "Très basse"


def _face_verify_with_detector(w_path: str, p_path: str, detector: str) -> dict:
    from deepface import DeepFace
    result   = DeepFace.verify(
        img1_path=w_path, img2_path=p_path,
        model_name=FACE_MODEL, detector_backend=detector,
        distance_metric=FACE_METRIC, enforce_detection=True,
    )
    distance = float(result["distance"])
    return {"distance": distance, "verified": distance < FACE_THRESHOLD, "detector": detector}


@app.route("/verify-face", methods=["POST"])
def verify_face():
    t0   = time.time()
    data = request.get_json(silent=True) or {}
    for field in ["candidateId", "webcamImage", "profileImage"]:
        if field not in data:
            return jsonify({"error": f"Champ manquant : {field}"}), 400

    candidate_id = int(data["candidateId"])
    webcam_b64   = data["webcamImage"]
    profile_b64  = data["profileImage"]
    if not webcam_b64 or not profile_b64:
        return jsonify({"error": "Images manquantes"}), 400

    log.info("Candidat #%d | ArcFace (seuil=%.2f)", candidate_id, FACE_THRESHOLD)
    try:
        webcam_img  = _b64_to_cv2(webcam_b64)
        profile_img = _b64_to_cv2(profile_b64)
    except Exception as e:
        return jsonify({"error": f"Erreur décodage image : {e}"}), 400

    webcam_img  = _face_pretraiter(webcam_img)
    profile_img = _face_pretraiter(profile_img)
    wq = _face_valider_qualite(webcam_img,  nom="webcam")
    pq = _face_valider_qualite(profile_img, nom="profil")
    if not wq["valid"]:
        return jsonify({"verified": False, "error": f"Webcam : {wq['reason']}",
                        "conseil": "Améliorez l'éclairage et rapprochez-vous"}), 400
    if not pq["valid"]:
        return jsonify({"verified": False, "error": f"Photo profil : {pq['reason']}",
                        "conseil": "Mettez à jour votre photo de profil"}), 400

    webcam_path = profile_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f1:
            cv2.imwrite(f1.name, webcam_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            webcam_path = f1.name
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f2:
            cv2.imwrite(f2.name, profile_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            profile_path = f2.name

        best_result, errors = None, []
        for detector in FACE_DETECTORS:
            try:
                res = _face_verify_with_detector(webcam_path, profile_path, detector)
                log.info("Détecteur %s → dist=%.4f | verified=%s",
                         detector, res["distance"], res["verified"])
                if best_result is None or res["distance"] < best_result["distance"]:
                    best_result = res
                if res["verified"]:
                    log.info("✅ Vérifié avec %s — arrêt", detector); break
            except Exception as e:
                log.warning("Détecteur %s : %s", detector, str(e)[:80])
                errors.append(f"{detector}: {str(e)[:60]}")

        elapsed = round(time.time() - t0, 2)
        if best_result is None:
            return jsonify({"verified": False,
                            "error":   "Aucun visage détecté dans l'image",
                            "conseil": "Positionnez-vous face à la caméra, améliorez l'éclairage",
                            "detectors_tried": FACE_DETECTORS}), 400

        distance   = best_result["distance"]
        verified   = best_result["verified"]
        detector   = best_result["detector"]
        confidence = _face_confiance(distance)
        niveau     = _face_niveau(confidence)
        log.info("%s Candidat #%d | dist=%.4f | conf=%.1f%% (%s) | détecteur=%s | %.2fs",
                 "✅" if verified else "❌",
                 candidate_id, distance, confidence, niveau, detector, elapsed)

        if verified:
            msg = f"Identité vérifiée ✅ — confiance {confidence:.0f}% ({niveau})"
        elif distance < FACE_THRESHOLD + 0.05:
            msg = f"Presque reconnu (confiance {confidence:.0f}%) — Améliorez l'éclairage"
        elif confidence < 30:
            msg = "Visage trop loin ou mal éclairé — Rapprochez-vous"
        else:
            msg = "Visage non reconnu — Assurez-vous d'être bien face à la caméra"

        return jsonify({
            "verified":        verified, "distance": round(distance, 4),
            "threshold":       FACE_THRESHOLD, "confidence": confidence,
            "niveauConfiance": niveau, "model": FACE_MODEL,
            "detector":        detector, "processingTime": elapsed,
            "message":         msg,
        }), 200 if verified else 401

    except Exception as e:
        log.error("Erreur inattendue face verify : %s", e, exc_info=True)
        return jsonify({"error": f"Erreur serveur : {str(e)[:200]}"}), 500
    finally:
        for path in [webcam_path, profile_path]:
            if path:
                try: os.unlink(path)
                except: pass


@app.route("/stats", methods=["GET"])
def face_stats():
    return jsonify({
        "threshold": FACE_THRESHOLD, "model": FACE_MODEL,
        "detectors_order": FACE_DETECTORS, "sigmoid_alpha": FACE_SIGMOID,
        "improvements": ["Seuil relevé 0.65→0.72",
                         "normaliser_couleur() supprimée",
                         "Multi-détecteur avec fallback"],
    })


@app.route("/calibrate", methods=["POST"])
def face_calibrate():
    from deepface import DeepFace
    data = request.get_json(silent=True) or {}
    if "image1" not in data or "image2" not in data:
        return jsonify({"error": "image1 et image2 requis"}), 400
    p1 = p2 = None
    try:
        img1 = _face_pretraiter(_b64_to_cv2(data["image1"]))
        img2 = _face_pretraiter(_b64_to_cv2(data["image2"]))
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f1:
            cv2.imwrite(f1.name, img1, [cv2.IMWRITE_JPEG_QUALITY, 95]); p1 = f1.name
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f2:
            cv2.imwrite(f2.name, img2, [cv2.IMWRITE_JPEG_QUALITY, 95]); p2 = f2.name
        results = []
        for detector in FACE_DETECTORS:
            try:
                r = DeepFace.verify(p1, p2, model_name=FACE_MODEL,
                                    detector_backend=detector,
                                    distance_metric=FACE_METRIC, enforce_detection=True)
                results.append({"detector": detector,
                                 "distance": round(float(r["distance"]), 4),
                                 "verified_at_current_threshold": float(r["distance"]) < FACE_THRESHOLD})
            except Exception as e:
                results.append({"detector": detector, "error": str(e)[:80]})
        return jsonify({"current_threshold": FACE_THRESHOLD, "results": results,
                        "recommendation": "Si votre distance est entre 0.65 et 0.80, ajustez le seuil"})
    finally:
        for p in [p1, p2]:
            if p:
                try: os.unlink(p)
                except: pass


# ═══════════════════════════════════════════════════════════════════════════════
#  ── SERVICE 4 : CV SCORER (NLP + BERT fine-tuné) ────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

def _normaliser_accents(texte: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texte)
                   if unicodedata.category(c) != "Mn")


def _preprocess(texte: str, garder_phrases: bool = False) -> str:
    if not texte: return ""
    t = _normaliser_accents(texte).lower()
    t = re.sub(r"https?://\S+|www\.\S+", " ", t)
    t = re.sub(r"[\w.\-+]+@[\w.\-]+\.\w+", " ", t)
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    if garder_phrases: return t
    try:    tokens = word_tokenize(t, language="french")
    except: tokens = t.split()
    tokens = [_lemmatizer.lemmatize(tok) for tok in tokens
              if tok not in _STOPWORDS and len(tok) >= 2 and not tok.isdigit()]
    return " ".join(tokens)


import fitz  # PyMuPDF

def _extraire_texte_pdf_bytes(source) -> str:
    try:
        if isinstance(source, bytes):         doc = fitz.open(stream=source, filetype="pdf")
        elif isinstance(source, (str, Path)): doc = fitz.open(str(source))
        else:                                 doc = fitz.open(stream=source.read(), filetype="pdf")
        pages = []
        for page in doc:
            t = page.get_text("text")
            if len(t.strip()) < 30:
                blocs = page.get_text("blocks")
                t = " ".join(b[4] for b in blocs if len(b) > 4 and isinstance(b[4], str))
            if len(t.strip()) < 30:
                try:
                    import pytesseract
                    img = Image.open(io.BytesIO(page.get_pixmap(dpi=300).tobytes("png")))
                    t   = pytesseract.image_to_string(img, lang="fra+eng", config="--psm 3")
                except Exception:
                    t = ""
            pages.append(t)
        doc.close()
        return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", "\n".join(pages))).strip()
    except Exception as e:
        log.error("Extraction PDF : %s", e); return ""


def _calculer_tfidf(texte_cv: str, texte_poste: str) -> float:
    cv_c = _preprocess(texte_cv); po_c = _preprocess(texte_poste)
    cv_n = _normaliser_accents(texte_cv).lower()[:3000]
    po_n = _normaliser_accents(texte_poste).lower()[:1000]
    if not cv_c or not po_c: return 0.0
    try:
        def _sim(a, b):
            m = TfidfVectorizer(ngram_range=(1, 2), min_df=1,
                                max_features=15_000, sublinear_tf=True).fit_transform([a, b])
            return float(cosine_similarity(m[0], m[1])[0][0])
        return round(max(_sim(cv_c, po_c), _sim(cv_n, po_n)), 4)
    except Exception as e:
        log.warning("TF-IDF : %s", e); return 0.0


def _calculer_bert(texte_cv: str, titre: str, description: str, competences: List[str]) -> dict:
    bert = get_bert()
    cv_c = _preprocess(texte_cv, garder_phrases=True)[:1500]

    def sim(a: str, b: str) -> float:
        if not a.strip() or not b.strip(): return 0.0
        try:
            v = bert.encode([a[:512], b[:512]], normalize_embeddings=True, show_progress_bar=False)
            return float(max(0.0, v[0] @ v[1]))
        except Exception: return 0.0

    s_d = sim(cv_c, f"{titre} {description}"[:800])
    s_t = sim(cv_c, f"{titre} développement web fullstack {' '.join(competences[:8])}"[:500])
    if competences:
        sims_ind = []
        for comp in competences:
            cn = comp.lower().strip()
            sims_ind.append(max(sim(cv_c, cn),
                                sim(cv_c, f"développeur {cn}"),
                                sim(cv_c, f"{cn} programmation web")))
        sims_ind.sort(reverse=True)
        top_k = max(1, len(sims_ind) // 2)
        s_c   = sum(sims_ind[:top_k]) / top_k
    else:
        s_c = s_d
    s_g = 0.55 * s_d + 0.30 * s_t + 0.15 * s_c
    return {"titre": round(s_t, 4), "description": round(s_d, 4),
            "competences": round(s_c, 4), "global": round(s_g, 4)}


_SYNONYMES = {
    "js":"javascript","ts":"typescript","py":"python","rb":"ruby",
    "react.js":"react","reactjs":"react","node.js":"nodejs",
    "vue.js":"vue","vuejs":"vue","angular.js":"angular",
    "springboot":"spring boot","spring-boot":"spring boot",
    "nestjs":"node","expressjs":"nodejs","express.js":"nodejs",
    "k8s":"kubernetes","ci/cd":"cicd","jenkins":"cicd",
    "mongo":"mongodb","pg":"postgresql","postgres":"postgresql","mariadb":"mysql",
    "ml":"machine learning","dl":"deep learning","tf":"tensorflow",
    "pt":"pytorch","sk":"scikit","gh":"git","gl":"git","github":"git","gitlab":"git",
    "jwt":"authentification","oauth":"authentification","rest":"api","graphql":"api",
}

def _norm_skill(s: str) -> str:
    s = _normaliser_accents(s).lower().strip()
    return _SYNONYMES.get(s, s)

def _calculer_skills(texte_cv: str, competences: List[str]) -> dict:
    t     = _normaliser_accents(texte_cv).lower()
    t_raw = texte_cv.lower()
    presentes, partielles, manquantes = [], [], []
    for comp in competences:
        cn     = _norm_skill(comp)
        cn_raw = comp.lower().strip()
        cnt    = t.count(cn)
        if cnt == 0: cnt = t_raw.count(cn_raw)
        if cnt == 0:
            matches = sum(1 for part in cn.split() if len(part) >= 3 and part in t)
            if matches > 0: cnt = 1
        if cnt == 0:
            for syn_from, syn_to in _SYNONYMES.items():
                if syn_to == cn and syn_from in t: cnt = 1; break
        if   cnt >= 2: presentes.append(comp)
        elif cnt == 1: partielles.append(comp)
        else:          manquantes.append(comp)
    total = len(competences)
    ratio = (len(presentes) + 0.5 * len(partielles)) / max(total, 1)
    return {"ratio": round(ratio, 4), "presentes": presentes,
            "partielles": partielles, "manquantes": manquantes, "total": total}


_NIVEAUX_DIPLOME = {
    "doctorat": (["doctorat","phd","these","doctoral"], 5),
    "master":   (["master","m2","ingenieur","bac+5","mba","graduate",
                  "diplome d ingenieur","diplôme d ingénieur"], 4),
    "licence":  (["licence","bachelor","bac+3","licence en sciences"], 3),
    "bts_dut":  (["bts","dut","bac+2"], 2),
    "bac":      (["baccalaureat","bac ","diplome de baccalaureat"], 1),
}
_ECOLES_RECONNUES = {
    "esprit":("ingenieur",4), "enit":("ingenieur",4), "insat":("ingenieur",4),
    "supcom":("ingenieur",4), "ensi":("ingenieur",4), "isamm":("ingenieur",4),
    "isi":("master",4), "isim":("master",4), "fst":("master",4), "ihec":("master",4),
    "esb":("master",4), "isg":("licence",3), "fseg":("licence",3),
    "polytechnique":("ingenieur",4), "centrale":("ingenieur",4),
    "sorbonne":("master",4), "universitaire":("licence",3),
}

def _detecter_ecole(texte: str):
    t = _normaliser_accents(texte).lower()
    for ecole, (label, niv) in _ECOLES_RECONNUES.items():
        if ecole in t: return label, niv
    return None, 0

def _extraire_infos(texte: str) -> dict:
    t     = _normaliser_accents(texte).lower()
    email = ""
    m = re.search(r"[\w.+\-]+@[\w.\-]+\.[a-z]{2,}", texte, re.I)
    if m: email = m.group(0)
    tel = ""
    m = re.search(r"(\+?\d[\d\s\-.(]{7,14}\d)", texte)
    if m: tel = re.sub(r"\s+", " ", m.group(0)).strip()
    niv, dip = 0, "Non précisé"
    for n, (mots, sc) in _NIVEAUX_DIPLOME.items():
        if any(mo in t for mo in mots) and sc > niv:
            niv = sc; dip = n.replace("_", "/").capitalize()
    ecole_label, ecole_niv = _detecter_ecole(texte)
    if ecole_niv > niv: niv = ecole_niv; dip = (ecole_label or "").capitalize()
    mois = 0
    for mm in re.finditer(r"(\d+)\s*(an|ans|year|years)", t): mois += int(mm.group(1)) * 12
    for mm in re.finditer(r"(\d+)\s*(mois|month)", t):        mois += int(mm.group(1))
    try:
        from langdetect import detect; langue = detect(texte[:500])
    except Exception: langue = "fr"
    return {
        "email": email, "telephone": tel, "langue": langue,
        "niveauDiplome": niv, "diplomeLabel": dip,
        "moisExperience": min(mois, 120),
        "hasGithub":   "github" in t or "gitlab" in t,
        "hasLinkedin": "linkedin" in t,
        "nbMots":      len(texte.split()),
    }

def _calculer_lettre(lettre: str, titre: str) -> float:
    if not lettre or len(lettre.strip()) < 50: return 0.0
    t    = _normaliser_accents(lettre).lower()
    mots = len(t.split())
    score = 30 if mots >= 300 else 22 if mots >= 200 else 14 if mots >= 100 else 6
    try:
        bert = get_bert()
        v    = bert.encode([lettre[:800], titre], normalize_embeddings=True, show_progress_bar=False)
        score += int(float(v[0] @ v[1]) * 40)
    except Exception: pass
    for mc, pts in [
        (["candidature","postuler","madame","monsieur"], 10),
        (["competences","experience","formation"], 10),
        (["cordialement","sincerement","entretien"], 10),
    ]:
        if any(m in t for m in mc): score += pts
    return round(min(score, 100) / 100, 4)


_DOMAINES_BOOST = {
    "fullstack_web": {"cv": ["react","node","javascript","typescript","spring","docker","mongodb","mysql","angular","api"],
                      "job": ["full stack","fullstack","web","react","node","javascript","spring boot","gestion","backend","frontend"], "bonus": 8.0},
    "ml_nlp":        {"cv": ["python","tensorflow","pytorch","bert","nlp","machine learning","sklearn"],
                      "job": ["machine learning","nlp","bert","deep learning","ia","intelligence artificielle"], "bonus": 8.0},
    "devops_cloud":  {"cv": ["docker","kubernetes","aws","azure","jenkins","terraform","linux"],
                      "job": ["devops","cloud","kubernetes","docker","ci/cd","infrastructure"], "bonus": 8.0},
    "data_analyst":  {"cv": ["sql","pandas","power bi","tableau","excel","python","statistiques"],
                      "job": ["data analyst","bi","reporting","tableau","power bi","sql","analytics"], "bonus": 7.0},
    "finance":       {"cv": ["audit","comptabilite","ifrs","finance","excel","vba","bilan"],
                      "job": ["audit","finance","comptable","ifrs","risque","credit"], "bonus": 7.0},
    "cybersecurity": {"cv": ["securite","pentest","linux","firewall","iso 27001","siem","reseau"],
                      "job": ["securite","cybersecurite","pentest","audit securite","siem"], "bonus": 7.0},
    "econometrie":   {"cv": ["econometrie","statistiques","var","arima","r","python","matlab","regression"],
                      "job": ["econometrie","var","arima","prevision","macroeconomique","taux change","liquidite"], "bonus": 7.0},
    "audit_interne": {"cv": ["audit","conformite","risques","gouvernance","controle","ifrs","bale","compliance"],
                      "job": ["audit interne","gouvernance","risques operationnels","controle interne","banque centrale"], "bonus": 7.0},
    "genie_logiciel":{"cv": ["java","spring","python","sql","mysql","postgresql","git","application","gestion","docker"],
                      "job": ["application","gestion","genie logiciel","developpement","systeme information"], "bonus": 7.0},
}

def _domain_boost(texte_cv: str, texte_poste: str) -> float:
    cv_l = _normaliser_accents(texte_cv).lower()
    po_l = _normaliser_accents(texte_poste).lower()
    best = 0.0
    for cfg in _DOMAINES_BOOST.values():
        cv_m  = sum(1 for k in cfg["cv"]  if k in cv_l)
        job_m = sum(1 for k in cfg["job"] if k in po_l)
        if cv_m >= 2 and job_m >= 1:
            ratio = min(1.0, (cv_m + job_m) / (len(cfg["cv"]) + len(cfg["job"])) * 3)
            bonus = cfg["bonus"] * ratio
            if bonus > best: best = bonus
    return round(best, 2)


def _scorer_cv(texte_cv: str, titre: str, description: str,
               competences: List[str], lettre: str = "") -> dict:
    texte_poste  = f"{titre} {description} {' '.join(competences)}"
    tfidf_sim    = _calculer_tfidf(texte_cv, texte_poste)
    bert_scores  = _calculer_bert(texte_cv, titre, description, competences)
    bert_sim     = bert_scores["global"]
    bert_desc    = bert_scores["description"]
    skills       = _calculer_skills(texte_cv, competences)
    lettre_norm  = _calculer_lettre(lettre, titre)
    infos        = _extraire_infos(texte_cv)
    semantic     = 0.75 * bert_desc + 0.25 * tfidf_sim
    domain_bonus = min(5.0, _domain_boost(texte_cv, texte_poste) * 0.5)
    raw = (0.40 * semantic + 0.35 * skills["ratio"] + 0.15 * lettre_norm +
           0.10 * (0.5 + 0.1 * min(5, infos["niveauDiplome"])))
    raw_pct = raw * 100
    if   raw_pct < 20: raw_pct = raw_pct * 1.10
    elif raw_pct > 85: raw_pct = 85 + (raw_pct - 85) * 0.50
    score  = round(min(100.0, max(0.0, raw_pct + domain_bonus)), 1)
    compat = "Élevée" if score >= 75 else "Moyenne" if score >= 50 else "Faible"
    if   score >= 80: reco = "Hautement recommandé"
    elif score >= 65: reco = "Recommandé"
    elif score >= 50: reco = "Profil intéressant"
    elif score >= 35: reco = "Profil partiel"
    else:             reco = "Non adapté"
    forts, faibles = [], []
    if bert_sim >= 0.65:     forts.append(f"Forte cohérence sémantique BERT ({bert_sim:.2f})")
    elif bert_sim < 0.35:    faibles.append(f"Faible similarité sémantique ({bert_sim:.2f})")
    if tfidf_sim >= 0.25:    forts.append(f"Bonne couverture mots-clés TF-IDF ({tfidf_sim:.2f})")
    elif tfidf_sim < 0.08:   faibles.append("Peu de mots-clés du poste dans le CV")
    if skills["presentes"]:  forts.append(f"Compétences présentes : {', '.join(skills['presentes'][:4])}")
    if skills["manquantes"]: faibles.append(f"Compétences manquantes : {', '.join(skills['manquantes'][:3])}")
    if infos["hasGithub"]:   forts.append("Portfolio GitHub/GitLab présent")
    log.info("Score=%.1f | Sem=%.3f Ski=%.3f Let=%.3f Boost=+%.1f",
             score, semantic, skills["ratio"], lettre_norm, domain_bonus)
    return {
        "scoreTotal": score, "compatibilite": compat, "recommandation": reco,
        "scoreLettreMotivation": round(lettre_norm * 100),
        "detail": {
            "semantique":  round(min(40, semantic * 40), 1),
            "competences": round(min(35, skills["ratio"] * 35), 1),
            "lettre":      round(min(15, lettre_norm * 15), 1),
            "formation":   round(min(10, infos["niveauDiplome"] * 2.0), 1),
        },
        "rapport": {
            "pts_forts":  forts or ["Dossier soumis"], "pts_faibles": faibles or [],
            "resume": (f"Score NLP+BERT : {score}/100 ({compat}). "
                       f"BERT={bert_sim:.3f} TF-IDF={tfidf_sim:.3f} "
                       f"Skills={len(skills['presentes'])}/{skills['total']}."),
            "recommandation": reco,
        },
        "formule": {
            "bert_similarity":    round(bert_sim,        4),
            "tfidf_similarity":   round(tfidf_sim,       4),
            "skills_match_ratio": round(skills["ratio"], 4),
            "lettre_score":       round(lettre_norm,     4),
            "domain_boost":       domain_bonus,
            "calcul": (f"(0.40×Semantic={semantic:.3f} + 0.35×Skills={skills['ratio']:.3f}"
                       f" + 0.15×Lettre={lettre_norm:.3f} + 0.10×Formation"
                       f" + DomainBoost={domain_bonus:.1f}) × 100 = {score}"),
            "modele": "bert-fine-tuned-bct" if MODEL_DIR.exists() else "bert-base",
        },
        "bert_scores": bert_scores, "skills": skills, "informations": infos,
    }


@app.route("/score", methods=["POST"])
def cv_score():
    try:
        if "cv_file" not in request.files:
            return jsonify({"error": "cv_file manquant"}), 400
        fichier = request.files["cv_file"]
        if not fichier.filename.lower().endswith(".pdf"):
            return jsonify({"error": "PDF uniquement"}), 400
        cv_bytes    = fichier.read()
        titre       = request.form.get("titre_sujet",  "")
        description = request.form.get("description",  "")
        lettre      = request.form.get("lettre",       "")
        sujet_id    = request.form.get("sujet_id",     titre[:20])
        competences = []
        try: competences = json.loads(request.form.get("competences", "[]"))
        except Exception: pass
        key    = hashlib.md5(cv_bytes + sujet_id.encode()).hexdigest()
        cached = _score_cache.get(key)
        if cached and (time.time() - cached["ts"]) < CACHE_TTL:
            return jsonify({**cached["val"], "_from_cache": True})
        texte_cv = _extraire_texte_pdf_bytes(cv_bytes)
        if len(texte_cv) < 80:
            return jsonify({"error": "CV illisible ou vide"}), 400
        result = _scorer_cv(texte_cv, titre, description, competences, lettre)
        _score_cache[key] = {"val": result, "ts": time.time()}
        log.info("✅ %s | Score=%.1f (%s) | BERT=%.3f | TF-IDF=%.3f",
                 Path(fichier.filename).name, result["scoreTotal"],
                 result["compatibilite"], result["bert_scores"]["global"],
                 result["formule"]["tfidf_similarity"])
        return jsonify(result)
    except Exception as e:
        log.error("Erreur /score : %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  LANCEMENT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log.info("🚀 ML Router unifié — port %d", PORT)
    log.info("   Services : Quiz (Groq) | Face (ArcFace) | CV-Scorer (BERT) | CV-Vector (ChromaDB)")
    log.info("   BERT     : %s", "fine-tuned" if MODEL_DIR.exists() else "base multilingue")
    log.info("   Groq     : %s", "✅ prêt" if GROQ_API_KEY else "⚠️  GROQ_API_KEY manquant")
    get_bert()  # précharger BERT au démarrage
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)