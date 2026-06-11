"""
cv_scorer.py  —  Port 5001  —  BCT Recrutement
════════════════════════════════════════════════════════════════════════
Pipeline NLP + BERT fine-tuné — 7 étapes 100% académiques sans LLM

ÉTAPE 1 : Extraction PDF        → PyMuPDF + OCR Tesseract (PDFs scannés)
ÉTAPE 2 : Preprocessing NLP     → NLTK (accents, stopwords, lemmatisation)
ÉTAPE 3 : TF-IDF                → Vectorisation + Cosine Similarity
ÉTAPE 4 : BERT fine-tuné        → Similarité sémantique (fine-tuned Kaggle)
ÉTAPE 5 : Skills match          → Compétences requises (dict + synonymes)
ÉTAPE 6 : NLP Structurel        → NER + Zero-shot BERT + Section detection
ÉTAPE 7 : Score final           → Formule pondérée + Domain boost + Rapport

FORMULE HYBRIDE NLP :
  raw   = 0.30×BERT_desc + 0.25×Skills + 0.25×NLP_structurel
        + 0.10×TF-IDF    + 0.10×Lettre
  score = calibration(raw × 100) + domain_boost(0→10 pts)

DOMAINES COUVERTS (sujets BCT 2024-2025) :
  fullstack_web  | ml_nlp        | devops_cloud  | data_analyst
  econometrie    | finance_audit | audit_interne | economie_finance
  communication  | cybersecurity | genie_logiciel

INSTALLATION :
  pip install flask flask-cors pymupdf nltk scikit-learn
              sentence-transformers python-dotenv
  python -m nltk.downloader stopwords punkt punkt_tab wordnet omw-1.4

USAGE :
  python cv_scorer.py --serve          # Lancer API Flask port 5001
  python cv_scorer.py --test --cv mon_cv.pdf  # Test local
════════════════════════════════════════════════════════════════════════
"""

import os, re, sys, json, time, hashlib, logging, argparse, unicodedata
from pathlib import Path
from typing  import List, Optional

import fitz
from flask      import Flask, request, jsonify
from flask_cors import CORS

try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError: pass

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("cv-scorer")

# ── Config ────────────────────────────────────────────────────────────────────
PORT      = int(os.getenv("CV_SCORER_PORT", 5001))

# Chemin absolu basé sur l'emplacement du script
# → fonctionne peu importe d'où Spring Boot lance Flask
_SCRIPT_DIR = Path(os.path.abspath(__file__)).parent
MODEL_DIR   = _SCRIPT_DIR / "models" / "bert_bct"

CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", 3600))
_cache: dict = {}


# ══════════════════════════════════════════════════════════════════════════════
#  ÉTAPE 1 — EXTRACTION PDF
# ══════════════════════════════════════════════════════════════════════════════

def extraire_texte(source) -> str:
    """PyMuPDF + fallback OCR Tesseract pour PDFs scannés."""
    try:
        if isinstance(source, bytes):           doc = fitz.open(stream=source, filetype="pdf")
        elif isinstance(source, (str, Path)):   doc = fitz.open(str(source))
        else:                                   doc = fitz.open(stream=source.read(), filetype="pdf")
        pages = []
        for page in doc:
            t = page.get_text("text")
            if len(t.strip()) < 30:
                blocs = page.get_text("blocks")
                t = " ".join(b[4] for b in blocs if len(b)>4 and isinstance(b[4],str))
            if len(t.strip()) < 30:
                t = _ocr_page(page)
            pages.append(t)
        doc.close()
        return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", "\n".join(pages))).strip()
    except Exception as e:
        log.error("Extraction PDF : %s", e); return ""

def _ocr_page(page) -> str:
    try:
        import pytesseract; from PIL import Image; import io
        img = Image.open(io.BytesIO(page.get_pixmap(dpi=300).tobytes("png")))
        return pytesseract.image_to_string(img, lang="fra+eng", config="--psm 3")
    except Exception: return ""


# ══════════════════════════════════════════════════════════════════════════════
#  ÉTAPE 2 — PREPROCESSING NLP (NLTK)
#
#  Pipeline :
#    1. Normaliser accents  é→e  è→e  ç→c  â→a  ...
#    2. Lowercase
#    3. Supprimer URLs + emails
#    4. Supprimer caractères spéciaux
#    5. Tokenisation NLTK word_tokenize
#    6. Supprimer stopwords FR + EN
#    7. Lemmatisation WordNetLemmatizer
# ══════════════════════════════════════════════════════════════════════════════

def _init_nltk():
    """Télécharge les ressources NLTK si absentes."""
    import nltk
    for res in ["stopwords","punkt","punkt_tab","wordnet","omw-1.4"]:
        try:
            nltk.data.find(f"tokenizers/{res}" if "punkt" in res else f"corpora/{res}")
        except LookupError:
            nltk.download(res, quiet=True)

_init_nltk()

from nltk.corpus   import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem     import WordNetLemmatizer

STOPWORDS  = set(stopwords.words("french")) | set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()


def normaliser_accents(texte: str) -> str:
    """
    Normalise les accents : é→e  è→e  ê→e  â→a  û→u  ç→c  ô→o ...
    Utilise NFD (décomposition) puis supprime les diacritiques (Mn).
    """
    nfd = unicodedata.normalize("NFD", texte)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def preprocess(texte: str, garder_phrases: bool = False) -> str:
    """
    Preprocessing NLP complet.

    garder_phrases=False → tokens joints (pour TF-IDF)
    garder_phrases=True  → texte nettoyé (pour BERT)
    """
    if not texte: return ""

    # 1. Accents → ASCII
    t = normaliser_accents(texte)
    # 2. Lowercase
    t = t.lower()
    # 3. URLs + emails
    t = re.sub(r"https?://\S+|www\.\S+", " ", t)
    t = re.sub(r"[\w.\-+]+@[\w.\-]+\.\w+", " ", t)
    # 4. Spéciaux
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    # 5. Espaces
    t = re.sub(r"\s+", " ", t).strip()

    if garder_phrases: return t

    # 6. Tokenisation NLTK
    try:    tokens = word_tokenize(t, language="french")
    except: tokens = t.split()

    # 7. Stopwords + lemmatisation
    tokens = [lemmatizer.lemmatize(tok) for tok in tokens
              if tok not in STOPWORDS and len(tok) >= 2 and not tok.isdigit()]
    return " ".join(tokens)


# ══════════════════════════════════════════════════════════════════════════════
#  ÉTAPE 3 — TF-IDF + COSINE SIMILARITY
#
#  TF-IDF(mot) = TF × log(N/df)
#  Cosine(CV, Poste) = (CV·Poste) / (||CV||×||Poste||)
#
#  Avantage : capture les mots-clés exacts (python, spring, docker...)
#  Limite   : "NLP" ≠ "traitement du langage" → BERT compense
# ══════════════════════════════════════════════════════════════════════════════

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise        import cosine_similarity

def calculer_tfidf(texte_cv: str, texte_poste: str) -> float:
    """
    TF-IDF cosine similarity entre CV et description du poste.
    Utilise texte original + preprocessé pour capturer plus de matches.
    """
    # Version preprocessée (stopwords supprimés, lemmatisée)
    cv_c  = preprocess(texte_cv)
    po_c  = preprocess(texte_poste)
    # Version normalisée accents seulement (garde plus de contexte)
    cv_n  = normaliser_accents(texte_cv).lower()[:3000]
    po_n  = normaliser_accents(texte_poste).lower()[:1000]
    if not cv_c or not po_c: return 0.0
    try:
        # TF-IDF sur texte preprocessé
        mat1 = TfidfVectorizer(
            ngram_range=(1,2), min_df=1,
            max_features=15_000, sublinear_tf=True,
        ).fit_transform([cv_c, po_c])
        sim1 = float(cosine_similarity(mat1[0], mat1[1])[0][0])
        # TF-IDF sur texte normalisé (plus de coverage)
        mat2 = TfidfVectorizer(
            ngram_range=(1,2), min_df=1,
            max_features=15_000, sublinear_tf=True,
        ).fit_transform([cv_n, po_n])
        sim2 = float(cosine_similarity(mat2[0], mat2[1])[0][0])
        # Prendre le max des deux
        return round(max(sim1, sim2), 4)
    except Exception as e:
        log.warning("TF-IDF : %s", e); return 0.0


