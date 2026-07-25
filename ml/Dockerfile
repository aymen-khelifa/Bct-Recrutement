# ml/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système (fini le problème libxcb !)
RUN apt-get update && apt-get install -y \
    libxcb1 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# 🔥 ASTUCE CRUCIALE : Forcer la version CPU de PyTorch (Évite 3 Go de téléchargement CUDA Nvidia et empêche le crash)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir opencv-python-headless==4.10.0.84
RUN pip install --no-cache-dir deepface --no-deps
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "--bind=0.0.0.0:8000", "--timeout=600", "--workers=1", "ml_router:app"]
