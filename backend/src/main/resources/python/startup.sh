#!/bin/bash
# Script de démarrage pour Azure App Service (Linux/Python)
# 1 worker (ArcFace + BERT sont très gourmands en mémoire)
# timeout 600s pour laisser les modèles se charger au cold-start
gunicorn --bind=0.0.0.0:8000 \
         --timeout=600 \
         --workers=1 \
         --threads=4 \
         --preload \
         app:app
