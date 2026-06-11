"""
cv_scorer_nlp.py  —  PHASE 1 : Entraînement
════════════════════════════════════════════════════════════════════════
Prépare le dataset Kaggle avec Weak Supervision (sans Groq)
puis fine-tune Sentence-BERT.

Usage :
  # Entraînement complet
  python cv_scorer_nlp.py --train --max_cvs 500

  # Si Kaggle déjà téléchargé
  python cv_scorer_nlp.py --train --dataset_path "C:\\...\\versions\\1"

  # Sauter extraction si pairs_bct.csv existe
  python cv_scorer_nlp.py --train --skip_extract
════════════════════════════════════════════════════════════════════════
"""

import os, re, sys, math, logging, argparse, unicodedata
from pathlib import Path
from typing  import List, Tuple, Dict

import numpy  as np
import pandas as pd
import fitz

# ── Configuration OCR ─────────────────────────────────────────────────────────
try:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = (
        r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    )
except ImportError:
    pass

POPPLER_PATH = r"C:\Users\MSI\Downloads\Release-25.12.0-0\poppler-25.12.0\Library\bin"


# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("train")

MODEL_DIR = Path("./models/bert_bct")
PAIRS_CSV = Path("./pairs_bct.csv")

# ══════════════════════════════════════════════════════════════════════════════
#  POSTES BCT (descriptions riches pour le fine-tuning)
# ══════════════════════════════════════════════════════════════════════════════
BCT_POSTES: Dict[str, dict] = {
    "ML_NLP": {
        "titre": "Stage Machine Learning NLP",
        "description": "Développement systèmes NLP traitement automatique documents bancaires. Modèles deep learning BERT transformers PyTorch TensorFlow. Classification textes financiers embedding vectoriel Flask Docker.",
        "keywords": ["python","machine learning","nlp","bert","transformers","tensorflow","pytorch","scikit-learn","pandas","docker","classification","neural","embedding","deep learning"],
    },
    "BACKEND_JAVA": {
        "titre": "Stage Développement Backend Java",
        "description": "Conception APIs RESTful Spring Boot microservices JPA Hibernate MySQL PostgreSQL. Tests JUnit Docker CI/CD Jenkins Maven sécurité JWT OAuth2.",
        "keywords": ["java","spring","spring boot","rest","api","microservices","jpa","hibernate","mysql","sql","docker","git","maven","junit","backend","jwt","oauth"],
    },
    "DATA_ANALYST": {
        "titre": "Stage Data Analyst Business Intelligence",
        "description": "Analyse données financières bancaires tableaux de bord Power BI Tableau Excel rapports SQL statistiques Python pandas ETL data pipeline.",
        "keywords": ["data","analyst","sql","excel","power bi","tableau","python","pandas","statistics","reporting","dashboard","bi","etl","visualization","r","kpi"],
    },
    "CYBERSECURITY": {
        "titre": "Stage Cybersécurité Audit Sécurité",
        "description": "Audit sécurité systèmes information tests pénétration pentest. Gestion risques cyber RGPD ISO 27001 SIEM Splunk cryptographie SSL TLS réseau firewall.",
        "keywords": ["cybersecurity","security","pentest","network","firewall","linux","python","siem","iso 27001","rgpd","vulnerability","audit","cryptography","ssl","tls"],
    },
    "FINANCE_AUDIT": {
        "titre": "Stage Analyste Financier Audit Bancaire",
        "description": "Analyse financière comptable bancaire Bâle III IFRS gestion risques crédit liquidité marché. Reporting Excel VBA modélisation financière Swift SEPA.",
        "keywords": ["finance","accounting","audit","banking","risk","ifrs","basel","credit","excel","vba","reporting","financial","compliance","swift","sepa","comptabilite"],
    },
    "DEVOPS_CLOUD": {
        "titre": "Stage DevOps Cloud Infrastructure",
        "description": "Infrastructure cloud AWS Azure GCP Docker Kubernetes CI/CD Jenkins Terraform Ansible monitoring Prometheus Grafana Linux Shell Python automation.",
        "keywords": ["devops","cloud","docker","kubernetes","aws","azure","linux","jenkins","terraform","ansible","prometheus","grafana","shell","python","automation","cicd"],
    },
    "FRONTEND": {
        "titre": "Stage Développement Frontend React",
        "description": "Interfaces utilisateur modernes React.js Next.js JavaScript TypeScript HTML CSS responsive Redux APIs REST Jest Figma performance web.",
        "keywords": ["react","javascript","typescript","frontend","html","css","nodejs","redux","vue","angular","web","ui","ux","figma","jest","webpack","sass","tailwind"],
    },
}

