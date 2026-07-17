# ═══════════════════════════════════════════════════════════════════════════════
#  ml_router.py — Service Flask UNIFIÉ pour BCT Recrutement
#  Regroupe : Quiz Generator + Face Verification + CV Scorer (BERT) + CV Vector RAG
#  Un seul processus, un seul port (par défaut 5000)
# ═══════════════════════════════════════════════════════════════════════════════

# ── Fix SQLite pour Azure App Service Linux (sqlite3 trop ancien pour ChromaDB) ──
try:
    __import__('pysqlite3')
    import sys
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError:
    pass  # pysqlite3 non disponible, on tente avec sqlite3 système


import os
import sys

# ── Fix OpenCV Headless C++ Memory Issue ──────────────────────────────
# Si deepface ou une autre lib importe un OpenCV GUI cassé, la librairie
# C++ reste bloquée dans la RAM du processus actuel même si on fait `pip install`.
# Solution : vérifier cvtColor, et si absent, réinstaller ET redémarrer (os.execv).
def _fix_opencv_and_restart():
    try:
        import cv2
        if hasattr(cv2, 'cvtColor'):
            return  # Tout va bien
    except ImportError:
        pass
    
    print("[OpenCV-Fix] ⚠️ OpenCV cassé ou manquant. Suppression des versions GUI...")
    os.system(f"{sys.executable} -m pip uninstall -y opencv-python opencv-contrib-python opencv-python-headless 2>/dev/null")
    print("[OpenCV-Fix] Installation de opencv-python-headless...")
    os.system(f"{sys.executable} -m pip install --quiet --no-cache-dir opencv-python-headless==4.10.0.84")
    
    print("[OpenCV-Fix] ✅ Terminé. Redémarrage du processus Python pour purger la mémoire...")
    # Remplace le processus courant par un nouveau avec les mêmes arguments
    os.execv(sys.executable, [sys.executable] + sys.argv)

_fix_opencv_and_restart()
import cv2

import io
import re
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

# Clé dédiée au scheduler d'entretiens (GROQ1_API_KEY), fallback sur GROQ_API_KEY
SCHEDULER_GROQ_KEY = GROQ1_API_KEY or GROQ_API_KEY
if not SCHEDULER_GROQ_KEY:
    print("[config] ⚠️  Aucune clé Groq pour le scheduler → /schedule désactivé")

# ── Imports restants ───────────────────────────────────────────────────────────
import numpy as np
import fitz  # PyMuPDF — utilisé pour toute extraction de texte PDF (RAG + CV Scorer)
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

# Sur Azure App Service Python (Oryx), l'app tourne depuis un dossier /tmp au lieu de /home/site/wwwroot.
# Vérifier d'abord le stockage persistant Azure (Kudu) HORS DE WWWROOT pour éviter la suppression par CI/CD.
AZURE_PERSISTENT_MODELS_ROOT = Path("/home/site/models/bert_bct")
AZURE_PERSISTENT_MODELS_SUB = Path("/home/site/models/models/bert_bct")
LEGACY_WWWROOT = Path("/home/site/wwwroot/bert_bct")

# Ordre de priorité
if AZURE_PERSISTENT_MODELS_ROOT.exists():
    MODEL_DIR = AZURE_PERSISTENT_MODELS_ROOT
elif AZURE_PERSISTENT_MODELS_SUB.exists():
    MODEL_DIR = AZURE_PERSISTENT_MODELS_SUB
elif LEGACY_WWWROOT.exists():
    MODEL_DIR = LEGACY_WWWROOT
else:
    MODEL_DIR = BASE_DIR / "models" / "bert_bct"

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


def preload_deepface():
    """Précharge TensorFlow + les poids ArcFace en mémoire au démarrage du
    service, pour éviter le délai de ~30s (chargement à froid) lors du
    premier appel réel à /verify-face."""
    try:
        from deepface import DeepFace
        dummy = (np.random.rand(100, 100, 3) * 255).astype("uint8")
        path = os.path.join(tempfile.gettempdir(), "_warmup.jpg")
        cv2.imwrite(path, dummy)
        DeepFace.represent(img_path=path, model_name=FACE_MODEL,
                           detector_backend="opencv", enforce_detection=False)
        try:
            os.unlink(path)
        except Exception:
            pass
        log.info("✅ ArcFace préchargé")
    except Exception as e:
        log.warning("Préchargement ArcFace échoué : %s", e)


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
        "services":       ["quiz", "scheduler", "face", "cv-scorer", "cv-vector"],
        "cv_chunks":      _col_cv.count(),
        "fiches":         _col_fiches.count(),
        "groq":           bool(GROQ_API_KEY),
        "scheduler_groq": bool(SCHEDULER_GROQ_KEY),
        "bert":           "fine-tuned" if MODEL_DIR.exists() else "base",
        "face_threshold": 0.72,
    }), 200


# ═══════════════════════════════════════════════════════════════════════════════
#  ── SERVICE 1 : CV VECTOR RAG ────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

def _extraire_texte_pdf_bytes(source) -> str:
    """Extraction PDF unifiée (PyMuPDF + fallback OCR Tesseract) — utilisée
    à la fois par le service RAG (cv/index, cv/index-base64) et le CV Scorer
    (/score), pour garantir un comportement d'extraction identique partout."""
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


