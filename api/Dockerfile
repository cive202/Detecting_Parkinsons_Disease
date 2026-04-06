# Production Flask API for Parkinson's voice predictor.
# Build: docker build -t parkinsons-api .
# Run:   docker run -p 5000:5000 -e PORT=5000 parkinsons-api
# Requires api/models/parkinson_models.joblib (or set PARKINSON_MODEL_PATH).

FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY feature_config.py train_model.py app.py ./
COPY models/ ./models/

EXPOSE 5000

# Render/Fly/Railway set PORT; default for local docker run.
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --threads 2 --timeout 120 app:app"]