# Matrice compatibilité domaine Kaggle → poste BCT
COMPAT: Dict[str, Dict[str, float]] = {

    # ── TECH GÉNÉRALISTE ──────────────────────────────────────────────────────
    "IT":                            {"ML_NLP":0.88,"BACKEND_JAVA":0.88,"DATA_ANALYST":0.75,"CYBERSECURITY":0.80,"FINANCE_AUDIT":0.12,"DEVOPS_CLOUD":0.85,"FRONTEND":0.85},
    "INFORMATION-TECHNOLOGY":        {"ML_NLP":0.88,"BACKEND_JAVA":0.88,"DATA_ANALYST":0.75,"CYBERSECURITY":0.80,"FINANCE_AUDIT":0.12,"DEVOPS_CLOUD":0.85,"FRONTEND":0.85},
    "INFORMATION-TECHNOLOGY-RESUMES":{"ML_NLP":0.88,"BACKEND_JAVA":0.88,"DATA_ANALYST":0.75,"CYBERSECURITY":0.80,"FINANCE_AUDIT":0.12,"DEVOPS_CLOUD":0.85,"FRONTEND":0.85},
    "INFORMATION TECHNOLOGY":        {"ML_NLP":0.88,"BACKEND_JAVA":0.88,"DATA_ANALYST":0.75,"CYBERSECURITY":0.80,"FINANCE_AUDIT":0.12,"DEVOPS_CLOUD":0.85,"FRONTEND":0.85},
    "INFORMATION TECHNOLOGY RESUMES":{"ML_NLP":0.88,"BACKEND_JAVA":0.88,"DATA_ANALYST":0.75,"CYBERSECURITY":0.80,"FINANCE_AUDIT":0.12,"DEVOPS_CLOUD":0.85,"FRONTEND":0.85},

    # ── DATA SCIENCE / ML ─────────────────────────────────────────────────────
    "DATA-SCIENCE":           {"ML_NLP":0.95,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.90,"CYBERSECURITY":0.30,"FINANCE_AUDIT":0.30,"DEVOPS_CLOUD":0.50,"FRONTEND":0.28},
    "DATA-SCIENCE-RESUMES":   {"ML_NLP":0.95,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.90,"CYBERSECURITY":0.30,"FINANCE_AUDIT":0.30,"DEVOPS_CLOUD":0.50,"FRONTEND":0.28},
    "DATASCIENCE":            {"ML_NLP":0.95,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.90,"CYBERSECURITY":0.30,"FINANCE_AUDIT":0.30,"DEVOPS_CLOUD":0.50,"FRONTEND":0.28},
    "DATA SCIENCE":           {"ML_NLP":0.95,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.90,"CYBERSECURITY":0.30,"FINANCE_AUDIT":0.30,"DEVOPS_CLOUD":0.50,"FRONTEND":0.28},
    "DATA SCIENCE RESUMES":   {"ML_NLP":0.95,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.90,"CYBERSECURITY":0.30,"FINANCE_AUDIT":0.30,"DEVOPS_CLOUD":0.50,"FRONTEND":0.28},
    "data science resumes":   {"ML_NLP":0.95,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.90,"CYBERSECURITY":0.30,"FINANCE_AUDIT":0.30,"DEVOPS_CLOUD":0.50,"FRONTEND":0.28},
    "PYTHON-DEVELOPER":       {"ML_NLP":0.90,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.82,"CYBERSECURITY":0.45,"FINANCE_AUDIT":0.15,"DEVOPS_CLOUD":0.70,"FRONTEND":0.55},
    "PYTHON DEVELOPER":       {"ML_NLP":0.90,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.82,"CYBERSECURITY":0.45,"FINANCE_AUDIT":0.15,"DEVOPS_CLOUD":0.70,"FRONTEND":0.55},
    "PYTHON-DEVELOPER-RESUMES":{"ML_NLP":0.90,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.82,"CYBERSECURITY":0.45,"FINANCE_AUDIT":0.15,"DEVOPS_CLOUD":0.70,"FRONTEND":0.55},
    "PYTHONDEVELOPER":        {"ML_NLP":0.90,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.82,"CYBERSECURITY":0.45,"FINANCE_AUDIT":0.15,"DEVOPS_CLOUD":0.70,"FRONTEND":0.55},

    # ── FRONTEND / WEB ────────────────────────────────────────────────────────
    "REACT":                  {"ML_NLP":0.25,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.30,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.35,"FRONTEND":0.96},
    "REACT-DEVELOPER":        {"ML_NLP":0.25,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.30,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.35,"FRONTEND":0.96},
    "REACT DEVELOPER":        {"ML_NLP":0.25,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.30,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.35,"FRONTEND":0.96},
    "REACT-DEVELOPER-RESUMES":{"ML_NLP":0.25,"BACKEND_JAVA":0.45,"DATA_ANALYST":0.30,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.35,"FRONTEND":0.96},
    "WEBDESIGNING":           {"ML_NLP":0.10,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.18,"CYBERSECURITY":0.08,"FINANCE_AUDIT":0.05,"DEVOPS_CLOUD":0.15,"FRONTEND":0.88},
    "WEB-DESIGNING-RESUME":   {"ML_NLP":0.10,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.18,"CYBERSECURITY":0.08,"FINANCE_AUDIT":0.05,"DEVOPS_CLOUD":0.15,"FRONTEND":0.88},
    "web designing resume":   {"ML_NLP":0.10,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.18,"CYBERSECURITY":0.08,"FINANCE_AUDIT":0.05,"DEVOPS_CLOUD":0.15,"FRONTEND":0.88},
    "DIGITAL":                {"ML_NLP":0.18,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.40,"CYBERSECURITY":0.12,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.15,"FRONTEND":0.65},
    "DIGITAL-MEDIA":          {"ML_NLP":0.18,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.40,"CYBERSECURITY":0.12,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.15,"FRONTEND":0.65},
    "DIGITAL MEDIA":          {"ML_NLP":0.18,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.40,"CYBERSECURITY":0.12,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.15,"FRONTEND":0.65},
    "DIGITAL-MEDIA-RESUMES":  {"ML_NLP":0.18,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.40,"CYBERSECURITY":0.12,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.15,"FRONTEND":0.65},
    "DESIGN":                 {"ML_NLP":0.10,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.22,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.05,"DEVOPS_CLOUD":0.10,"FRONTEND":0.75},
    "DESIGNER":               {"ML_NLP":0.10,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.22,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.05,"DEVOPS_CLOUD":0.10,"FRONTEND":0.75},
    "DESIGNING-RESUMES":      {"ML_NLP":0.10,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.22,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.05,"DEVOPS_CLOUD":0.10,"FRONTEND":0.75},

    # ── BACKEND / JAVA ────────────────────────────────────────────────────────
    "JAVA-DEVELOPER":         {"ML_NLP":0.40,"BACKEND_JAVA":0.96,"DATA_ANALYST":0.35,"CYBERSECURITY":0.40,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.65,"FRONTEND":0.45},
    "JAVA DEVELOPER":         {"ML_NLP":0.40,"BACKEND_JAVA":0.96,"DATA_ANALYST":0.35,"CYBERSECURITY":0.40,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.65,"FRONTEND":0.45},
    "JAVA-DEVELOPER-RESUMES": {"ML_NLP":0.40,"BACKEND_JAVA":0.96,"DATA_ANALYST":0.35,"CYBERSECURITY":0.40,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.65,"FRONTEND":0.45},
    "JAVADEVELOPER":          {"ML_NLP":0.40,"BACKEND_JAVA":0.96,"DATA_ANALYST":0.35,"CYBERSECURITY":0.40,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.65,"FRONTEND":0.45},
    "DOT":                    {"ML_NLP":0.35,"BACKEND_JAVA":0.85,"DATA_ANALYST":0.30,"CYBERSECURITY":0.35,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.55,"FRONTEND":0.50},
    "DOTNET-DEVELOPER-RESUMES":{"ML_NLP":0.35,"BACKEND_JAVA":0.85,"DATA_ANALYST":0.30,"CYBERSECURITY":0.35,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.55,"FRONTEND":0.50},
    "SAP-DEVELOPER":          {"ML_NLP":0.20,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.55,"CYBERSECURITY":0.25,"FINANCE_AUDIT":0.60,"DEVOPS_CLOUD":0.35,"FRONTEND":0.15},
    "SAP DEVELOPER":          {"ML_NLP":0.20,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.55,"CYBERSECURITY":0.25,"FINANCE_AUDIT":0.60,"DEVOPS_CLOUD":0.35,"FRONTEND":0.15},
    "SAP-DEVELOPER-RESUMES":  {"ML_NLP":0.20,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.55,"CYBERSECURITY":0.25,"FINANCE_AUDIT":0.60,"DEVOPS_CLOUD":0.35,"FRONTEND":0.15},
    "SAPDEVELOPER":           {"ML_NLP":0.20,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.55,"CYBERSECURITY":0.25,"FINANCE_AUDIT":0.60,"DEVOPS_CLOUD":0.35,"FRONTEND":0.15},

    # ── DATABASE / SQL / ETL ──────────────────────────────────────────────────
    "DATABASE":               {"ML_NLP":0.55,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.85,"CYBERSECURITY":0.40,"FINANCE_AUDIT":0.35,"DEVOPS_CLOUD":0.60,"FRONTEND":0.25},
    "DATABASE-RESUMES":       {"ML_NLP":0.55,"BACKEND_JAVA":0.70,"DATA_ANALYST":0.85,"CYBERSECURITY":0.40,"FINANCE_AUDIT":0.35,"DEVOPS_CLOUD":0.60,"FRONTEND":0.25},
    "SQL":                    {"ML_NLP":0.60,"BACKEND_JAVA":0.72,"DATA_ANALYST":0.90,"CYBERSECURITY":0.35,"FINANCE_AUDIT":0.40,"DEVOPS_CLOUD":0.55,"FRONTEND":0.22},
    "SQL-DEVELOPER-RESUMES":  {"ML_NLP":0.60,"BACKEND_JAVA":0.72,"DATA_ANALYST":0.90,"CYBERSECURITY":0.35,"FINANCE_AUDIT":0.40,"DEVOPS_CLOUD":0.55,"FRONTEND":0.22},
    "ETL":                    {"ML_NLP":0.65,"BACKEND_JAVA":0.55,"DATA_ANALYST":0.88,"CYBERSECURITY":0.28,"FINANCE_AUDIT":0.38,"DEVOPS_CLOUD":0.55,"FRONTEND":0.18},
    "ETL-DEVELOPER":          {"ML_NLP":0.65,"BACKEND_JAVA":0.55,"DATA_ANALYST":0.88,"CYBERSECURITY":0.28,"FINANCE_AUDIT":0.38,"DEVOPS_CLOUD":0.55,"FRONTEND":0.18},
    "ETL DEVELOPER":          {"ML_NLP":0.65,"BACKEND_JAVA":0.55,"DATA_ANALYST":0.88,"CYBERSECURITY":0.28,"FINANCE_AUDIT":0.38,"DEVOPS_CLOUD":0.55,"FRONTEND":0.18},
    "ETL-DEVELOPER-RESUMES":  {"ML_NLP":0.65,"BACKEND_JAVA":0.55,"DATA_ANALYST":0.88,"CYBERSECURITY":0.28,"FINANCE_AUDIT":0.38,"DEVOPS_CLOUD":0.55,"FRONTEND":0.18},

    # ── DEVOPS / CLOUD / SECURITE ─────────────────────────────────────────────
    "DEVOPS-ENGINEER":        {"ML_NLP":0.50,"BACKEND_JAVA":0.65,"DATA_ANALYST":0.45,"CYBERSECURITY":0.70,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.96,"FRONTEND":0.30},
    "DEVOPS ENGINEER":        {"ML_NLP":0.50,"BACKEND_JAVA":0.65,"DATA_ANALYST":0.45,"CYBERSECURITY":0.70,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.96,"FRONTEND":0.30},
    "DEVOPS-ENGINEER-RESUMES":{"ML_NLP":0.50,"BACKEND_JAVA":0.65,"DATA_ANALYST":0.45,"CYBERSECURITY":0.70,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.96,"FRONTEND":0.30},
    "DEVOPSENGINEER":         {"ML_NLP":0.50,"BACKEND_JAVA":0.65,"DATA_ANALYST":0.45,"CYBERSECURITY":0.70,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.96,"FRONTEND":0.30},
    "NETWORK-SECURITY-ENGINEER-RESUMES":{"ML_NLP":0.45,"BACKEND_JAVA":0.40,"DATA_ANALYST":0.35,"CYBERSECURITY":0.95,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.75,"FRONTEND":0.15},
    "NSE":                    {"ML_NLP":0.45,"BACKEND_JAVA":0.40,"DATA_ANALYST":0.35,"CYBERSECURITY":0.95,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.75,"FRONTEND":0.15},
    "BLOCKCHAIN":             {"ML_NLP":0.60,"BACKEND_JAVA":0.65,"DATA_ANALYST":0.50,"CYBERSECURITY":0.65,"FINANCE_AUDIT":0.55,"DEVOPS_CLOUD":0.55,"FRONTEND":0.40},
    "BLOCKCHAIN-RESUMES":     {"ML_NLP":0.60,"BACKEND_JAVA":0.65,"DATA_ANALYST":0.50,"CYBERSECURITY":0.65,"FINANCE_AUDIT":0.55,"DEVOPS_CLOUD":0.55,"FRONTEND":0.40},

    # ── BUSINESS ANALYST / CONSULTANT ─────────────────────────────────────────
    "BUSINESSANALYST":        {"ML_NLP":0.35,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.85,"CYBERSECURITY":0.20,"FINANCE_AUDIT":0.65,"DEVOPS_CLOUD":0.20,"FRONTEND":0.25},
    "BUSINESS-ANALYST-RESUMES":{"ML_NLP":0.35,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.85,"CYBERSECURITY":0.20,"FINANCE_AUDIT":0.65,"DEVOPS_CLOUD":0.20,"FRONTEND":0.25},
    "CONSULTANT":             {"ML_NLP":0.30,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.70,"CYBERSECURITY":0.25,"FINANCE_AUDIT":0.65,"DEVOPS_CLOUD":0.20,"FRONTEND":0.20},
    "CONSULT":                {"ML_NLP":0.30,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.70,"CYBERSECURITY":0.25,"FINANCE_AUDIT":0.65,"DEVOPS_CLOUD":0.20,"FRONTEND":0.20},
    "CONSULTANT-RESUMES":     {"ML_NLP":0.30,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.70,"CYBERSECURITY":0.25,"FINANCE_AUDIT":0.65,"DEVOPS_CLOUD":0.20,"FRONTEND":0.20},
    "PMO":                    {"ML_NLP":0.20,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.60,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.55,"DEVOPS_CLOUD":0.20,"FRONTEND":0.10},
    "PMO-RESUMES":            {"ML_NLP":0.20,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.60,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.55,"DEVOPS_CLOUD":0.20,"FRONTEND":0.10},
    "MANAGEMENT":             {"ML_NLP":0.20,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.60,"CYBERSECURITY":0.18,"FINANCE_AUDIT":0.60,"DEVOPS_CLOUD":0.18,"FRONTEND":0.12},
    "MANAGMENT-RESUMES":      {"ML_NLP":0.20,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.60,"CYBERSECURITY":0.18,"FINANCE_AUDIT":0.60,"DEVOPS_CLOUD":0.18,"FRONTEND":0.12},
    "OPERATIONMANAGER":       {"ML_NLP":0.15,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.55,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.55,"DEVOPS_CLOUD":0.15,"FRONTEND":0.08},
    "OPERATIONS-MANAGER-RESUMES":{"ML_NLP":0.15,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.55,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.55,"DEVOPS_CLOUD":0.15,"FRONTEND":0.08},

    # ── TESTING / QA ──────────────────────────────────────────────────────────
    "TESTING":                {"ML_NLP":0.35,"BACKEND_JAVA":0.65,"DATA_ANALYST":0.35,"CYBERSECURITY":0.55,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.60,"FRONTEND":0.50},
    "TESTING-RESUMES":        {"ML_NLP":0.35,"BACKEND_JAVA":0.65,"DATA_ANALYST":0.35,"CYBERSECURITY":0.55,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.60,"FRONTEND":0.50},

    # ── FINANCE / BANQUE ──────────────────────────────────────────────────────
    "FINANCE":                {"ML_NLP":0.22,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.68,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.95,"DEVOPS_CLOUD":0.10,"FRONTEND":0.10},
    "FINANCE-RESUMES":        {"ML_NLP":0.22,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.68,"CYBERSECURITY":0.15,"FINANCE_AUDIT":0.95,"DEVOPS_CLOUD":0.10,"FRONTEND":0.10},
    "ACCOUNTANT":             {"ML_NLP":0.10,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.62,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.93,"DEVOPS_CLOUD":0.05,"FRONTEND":0.05},
    "ACCOUNTANT-RESUMES":     {"ML_NLP":0.10,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.62,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.93,"DEVOPS_CLOUD":0.05,"FRONTEND":0.05},
    "BANKING":                {"ML_NLP":0.28,"BACKEND_JAVA":0.18,"DATA_ANALYST":0.68,"CYBERSECURITY":0.22,"FINANCE_AUDIT":0.92,"DEVOPS_CLOUD":0.15,"FRONTEND":0.12},
    "BANKING-RESUMES":        {"ML_NLP":0.28,"BACKEND_JAVA":0.18,"DATA_ANALYST":0.68,"CYBERSECURITY":0.22,"FINANCE_AUDIT":0.92,"DEVOPS_CLOUD":0.15,"FRONTEND":0.12},

    # ── HR / RH ───────────────────────────────────────────────────────────────
    "HR":                     {"ML_NLP":0.15,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.48,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.32,"DEVOPS_CLOUD":0.05,"FRONTEND":0.10},
    "HR-RESUMES":             {"ML_NLP":0.15,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.48,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.32,"DEVOPS_CLOUD":0.05,"FRONTEND":0.10},
    "HUMAN-RESOURCES":        {"ML_NLP":0.15,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.48,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.32,"DEVOPS_CLOUD":0.05,"FRONTEND":0.10},
    "HUMAN RESOURCES":        {"ML_NLP":0.15,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.48,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.32,"DEVOPS_CLOUD":0.05,"FRONTEND":0.10},
    "PBO":                    {"ML_NLP":0.12,"BACKEND_JAVA":0.08,"DATA_ANALYST":0.45,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.40,"DEVOPS_CLOUD":0.08,"FRONTEND":0.08},
    "BPO-RESUMES":            {"ML_NLP":0.12,"BACKEND_JAVA":0.08,"DATA_ANALYST":0.45,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.40,"DEVOPS_CLOUD":0.08,"FRONTEND":0.08},

    # ── INGÉNIERIE ────────────────────────────────────────────────────────────
    "CIVIL-ENGINEER-RESUMES": {"ML_NLP":0.10,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.30,"CYBERSECURITY":0.08,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.12,"FRONTEND":0.10},
    "CIVILENGINEER":          {"ML_NLP":0.10,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.30,"CYBERSECURITY":0.08,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.12,"FRONTEND":0.10},
    "MECHANICAL-ENGINEER-RESUMES":{"ML_NLP":0.20,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.35,"CYBERSECURITY":0.12,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.25,"FRONTEND":0.12},
    "MECHANICALENGINEER":     {"ML_NLP":0.20,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.35,"CYBERSECURITY":0.12,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.25,"FRONTEND":0.12},
    "ELECTRICAL-ENGINEERING-RESUMES":{"ML_NLP":0.25,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.35,"CYBERSECURITY":0.20,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.30,"FRONTEND":0.15},
    "ELECTRICALENGINEER":     {"ML_NLP":0.25,"BACKEND_JAVA":0.20,"DATA_ANALYST":0.35,"CYBERSECURITY":0.20,"FINANCE_AUDIT":0.10,"DEVOPS_CLOUD":0.30,"FRONTEND":0.15},
    "BUILDING-CONSTRUCTION-RESUMES":{"ML_NLP":0.05,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.20,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.08,"FRONTEND":0.05},

    # ── EDUCATION ─────────────────────────────────────────────────────────────
    "EDUCATION":              {"ML_NLP":0.28,"BACKEND_JAVA":0.18,"DATA_ANALYST":0.30,"CYBERSECURITY":0.18,"FINANCE_AUDIT":0.18,"DEVOPS_CLOUD":0.15,"FRONTEND":0.18},
    "EDUCATION-RESUMES":      {"ML_NLP":0.28,"BACKEND_JAVA":0.18,"DATA_ANALYST":0.30,"CYBERSECURITY":0.18,"FINANCE_AUDIT":0.18,"DEVOPS_CLOUD":0.15,"FRONTEND":0.18},

    # ── AUTRES ────────────────────────────────────────────────────────────────
    "ADVOCATE":               {"ML_NLP":0.08,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.20,"CYBERSECURITY":0.18,"FINANCE_AUDIT":0.42,"DEVOPS_CLOUD":0.05,"FRONTEND":0.05},
    "ADVOCATE-RESUMES":       {"ML_NLP":0.08,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.20,"CYBERSECURITY":0.18,"FINANCE_AUDIT":0.42,"DEVOPS_CLOUD":0.05,"FRONTEND":0.05},
    "AGRICULTURAL":           {"ML_NLP":0.08,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.28,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.05,"FRONTEND":0.05},
    "AGRICULTURAL-RESUMES":   {"ML_NLP":0.08,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.28,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.05,"FRONTEND":0.05},
    "AGRICULTURE":            {"ML_NLP":0.08,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.28,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.05,"FRONTEND":0.05},
    "ARCHITECT":              {"ML_NLP":0.12,"BACKEND_JAVA":0.12,"DATA_ANALYST":0.20,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.15,"FRONTEND":0.38},
    "ARCHITECTS-RESUMES":     {"ML_NLP":0.12,"BACKEND_JAVA":0.12,"DATA_ANALYST":0.20,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.15,"FRONTEND":0.38},
    "ARTS":                   {"ML_NLP":0.12,"BACKEND_JAVA":0.12,"DATA_ANALYST":0.18,"CYBERSECURITY":0.08,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.08,"FRONTEND":0.42},
    "ARTS-RESUMES":           {"ML_NLP":0.12,"BACKEND_JAVA":0.12,"DATA_ANALYST":0.18,"CYBERSECURITY":0.08,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.08,"FRONTEND":0.42},
    "APPAREL":                {"ML_NLP":0.05,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.15,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.05,"DEVOPS_CLOUD":0.05,"FRONTEND":0.28},
    "APPAREL-RESUMES":        {"ML_NLP":0.05,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.15,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.05,"DEVOPS_CLOUD":0.05,"FRONTEND":0.28},
    "AUTOMOBILE":             {"ML_NLP":0.15,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.28,"CYBERSECURITY":0.12,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.18,"FRONTEND":0.12},
    "AUTOMOBILE-RESUMES":     {"ML_NLP":0.15,"BACKEND_JAVA":0.15,"DATA_ANALYST":0.28,"CYBERSECURITY":0.12,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.18,"FRONTEND":0.12},
    "AVIATION":               {"ML_NLP":0.18,"BACKEND_JAVA":0.12,"DATA_ANALYST":0.32,"CYBERSECURITY":0.20,"FINANCE_AUDIT":0.12,"DEVOPS_CLOUD":0.22,"FRONTEND":0.10},
    "AVIATION-RESUMES":       {"ML_NLP":0.18,"BACKEND_JAVA":0.12,"DATA_ANALYST":0.32,"CYBERSECURITY":0.20,"FINANCE_AUDIT":0.12,"DEVOPS_CLOUD":0.22,"FRONTEND":0.10},
    "FOOD":                   {"ML_NLP":0.05,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.15,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.05,"FRONTEND":0.05},
    "FOOD-BEVERAGES-RESUMES": {"ML_NLP":0.05,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.15,"CYBERSECURITY":0.05,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.05,"FRONTEND":0.05},
    "SALES":                  {"ML_NLP":0.12,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.42,"CYBERSECURITY":0.08,"FINANCE_AUDIT":0.38,"DEVOPS_CLOUD":0.05,"FRONTEND":0.15},
    "SALES-RESUMES":          {"ML_NLP":0.12,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.42,"CYBERSECURITY":0.08,"FINANCE_AUDIT":0.38,"DEVOPS_CLOUD":0.05,"FRONTEND":0.15},
    "PUBLIC":                 {"ML_NLP":0.08,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.30,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.30,"DEVOPS_CLOUD":0.05,"FRONTEND":0.10},
    "PUBLIC-RELATIONS-RESUMES":{"ML_NLP":0.08,"BACKEND_JAVA":0.05,"DATA_ANALYST":0.30,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.30,"DEVOPS_CLOUD":0.05,"FRONTEND":0.10},
    "HEALTHFITNESS":          {"ML_NLP":0.20,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.35,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.10,"FRONTEND":0.12},
    "HEALTH-FITNESS-RESUMES": {"ML_NLP":0.20,"BACKEND_JAVA":0.10,"DATA_ANALYST":0.35,"CYBERSECURITY":0.10,"FINANCE_AUDIT":0.08,"DEVOPS_CLOUD":0.10,"FRONTEND":0.12},
}