def _extraire_texte_url(url: str) -> str:
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    texte = _extraire_texte_pdf_bytes(resp.content)
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
        texte  = _extraire_texte_pdf_bytes(base64.b64decode(pdf_b64))
        texte  = re.sub(r"[ \t]+", " ", re.sub(r"\n{3,}", "\n\n", texte)).strip()
        if not texte:
            return jsonify({"error": "PDF vide"}), 422
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
        if not all_questions:
            log.error("⚠️ Impossible de générer la moindre question — Groq indisponible")
            return all_questions  # liste vide, on laisse l'appelant gérer

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

    if not all_questions:
        log.error("[/generate] ❌ Aucune question générée — vérifier GROQ_API_KEY")
        return jsonify({
            "error": "Impossible de générer des questions — clé Groq invalide ou service indisponible"
        }), 503

    log.info("[/generate] ✅ Total final : %d questions.", len(all_questions))
    return jsonify({"sujetId": sujet_id, "count": len(all_questions), "questions": all_questions})


# ═══════════════════════════════════════════════════════════════════════════════
#  ── SERVICE 2bis : INTERVIEW SCHEDULER (Groq LLaMA) ──────────────────────────
#  Génère un planning d'entretiens JSON à partir de candidats + contraintes
#  horaires fournies par Java. Java garde la logique métier (BDD, validation,
#  fallback, emails) — ce service ne fait QUE l'appel LLM.
# ═══════════════════════════════════════════════════════════════════════════════

_scheduler_groq = None
if SCHEDULER_GROQ_KEY:
    from groq import Groq as _GroqScheduler
    _scheduler_groq = _GroqScheduler(api_key=SCHEDULER_GROQ_KEY)
    log.info("✅ Client Groq scheduler prêt")


def _schedule_build_prompt(data: dict) -> str:
    heure_debut       = data.get("heureDebut", 9)
    heure_fin         = data.get("heureFin", 17)
    pause_debut       = data.get("pauseDebut", 12)
    pause_fin         = data.get("pauseFin", 13)
    duree_minutes     = data.get("dureeMinutes", 15)
    battement_minutes = data.get("battementMinutes", 15)
    pas_minutes       = duree_minutes + battement_minutes
    creneaux_valides  = data.get("creneauxValides", [])
    occupes_str       = data.get("occupesStr", "Aucun")
    jours              = data.get("jours", [])
    candidats_str      = data.get("candidatsStr", "")
    nb_candidats        = data.get("nbCandidats", 0)
    premier_jour        = jours[0] if jours else ""

    return f"""Génère un planning d'entretiens RH (Banque Centrale de Tunisie).

RÈGLES STRICTES :
- Horaires de travail : de {heure_debut}h00 à {heure_fin}h00
- PAUSE DÉJEUNER OBLIGATOIRE : AUCUN entretien entre {pause_debut}h00 et {pause_fin}h00
- Durée de chaque entretien : {duree_minutes} minutes EXACTEMENT
- Battement OBLIGATOIRE de {battement_minutes} minutes entre deux entretiens
- Les entretiens commencent donc toutes les {pas_minutes} minutes
- Un seul entretien à la fois (aucun chevauchement)
- Trier les candidats par meilleur score quiz EN PREMIER
- Remplir les jours dans l'ordre, du matin au soir
- Ne JAMAIS dépasser {heure_fin}h00

CRÉNEAUX HORAIRES VALIDES (utiliser dans cet ordre, par jour) :
{"  ".join(creneaux_valides)}

⛔ CRÉNEAUX DÉJÀ OCCUPÉS (ne JAMAIS réutiliser ces date+heure) :
{occupes_str}

Jours ouvrés disponibles : {", ".join(jours)}

Candidats à planifier ({nb_candidats} au total) :
{candidats_str}

Réponds UNIQUEMENT avec un JSON valide. AUCUN texte avant ou après.
Format exact :
[{{"candidatureId":1,"debut":"{premier_jour}T09:00:00","fin":"{premier_jour}T09:15:00"}}]
"""


@app.route("/schedule", methods=["POST"])
def schedule_generate():
    if _scheduler_groq is None:
        return jsonify({"error": "Clé Groq scheduler non configurée"}), 503

    data = request.get_json(force=True) or {}
    if not data.get("candidatsStr") or not data.get("jours"):
        return jsonify({"error": "candidatsStr et jours requis"}), 400

    prompt = _schedule_build_prompt(data)
    log.info("[/schedule] %d candidat(s) | %d jour(s)",
             data.get("nbCandidats", 0), len(data.get("jours", [])))

    try:
        completion = _scheduler_groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": (
                    "Tu génères uniquement du JSON valide sans aucun texte autour. "
                    "Tu respectes STRICTEMENT la pause déjeuner et les battements de 15 minutes."
                )},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=4000,
        )
        content = completion.choices[0].message.content.strip()

        start = content.find("[")
        end   = content.rfind("]")
        if start == -1 or end == -1:
            log.warning("[/schedule] Réponse Groq sans JSON exploitable")
            return jsonify({"error": "Réponse Groq invalide", "planning": []}), 502

        planning = json.loads(content[start:end + 1])
        log.info("[/schedule] ✅ %d créneau(x) générés", len(planning))
        return jsonify({"planning": planning}), 200

    except json.JSONDecodeError as e:
        log.error("[/schedule] JSON invalide : %s", e)
        return jsonify({"error": "JSON invalide reçu de Groq", "planning": []}), 502
    except Exception as e:
        log.error("[/schedule] Erreur : %s", e, exc_info=True)
        return jsonify({"error": str(e), "planning": []}), 500


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

