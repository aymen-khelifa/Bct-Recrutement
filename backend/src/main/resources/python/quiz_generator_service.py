"""
quiz_generator_service.py
src/main/resources/python/quiz_generator_service.py

Fix :
- Délai entre les 2 batches pour éviter le 429
- Accepte les questions même si < 25 (pas de retry inutile)
- Tolérance plus souple
"""

import argparse
import json
import logging
import os
import time

from flask import Flask, request, jsonify
from groq import Groq

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=5000)
args = parser.parse_args()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("quiz-gen")

app = Flask(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL   = "llama-3.3-70b-versatile"

if not GROQ_API_KEY:
    log.warning("⚠️ GROQ_API_KEY non défini !")

client = Groq(api_key=GROQ_API_KEY)
log.info(f"✅ Client Groq prêt ({GROQ_MODEL})")

GENERIQUES = {
    "première proposition", "deuxième proposition", "troisième proposition",
    "option a", "option b", "option c",
    "option 1", "option 2", "option 3",
    "vrai", "faux", "true", "false",
    "oui", "non", "aucune", "toutes",
    "réponse a", "réponse b", "réponse c",
}


def build_prompt(titre, departement, specialite, description, nb, distribution, existing_topics):
    desc        = (description or "")[:300]
    distrib_str = ", ".join(f"{n} {d}" for d, n in distribution)
    avoid_str   = ""
    if existing_topics:
        avoid_str = "\n\nSujets déjà traités — NE PAS répéter :\n" + \
                    "\n".join(f"- {t}" for t in existing_topics[:25])

    return f"""Tu es un expert RH de la Banque Centrale de Tunisie.
Génère exactement {nb} questions QCM en français pour évaluer un stagiaire.

Sujet       : {titre}
Département : {departement}
Spécialité  : {specialite}
Contexte    : {desc}

Distribution : {distrib_str}{avoid_str}

RÈGLES :
- {nb} questions UNIQUES sur des aspects différents
- 3 options RÉELLES et TECHNIQUES par question
- INTERDIT : "Option A", "Première proposition", "Vrai", "Faux"
- 1 seule réponse correcte (correcte: true)
- Options plausibles (pas évidemment fausses)

Réponds UNIQUEMENT avec un tableau JSON de {nb} éléments.
Commence par [ et termine par ].

[
  {{
    "texte": "Question précise ?",
    "difficulte": "Débutant",
    "options": [
      {{"texte": "réponse technique 1", "correcte": false}},
      {{"texte": "réponse technique 2", "correcte": true}},
      {{"texte": "réponse technique 3", "correcte": false}}
    ]
  }}
]"""


def call_groq(prompt: str) -> str:
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Tu es un expert en QCM bancaires. "
                    "Tu réponds UNIQUEMENT avec du JSON valide. "
                    "Tu génères exactement le nombre de questions demandé, toutes uniques."
                )
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.5,
        max_tokens=6000,
    )
    return completion.choices[0].message.content


def parse_questions(raw: str, seen_texts: set) -> list:
    try:
        start = raw.find('[')
        end   = raw.rfind(']')
        if start == -1 or end == -1:
            log.error("Pas de [ ] dans la réponse")
            return []

        data  = json.loads(raw[start:end + 1])
        valid = []

        for q in data:
            try:
                texte   = str(q.get("texte", "")).strip()
                diff    = str(q.get("difficulte", "Intermédiaire")).strip()
                options = q.get("options", [])

                if not texte or len(texte) < 10:
                    continue

                key = texte.lower()[:60]
                if key in seen_texts:
                    log.warning(f"Doublon : '{texte[:50]}'")
                    continue

                if len(options) != 3:
                    continue

                opts_ok = True
                for opt in options:
                    t = str(opt.get("texte", "")).strip()
                    if t.lower() in GENERIQUES or len(t) < 3:
                        opts_ok = False
                        break
                if not opts_ok:
                    continue

                nb_ok = sum(1 for o in options if o.get("correcte") is True)
                if nb_ok == 0:
                    options[0]["correcte"] = True
                elif nb_ok > 1:
                    first = True
                    for o in options:
                        if o.get("correcte"):
                            o["correcte"] = first
                            first = False

                seen_texts.add(key)
                valid.append({
                    "texte":      texte,
                    "difficulte": diff,
                    "options": [
                        {
                            "texte":    str(o.get("texte", "")).strip(),
                            "correcte": bool(o.get("correcte", False))
                        }
                        for o in options
                    ]
                })

            except Exception:
                continue

        return valid

    except json.JSONDecodeError as e:
        log.error(f"JSON invalide : {e}")
        return []