def _get_compat(categorie: str) -> Dict[str, float]:
    """Cherche la compatibilité pour une catégorie, avec fallback intelligent."""
    # Match exact
    if categorie in COMPAT:
        return COMPAT[categorie]
    # Match partiel : ACCOUNTANT-RESUMES → ACCOUNTANT
    for key in COMPAT:
        if categorie.startswith(key) or key.startswith(categorie.split("-")[0]):
            return COMPAT[key]
    return DEFAULT_COMPAT

DEFAULT_COMPAT = {k: 0.18 for k in BCT_POSTES}


# ══════════════════════════════════════════════════════════════════════════════
#  EXTRACTION PDF
# ══════════════════════════════════════════════════════════════════════════════

def extraire_texte(chemin: str) -> str:
    """
    Extraction PDF avec 4 méthodes en cascade :
      1. get_text("text")    → texte natif
      2. get_text("blocks")  → blocs de texte
      3. get_text("rawtext") → texte brut
      4. OCR Tesseract       → PDF scanné
    """
    try:
        doc   = fitz.open(chemin)
        pages = []
        for page in doc:
            t = ""

            # Méthode 1 : texte natif
            t = page.get_text("text").strip()

            # Méthode 2 : blocs si vide
            if len(t) < 30:
                blocs = page.get_text("blocks")
                t = " ".join(
                    b[4] for b in blocs
                    if len(b) > 4 and isinstance(b[4], str) and b[4].strip()
                ).strip()

            # Méthode 3 : rawtext si encore vide
            if len(t) < 30:
                t = page.get_text("rawtext").strip()

            # Méthode 4 : OCR Tesseract si toujours vide (PDF scanné)
            if len(t) < 30:
                t = _ocr_page(page)
                if not t.strip():
                    log.debug("OCR page vide")

            if t:
                pages.append(t)

        doc.close()

        texte = unicodedata.normalize("NFKC", "\n".join(pages))
        texte = re.sub(r"\s+", " ", texte).strip()

        # Si toujours vide → essayer pdf2image (meilleure qualité)
        if len(texte.split()) < 10:
            texte = _ocr_pdf_pdf2image(chemin)

        return texte

    except Exception as e:
        log.debug("PDF %s : %s", Path(chemin).name, e)
        # Dernier recours : pdf2image direct
        return _ocr_pdf_pdf2image(chemin)