# Écoles reconnues et leur niveau, avec description (pour education score)
_ECOLES_RECONNUES = {
    "esprit":       ("ingenieur", 4, "École Supérieure Privée d'Ingénierie"),
    "enit":         ("ingenieur", 4, "École Nationale d'Ingénieurs de Tunis"),
    "insat":        ("ingenieur", 4, "Institut National des Sciences Appliquées"),
    "supcom":       ("ingenieur", 4, "École Supérieure des Communications"),
    "ensi":         ("ingenieur", 4, "École Nationale des Sciences de l'Informatique"),
    "isamm":        ("ingenieur", 4, "Institut Supérieur des Arts Multimédia"),
    "isi":          ("master",    4, "Institut Supérieur d'Informatique"),
    "isim":         ("master",    4, "Institut Supérieur d'Informatique de Monastir"),
    "fst":          ("master",    4, "Faculté des Sciences et Techniques"),
    "ihec":         ("master",    4, "Institut des Hautes Études Commerciales"),
    "esb":          ("master",    4, "École Supérieure de Business"),
    "isg":          ("licence",   3, "Institut Supérieur de Gestion"),
    "fseg":         ("licence",   3, "Faculté des Sciences Économiques"),
    "polytechnique":("ingenieur", 4, "École Polytechnique"),
    "centrale":     ("ingenieur", 4, "École Centrale"),
    "sorbonne":     ("master",    4, "Université Paris Sorbonne"),
    "universitaire":("licence",   3, "Université"),
}

def _detecter_ecole(texte: str) -> tuple:
    """Retourne (label, niveau, description)."""
    t = _normaliser_accents(texte).lower()
    for ecole, (label, niv, desc) in _ECOLES_RECONNUES.items():
        if ecole in t:
            return label, niv, desc
    return None, 0, ""


# ── Mots-clés domaines pour enrichir les projets ──────────────────────────────
_DOMAINES_PROJETS = {
    "hospitalier":   ["hospitalier","hopital","urgences","medical","sante","clinique",
                      "patient","health","hospital","infirmier"],
    "bancaire":      ["bancaire","banque","credit","finance","paiement","swift",
                      "banking","financial","transaction","compte"],
    "ecommerce":     ["ecommerce","vente","boutique","panier","commande","shop",
                      "marketplace","produit","catalogue","prix"],
    "education":     ["formation","cours","apprentissage","education","pedagogie",
                      "etudiant","enseignement","plateforme lms","elearning"],
    "securite":      ["securite","authentification","cybersecurite","pentest",
                      "firewall","vulnerability","audit","iso 27001"],
    "data":          ["analyse","tableau","dashboard","rapport","statistiques",
                      "pipeline","etl","datawarehouse","bi","kpi"],
}

def _extraire_projets(texte: str) -> list:
    """Extrait les projets du CV avec leur contexte domaine."""
    t_lower = _normaliser_accents(texte).lower()
    projets = []
    patterns_projet = [
        r'([A-Z][a-zA-Z0-9]+)\s*\(?(20\d{2})\)?.*?Technologies?[:]\s*([^\n]{10,100})',
        r'[Pp]rojet\s+([^:\n]{3,30})\s*[:\-]\s*([^\n]{10,100})',
    ]
    for pattern in patterns_projet:
        for m in re.finditer(pattern, texte):
            nom = m.group(1).strip()
            techno_str = m.group(len(m.groups())).strip()
            techno = [t.strip() for t in re.split(r'[,;]', techno_str) if len(t.strip()) > 1]
            domaine_projet = "autre"
            for dom, mots in _DOMAINES_PROJETS.items():
                if any(mo in t_lower for mo in mots):
                    domaine_projet = dom
                    break
            if nom and len(nom) > 2:
                projets.append({"nom": nom, "techno": techno[:5], "domaine": domaine_projet})
    return projets[:5]


def _extraire_experiences(texte: str) -> list:
    """Extrait les expériences/stages du CV."""
    pattern = r'[Ss]tage\s+(?:chez|at|@)?\s*([A-Z][A-Za-z0-9\s]{1,30})\s*\(([^)]+)\)'
    experiences = []
    for m in re.finditer(pattern, texte):
        entreprise = m.group(1).strip()
        periode    = m.group(2).strip()
        mois = 2
        mm = re.search(r'(\d+)/(\d{4})\s*[-–]\s*(\d+)/(\d{4})', periode)
        if mm:
            try:
                m1, y1, m2, y2 = int(mm.group(1)), int(mm.group(2)), int(mm.group(3)), int(mm.group(4))
                mois = max(1, (y2 - y1) * 12 + (m2 - m1))
            except Exception:
                pass
        domaine_exp = "autre"
        entreprise_lower = _normaliser_accents(entreprise).lower()
        if any(b in entreprise_lower for b in ["bank","banque","bct","stb","biat","amen","attijari"]):
            domaine_exp = "bancaire"
        elif any(b in entreprise_lower for b in ["easysoft","soft","tech","digital","dev"]):
            domaine_exp = "tech"
        elif any(b in entreprise_lower for b in ["esprit","enit","insat","universite"]):
            domaine_exp = "education"
        experiences.append({"entreprise": entreprise, "duree_mois": mois, "domaine": domaine_exp})
    return experiences[:4]