@app.route("/generate", methods=["POST"])
def generate_quiz():
    data        = request.get_json(force=True) or {}
    sujet_id    = data.get("sujetId",     0)
    titre       = data.get("titre",       "Stage bancaire")
    departement = data.get("departement", "Informatique")
    specialite  = data.get("specialite",  "Informatique")
    description = data.get("description", "")
    log.info(f"[/generate] sujetId={sujet_id} | titre={titre}")

    all_questions = []
    seen_texts    = set()

    # ── Batch 1 : 25 questions ────────────────────────────────────────────────
    log.info("=== Batch 1/2 ===")
    try:
        prompt1 = build_prompt(
            titre, departement, specialite, description,
            25,
            [("Débutant", 8), ("Intermédiaire", 10), ("Avancé", 5), ("Expert", 2)],
            []
        )
        raw1   = call_groq(prompt1)
        batch1 = parse_questions(raw1, seen_texts)
        all_questions.extend(batch1)
        log.info(f"Batch 1 : {len(batch1)} questions valides")
    except Exception as e:
        log.error(f"Batch 1 erreur : {e}")

    # ── Délai pour éviter le 429 ──────────────────────────────────────────────
    log.info("Pause 5s entre les batches (rate limit Groq)...")
    time.sleep(5)

    # ── Batch 2 : 25 questions différentes ───────────────────────────────────
    log.info("=== Batch 2/2 ===")
    try:
        existing_topics = [q["texte"][:80] for q in all_questions]
        prompt2 = build_prompt(
            titre, departement, specialite, description,
            25,
            [("Débutant", 7), ("Intermédiaire", 10), ("Avancé", 5), ("Expert", 3)],
            existing_topics
        )
        raw2   = call_groq(prompt2)
        batch2 = parse_questions(raw2, seen_texts)
        all_questions.extend(batch2)
        log.info(f"Batch 2 : {len(batch2)} questions valides")
    except Exception as e:
        log.error(f"Batch 2 erreur : {e}")

    # ── Si encore < 50 : 1 appel de complétion ───────────────────────────────
    MAX_ATTEMPTS = 5
    attempt = 0
    while len(all_questions) < 50 and attempt < MAX_ATTEMPTS:
        manquantes = 50 - len(all_questions)
        log.info(f"Complétion tentative {attempt+1} : {manquantes} questions manquantes...")

        time.sleep(5)

        try:
            existing_topics = [q["texte"][:80] for q in all_questions]

            prompt = build_prompt(
                titre,
                departement,
                specialite,
                description,
                manquantes,
                [("Intermédiaire", manquantes)],
                existing_topics
            )

            raw   = call_groq(prompt)
            extra = parse_questions(raw, seen_texts)

            if not extra:
                log.warning("Aucune question valide retournée")
                attempt += 1
                continue

            all_questions.extend(extra)
            log.info(f"Ajoutées : {len(extra)} | Total: {len(all_questions)}")

        except Exception as e:
            log.error(f"Erreur complétion : {e}")

        attempt += 1

    # 🔒 Sécurité finale
    if len(all_questions) > 50:
        all_questions = all_questions[:50]

    log.info(f"[/generate] ✅ Total final : {len(all_questions)} questions.")
    return jsonify({
        "sujetId":   sujet_id,
        "count":     len(all_questions),
        "questions": all_questions
    })


@app.route("/health", methods=["GET"])
def health():
    try:
        client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5,
        )
        groq_ok = True
    except Exception as e:
        log.error(f"Groq health check: {e}")
        groq_ok = False

    return jsonify({
        "status": "ok" if groq_ok else "error",
        "model":  GROQ_MODEL,
        "groq":   groq_ok,
    })


if __name__ == "__main__":
    log.info(f"Démarrage sur le port {args.port}")
    app.run(host="0.0.0.0", port=args.port, debug=False, threaded=True)