def _ocr_page(page) -> str:
    """
    OCR Tesseract sur une page PDF scannée.
    Utilise le chemin Tesseract et Poppler configurés en haut du fichier.
    """
    try:
        import pytesseract
        from PIL import Image
        import io
        # dpi=300 → meilleure qualité OCR
        pix  = page.get_pixmap(dpi=300)
        img  = Image.open(io.BytesIO(pix.tobytes("png")))
        # lang="eng+fra" → anglais + français
        text = pytesseract.image_to_string(
            img,
            lang   = "eng+fra",
            config = "--psm 3",
        ).strip()
        return text
    except Exception as e:
        log.debug("OCR page : %s", e)
        return ""


def _ocr_pdf_pdf2image(chemin: str) -> str:
    """
    OCR via pdf2image + Tesseract (meilleure qualité pour PDFs multi-pages).
    Nécessite Poppler installé.
    """
    try:
        from pdf2image import convert_from_path
        import pytesseract

        images = convert_from_path(
            chemin,
            dpi          = 300,
            poppler_path = POPPLER_PATH,
        )
        texte = " ".join(
            pytesseract.image_to_string(img, lang="eng+fra", config="--psm 3")
            for img in images
        )
        return re.sub(r"\s+", " ", texte).strip()
    except Exception as e:
        log.debug("pdf2image OCR : %s", e)
        return ""