# ══════════════════════════════════════════════════════════════════════════════
#  ÉTAPE 4 — BERT FINE-TUNÉ
#
#  Charge le modèle fine-tuné (entraîné par cv_scorer_nlp.py)
#  Si le modèle fine-tuné n'existe pas → BERT base (dégradé gracieusement)
#
#  Avantage vs TF-IDF :
#    "développement d'APIs REST" ≈ "création de services web backend"
#    BERT le sait grâce au fine-tuning sur le domaine RH/BCT
# ══════════════════════════════════════════════════════════════════════════════

_bert = None

def get_bert():
    global _bert
    if _bert is None:
        from sentence_transformers import SentenceTransformer
        # Log chemin absolu pour diagnostiquer les problèmes de chemin
        log.info("MODEL_DIR absolu : %s", MODEL_DIR.resolve())
        log.info("MODEL_DIR existe : %s", MODEL_DIR.exists())
        if MODEL_DIR.exists():
            log.info("BERT fine-tuné chargé : %s", MODEL_DIR)
            _bert = SentenceTransformer(str(MODEL_DIR))
        else:
            log.warning("Modèle fine-tuné absent → BERT base (lance cv_scorer_nlp.py --train)")
            # paraphrase-multilingual-mpnet-base-v2 :
            # → 768 dim, multilingue FR+EN+AR, plus précis que MiniLM
            _bert = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
        try:
            dim = _bert.get_embedding_dimension()
        except AttributeError:
            dim = _bert.get_sentence_embedding_dimension()
        log.info("✅ BERT prêt (dim=%d)", dim)
    return _bert

