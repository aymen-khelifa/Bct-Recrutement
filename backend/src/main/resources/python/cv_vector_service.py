# ═══════════════════════════════════════════════════════════════════════════════
#  cv_vector_service.py — RAG vectoriel pour le recrutement BCT
#  Flask STANDALONE sur le port 5003
#  Géré par CvVectorProcessManager (Spring Boot)
# ═══════════════════════════════════════════════════════════════════════════════

import io
import re
import os
import logging
import requests
import pdfplumber
import chromadb
from chromadb.config import Settings
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [INFO] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger("cv_vector")

PORT       = int(os.getenv("CV_VECTOR_PORT", 5003))
MODEL_NAME = "sentence-transformers/all-MiniLM-L12-v2"
CHROMA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_cv")

# ── Modèle d'embeddings ────────────────────────────────────────────────────────
log.info("Chargement SentenceTransformer : %s", MODEL_NAME)
_model = SentenceTransformer(MODEL_NAME)
log.info("Modèle prêt (dim=384)")

# ── ChromaDB persistant ────────────────────────────────────────────────────────
_chroma = chromadb.PersistentClient(
    path=CHROMA_DIR,
    settings=Settings(anonymized_telemetry=False)
)
_col_cv     = _chroma.get_or_create_collection("cvs",              metadata={"hnsw:space": "cosine"})
_col_fiches = _chroma.get_or_create_collection("fiches_candidats", metadata={"hnsw:space": "cosine"})
log.info("ChromaDB prêt — cvs=%d chunks, fiches=%d", _col_cv.count(), _col_fiches.count())

# ── Flask ──────────────────────────────────────────────────────────────────────
app = Flask(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  UTILITAIRES
# ═══════════════════════════════════════════════════════════════════════════════

def _extraire_texte_pdf(url: str) -> str:
    # User-Agent navigateur : Cloudinary bloque les requêtes requests "nues"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/124.0 Safari/537.36"
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    texte = ""
    with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
        for page in pdf.pages:
            texte += (page.extract_text() or "") + "\n"
    texte = re.sub(r"[ \t]+", " ", texte)
    texte = re.sub(r"\n{3,}", "\n\n", texte)
    return texte.strip()


def _chunker(texte: str, taille=600, overlap=100):
    chunks, i = [], 0
    while i < len(texte):
        chunk = texte[i:i + taille].strip()
        if chunk:
            chunks.append(chunk)
        i += taille - overlap
    return chunks


def _embed(textes):
    return [v.tolist() for v in _model.encode(textes, normalize_embeddings=True)]


# ═══════════════════════════════════════════════════════════════════════════════
#  HEALTH CHECK (appelé par CvVectorProcessManager pour savoir si le service est prêt)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "cv_chunks": _col_cv.count(), "fiches": _col_fiches.count()}), 200


# ═══════════════════════════════════════════════════════════════════════════════
#  INDEXATION CV (PDF → chunks → ChromaDB)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/cv/index", methods=["POST"])
def indexer_cv():
    """Body : { candidatureId, candidatNom, sujetTitre, cvUrl }"""
    data    = request.get_json(force=True)
    cand_id = str(data.get("candidatureId", ""))
    nom     = data.get("candidatNom", "")
    sujet   = data.get("sujetTitre", "")
    cv_url  = data.get("cvUrl", "")

    if not cand_id or not cv_url:
        return jsonify({"error": "candidatureId et cvUrl requis"}), 400

    try:
        texte = _extraire_texte_pdf(cv_url)
        if not texte:
            return jsonify({"error": "PDF vide ou illisible"}), 422

        chunks = _chunker(texte)
        if not chunks:
            return jsonify({"error": "Aucun contenu extrait"}), 422

        # Supprime l'ancienne version si elle existe
        try:
            _col_cv.delete(where={"candidatureId": cand_id})
        except Exception:
            pass

        ids       = [f"{cand_id}_{i}" for i in range(len(chunks))]
        metadatas = [{"candidatureId": cand_id, "candidatNom": nom,
                      "sujetTitre": sujet, "chunkIndex": i}
                     for i in range(len(chunks))]

        _col_cv.add(ids=ids, embeddings=_embed(chunks), documents=chunks, metadatas=metadatas)
        log.info("CV indexé : %s (#%s) → %d chunks", nom, cand_id, len(chunks))
        return jsonify({"message": "CV indexé", "chunks": len(chunks)}), 200

    except Exception as e:
        log.error("Erreur indexation CV : %s", e)
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  INDEXATION FICHES CANDIDATS (scores, statut — envoyés depuis Java)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/candidat/index-batch", methods=["POST"])
def indexer_fiches_batch():
    """Body : { fiches: [ { candidatureId, candidatNom, texte }, ... ] }"""
    data   = request.get_json(force=True)
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

        _col_fiches.add(ids=ids, embeddings=_embed(docs), documents=docs, metadatas=metas)
        log.info("%d fiches candidats indexées", len(ids))
        return jsonify({"message": "Fiches indexées", "indexees": len(ids)}), 200

    except Exception as e:
        log.error("Erreur indexation fiches : %s", e)
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  RECHERCHE — fusionne fiches + contenu CV
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/cv/search", methods=["POST"])
def rechercher():
    """Body : { query, top_k? }"""
    data  = request.get_json(force=True)
    query = data.get("query", "").strip()
    top_k = int(data.get("top_k", 5))
    if not query:
        return jsonify({"resultats": []}), 200

    try:
        q_emb    = _embed([query])[0]
        resultats = []

        # Fiches candidats (scores, statut, nom)
        if _col_fiches.count() > 0:
            rf = _col_fiches.query(query_embeddings=[q_emb], n_results=min(top_k, _col_fiches.count()))
            for doc, meta, dist in zip(rf["documents"][0], rf["metadatas"][0], rf["distances"][0]):
                resultats.append({
                    "type": "fiche", "extrait": doc,
                    "candidatNom": meta.get("candidatNom", ""),
                    "score": round(1 - dist, 3)
                })

        # Contenu CV (compétences, expériences)
        if _col_cv.count() > 0:
            rc = _col_cv.query(query_embeddings=[q_emb], n_results=min(top_k, _col_cv.count()))
            for doc, meta, dist in zip(rc["documents"][0], rc["metadatas"][0], rc["distances"][0]):
                resultats.append({
                    "type": "cv", "extrait": doc,
                    "candidatNom": meta.get("candidatNom", ""),
                    "sujetTitre": meta.get("sujetTitre", ""),
                    "score": round(1 - dist, 3)
                })

        resultats.sort(key=lambda x: x["score"], reverse=True)
        log.info("Recherche '%s' → %d résultats", query[:60], len(resultats))
        return jsonify({"resultats": resultats[:top_k + 5]}), 200

    except Exception as e:
        log.error("Erreur recherche : %s", e)
        return jsonify({"error": str(e), "resultats": []}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  SUPPRESSION & STATS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/cv/<cand_id>", methods=["DELETE"])
def supprimer(cand_id):
    try:
        _col_cv.delete(where={"candidatureId": str(cand_id)})
        try:
            _col_fiches.delete(ids=[f"fiche_{cand_id}"])
        except Exception:
            pass
        return jsonify({"message": "Index supprimé", "candidatureId": cand_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/cv/stats", methods=["GET"])
def stats():
    return jsonify({"cv_chunks": _col_cv.count(), "fiches": _col_fiches.count()}), 200


# ═══════════════════════════════════════════════════════════════════════════════
#  LANCEMENT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log.info("Démarrage sur le port %d", PORT)
    app.run(host="0.0.0.0", port=PORT, debug=False)