def collecter_pdfs(path: str, max_cvs: int):
    """Collecte les PDFs du dataset Kaggle. max_cvs=0 → tous."""
    import random
    all_pdfs = []
    for root, _, files in os.walk(path):
        cat = Path(root).name.strip().upper().replace(" ","-").replace("_","-")
        while "--" in cat: cat = cat.replace("--","-")
        for f in sorted(files):
            if f.lower().endswith(".pdf"):
                all_pdfs.append((os.path.join(root, f), cat))

    random.seed(42)
    random.shuffle(all_pdfs)
    pdfs = all_pdfs if max_cvs <= 0 else all_pdfs[:max_cvs]

    cats = {}
    for _, c in pdfs: cats[c] = cats.get(c,0)+1
    log.info("Dataset Kaggle : %d PDFs (sur %d disponibles)", len(pdfs), len(all_pdfs))
    for cat, n in sorted(cats.items(), key=lambda x:-x[1])[:20]:
        log.info("  %-35s : %d", cat, n)
    if len(cats) > 20:
        log.info("  ... et %d autres categories", len(cats)-20)
    return pdfs


# ══════════════════════════════════════════════════════════════════════════════
#  WEAK SUPERVISION
# ══════════════════════════════════════════════════════════════════════════════

def normaliser(texte: str) -> str:
    t = unicodedata.normalize("NFD", texte)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return t.lower()