def _extraire_infos(texte: str) -> dict:
    """Extraction complète des informations structurées du CV."""
    t = _normaliser_accents(texte).lower()

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

    ecole_label, ecole_niv, ecole_desc = _detecter_ecole(texte)
    if ecole_niv > niv:
        niv = ecole_niv
        dip = (ecole_label or "").capitalize()

    mois = 0
    for mm in re.finditer(r"(\d+)\s*(an|ans|year|years)", t): mois += int(mm.group(1)) * 12
    for mm in re.finditer(r"(\d+)\s*(mois|month)", t):        mois += int(mm.group(1))

    projets     = _extraire_projets(texte)
    experiences = _extraire_experiences(texte)

    try:
        from langdetect import detect; langue = detect(texte[:500])
    except Exception: langue = "fr"

    return {
        "email": email, "telephone": tel, "langue": langue,
        "niveauDiplome": niv, "diplomeLabel": dip,
        "ecoleDetectee": ecole_desc if ecole_desc else "",
        "moisExperience": min(mois, 120),
        "hasGithub":   "github" in t or "gitlab" in t,
        "hasLinkedin": "linkedin" in t,
        "nbMots":      len(texte.split()),
        "projets":         projets,
        "experiences":     experiences,
        "nb_projets":      len(projets),
        "nb_experiences":  len(experiences),
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


# ══════════════════════════════════════════════════════════════════════════════
#  MODULE NLP PUR — Extraction structurée sans LLM (porté de cv_scorer.py)
# ══════════════════════════════════════════════════════════════════════════════

_SECTION_PATTERNS = {
    "formation": [
        r"(?i)(formation|education|diplôme|diplome|études|etudes|academic)",
        r"(?i)(université|universite|école|ecole|institut|faculty)",
        r"(?i)(master|licence|ingénieur|ingenieur|bachelor|bts|dut)",
    ],
    "experience": [
        r"(?i)(expérience|experience|stage|internship|emploi|poste|work)",
        r"(?i)(chez|at|@|entreprise|company|société|societe)",
    ],
    "projets": [
        r"(?i)(projet|project|réalisation|realisation|développement|developpement)",
        r"(?i)(academic|personnel|professionnel|application|plateforme|système)",
    ],
    "competences": [
        r"(?i)(compétence|competence|skill|technolog|maîtrise|maitrise)",
        r"(?i)(langage|framework|outil|tool|stack|librairie)",
    ],
}

def _detecter_sections(texte: str) -> dict:
    """Détecte et extrait les sections du CV (formation/expérience/projets/...)."""
    lignes   = texte.split("\n")
    section_courante = "autre"
    contenu_sections = {k: [] for k in _SECTION_PATTERNS}
    contenu_sections["autre"] = []
    for ligne in lignes:
        nouvelle_section = None
        for nom_section, patterns in _SECTION_PATTERNS.items():
            if any(re.search(p, ligne) for p in patterns):
                if len(ligne.strip()) < 40:
                    nouvelle_section = nom_section
                    break
        if nouvelle_section:
            section_courante = nouvelle_section
        else:
            contenu_sections[section_courante].append(ligne)
    return {k: " ".join(v) for k, v in contenu_sections.items()}


_ECOLES_NER = {
    "esprit": "SCHOOL_ENGINEER",   "enit": "SCHOOL_ENGINEER",
    "insat":  "SCHOOL_ENGINEER",   "supcom": "SCHOOL_ENGINEER",
    "ensi":   "SCHOOL_ENGINEER",   "ihec": "SCHOOL_BUSINESS",
    "isg":    "SCHOOL_BUSINESS",   "fseg": "SCHOOL_BUSINESS",
    "isi":    "SCHOOL_IT",         "isim": "SCHOOL_IT",
    "fst":    "SCHOOL_SCIENCE",    "isamm": "SCHOOL_MEDIA",
    "polytechnique": "SCHOOL_ENGINEER", "centrale": "SCHOOL_ENGINEER",
    "sorbonne":      "SCHOOL_GENERAL",  "grenoble": "SCHOOL_GENERAL",
    "al manahel":    "SCHOOL_GENERAL",
    "fsegs":         "SCHOOL_ECONOMICS",
    "fseg sfax":     "SCHOOL_ECONOMICS",
    "fseg tunis":    "SCHOOL_ECONOMICS",
    "iscae":         "SCHOOL_MANAGEMENT",
    "higher institute": "SCHOOL_GENERAL",
}

_ENTREPRISES_NER = {
    "bct": "BANK_CENTRAL",   "stb": "BANK",     "biat": "BANK",
    "amen bank": "BANK",     "attijari": "BANK", "tsb": "BANK",
    "bh bank": "BANK",       "ubci": "BANK",
    "easysoft": "TECH_COMPANY", "telnet": "TECH_COMPANY",
    "vermeg": "TECH_COMPANY",   "sofrecom": "TECH_COMPANY",
    "microsoft": "BIG_TECH",  "google": "BIG_TECH",
    "amazon": "BIG_TECH",     "facebook": "BIG_TECH",
}

_TECH_STACK_NER = {
    "react": "FRONTEND",    "angular": "FRONTEND",  "vue": "FRONTEND",
    "html": "FRONTEND",     "css": "FRONTEND",       "typescript": "FRONTEND",
    "spring boot": "BACKEND", "node": "BACKEND",     "django": "BACKEND",
    "laravel": "BACKEND",     "symfony": "BACKEND",  "express": "BACKEND",
    "mysql": "DATABASE",    "mongodb": "DATABASE",  "postgresql": "DATABASE",
    "firebase": "DATABASE", "redis": "DATABASE",
    "docker": "DEVOPS",     "kubernetes": "DEVOPS", "jenkins": "DEVOPS",
    "aws": "CLOUD",         "azure": "CLOUD",       "gcp": "CLOUD",
    "python": "ML_LANG",    "tensorflow": "ML_FRAMEWORK",
    "pytorch": "ML_FRAMEWORK", "bert": "ML_MODEL",
    "scikit": "ML_LIB",     "pandas": "ML_LIB",
}

def _extraire_entites_ner(texte: str) -> dict:
    """NER léger basé sur dictionnaires et règles (sans spaCy)."""
    t = _normaliser_accents(texte).lower()
    entites = {"ecoles": [], "entreprises": [], "technologies": [], "dates": [], "niveau": None}
    for ecole, label in _ECOLES_NER.items():
        if ecole in t:
            entites["ecoles"].append({"nom": ecole, "type": label})
            if "ENGINEER" in label and entites["niveau"] is None:
                entites["niveau"] = "ingenieur"
            elif "BUSINESS" in label and entites["niveau"] is None:
                entites["niveau"] = "master"
    for ent, label in _ENTREPRISES_NER.items():
        if ent in t:
            entites["entreprises"].append({"nom": ent, "type": label})
    for tech, categorie in _TECH_STACK_NER.items():
        if tech in t:
            entites["technologies"].append({"nom": tech, "categorie": categorie})
    entites["dates"] = sorted(set(re.findall(r"20\d{2}", texte)))
    return entites


_DOMAINES_REFERENCE = {
    "fullstack_web": (
        "développement web fullstack React.js Node.js Spring Boot Docker MongoDB MySQL "
        "JavaScript TypeScript HTML CSS REST API microservices CI/CD Jenkins Git "
        "application gestion génie logiciel développement informatique"
    ),
    "ml_nlp": (
        "machine learning NLP Python TensorFlow PyTorch BERT transformers scikit-learn "
        "pandas numpy deep learning classification neural network embedding "
        "intelligence artificielle IA prévision modèle données tunisiennes"
    ),
    "devops_cloud": (
        "DevOps cloud AWS Azure Kubernetes Docker Jenkins Terraform Ansible Linux "
        "CI/CD pipeline monitoring Prometheus Grafana infrastructure automation"
    ),
    "data_analyst": (
        "data analyst SQL Excel Power BI Tableau Python pandas statistiques reporting "
        "dashboard ETL data pipeline business intelligence KPI visualisation "
        "big data méthodes quantitatives prévision économétrique"
    ),
    "econometrie": (
        "économétrie modèle VAR ARIMA prévision séries temporelles régression "
        "analyse statistique macroéconomique taux change inflation croissance "
        "méthodes quantitatives finance économique Tunisie données bancaires"
    ),
    "finance_audit": (
        "finance audit comptabilité bancaire IFRS risques crédit Excel VBA reporting "
        "modélisation financière conformité réglementaire Basel SEPA Swift "
        "politique monétaire liquidité dette publique inclusion financière"
    ),
    "audit_interne": (
        "audit interne gouvernance risques opérationnels contrôle interne "
        "recommandations audit conformité gestion risques banque centrale "
        "management système information audit systèmes"
    ),
    "economie_finance": (
        "économie monétaire finance inclusion financière crowdfunding e-wallet "
        "paiement numérique taux change dette ménages croissance économique "
        "développement durable RSE politique macroéconomique Tunisie banque"
    ),
    "cybersecurity": (
        "cybersécurité sécurité pentest Linux firewall ISO 27001 RGPD SIEM "
        "cryptographie SSL TLS audit vulnérabilité réseau"
    ),
    "communication": (
        "communication digitale marketing RSE stratégie communication interne "
        "cohésion organisationnelle supports numériques multimédia branding"
    ),
}

def _classifier_domaine_bert(texte_cv: str) -> tuple:
    """Classification zero-shot du domaine du CV par similarité cosine BERT."""
    try:
        bert    = get_bert()
        cv_enc  = bert.encode(texte_cv[:1000], normalize_embeddings=True, show_progress_bar=False)
        meilleur_domaine, meilleur_score = "autre", 0.0
        for domaine, description in _DOMAINES_REFERENCE.items():
            ref_enc = bert.encode(description, normalize_embeddings=True, show_progress_bar=False)
            score = float(cv_enc @ ref_enc)
            if score > meilleur_score:
                meilleur_score, meilleur_domaine = score, domaine
        return meilleur_domaine, round(meilleur_score, 4)
    except Exception as e:
        log.debug("Classification domaine : %s", e)
        return "autre", 0.0


def _calculer_score_structurel_nlp(texte_cv: str, texte_poste: str, competences: list) -> dict:
    """Score structurel 100% NLP : NER skills + domaine BERT + projets + formation + exp."""
    ner_cv    = _extraire_entites_ner(texte_cv)
    ner_poste = _extraire_entites_ner(texte_poste)

    cv_techs    = {e["nom"] for e in ner_cv["technologies"]}
    poste_techs = {e["nom"] for e in ner_poste["technologies"]}
    ner_match = round(len(cv_techs & poste_techs) / len(poste_techs), 4) if poste_techs else 0.5

    domaine_cv,    conf_cv    = _classifier_domaine_bert(texte_cv[:800])
    domaine_poste, conf_poste = _classifier_domaine_bert(texte_poste[:500])
    alignement_domaine = 1.0 if domaine_cv == domaine_poste else 0.3

    niv_labels  = {"ingenieur": 1.0, "master": 0.9, "licence": 0.7, None: 0.6}
    score_forma = niv_labels.get(ner_cv.get("niveau"), 0.6)

    nb_exp    = len(ner_cv["entreprises"])
    score_exp = min(1.0, 0.4 + nb_exp * 0.2)

    sections_cv   = _detecter_sections(texte_cv)
    projets_texte = sections_cv.get("projets", "")
    score_projets = 0.5
    if projets_texte.strip():
        try:
            bert = get_bert()
            v = bert.encode([projets_texte[:400], texte_poste[:400]],
                            normalize_embeddings=True, show_progress_bar=False)
            score_projets = float(max(0.0, v[0] @ v[1]))
        except Exception:
            pass

    score_global = (
        0.30 * ner_match +
        0.25 * alignement_domaine +
        0.20 * score_projets +
        0.15 * score_forma +
        0.10 * score_exp
    )

    log.info("Score structurel NLP : ner=%.2f dom=%.2f proj=%.2f forma=%.2f exp=%.2f → %.3f",
             ner_match, alignement_domaine, score_projets, score_forma, score_exp, score_global)

    return {
        "score": round(score_global, 4),
        "details": {
            "ner_skills_match":  round(ner_match, 3),
            "domaine_alignment": round(alignement_domaine, 3),
            "projets_bert":      round(score_projets, 3),
            "formation_niveau":  round(score_forma, 3),
            "experience_score":  round(score_exp, 3),
        },
        "entites": {
            "domaine_cv":      domaine_cv,
            "domaine_poste":   domaine_poste,
            "ecoles":          [e["nom"] for e in ner_cv["ecoles"]],
            "entreprises":     [e["nom"] for e in ner_cv["entreprises"]],
            "technologies_cv": list(cv_techs)[:10],
            "niveau_detecte":  ner_cv.get("niveau", "non détecté"),
        },
        "methode": "NLP_PUR_BERT_NER_RULES",
    }


def _calculer_experience_score(texte_cv: str, competences: List[str]) -> dict:
    """Score expérience 0→1 : stages, projets, GitHub, pertinence bancaire."""
    t = _normaliser_accents(texte_cv).lower()

    experiences  = _extraire_experiences(texte_cv)
    nb_stages    = len(experiences)
    duree_totale = min(sum(e.get("duree_mois", 2) for e in experiences), 24)
    score_stages = min(0.40, nb_stages * 0.08 + duree_totale * 0.02)

    projets       = _extraire_projets(texte_cv)
    nb_projets    = len(projets)
    score_projets = min(0.25, nb_projets * 0.07)

    has_github    = "github" in t or "gitlab" in t
    has_portfolio = "portfolio" in t
    score_github  = 0.10 if has_github else (0.05 if has_portfolio else 0.0)

    mots_bancaires = ["banque","bank","bct","stb","biat","tsb","attijari",
                      "amen","finance","audit","comptabilite","tresorerie"]
    has_bancaire   = any(m in t for m in mots_bancaires)
    score_bancaire = 0.15 if has_bancaire else 0.0

    comp_norm   = {_normaliser_accents(c).lower() for c in competences}
    techs_stage = set()
    for exp in experiences:
        for tech in exp.get("techno", []):
            techs_stage.add(_normaliser_accents(tech).lower())
    overlap_stage     = len(comp_norm & techs_stage) / max(len(comp_norm), 1)
    score_tech_stage  = min(0.10, overlap_stage * 0.10)

    score_exp = min(1.0, score_stages + score_projets + score_github + score_bancaire + score_tech_stage)

    log.info("ExperienceScore=%.3f | stages=%d(%.1fmois) projets=%d github=%s bancaire=%s",
             score_exp, nb_stages, duree_totale, nb_projets,
             "✅" if has_github else "❌", "✅" if has_bancaire else "❌")

    return {
        "score":        round(score_exp, 4),
        "nb_stages":    nb_stages,
        "duree_mois":   duree_totale,
        "nb_projets":   nb_projets,
        "has_github":   has_github,
        "has_bancaire": has_bancaire,
        "score_detail": {
            "stages":     round(score_stages, 3),
            "projets":    round(score_projets, 3),
            "github":     round(score_github, 3),
            "bancaire":   round(score_bancaire, 3),
            "tech_stage": round(score_tech_stage, 3),
        }
    }


_NIVEAU_SCORE = {
    "doctorat": 1.00, "ingenieur": 0.90, "master": 0.85, "licence": 0.65,
    "bts/dut": 0.45, "bac": 0.25, None: 0.40,
}

_SPECIALITES_BCT = {
    "informatique":        {"fullstack_web":1.0, "ml_nlp":0.9, "devops_cloud":0.9},
    "genie logiciel":      {"fullstack_web":1.0, "ml_nlp":0.7, "devops_cloud":0.8},
    "intelligence artificielle": {"ml_nlp":1.0, "data_analyst":0.8, "fullstack_web":0.5},
    "data science":        {"ml_nlp":1.0, "data_analyst":1.0, "econometrie":0.7},
    "reseaux":             {"devops_cloud":0.9, "cybersecurity":0.9},
    "cybersecurite":       {"cybersecurity":1.0, "audit_interne":0.6},
    "finance":             {"finance_audit":1.0, "econometrie":0.8, "economie_finance":0.9},
    "econometrie":         {"econometrie":1.0, "finance_audit":0.8, "data_analyst":0.7},
    "economie":            {"finance_audit":0.9, "econometrie":0.9, "economie_finance":1.0},
    "audit":               {"audit_interne":1.0, "finance_audit":0.9},
    "comptabilite":        {"finance_audit":0.9, "audit_interne":0.8},
    "communication":       {"communication":1.0, "data_analyst":0.5},
    "marketing":           {"communication":1.0, "data_analyst":0.6},
}

def _calculer_education_score(texte_cv: str, domaine_poste: str = "fullstack_web") -> dict:
    """Score formation 0→1 : niveau diplôme, école reconnue, spécialité, certifs."""
    t = _normaliser_accents(texte_cv).lower()

    niv_label, niv_num, _ = _detecter_ecole(texte_cv)
    niveau_detecte = None
    for niv, (mots, _) in _NIVEAUX_DIPLOME.items():
        if any(mo in t for mo in mots):
            niveau_detecte = niv
            break
    if niv_label and niveau_detecte is None:
        niveau_detecte = niv_label
    score_niveau = _NIVEAU_SCORE.get(niveau_detecte, 0.40)

    ecole_label, ecole_niv, ecole_desc = _detecter_ecole(texte_cv)
    if ecole_desc:
        score_ecole = 1.0 if ecole_niv >= 4 else (0.70 if ecole_niv == 3 else 0.50)
    else:
        score_ecole = 0.50 if any(u in t for u in ["universite","university","faculte","faculty"]) else 0.0

    score_specialite = 0.50
    for specialite, alignements in _SPECIALITES_BCT.items():
        if specialite in t:
            align = alignements.get(domaine_poste, 0.30)
            if align > score_specialite:
                score_specialite = align

    certifs = ["certification","certified","aws","azure","cisco","pmp",
               "scrum","agile","toefl","ielts","double diplome","double degree"]
    nb_certifs   = sum(1 for c in certifs if c in t)
    score_certif = min(0.15, nb_certifs * 0.05)

    score_edu = min(1.0,
        0.40 * score_niveau +
        0.30 * score_ecole +
        0.20 * score_specialite +
        0.10 * (score_certif / 0.15 if score_certif > 0 else 0)
    )

    log.info("EducationScore=%.3f | niveau=%s école=%s spécialité=%.2f certifs=%d",
             score_edu, niveau_detecte or "?", ecole_desc[:20] if ecole_desc else "?",
             score_specialite, nb_certifs)

    return {
        "score":          round(score_edu, 4),
        "niveau_detecte": niveau_detecte or "non détecté",
        "ecole_detectee": ecole_desc or "non détectée",
        "score_detail": {
            "niveau":         round(score_niveau, 3),
            "ecole":          round(score_ecole, 3),
            "specialite":     round(score_specialite, 3),
            "certifications": round(score_certif, 3),
        }
    }


_DOMAINES_BOOST = {
    "fullstack_web": {
        "cv_keys":  ["react","node","javascript","typescript","spring","docker",
                     "mongodb","mysql","angular","express","nestjs","api","rest"],
        "job_keys": ["full stack","fullstack","web","react","node","javascript",
                     "spring boot","gestion","hospitaliere","plateforme","backend","frontend"],
        "bonus": 8.0,
    },
    "ml_nlp": {
        "cv_keys":  ["python","tensorflow","pytorch","bert","nlp","machine learning","sklearn"],
        "job_keys": ["machine learning","nlp","bert","deep learning","ia","intelligence artificielle"],
        "bonus": 8.0,
    },
    "devops_cloud": {
        "cv_keys":  ["docker","kubernetes","aws","azure","jenkins","terraform","linux"],
        "job_keys": ["devops","cloud","kubernetes","docker","ci/cd","infrastructure"],
        "bonus": 8.0,
    },
    "data_analyst": {
        "cv_keys":  ["sql","pandas","power bi","tableau","excel","python","statistiques"],
        "job_keys": ["data analyst","bi","reporting","tableau","power bi","sql","analytics"],
        "bonus": 7.0,
    },
    "finance": {
        "cv_keys":  ["audit","comptabilite","ifrs","finance","excel","vba","bilan"],
        "job_keys": ["audit","finance","comptable","ifrs","risque","credit"],
        "bonus": 7.0,
    },
    "cybersecurity": {
        "cv_keys":  ["securite","pentest","linux","firewall","iso 27001","siem","reseau"],
        "job_keys": ["securite","cybersecurite","pentest","audit securite","siem"],
        "bonus": 7.0,
    },
    "econometrie": {
        "cv_keys":  ["econometrie","statistiques","var","arima","r","python","matlab",
                     "series temporelles","regression","prevision","modelisation"],
        "job_keys": ["econometrie","var","arima","prevision","macroeconomique",
                     "taux change","politique monetaire","liquidite","dette"],
        "bonus": 7.0,
    },
    "audit_interne": {
        "cv_keys":  ["audit","conformite","risques","gouvernance","controle",
                     "ifrs","bale","compliance","gestion risques"],
        "job_keys": ["audit interne","gouvernance","risques operationnels",
                     "controle interne","recommandations audit","banque centrale"],
        "bonus": 7.0,
    },
    "economie_bancaire": {
        "cv_keys":  ["economie","finance","banque","monetaire","credit","inflation",
                     "macro","microeconomie","developpement","croissance"],
        "job_keys": ["economie monetaire","politique monetaire","inclusion financiere",
                     "dette publique","taux change","balance courante","liquidite"],
        "bonus": 6.0,
    },
    "genie_logiciel": {
        "cv_keys":  ["java","spring","python","sql","mysql","postgresql","git",
                     "application","gestion","backend","api","rest","docker"],
        "job_keys": ["application","gestion","genie logiciel","developpement",
                     "swift","tableau bord","bct","systeme information"],
        "bonus": 7.0,
    },
}

def _domain_boost(texte_cv: str, texte_poste: str) -> float:
    """Bonus domaine (0→8 pts) : récompense quand le domaine du CV matche le poste."""
    cv_lower    = _normaliser_accents(texte_cv).lower()
    poste_lower = _normaliser_accents(texte_poste).lower()
    meilleur_bonus = 0.0
    for cfg in _DOMAINES_BOOST.values():
        cv_matches  = sum(1 for k in cfg["cv_keys"]  if k in cv_lower)
        job_matches = sum(1 for k in cfg["job_keys"] if k in poste_lower)
        if cv_matches >= 2 and job_matches >= 1:
            ratio = min(1.0, (cv_matches + job_matches) /
                        (len(cfg["cv_keys"]) + len(cfg["job_keys"])) * 3)
            bonus = cfg["bonus"] * ratio
            if bonus > meilleur_bonus:
                meilleur_bonus = bonus
    return round(meilleur_bonus, 2)


def _scorer_cv(texte_cv: str, titre: str, description: str,
               competences: List[str], lettre: str = "") -> dict:
    """Pipeline complet NLP+BERT (7 étapes, porté de cv_scorer.py) → score /100."""

    texte_poste = f"{titre} {description} {' '.join(competences)}"

    tfidf_sim   = _calculer_tfidf(texte_cv, texte_poste)
    bert_scores = _calculer_bert(texte_cv, titre, description, competences)
    bert_sim    = bert_scores["global"]
    skills      = _calculer_skills(texte_cv, competences)
    lettre_norm = _calculer_lettre(lettre, titre)

    struct_result = _calculer_score_structurel_nlp(texte_cv, texte_poste, competences)
    score_str     = struct_result["score"]

    exp_result = _calculer_experience_score(texte_cv, competences)
    exp_score  = exp_result["score"]

    domaine_poste, _ = _classifier_domaine_bert(texte_poste[:400])
    edu_result = _calculer_education_score(texte_cv, domaine_poste)
    edu_score  = edu_result["score"]

    bert_desc_sim  = bert_scores["description"]
    skills_norm    = skills["ratio"]
    semantic_score = 0.75 * bert_desc_sim + 0.25 * tfidf_sim

    infos = _extraire_infos(texte_cv)

    domain_bonus = min(5.0, _domain_boost(texte_cv, texte_poste) * 0.5)

    # ══════════════════════════════════════════════════════════════════════
    #  FORMULE FINALE RH — 5 critères académiques (identique à cv_scorer.py)
    #  FINAL = 0.35×Semantic + 0.25×Skills + 0.20×Experience
    #        + 0.10×Education + 0.05×Structure + 0.05×Lettre + DomainBoost
    # ══════════════════════════════════════════════════════════════════════
    raw = (0.35 * semantic_score +
           0.25 * skills_norm +
           0.20 * exp_score +
           0.10 * edu_score +
           0.05 * score_str +
           0.05 * lettre_norm)

    raw_pct = raw * 100
    if   raw_pct < 20: raw_pct = raw_pct * 1.10
    elif raw_pct > 85: raw_pct = 85 + (raw_pct - 85) * 0.50

    score = round(min(100.0, max(0.0, raw_pct + domain_bonus)), 1)

    log.info("Score=%.1f | Sem=%.3f Ski=%.3f Exp=%.3f Edu=%.3f Str=%.3f Let=%.3f Boost=+%.1f",
             score, semantic_score, skills_norm, exp_score, edu_score, score_str, lettre_norm, domain_bonus)

    compat = "Élevée" if score >= 75 else "Moyenne" if score >= 50 else "Faible"
    if   score >= 80: reco = "Hautement recommandé"
    elif score >= 65: reco = "Recommandé"
    elif score >= 50: reco = "Profil intéressant"
    elif score >= 35: reco = "Profil partiel"
    else:             reco = "Non adapté"

    detail = {
        "semantique":  round(min(35, semantic_score * 35), 1),
        "competences": round(min(25, skills_norm * 25), 1),
        "experience":  round(min(20, exp_score * 20), 1),
        "formation":   round(min(10, edu_score * 10), 1),
        "structure":   round(min(5,  score_str * 5), 1),
        "lettre":      round(min(5,  lettre_norm * 5), 1),
    }

    forts, faibles = [], []
    if bert_sim >= 0.65:     forts.append(f"Forte cohérence sémantique BERT ({bert_sim:.2f})")
    elif bert_sim < 0.35:    faibles.append(f"Faible similarité sémantique ({bert_sim:.2f})")
    if tfidf_sim >= 0.25:    forts.append(f"Bonne couverture mots-clés TF-IDF ({tfidf_sim:.2f})")
    elif tfidf_sim < 0.08:   faibles.append("Peu de mots-clés du poste dans le CV")
    if skills["presentes"]:  forts.append(f"Compétences présentes : {', '.join(skills['presentes'][:4])}")
    if skills["manquantes"]: faibles.append(f"Compétences manquantes : {', '.join(skills['manquantes'][:3])}")
    if infos["hasGithub"]:   forts.append("Portfolio GitHub/GitLab présent")
    if infos["moisExperience"] >= 12: forts.append(f"~{infos['moisExperience']} mois d'expérience")

    return {
        "scoreTotal":            score,
        "compatibilite":         compat,
        "recommandation":        reco,
        "scoreLettreMotivation": round(lettre_norm * 100),
        "detail": detail,
        "rapport": {
            "pts_forts":  forts or ["Dossier soumis"],
            "pts_faibles": faibles or [],
            "resume": (f"Score NLP+BERT : {score}/100 ({compat}). "
                       f"BERT={bert_sim:.3f} TF-IDF={tfidf_sim:.3f} "
                       f"Skills={len(skills['presentes'])}/{skills['total']}."),
            "recommandation":      reco,
            "questions_entretien": [],
        },
        "formule": {
            "bert_similarity":    round(bert_sim, 4),
            "tfidf_similarity":   round(tfidf_sim, 4),
            "skills_match_ratio": round(skills["ratio"], 4),
            "lettre_score":       round(lettre_norm, 4),
            "domain_boost":       domain_bonus,
            "calcul": (
                f"(0.35×Semantic={semantic_score:.3f}"
                f" + 0.25×Skills={skills_norm:.3f}"
                f" + 0.20×Experience={exp_score:.3f}"
                f" + 0.10×Education={edu_score:.3f}"
                f" + 0.05×Structure={score_str:.3f}"
                f" + 0.05×Lettre={lettre_norm:.3f}"
                f" + DomainBoost={domain_bonus:.1f}) × 100 = {score}"
            ),
            "modele": "bert-fine-tuned-bct" if MODEL_DIR.exists() else "bert-base",
        },
        "bert_scores":    bert_scores,
        "skills":         skills,
        "informations":   infos,
        "nlp_structurel": struct_result,
        "experience":     exp_result,
        "education":      edu_result,
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
    get_bert()         # précharger BERT au démarrage
    preload_deepface() # précharger ArcFace/DeepFace au démarrage (évite ~30s au 1er candidat)
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)