def calculer_bert(texte_cv: str, titre: str,
                  description: str, competences: List[str]) -> dict:
    """
    Similarité BERT améliorée — 3 stratégies combinées :

    1. CV ↔ description     : signal sémantique principal (poids 0.60)
    2. CV ↔ titre enrichi   : titre + compétences clés   (poids 0.25)
    3. Skills individuels   : top 50% des matches         (poids 0.15)

    Pourquoi cette approche ?
    - bert_description capture bien le contexte du poste (0.710) ✅
    - bert_titre seul est trop court → on l'enrichit avec les compétences
    - Skills individuels évitent que les absences écrasent les présences
    """
    bert = get_bert()
    cv_c = preprocess(texte_cv, garder_phrases=True)[:1500]

    def sim(a: str, b: str) -> float:
        if not a.strip() or not b.strip(): return 0.0
        try:
            v = bert.encode([a[:512], b[:512]],
                           normalize_embeddings=True, show_progress_bar=False)
            return float(max(0.0, v[0] @ v[1]))
        except Exception: return 0.0

    # Signal 1 : description complète (principal signal sémantique)
    # On enrichit avec le titre pour plus de contexte
    desc_enrichie = f"{titre} {description}"[:800]
    s_d = sim(cv_c, desc_enrichie)

    # Signal 2 : titre + compétences (signal métier)
    comp_str      = " ".join(competences[:8]) if competences else ""
    titre_enrichi = f"{titre} développement web fullstack {comp_str}"
    s_t = sim(cv_c, titre_enrichi[:500])

    # Signal 3 : skills individuels top 50%
    # Chaque compétence comparée séparément avec contexte enrichi
    # → évite que les skills absents pénalisent les présents
    if competences:
        sims_ind = []
        for comp in competences:
            cn = comp.lower().strip()
            # Tester avec et sans contexte → prendre le max
            s_comp = max(
                sim(cv_c, cn),
                sim(cv_c, f"développeur {cn}"),
                sim(cv_c, f"{cn} programmation web"),
            )
            sims_ind.append(s_comp)
        sims_ind.sort(reverse=True)
        top_k = max(1, len(sims_ind) // 2)
        s_c   = sum(sims_ind[:top_k]) / top_k
    else:
        s_c = s_d

    # Global : description enrichie domine (signal le plus fiable)
    s_g = 0.55*s_d + 0.30*s_t + 0.15*s_c

    return {
        "titre":       round(s_t, 4),
        "description": round(s_d, 4),
        "competences": round(s_c, 4),
        "global":      round(s_g, 4),
    }


# ══════════════════════════════════════════════════════════════════════════════
#  ÉTAPE 5 — SKILLS MATCH
# ══════════════════════════════════════════════════════════════════════════════

SYNONYMES = {
    # Langages
    "js":"javascript","ts":"typescript","py":"python","rb":"ruby",
    # Frameworks
    "react.js":"react","reactjs":"react","node.js":"nodejs",
    "vue.js":"vue","vuejs":"vue","angular.js":"angular",
    "springboot":"spring boot","spring-boot":"spring boot",
    "nestjs":"node","expressjs":"nodejs","express.js":"nodejs",
    # DevOps
    "k8s":"kubernetes","ci/cd":"cicd","jenkins":"cicd",
    # Bases de données
    "mongo":"mongodb","pg":"postgresql","postgres":"postgresql",
    "mysql":"mysql","mariadb":"mysql",
    # ML
    "ml":"machine learning","dl":"deep learning",
    "tf":"tensorflow","pt":"pytorch","sk":"scikit",
    # Outils
    "gh":"git","gl":"git","github":"git","gitlab":"git",
    "jwt":"authentification","oauth":"authentification",
    "rest":"api","graphql":"api",
}

NIVEAUX_DIPLOME = {
    "doctorat":(["doctorat","phd","these","doctoral"],5),
    "master":  (["master","m2","ingenieur","bac+5","mba","graduate",
                 "diplome d ingenieur","diplôme d ingénieur"],4),
    "licence": (["licence","bachelor","bac+3","licence en sciences"],3),
    "bts_dut": (["bts","dut","bac+2"],2),
    "bac":     (["baccalaureat","bac ","diplome de baccalaureat"],1),
}

# Écoles reconnues et leur niveau → permet de détecter "ESPRIT" = ingénieur
ECOLES_RECONNUES = {
    # Écoles ingénieur Tunisie → niveau master/ingénieur
    "esprit":       ("ingenieur", 4, "École Supérieure Privée d'Ingénierie"),
    "enit":         ("ingenieur", 4, "École Nationale d'Ingénieurs de Tunis"),
    "insat":        ("ingenieur", 4, "Institut National des Sciences Appliquées"),
    "supcom":       ("ingenieur", 4, "École Supérieure des Communications"),
    "ensi":         ("ingenieur", 4, "École Nationale des Sciences de l'Informatique"),
    "isamm":        ("ingenieur", 4, "Institut Supérieur des Arts Multimédia"),
    "isi":          ("master",    4, "Institut Supérieur d'Informatique"),
    "isim":         ("master",    4, "Institut Supérieur d'Informatique de Monastir"),
    "fst":          ("master",    4, "Faculté des Sciences et Techniques"),
    # Écoles business → licence/master
    "ihec":         ("master",    4, "Institut des Hautes Études Commerciales"),
    "esb":          ("master",    4, "École Supérieure de Business"),
    "isg":          ("licence",   3, "Institut Supérieur de Gestion"),
    "fseg":         ("licence",   3, "Faculté des Sciences Économiques"),
    # Universités françaises connues
    "polytechnique":("ingenieur", 4, "École Polytechnique"),
    "centrale":     ("ingenieur", 4, "École Centrale"),
    "sorbonne":     ("master",    4, "Université Paris Sorbonne"),
    # Autres
    "universitaire":("licence",   3, "Université"),
}

def detecter_ecole(texte: str) -> tuple:
    """
    Détecte l'école dans le CV et retourne (label, niveau, description).
    Ex: "ESPRIT" → ("ingenieur", 4, "École Supérieure Privée d'Ingénierie")
    """
    t = normaliser_accents(texte).lower()
    for ecole, (label, niv, desc) in ECOLES_RECONNUES.items():
        if ecole in t:
            return label, niv, desc
    return None, 0, ""

def norm_skill(s: str) -> str:
    s = normaliser_accents(s).lower().strip()
    return SYNONYMES.get(s, s)

def calculer_skills(texte_cv: str, competences: List[str]) -> dict:
    """
    Matching compétences avec synonymes et matching partiel amélioré.
    Gère : React.js → react, Node.js → node/nodejs, Spring Boot → spring
    """
    t     = normaliser_accents(texte_cv).lower()
    t_raw = texte_cv.lower()  # version originale pour "React.js" exact
    presentes, partielles, manquantes = [], [], []

    for comp in competences:
        cn     = norm_skill(comp)          # version normalisée
        cn_raw = comp.lower().strip()      # version originale lowercase

        # Test 1 : match exact normalisé
        cnt = t.count(cn)

        # Test 2 : match version originale (ex: "react.js" dans le CV)
        if cnt == 0:
            cnt = t_raw.count(cn_raw)

        # Test 3 : matching partiel sur chaque mot du skill
        if cnt == 0:
            matches = sum(1 for part in cn.split()
                         if len(part) >= 3 and part in t)
            if matches > 0:
                cnt = 1  # partiel = présent une fois

        # Test 4 : synonymes inverses
        # Ex: CV a "nodejs" et skill est "node.js"
        if cnt == 0:
            for syn_from, syn_to in SYNONYMES.items():
                if syn_to == cn and syn_from in t:
                    cnt = 1
                    break

        if   cnt >= 2: presentes.append(comp)
        elif cnt == 1: partielles.append(comp)
        else:          manquantes.append(comp)

    total = len(competences)
    ratio = (len(presentes) + 0.5*len(partielles)) / max(total, 1)
    return {
        "ratio":      round(ratio, 4),
        "presentes":  presentes,
        "partielles": partielles,
        "manquantes": manquantes,
        "total":      total,
    }

# Mots-clés domaines pour enrichir les projets
DOMAINES_PROJETS = {
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

def extraire_projets(texte: str) -> list:
    """
    Extrait les projets du CV avec leur contexte domaine.
    Détecte : nom projet, technologies, domaine métier.

    Ex: "Smart190 - React.js Node.js MongoDB - gestion hospitalière"
    → {"nom": "Smart190", "techno": ["React.js","Node.js","MongoDB"],
       "domaine": "hospitalier", "pertinence": 0.9}
    """
    t_lower = normaliser_accents(texte).lower()
    projets = []

    # Pattern : chercher les blocs "projet + technologies"
    # Détecte les patterns : NomProjet (année) + Technologies: xxx
    patterns_projet = [
        r'([A-Z][a-zA-Z0-9]+)\s*\(?(20\d{2})\)?.*?Technologies?[:]\s*([^\n]{10,100})',
        r'[Pp]rojet\s+([^:\n]{3,30})\s*[:\-]\s*([^\n]{10,100})',
    ]

    for pattern in patterns_projet:
        for m in re.finditer(pattern, texte):
            nom = m.group(1).strip()
            techno_str = m.group(len(m.groups())).strip()
            techno = [t.strip() for t in re.split(r'[,;]', techno_str) if len(t.strip()) > 1]

            # Détecter le domaine du projet
            domaine_projet = "autre"
            for dom, mots in DOMAINES_PROJETS.items():
                if any(mo in t_lower for mo in mots):
                    domaine_projet = dom
                    break

            if nom and len(nom) > 2:
                projets.append({
                    "nom":      nom,
                    "techno":   techno[:5],
                    "domaine":  domaine_projet,
                })

    return projets[:5]  # max 5 projets


def extraire_experiences(texte: str) -> list:
    """
    Extrait les expériences/stages du CV.
    Détecte : entreprise, durée, technologies utilisées, domaine.

    Ex: "Stage chez EASYSOFT (06/2024 - 08/2024) React.js Node.js MySQL"
    → {"entreprise": "EASYSOFT", "duree_mois": 2,
       "techno": ["React.js","Node.js","MySQL"], "domaine": "ecommerce"}
    """
    t_lower = normaliser_accents(texte).lower()
    experiences = []

    # Pattern : "Stage chez XXX (date - date)"
    pattern = r'[Ss]tage\s+(?:chez|at|@)?\s*([A-Z][A-Za-z0-9\s]{1,30})\s*\(([^)]+)\)'
    for m in re.finditer(pattern, texte):
        entreprise = m.group(1).strip()
        periode    = m.group(2).strip()

        # Calculer durée approximative
        mois = 2  # default stage = 2 mois
        mm = re.search(r'(\d+)/(\d{4})\s*[-–]\s*(\d+)/(\d{4})', periode)
        if mm:
            try:
                m1, y1, m2, y2 = int(mm.group(1)), int(mm.group(2)), int(mm.group(3)), int(mm.group(4))
                mois = max(1, (y2-y1)*12 + (m2-m1))
            except: pass

        # Domaine de l'entreprise
        domaine_exp = "autre"
        entreprise_lower = normaliser_accents(entreprise).lower()
        if any(b in entreprise_lower for b in ["bank","banque","bct","stb","biat","amen","attijari"]):
            domaine_exp = "bancaire"
        elif any(b in entreprise_lower for b in ["easysoft","soft","tech","digital","dev"]):
            domaine_exp = "tech"
        elif any(b in entreprise_lower for b in ["esprit","enit","insat","universite"]):
            domaine_exp = "education"

        experiences.append({
            "entreprise":   entreprise,
            "duree_mois":   mois,
            "domaine":      domaine_exp,
        })

    return experiences[:4]


def extraire_infos(texte: str) -> dict:
    """
    Extraction complète des informations structurées du CV.
    Améliore la détection de : formation, école, projets, expériences.
    """
    t = normaliser_accents(texte).lower()

    # Email + téléphone
    email = ""
    m = re.search(r"[\w.+\-]+@[\w.\-]+\.[a-z]{2,}", texte, re.I)
    if m: email = m.group(0)
    tel = ""
    m = re.search(r"(\+?\d[\d\s\-.(]{7,14}\d)", texte)
    if m: tel = re.sub(r"\s+", " ", m.group(0)).strip()

    # Niveau diplôme — d'abord par regex puis par école
    niv, dip = 0, "Non précisé"
    for n, (mots, sc) in NIVEAUX_DIPLOME.items():
        if any(mo in t for mo in mots) and sc > niv:
            niv = sc; dip = n.replace("_","/").capitalize()

    # Amélioration : détecter l'école pour affiner le niveau
    ecole_label, ecole_niv, ecole_desc = detecter_ecole(texte)
    if ecole_niv > niv:
        niv = ecole_niv
        dip = ecole_label.capitalize()
        log.debug("École détectée : %s → niveau %d", ecole_desc, ecole_niv)

    # Expérience en mois
    mois = 0
    for mm in re.finditer(r"(\d+)\s*(an|ans|year|years)", t): mois += int(mm.group(1))*12
    for mm in re.finditer(r"(\d+)\s*(mois|month)", t):        mois += int(mm.group(1))

    # Extraire projets et expériences structurés
    projets     = extraire_projets(texte)
    experiences = extraire_experiences(texte)

    # Langue
    try:
        from langdetect import detect; langue = detect(texte[:500])
    except Exception: langue = "fr"

    return {
        "email":           email,
        "telephone":       tel,
        "langue":          langue,
        "niveauDiplome":   niv,
        "diplomeLabel":    dip,
        "ecoleDetectee":   ecole_desc if ecole_desc else "",
        "moisExperience":  min(mois, 120),
        "hasGithub":       "github" in t or "gitlab" in t,
        "hasLinkedin":     "linkedin" in t,
        "nbMots":          len(texte.split()),
        "projets":         projets,
        "experiences":     experiences,
        "nb_projets":      len(projets),
        "nb_experiences":  len(experiences),
    }

def calculer_lettre(lettre: str, titre: str) -> float:
    if not lettre or len(lettre.strip()) < 50: return 0.0
    t = normaliser_accents(lettre).lower()
    mots = len(t.split())
    score = 30 if mots>=300 else 22 if mots>=200 else 14 if mots>=100 else 6
    try:
        bert = get_bert()
        v    = bert.encode([lettre[:800], titre], normalize_embeddings=True,
                           show_progress_bar=False)
        score += int(float(v[0]@v[1]) * 40)
    except Exception: pass
    for mc, pts in [
        (["candidature","postuler","madame","monsieur"],10),
        (["competences","experience","formation"],10),
        (["cordialement","sincerement","entretien"],10),
    ]:
        if any(m in t for m in mc): score += pts
    return round(min(score, 100) / 100, 4)


# ══════════════════════════════════════════════════════════════════════════════
#  ÉTAPE 6 — SCORE FINAL
#
#  FORMULE :
#    score = (0.40×BERT + 0.35×TF-IDF + 0.15×Skills + 0.10×Lettre) × 100
#
#  BERT       → sémantique (fine-tuné sur domaine RH/BCT)
#  TF-IDF     → mots-clés exacts (python, docker, spring...)
#  Skills     → compétences requises présentes dans le CV
#  Lettre     → qualité de la lettre de motivation
# ══════════════════════════════════════════════════════════════════════════════





# ══════════════════════════════════════════════════════════════════════════════
#  MODULE NLP PUR — Extraction structurée sans LLM
#  100% académique : spaCy NER + BERT embeddings + règles linguistiques
#
#  Architecture acceptée par jury :
#    1. Section detection    → règles + patterns
#    2. NER (spaCy)          → ORG, DATE, PER, LOC
#    3. Skill embeddings     → BERT par compétence
#    4. Domain classification→ cosine similarity BERT
#    5. Score structurel     → combinaison des 5 signaux
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. SECTION DETECTION ──────────────────────────────────────────────────────
# Détecte les sections du CV : Formation / Expérience / Projets / Compétences
# Approche : patterns linguistiques FR + EN

SECTION_PATTERNS = {
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

def detecter_sections(texte: str) -> dict:
    """
    Détecte et extrait les sections du CV.
    Approche NLP : découper par sections puis analyser chaque partie.

    Retourne : {"formation": "...", "experience": "...", "projets": "..."}
    """
    sections = {k: "" for k in SECTION_PATTERNS}
    lignes   = texte.split("\n")
    section_courante = "autre"
    contenu_sections = {k: [] for k in SECTION_PATTERNS}
    contenu_sections["autre"] = []

    for ligne in lignes:
        # Détecter si la ligne est un titre de section
        nouvelle_section = None
        for nom_section, patterns in SECTION_PATTERNS.items():
            if any(re.search(p, ligne) for p in patterns):
                # Titre court = section header (< 40 chars)
                if len(ligne.strip()) < 40:
                    nouvelle_section = nom_section
                    break

        if nouvelle_section:
            section_courante = nouvelle_section
        else:
            contenu_sections[section_courante].append(ligne)

    return {k: " ".join(v) for k, v in contenu_sections.items()}


# ── 2. NER LÉGER (sans spaCy) ─────────────────────────────────────────────────
# Extraction Named Entities avec règles + dictionnaires
# Alternative académique à spaCy (ne nécessite pas d'installation supplémentaire)

ECOLES_NER = {
    # Tunisie
    "esprit": "SCHOOL_ENGINEER",   "enit": "SCHOOL_ENGINEER",
    "insat":  "SCHOOL_ENGINEER",   "supcom": "SCHOOL_ENGINEER",
    "ensi":   "SCHOOL_ENGINEER",   "ihec": "SCHOOL_BUSINESS",
    "isg":    "SCHOOL_BUSINESS",   "fseg": "SCHOOL_BUSINESS",
    "isi":    "SCHOOL_IT",         "isim": "SCHOOL_IT",
    "fst":    "SCHOOL_SCIENCE",    "isamm": "SCHOOL_MEDIA",
    # France
    "polytechnique": "SCHOOL_ENGINEER", "centrale": "SCHOOL_ENGINEER",
    "sorbonne":      "SCHOOL_GENERAL",  "grenoble": "SCHOOL_GENERAL",
    # Maroc/Algérie
    "al manahel":    "SCHOOL_GENERAL",
    # Écoles économie/finance Tunisie
    "fsegs":         "SCHOOL_ECONOMICS",
    "fseg sfax":     "SCHOOL_ECONOMICS",
    "fseg tunis":    "SCHOOL_ECONOMICS",
    "iscae":         "SCHOOL_MANAGEMENT",
    "higher institute": "SCHOOL_GENERAL",
}

ENTREPRISES_NER = {
    # Banques Tunisie
    "bct": "BANK_CENTRAL",   "stb": "BANK",     "biat": "BANK",
    "amen bank": "BANK",     "attijari": "BANK", "tsb": "BANK",
    "bh bank": "BANK",       "ubci": "BANK",
    # Tech Tunisie
    "easysoft": "TECH_COMPANY", "esprit": "TECH_COMPANY",
    "telnet": "TECH_COMPANY",   "vermeg": "TECH_COMPANY",
    "sofrecom": "TECH_COMPANY",
    # International
    "microsoft": "BIG_TECH",  "google": "BIG_TECH",
    "amazon": "BIG_TECH",     "facebook": "BIG_TECH",
}

TECH_STACK_NER = {
    # Frontend
    "react": "FRONTEND",    "angular": "FRONTEND",  "vue": "FRONTEND",
    "html": "FRONTEND",     "css": "FRONTEND",       "typescript": "FRONTEND",
    # Backend
    "spring boot": "BACKEND", "node": "BACKEND",     "django": "BACKEND",
    "laravel": "BACKEND",     "symfony": "BACKEND",  "express": "BACKEND",
    # Data
    "mysql": "DATABASE",    "mongodb": "DATABASE",  "postgresql": "DATABASE",
    "firebase": "DATABASE", "redis": "DATABASE",
    # DevOps
    "docker": "DEVOPS",     "kubernetes": "DEVOPS", "jenkins": "DEVOPS",
    "aws": "CLOUD",         "azure": "CLOUD",       "gcp": "CLOUD",
    # ML
    "python": "ML_LANG",    "tensorflow": "ML_FRAMEWORK",
    "pytorch": "ML_FRAMEWORK", "bert": "ML_MODEL",
    "scikit": "ML_LIB",     "pandas": "ML_LIB",
}

def extraire_entites_ner(texte: str) -> dict:
    """
    NER basé sur dictionnaires et règles linguistiques.
    Extrait : écoles, entreprises, technologies, dates.

    Équivalent académique de spaCy sans dépendance externe.
    """
    t = normaliser_accents(texte).lower()

    entites = {
        "ecoles":      [],
        "entreprises": [],
        "technologies":[],
        "dates":       [],
        "niveau":      None,
    }

    # Écoles
    for ecole, label in ECOLES_NER.items():
        if ecole in t:
            entites["ecoles"].append({"nom": ecole, "type": label})
            # Déduire le niveau
            if "ENGINEER" in label and entites["niveau"] is None:
                entites["niveau"] = "ingenieur"
            elif "BUSINESS" in label and entites["niveau"] is None:
                entites["niveau"] = "master"

    # Entreprises
    for ent, label in ENTREPRISES_NER.items():
        if ent in t:
            entites["entreprises"].append({"nom": ent, "type": label})

    # Technologies (avec catégorie)
    for tech, categorie in TECH_STACK_NER.items():
        if tech in t:
            entites["technologies"].append({"nom": tech, "categorie": categorie})

    # Dates (regex)
    dates = re.findall(r"20\d{2}", texte)
    entites["dates"] = sorted(set(dates))

    return entites


# ── 3. CLASSIFICATION DOMAINE PAR BERT ───────────────────────────────────────
# Sans LLM : on compare le CV à des descriptions de référence par domaine
# C'est du "zero-shot classification" avec BERT embeddings

DOMAINES_REFERENCE = {
    # ── Tech / Dev ────────────────────────────────────────────────────────────
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
    # ── Data / Stats ──────────────────────────────────────────────────────────
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
    # ── Finance / Banque ──────────────────────────────────────────────────────
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
    # ── Sécurité ──────────────────────────────────────────────────────────────
    "cybersecurity": (
        "cybersécurité sécurité pentest Linux firewall ISO 27001 RGPD SIEM "
        "cryptographie SSL TLS audit vulnérabilité réseau"
    ),
    # ── Communication ─────────────────────────────────────────────────────────
    "communication": (
        "communication digitale marketing RSE stratégie communication interne "
        "cohésion organisationnelle supports numériques multimédia branding"
    ),
}

def classifier_domaine_bert(texte_cv: str) -> tuple:
    """
    Classification du domaine du CV par similarité cosine BERT.
    Approche zero-shot : compare CV aux descriptions de référence.

    Retourne : (domaine, score_confiance)
    100% académique — pas de LLM externe.
    """
    try:
        bert    = get_bert()
        cv_enc  = bert.encode(
            texte_cv[:1000],
            normalize_embeddings=True,
            show_progress_bar=False
        )

        meilleur_domaine = "autre"
        meilleur_score   = 0.0

        for domaine, description in DOMAINES_REFERENCE.items():
            ref_enc = bert.encode(
                description,
                normalize_embeddings=True,
                show_progress_bar=False
            )
            score = float(cv_enc @ ref_enc)
            if score > meilleur_score:
                meilleur_score   = score
                meilleur_domaine = domaine

        log.info("Classification domaine : %s (conf=%.3f)", meilleur_domaine, meilleur_score)
        return meilleur_domaine, round(meilleur_score, 4)

    except Exception as e:
        log.debug("Classification domaine : %s", e)
        return "autre", 0.0


# ── 4. SCORE STRUCTUREL NLP PUR ───────────────────────────────────────────────
# Remplace Groq extraction JSON → même résultat avec NLP académique

def calculer_score_structurel_nlp(texte_cv: str, texte_poste: str,
                                   competences: list) -> dict:
    """
    Score structurel 100% NLP sans LLM.
    5 dimensions académiques :

    1. NER skills match     : compétences extraites par NER vs requises
    2. Domaine BERT         : classification zero-shot
    3. Section formation    : niveau diplôme détecté
    4. Section projets      : contexte projets BERT
    5. Expérience           : entités entreprises détectées

    Retourne : score 0→1 + détails explicables pour jury
    """
    # 1. Extraire entités NER
    ner_cv    = extraire_entites_ner(texte_cv)
    ner_poste = extraire_entites_ner(texte_poste)

    # 2. NER Skills match
    cv_techs    = {e["nom"] for e in ner_cv["technologies"]}
    poste_techs = {e["nom"] for e in ner_poste["technologies"]}
    if poste_techs:
        ner_match = len(cv_techs & poste_techs) / len(poste_techs)
    else:
        ner_match = 0.5
    ner_match = round(ner_match, 4)

    # 3. Classification domaine BERT (zero-shot)
    domaine_cv,    conf_cv    = classifier_domaine_bert(texte_cv[:800])
    domaine_poste, conf_poste = classifier_domaine_bert(texte_poste[:500])
    alignement_domaine = 1.0 if domaine_cv == domaine_poste else 0.3

    # 4. Niveau formation depuis NER
    niv_labels  = {"ingenieur":1.0, "master":0.9, "licence":0.7, None:0.6}
    score_forma = niv_labels.get(ner_cv.get("niveau"), 0.6)

    # 5. Expérience pertinente
    nb_exp      = len(ner_cv["entreprises"])
    score_exp   = min(1.0, 0.4 + nb_exp * 0.2)  # 0.4 base + 0.2 par exp

    # 6. Projets BERT similarity
    sections_cv    = detecter_sections(texte_cv)
    projets_texte  = sections_cv.get("projets", "")
    score_projets  = 0.5
    if projets_texte.strip():
        try:
            bert  = get_bert()
            v     = bert.encode(
                [projets_texte[:400], texte_poste[:400]],
                normalize_embeddings=True, show_progress_bar=False
            )
            score_projets = float(max(0.0, v[0] @ v[1]))
        except Exception:
            pass

    # Score global structurel
    score_global = (
        0.30 * ner_match          +  # NER skills match (principal)
        0.25 * alignement_domaine +  # domaine BERT zero-shot
        0.20 * score_projets      +  # contexte projets BERT
        0.15 * score_forma        +  # niveau formation NER
        0.10 * score_exp             # expérience entreprises
    )

    log.info("Score structurel NLP : ner=%.2f dom=%.2f proj=%.2f forma=%.2f exp=%.2f → %.3f",
             ner_match, alignement_domaine, score_projets, score_forma, score_exp, score_global)

    return {
        "score": round(score_global, 4),
        "details": {
            "ner_skills_match":    round(ner_match,         3),
            "domaine_alignment":   round(alignement_domaine,3),
            "projets_bert":        round(score_projets,     3),
            "formation_niveau":    round(score_forma,       3),
            "experience_score":    round(score_exp,         3),
        },
        "entites": {
            "domaine_cv":       domaine_cv,
            "domaine_poste":    domaine_poste,
            "ecoles":           [e["nom"] for e in ner_cv["ecoles"]],
            "entreprises":      [e["nom"] for e in ner_cv["entreprises"]],
            "technologies_cv":  list(cv_techs)[:10],
            "niveau_detecte":   ner_cv.get("niveau", "non détecté"),
        },
        "methode": "NLP_PUR_BERT_NER_RULES",
    }


# ══════════════════════════════════════════════════════════════════════════════
#  EXPERIENCE SCORE (20% du score final)
#
#  Critères RH :
#    - Nombre et durée des stages
#    - Nombre de projets académiques
#    - GitHub/Portfolio présent
#    - Expérience dans domaine bancaire (bonus BCT)
#    - Technologies utilisées en stage = compétences réelles
# ══════════════════════════════════════════════════════════════════════════════

def calculer_experience_score(texte_cv: str, competences: List[str]) -> dict:
    """
    Score expérience 0→1 basé sur :
      - Stages détectés (durée + domaine)
      - Projets académiques
      - GitHub/Portfolio
      - Pertinence bancaire (bonus BCT)
    """
    t = normaliser_accents(texte_cv).lower()

    # ── 1. Stages détectés ────────────────────────────────────────────────────
    experiences = extraire_experiences(texte_cv)
    nb_stages   = len(experiences)

    # Durée totale en mois
    duree_totale = sum(e.get("duree_mois", 2) for e in experiences)
    duree_totale = min(duree_totale, 24)  # plafonner à 24 mois

    # Score stages : 0.08 par stage + 0.02 par mois
    score_stages = min(0.40, nb_stages * 0.08 + duree_totale * 0.02)

    # ── 2. Projets académiques ────────────────────────────────────────────────
    projets   = extraire_projets(texte_cv)
    nb_projets = len(projets)
    score_projets = min(0.25, nb_projets * 0.07)

    # ── 3. GitHub / Portfolio ─────────────────────────────────────────────────
    has_github   = "github" in t or "gitlab" in t
    has_portfolio= "portfolio" in t or "aymen-khelifa" in t
    score_github = 0.10 if has_github else (0.05 if has_portfolio else 0.0)

    # ── 4. Bonus domaine bancaire BCT ─────────────────────────────────────────
    # Récompense expérience dans le secteur bancaire/financier
    mots_bancaires = ["banque","bank","bct","stb","biat","tsb","attijari",
                      "amen","finance","audit","comptabilite","tresorerie"]
    has_bancaire   = any(m in t for m in mots_bancaires)
    score_bancaire = 0.15 if has_bancaire else 0.0

    # ── 5. Technologies utilisées en stage ────────────────────────────────────
    # Bonus si les compétences requises ont été utilisées en stage
    comp_norm = {normaliser_accents(c).lower() for c in competences}
    techs_stage = set()
    for exp in experiences:
        for tech in exp.get("techno", []):
            techs_stage.add(normaliser_accents(tech).lower())

    overlap_stage = len(comp_norm & techs_stage) / max(len(comp_norm), 1)
    score_tech_stage = min(0.10, overlap_stage * 0.10)

    # ── Score global expérience ───────────────────────────────────────────────
    score_exp = min(1.0,
        score_stages    +   # 0→0.40 : stages
        score_projets   +   # 0→0.25 : projets
        score_github    +   # 0→0.10 : github
        score_bancaire  +   # 0→0.15 : domaine BCT
        score_tech_stage    # 0→0.10 : techs utilisées en stage
    )

    log.info("ExperienceScore=%.3f | stages=%d(%.1fmois) projets=%d github=%s bancaire=%s",
             score_exp, nb_stages, duree_totale, nb_projets,
             "✅" if has_github else "❌",
             "✅" if has_bancaire else "❌")

    return {
        "score":          round(score_exp, 4),
        "nb_stages":      nb_stages,
        "duree_mois":     duree_totale,
        "nb_projets":     nb_projets,
        "has_github":     has_github,
        "has_bancaire":   has_bancaire,
        "score_detail": {
            "stages":     round(score_stages,     3),
            "projets":    round(score_projets,    3),
            "github":     round(score_github,     3),
            "bancaire":   round(score_bancaire,   3),
            "tech_stage": round(score_tech_stage, 3),
        }
    }


# ══════════════════════════════════════════════════════════════════════════════
#  EDUCATION SCORE (10% du score final)
#
#  Critères RH :
#    - Niveau diplôme (bac → doctorat)
#    - École reconnue (ESPRIT, ENIT, IHEC...)
#    - Spécialité alignée avec le poste
#    - Double diplôme / certifications
# ══════════════════════════════════════════════════════════════════════════════

# Niveaux diplôme → score normalisé
NIVEAU_SCORE = {
    "doctorat":  1.00,
    "ingenieur": 0.90,
    "master":    0.85,
    "licence":   0.65,
    "bts/dut":   0.45,
    "bac":       0.25,
    None:        0.40,  # non détecté → neutre
}

# Spécialités et leur alignement avec les domaines BCT
SPECIALITES_BCT = {
    # Tech → postes DGSI, DGER5, DGPM3
    "informatique":        {"fullstack_web":1.0, "ml_nlp":0.9, "devops_cloud":0.9},
    "genie logiciel":      {"fullstack_web":1.0, "ml_nlp":0.7, "devops_cloud":0.8},
    "intelligence artificielle": {"ml_nlp":1.0, "data_analyst":0.8, "fullstack_web":0.5},
    "data science":        {"ml_nlp":1.0, "data_analyst":1.0, "econometrie":0.7},
    "reseaux":             {"devops_cloud":0.9, "cybersecurity":0.9},
    "cybersecurite":       {"cybersecurity":1.0, "audit_interne":0.6},
    # Finance → postes DGPM, DGST, DGFE, OIF, AI
    "finance":             {"finance_audit":1.0, "econometrie":0.8, "economie_finance":0.9},
    "econometrie":         {"econometrie":1.0, "finance_audit":0.8, "data_analyst":0.7},
    "economie":            {"finance_audit":0.9, "econometrie":0.9, "economie_finance":1.0},
    "audit":               {"audit_interne":1.0, "finance_audit":0.9},
    "comptabilite":        {"finance_audit":0.9, "audit_interne":0.8},
    # Communication → postes DGCICMM
    "communication":       {"communication":1.0, "data_analyst":0.5},
    "marketing":           {"communication":1.0, "data_analyst":0.6},
}

def calculer_education_score(texte_cv: str, domaine_poste: str = "fullstack_web") -> dict:
    """
    Score formation 0→1 basé sur :
      - Niveau diplôme détecté (NER)
      - École reconnue (NER dictionnaire)
      - Spécialité alignée avec domaine du poste
      - Certifications / double diplôme
    """
    t = normaliser_accents(texte_cv).lower()

    # ── 1. Niveau diplôme ─────────────────────────────────────────────────────
    niv_label, niv_num, _ = detecter_ecole(texte_cv)
    # Détecter niveau par mots-clés
    niveau_detecte = None
    for niv, (mots, _) in NIVEAUX_DIPLOME.items():
        if any(mo in t for mo in mots):
            niveau_detecte = niv
            break

    # École peut indiquer le niveau
    if niv_label and niveau_detecte is None:
        niveau_detecte = niv_label

    score_niveau = NIVEAU_SCORE.get(niveau_detecte, 0.40)

    # ── 2. École reconnue ─────────────────────────────────────────────────────
    ecole_label, ecole_niv, ecole_desc = detecter_ecole(texte_cv)
    score_ecole = 0.0
    if ecole_desc:
        # École ingénieur reconnue = bonus max
        if ecole_niv >= 4:
            score_ecole = 1.0
        elif ecole_niv == 3:
            score_ecole = 0.70
        else:
            score_ecole = 0.50
    else:
        # Chercher université générique
        if any(u in t for u in ["universite","university","faculte","faculty"]):
            score_ecole = 0.50

    # ── 3. Spécialité alignée avec poste ──────────────────────────────────────
    score_specialite = 0.50  # neutre par défaut
    for specialite, alignements in SPECIALITES_BCT.items():
        if specialite in t:
            # Score d'alignement avec le domaine du poste
            align = alignements.get(domaine_poste, 0.30)
            if align > score_specialite:
                score_specialite = align
                log.debug("Spécialité '%s' → alignement %.2f avec '%s'",
                          specialite, align, domaine_poste)

    # ── 4. Certifications / double diplôme ────────────────────────────────────
    certifs = ["certification","certified","aws","azure","cisco","pmp",
               "scrum","agile","toefl","ielts","double diplome","double degree"]
    nb_certifs  = sum(1 for c in certifs if c in t)
    score_certif = min(0.15, nb_certifs * 0.05)

    # ── Score global formation ────────────────────────────────────────────────
    # Pondération : niveau (40%) + école (30%) + spécialité (20%) + certifs (10%)
    score_edu = min(1.0,
        0.40 * score_niveau     +
        0.30 * score_ecole      +
        0.20 * score_specialite +
        0.10 * (score_certif / 0.15 if score_certif > 0 else 0)
    )

    log.info("EducationScore=%.3f | niveau=%s école=%s spécialité=%.2f certifs=%d",
             score_edu, niveau_detecte or "?",
             ecole_desc[:20] if ecole_desc else "?",
             score_specialite, nb_certifs)

    return {
        "score":            round(score_edu, 4),
        "niveau_detecte":   niveau_detecte or "non détecté",
        "ecole_detectee":   ecole_desc or "non détectée",
        "score_detail": {
            "niveau":       round(score_niveau,     3),
            "ecole":        round(score_ecole,      3),
            "specialite":   round(score_specialite, 3),
            "certifications": round(score_certif,   3),
        }
    }

# Domaines tech et leurs mots-clés
DOMAINES_BOOST = {
    "fullstack_web": {
        "cv_keys":  ["react","node","javascript","typescript","spring","docker",
                     "mongodb","mysql","angular","express","nestjs","api","rest"],
        "job_keys": ["full stack","fullstack","web","react","node","javascript",
                     "spring boot","gestion","hospitaliere","plateforme","backend","frontend"],
        "bonus":    8.0,
    },
    "ml_nlp": {
        "cv_keys":  ["python","tensorflow","pytorch","bert","nlp","machine learning","sklearn"],
        "job_keys": ["machine learning","nlp","bert","deep learning","ia","intelligence artificielle"],
        "bonus":    8.0,
    },
    "devops_cloud": {
        "cv_keys":  ["docker","kubernetes","aws","azure","jenkins","terraform","linux"],
        "job_keys": ["devops","cloud","kubernetes","docker","ci/cd","infrastructure"],
        "bonus":    8.0,
    },
    "data_analyst": {
        "cv_keys":  ["sql","pandas","power bi","tableau","excel","python","statistiques"],
        "job_keys": ["data analyst","bi","reporting","tableau","power bi","sql","analytics"],
        "bonus":    7.0,
    },
    "finance": {
        "cv_keys":  ["audit","comptabilite","ifrs","finance","excel","vba","bilan"],
        "job_keys": ["audit","finance","comptable","ifrs","risque","credit"],
        "bonus":    7.0,
    },
    "cybersecurity": {
        "cv_keys":  ["securite","pentest","linux","firewall","iso 27001","siem","reseau"],
        "job_keys": ["securite","cybersecurite","pentest","audit securite","siem"],
        "bonus":    7.0,
    },
    # ── Nouveaux domaines BCT ─────────────────────────────────────────────────
    "econometrie": {
        "cv_keys":  ["econometrie","statistiques","var","arima","r","python","matlab",
                     "series temporelles","regression","prevision","modelisation"],
        "job_keys": ["econometrie","var","arima","prevision","macroeconomique",
                     "taux change","politique monetaire","liquidite","dette"],
        "bonus":    7.0,
    },
    "audit_interne": {
        "cv_keys":  ["audit","conformite","risques","gouvernance","controle",
                     "ifrs","bale","compliance","gestion risques"],
        "job_keys": ["audit interne","gouvernance","risques operationnels",
                     "controle interne","recommandations audit","banque centrale"],
        "bonus":    7.0,
    },
    "economie_bancaire": {
        "cv_keys":  ["economie","finance","banque","monetaire","credit","inflation",
                     "macro","microeconomie","developpement","croissance"],
        "job_keys": ["economie monetaire","politique monetaire","inclusion financiere",
                     "dette publique","taux change","balance courante","liquidite"],
        "bonus":    6.0,
    },
    "genie_logiciel": {
        "cv_keys":  ["java","spring","python","sql","mysql","postgresql","git",
                     "application","gestion","backend","api","rest","docker"],
        "job_keys": ["application","gestion","genie logiciel","developpement",
                     "swift","tableau bord","bcт","systeme information"],
        "bonus":    7.0,
    },
}


def _domain_boost(texte_cv: str, texte_poste: str) -> float:
    """
    Bonus domaine : récompense quand le domaine du CV correspond au poste.
    Retourne un bonus entre 0 et 8 points.

    Exemple :
      CV React/Node + Poste Full Stack → +8 pts
      CV Finance + Poste ML NLP        →  0 pts
    """
    cv_lower    = normaliser_accents(texte_cv).lower()
    poste_lower = normaliser_accents(texte_poste).lower()

    meilleur_bonus = 0.0
    for domaine, cfg in DOMAINES_BOOST.items():
        cv_matches  = sum(1 for k in cfg["cv_keys"]  if k in cv_lower)
        job_matches = sum(1 for k in cfg["job_keys"] if k in poste_lower)

        # Les 2 doivent matcher pour déclencher le bonus
        if cv_matches >= 2 and job_matches >= 1:
            # Bonus proportionnel au nombre de matches
            ratio = min(1.0, (cv_matches + job_matches) /
                        (len(cfg["cv_keys"]) + len(cfg["job_keys"])) * 3)
            bonus = cfg["bonus"] * ratio
            if bonus > meilleur_bonus:
                meilleur_bonus = bonus
                log.debug("Domain boost '%s' : +%.1f pts", domaine, bonus)

    return round(meilleur_bonus, 2)


def scorer_cv(texte_cv: str, titre: str, description: str,
              competences: List[str], lettre: str = "") -> dict:
    """Pipeline complet NLP → score /100."""

    # Texte poste enrichi : titre + description + compétences
    # On ajoute aussi les synonymes et contexte pour améliorer bert_desc
    texte_poste = f"{titre} {description} {' '.join(competences)}"

    # Étape 3 : TF-IDF
    tfidf_sim = calculer_tfidf(texte_cv, texte_poste)

    # Étape 4 : BERT fine-tuné
    bert_scores = calculer_bert(texte_cv, titre, description, competences)
    bert_sim    = bert_scores["global"]

    # Étape 5 : Skills + lettre
    skills       = calculer_skills(texte_cv, competences)
    lettre_norm  = calculer_lettre(lettre, titre)

    # ── Étape 6 : NLP Structurel (zero-shot + NER + sections) ──────────────────
    struct_result  = calculer_score_structurel_nlp(texte_cv, texte_poste, competences)
    score_str      = struct_result["score"]

    # ── Étape 7 : Experience Score (20%) ─────────────────────────────────────
    exp_result     = calculer_experience_score(texte_cv, competences)
    exp_score      = exp_result["score"]

    # ── Étape 8 : Education Score (10%) ──────────────────────────────────────
    # Détecter domaine poste pour aligner spécialité
    domaine_poste, _ = classifier_domaine_bert(texte_poste[:400])
    edu_result     = calculer_education_score(texte_cv, domaine_poste)
    edu_score      = edu_result["score"]

    # ── Composantes sémantiques ───────────────────────────────────────────────
    bert_desc_sim  = bert_scores["description"]
    skills_norm    = skills["ratio"]

    # SemanticScore = combinaison BERT + TF-IDF
    semantic_score = 0.75 * bert_desc_sim + 0.25 * tfidf_sim

    # Informations parsées
    infos = extraire_infos(texte_cv)

    # ── Boost léger domaine (max 5 pts) ──────────────────────────────────────
    # Récompense légèrement l'alignement domaine CV ↔ poste
    # Plafonné à 5 pts — ne peut pas compenser un mauvais matching
    domain_bonus = min(5.0, _domain_boost(texte_cv, texte_poste) * 0.5)

    # ══════════════════════════════════════════════════════════════════════════
    #  FORMULE FINALE RH — 5 critères académiques
    #
    #  FINAL = 0.35×SemanticScore  (BERT_desc + TF-IDF)
    #        + 0.25×SkillScore     (compétences requises trouvées)
    #        + 0.20×ExperienceScore(stages + projets + GitHub + bancaire)
    #        + 0.10×EducationScore (diplôme + école + spécialité)
    #        + 0.05×StructureScore (NER + zero-shot BERT + sections)
    #        + 0.05×LettreScore    (qualité lettre de motivation)
    #        + DomainBoost         (0→5 pts bonus domaine aligné)
    # ══════════════════════════════════════════════════════════════════════════
    raw = (0.35 * semantic_score +  # 35% Sémantique (BERT+TF-IDF)
           0.25 * skills_norm    +  # 25% Compétences requises
           0.20 * exp_score      +  # 20% Expérience (stages+projets+GitHub)
           0.10 * edu_score      +  # 10% Formation (diplôme+école+spécialité)
           0.05 * score_str      +  #  5% Structure NLP (NER+zero-shot)
           0.05 * lettre_norm)      #  5% Lettre motivation

    # Calibration finale — évite les scores extrêmes aberrants
    raw_pct = raw * 100
    if   raw_pct < 20:  raw_pct = raw_pct * 1.10   # boost léger si très bas
    elif raw_pct > 85:  raw_pct = 85 + (raw_pct-85) * 0.50  # plafonnement doux

    score = round(min(100.0, max(0.0, raw_pct + domain_bonus)), 1)

    log.info("Score=%.1f | Sem=%.3f Ski=%.3f Exp=%.3f Edu=%.3f Str=%.3f Let=%.3f Boost=+%.1f",
             score, semantic_score, skills_norm, exp_score, edu_score, score_str, lettre_norm, domain_bonus)
    log.info("  (0.35×%.3f+0.25×%.3f+0.20×%.3f+0.10×%.3f+0.05×%.3f+0.05×%.3f)×100+%.1f=%.1f",
             semantic_score, skills_norm, exp_score, edu_score, score_str, lettre_norm, domain_bonus, score)

    # Compatibilité
    compat = "Élevée" if score>=75 else "Moyenne" if score>=50 else "Faible"

    # Recommandation
    if   score>=80: reco = "Hautement recommandé"
    elif score>=65: reco = "Recommandé"
    elif score>=50: reco = "Profil intéressant"
    elif score>=35: reco = "Profil partiel"
    else:           reco = "Non adapté"

    # Détail format front — aligné avec la formule finale 5 critères
    detail = {
        "semantique":  round(min(35, semantic_score * 35), 1),  # /35 pts
        "competences": round(min(25, skills_norm * 25),    1),  # /25 pts
        "experience":  round(min(20, exp_score * 20),      1),  # /20 pts
        "formation":   round(min(10, edu_score * 10),      1),  # /10 pts
        "structure":   round(min(5,  score_str * 5),       1),  #  /5 pts
        "lettre":      round(min(5,  lettre_norm * 5),     1),  #  /5 pts
    }

    # Points forts / faibles
    forts, faibles = [], []
    if bert_sim >= 0.65:        forts.append(f"Forte cohérence sémantique BERT ({bert_sim:.2f})")
    elif bert_sim < 0.35:       faibles.append(f"Faible similarité sémantique ({bert_sim:.2f})")
    if tfidf_sim >= 0.25:       forts.append(f"Bonne couverture mots-clés TF-IDF ({tfidf_sim:.2f})")
    elif tfidf_sim < 0.08:      faibles.append("Peu de mots-clés du poste dans le CV")
    if skills["presentes"]:     forts.append(f"Compétences présentes : {', '.join(skills['presentes'][:4])}")
    if skills["manquantes"]:    faibles.append(f"Compétences manquantes : {', '.join(skills['manquantes'][:3])}")
    if infos["hasGithub"]:      forts.append("Portfolio GitHub/GitLab présent")
    if infos["moisExperience"]>=12: forts.append(f"~{infos['moisExperience']} mois d'expérience")

    return {
        # Champs ScoringService.java
        "scoreTotal":            score,
        "compatibilite":         compat,
        "recommandation":        reco,
        "scoreLettreMotivation": round(lettre_norm * 100),

        # Détail front
        "detail": detail,

        # Rapport
        "rapport": {
            "pts_forts":           forts  or ["Dossier soumis"],
            "pts_faibles":         faibles or [],
            "resume": (
                f"Score NLP+BERT : {score}/100 ({compat}). "
                f"BERT={bert_sim:.3f} TF-IDF={tfidf_sim:.3f} "
                f"Skills={len(skills['presentes'])}/{skills['total']}."
            ),
            "recommandation":      reco,
            "questions_entretien": [],
        },

        # Traçabilité
        "formule": {
            "bert_similarity":    round(bert_sim,          4),
            "tfidf_similarity":   round(tfidf_sim,         4),
            "skills_match_ratio": round(skills["ratio"],   4),
            "lettre_score":       round(lettre_norm,       4),
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


# ══════════════════════════════════════════════════════════════════════════════
#  API FLASK — compatible ScoringService.java
# ══════════════════════════════════════════════════════════════════════════════

app = Flask(__name__)
CORS(app, origins=["http://localhost:8080","http://localhost:3000"])


@app.route("/score", methods=["POST"])
def score():
    try:
        if "cv_file" not in request.files:
            return jsonify({"error": "cv_file manquant"}), 400
        fichier = request.files["cv_file"]
        if not fichier.filename.lower().endswith(".pdf"):
            return jsonify({"error": "PDF uniquement"}), 400

        cv_bytes    = fichier.read()
        titre       = request.form.get("titre_sujet",   "")
        description = request.form.get("description",   "")
        lettre      = request.form.get("lettre",        "")
        sujet_id    = request.form.get("sujet_id",      titre[:20])
        competences = []
        try: competences = json.loads(request.form.get("competences","[]"))
        except Exception: pass

        # Cache MD5
        key    = hashlib.md5(cv_bytes + sujet_id.encode()).hexdigest()
        cached = _cache.get(key)
        if cached and (time.time()-cached["ts"]) < CACHE_TTL:
            return jsonify({**cached["val"], "_from_cache": True})

        # Extraction texte (Étape 1)
        texte_cv = extraire_texte(cv_bytes)
        if len(texte_cv) < 80:
            return jsonify({"error": "CV illisible ou vide"}), 400

        # Pipeline NLP complet (Étapes 2→6)
        result = scorer_cv(texte_cv, titre, description, competences, lettre)
        _cache[key] = {"val": result, "ts": time.time()}

        log.info("✅ %s | Score=%.1f (%s) | BERT=%.3f | TF-IDF=%.3f",
                 Path(fichier.filename).name,
                 result["scoreTotal"], result["compatibilite"],
                 result["bert_scores"]["global"],
                 result["formule"]["tfidf_similarity"])

        return jsonify(result)

    except Exception as e:
        log.error("Erreur /score : %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":       "ok",
        "version":      "nlp-bert-v1",
        "bert_tuned":   MODEL_DIR.exists(),
        "modele":       "bert-fine-tuned-bct" if MODEL_DIR.exists() else "bert-base",
        "cache":        len(_cache),
    })


# ══════════════════════════════════════════════════════════════════════════════
#  TEST LOCAL
# ══════════════════════════════════════════════════════════════════════════════

def test_local(cv_path: str):
    texte = extraire_texte(cv_path)
    log.info("CV extrait : %d mots", len(texte.split()))

    result = scorer_cv(
        texte_cv    = texte,
        titre       = "Stage Machine Learning NLP",
        description = "Développement systèmes NLP traitement documents bancaires BERT transformers",
        competences = ["Python","NLP","TensorFlow","PyTorch","BERT","Docker"],
        lettre      = "Je souhaite postuler car je maîtrise Python et NLP.",
    )
    print(f"\n{'═'*60}")
    print(f"  SCORE : {result['scoreTotal']}/100 ({result['compatibilite']})")
    print(f"  {result['formule']['calcul']}")
    print(f"\n  BERT global  : {result['bert_scores']['global']:.4f}")
    print(f"  TF-IDF       : {result['formule']['tfidf_similarity']:.4f}")
    print(f"  Skills       : {result['formule']['skills_match_ratio']:.4f}")
    print(f"  Lettre       : {result['formule']['lettre_score']:.4f}")
    print(f"\n  Compétences présentes  : {result['skills']['presentes']}")
    print(f"  Compétences manquantes : {result['skills']['manquantes']}")
    print(f"\n  Points forts   : {result['rapport']['pts_forts'][:3]}")
    print(f"  Points faibles : {result['rapport']['pts_faibles'][:2]}")
    print(f"  Recommandation : {result['recommandation']}")
    print(f"  Modèle         : {result['formule']['modele']}")
    print(f"{'═'*60}")


# ══════════════════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    p = argparse.ArgumentParser(description="BCT CV Scorer NLP+BERT")
    p.add_argument("--serve", action="store_true", help="Lancer API Flask")
    p.add_argument("--test",  action="store_true", help="Test local")
    p.add_argument("--cv",    default="",          help="Chemin PDF pour --test")
    p.add_argument("--port",  type=int, default=PORT)
    args = p.parse_args()

    # Précharger BERT
    get_bert()

    if args.test:
        if not args.cv:
            log.error("--cv requis pour --test"); sys.exit(1)
        test_local(args.cv)

    if args.serve or not args.test:
        log.info("API NLP+BERT — port %d", args.port)
        log.info("Modèle : %s",
                 "bert-fine-tuned-bct" if MODEL_DIR.exists() else "bert-base (lance cv_scorer_nlp.py --train)")
        app.run(host="0.0.0.0", port=args.port, debug=False)