def tfidf_overlap(texte_cv: str, keywords) -> float:
    if not keywords or not texte_cv: return 0.0
    cv_n = normaliser(texte_cv)
    total, matched = 0.0, 0.0
    for kw in keywords:
        kw_n  = normaliser(kw)
        poids = math.log(1 + len(kw_n.split()))
        total += poids
        cnt    = cv_n.count(kw_n)
        if cnt > 0:
            matched += poids * min(1.0, 0.5 + 0.25*cnt)
    return round(matched / max(total, 1e-6), 4)


def calculer_label(texte_cv: str, categorie: str, poste_id: str, poste: dict) -> float:
    cat       = categorie.upper().replace(" ","-")
    s_domaine = _get_compat(cat).get(poste_id, 0.18)
    s_tfidf   = tfidf_overlap(texte_cv, poste["keywords"])
    label     = 0.55 * s_domaine + 0.45 * s_tfidf
    return round(max(0.02, min(0.98, label)), 4)


# ── Paires synthétiques FR ────────────────────────────────────────────────────
PAIRES_SYNTHETIQUES_FR = [
    ("Etudiant ingenieur ESPRIT React.js Node.js Spring Boot Docker MongoDB MySQL JavaScript TypeScript Git CI/CD Jenkins REST API JWT stage developpement web plateforme gestion hospitaliere",
     "FRONTEND", "Stage Developpement Frontend React", 0.88),
    ("Etudiant ingenieur React.js Node.js Spring Boot Docker MongoDB MySQL JavaScript TypeScript Git CI/CD Jenkins REST API JWT",
     "BACKEND_JAVA", "Stage Developpement Backend Java", 0.82),
    ("Master data science Python machine learning TensorFlow PyTorch NLP BERT scikit-learn pandas numpy Flask Docker stage banque detection fraude AUC modele classification",
     "ML_NLP", "Stage Machine Learning NLP", 0.92),
    ("Etudiant finance IHEC comptabilite audit Excel VBA reporting financier analyse risques credit bilan IFRS conformite reglementaire stage banque",
     "FINANCE_AUDIT", "Stage Analyste Financier Audit Bancaire", 0.91),
    ("Etudiant ingenieur securite informatique Linux reseau firewall pentest ISO 27001 RGPD SIEM cryptographie SSL TLS audit securite",
     "CYBERSECURITY", "Stage Cybersecurite Audit Securite", 0.89),
    ("Ingenieur Docker Kubernetes AWS Azure CI/CD Jenkins Terraform Ansible Linux shell scripting Python monitoring Prometheus Grafana GitLab",
     "DEVOPS_CLOUD", "Stage DevOps Cloud Infrastructure", 0.90),
    ("Etudiant ingenieur React.js Node.js Spring Boot Docker MongoDB MySQL JavaScript TypeScript Git REST API",
     "ML_NLP", "Stage Machine Learning NLP", 0.22),
    ("Etudiant finance comptabilite audit Excel VBA reporting IFRS analyse financiere risques credit",
     "BACKEND_JAVA", "Stage Developpement Backend Java", 0.08),
    ("Etudiant ingenieur React.js Node.js Spring Boot Docker MongoDB MySQL JavaScript TypeScript Git",
     "DATA_ANALYST", "Stage Data Analyst Business Intelligence", 0.35),
    ("Developpeur web React.js Angular Vue.js JavaScript TypeScript HTML CSS Node.js Express MongoDB Firebase Docker Git responsive design UI UX",
     "FRONTEND", "Stage Developpement Frontend React", 0.91),
    ("Developpeur Java Spring Boot microservices JPA Hibernate MySQL PostgreSQL REST API Docker Maven Jenkins JWT OAuth2 tests JUnit",
     "BACKEND_JAVA", "Stage Developpement Backend Java", 0.93),
    ("Etudiant Python pandas SQL Excel power bi tableau reporting statistiques data visualisation ETL pipeline",
     "DATA_ANALYST", "Stage Data Analyst Business Intelligence", 0.87),
    ("Etudiant Python machine learning scikit-learn pandas NLP BERT Flask REST API Git Docker",
     "ML_NLP", "Stage Machine Learning NLP", 0.85),
    ("Etudiant DevOps Docker Kubernetes AWS Linux shell Python CI/CD Git Jenkins",
     "DEVOPS_CLOUD", "Stage DevOps Cloud Infrastructure", 0.84),
    ("Etudiant marketing communication reseaux sociaux publicite creativite design Adobe Photoshop",
     "ML_NLP", "Stage Machine Learning NLP", 0.05),
    ("Chef cuisinier restauration cuisine gastronomie patisserie management equipe service client",
     "BACKEND_JAVA", "Stage Developpement Backend Java", 0.02),
]


def preparer_pairs(dataset_path: str, max_cvs: int):
    """Phase 1 : extraction + labellisation weak supervision."""
    import pandas as pd
    log.info("Ajout paires synthetiques FR (x15)...")
    rows = []
    for texte_cv, poste_id, poste_titre, label in PAIRES_SYNTHETIQUES_FR:
        poste = BCT_POSTES.get(poste_id, {})
        if not poste: continue
        for _ in range(15):
            rows.append({
                "cv_path":          "synthetic_fr",
                "texte_cv":         texte_cv,
                "categorie_kaggle": "SYNTHETIC-FR",
                "poste_id":         poste_id,
                "poste_titre":      poste_titre,
                "poste_description":poste.get("description",""),
                "label":            label,
            })
    log.info("  -> %d paires synthetiques FR", len(rows))

    pdfs        = collecter_pdfs(dataset_path, max_cvs)
    nb_extraits = 0
    nb_ignores  = 0
    BATCH       = 500

    for i, (chemin, cat) in enumerate(pdfs):
        texte   = extraire_texte(chemin)
        nb_mots = len(texte.split())

        if i < 3:
            log.info("  [DEBUG] PDF %d : %-28s cat=%-22s %d mots | %s",
                     i+1, Path(chemin).name[:28], cat[:22], nb_mots,
                     texte[:50].replace("\n"," ") if texte else "VIDE")

        if nb_mots < 10:
            nb_ignores += 1
            continue

        nb_extraits += 1
        for pid, poste in BCT_POSTES.items():
            label = calculer_label(texte, cat, pid, poste)
            rows.append({
                "cv_path":          chemin,
                "texte_cv":         texte[:800],
                "categorie_kaggle": cat,
                "poste_id":         pid,
                "poste_titre":      poste["titre"],
                "poste_description":poste["description"],
                "label":            label,
            })

        if (i+1) % 100 == 0:
            pct = (i+1)/len(pdfs)*100
            log.info("  [%5.1f%%] %d/%d | extraits=%d ignores=%d | %d paires",
                     pct, i+1, len(pdfs), nb_extraits, nb_ignores, len(rows))

        if nb_extraits > 0 and nb_extraits % BATCH == 0:
            pd.DataFrame(rows).to_csv(PAIRS_CSV, sep="|", index=False)
            log.info("  Sauvegarde intermediaire : %d paires", len(rows))

    log.info("Extraction : %d extraits | %d ignores | %d paires",
             nb_extraits, nb_ignores, len(rows))

    if nb_extraits == 0:
        log.error("Aucun CV extrait — verifier OCR")
        sys.exit(1)

    df = pd.DataFrame(rows)
    df.to_csv(PAIRS_CSV, sep="|", index=False)
    pos = (df["label"]>=0.6).sum()
    neg = (df["label"]<0.3).sum()
    log.info("Labels : positifs=%d (%.0f%%) negatifs=%d | total=%d",
             pos, pos/len(df)*100, neg, len(df))
    return df



def finetune_bert(df: pd.DataFrame, epochs=5, batch_size=16):
    log.info("═══ PHASE 2 : Fine-tuning Sentence-BERT ═══")
    try:
        from sentence_transformers import SentenceTransformer, InputExample, losses, evaluation
        from torch.utils.data import DataLoader
        from sklearn.model_selection import train_test_split
    except ImportError:
        log.error("pip install sentence-transformers torch scikit-learn"); sys.exit(1)

    df_c = df.dropna(subset=["texte_cv","poste_description","label"])
    df_c = df_c[df_c["texte_cv"].str.len() > 80].copy()
    log.info("%d paires valides", len(df_c))

    df_c["lbin"] = pd.cut(df_c["label"], bins=3, labels=False)
    try:    df_tr, df_te = train_test_split(df_c, test_size=0.15, random_state=42, stratify=df_c["lbin"])
    except: df_tr, df_te = train_test_split(df_c, test_size=0.15, random_state=42)
    log.info("Train=%d | Test=%d", len(df_tr), len(df_te))

    examples = [
        InputExample(
            texts=[str(r["texte_cv"])[:512],
                   f"{r['poste_titre']} {r['poste_description']}"[:512]],
            label=float(r["label"]),
        ) for _, r in df_tr.iterrows()
    ]

    # paraphrase-multilingual-mpnet-base-v2 :
    # → 768 dimensions (vs 384 pour MiniLM) = 2x plus précis
    # → multilingue 50+ langues (FR + EN + AR) ✅
    # → meilleur des deux : puissance mpnet + support français
    model    = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    loader   = DataLoader(examples, shuffle=True, batch_size=batch_size)
    loss_fn  = losses.CosineSimilarityLoss(model)

    evaluator = evaluation.EmbeddingSimilarityEvaluator(
        sentences1=[str(r["texte_cv"])[:512] for _,r in df_te.iterrows()],
        sentences2=[f"{r['poste_titre']} {r['poste_description']}"[:512] for _,r in df_te.iterrows()],
        scores=[float(r["label"]) for _,r in df_te.iterrows()],
        name="bct", show_progress_bar=False,
    )

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    warmup = max(10, len(loader) * epochs // 10)
    log.info("Entraînement : %d epochs | batch=%d | warmup=%d", epochs, batch_size, warmup)

    model.fit(
        train_objectives=[(loader, loss_fn)],
        evaluator=evaluator,
        epochs=epochs,
        warmup_steps=warmup,
        evaluation_steps=max(50, len(loader)),
        output_path=str(MODEL_DIR),
        save_best_model=True,
        show_progress_bar=True,
    )
    log.info("✅ Modèle sauvegardé : %s", MODEL_DIR)


# ══════════════════════════════════════════════════════════════════════════════
#  PHASE 3 : ÉVALUATION
# ══════════════════════════════════════════════════════════════════════════════

def evaluer(df: pd.DataFrame):
    log.info("═══ PHASE 3 : Évaluation ═══")
    from sentence_transformers import SentenceTransformer
    from scipy.stats import spearmanr
    model   = SentenceTransformer(str(MODEL_DIR))
    df_eval = df.sample(min(100, len(df)), random_state=42)
    preds, labels = [], []
    for _, r in df_eval.iterrows():
        v = model.encode([str(r["texte_cv"])[:512],
                          f"{r['poste_titre']} {r['poste_description']}"[:512]],
                         normalize_embeddings=True, show_progress_bar=False)
        preds.append(float(max(0.0, v[0]@v[1])))
        labels.append(float(r["label"]))

    spear, _ = spearmanr(preds, labels)
    mae      = sum(abs(p-l) for p,l in zip(preds,labels)) / len(preds)
    log.info("Corrélation Spearman : %.4f | MAE : %.4f", spear, mae)
    log.info("Qualité : %s", "✅ EXCELLENT" if spear>=0.65 else "✅ BON" if spear>=0.45 else "⚠️ Augmenter max_cvs/epochs")


# ══════════════════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Entraînement BERT BCT — sans Groq")
    p.add_argument("--train",         action="store_true")
    p.add_argument("--max_cvs", type=int, default=0, help="Nombre max de CVs (0=TOUS)")
    p.add_argument("--epochs",        type=int,   default=5)
    p.add_argument("--batch_size",    type=int,   default=16)
    p.add_argument("--dataset_path",  default="")
    p.add_argument("--skip_extract",  action="store_true")
    args = p.parse_args()

    if args.train:
        if args.skip_extract and PAIRS_CSV.exists():
            log.info("Chargement %s...", PAIRS_CSV)
            df = pd.read_csv(PAIRS_CSV, sep="|")
        else:
            if not args.dataset_path:
                try:
                    import kagglehub
                    args.dataset_path = kagglehub.dataset_download("hadikp/resume-data-pdf")
                except Exception as e:
                    log.error("Kaggle : %s\npip install kagglehub", e); sys.exit(1)
            df = preparer_pairs(args.dataset_path, args.max_cvs)

        finetune_bert(df, epochs=args.epochs, batch_size=args.batch_size)
        if MODEL_DIR.exists(): evaluer(df)

        log.info("\n✅ Entraînement terminé !")
        log.info("   Lancer l'API : python cv_scorer.py --serve")
    else:
        p.print_help()