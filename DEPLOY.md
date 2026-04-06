# Deploying this project

The app has two parts:

1. **Flask ML API** (`api/`) — loads `parkinson_models.joblib` and serves `/predict` and `/health`.
2. **Next.js UI** (`UI/`) — calls `/api/predict` on the same origin; that route proxies to Flask when `FLASK_API_URL` is set.

Deploy the API first, then point the frontend at it.

---

## 1. Deploy the Flask API (Docker)

The repo includes `api/Dockerfile` and `render.yaml` for [Render](https://render.com).

1. Push this repository to GitHub (or GitLab/Bitbucket supported by your host).
2. On Render: **New → Blueprint**, connect the repo, and apply `render.yaml`, **or** create a **Web Service** manually:
   - **Environment**: Docker
   - **Dockerfile path**: `api/Dockerfile`
   - **Docker build context**: `api`
3. Ensure `api/models/parkinson_models.joblib` is in the repo (or set `PARKINSON_MODEL_PATH` to a mounted path your platform supports).
4. After deploy, open `https://<your-service>.onrender.com/health` — you should see `"status":"ok"` and `"model":"loaded"`.

**Alternatives:** Any container host works (Railway, Fly.io, Google Cloud Run, AWS ECS). Build from the `api/` directory:

```bash
docker build -t parkinsons-api ./api
docker run -p 5000:5000 -e PORT=5000 parkinsons-api
```

---

## 2. Deploy the Next.js UI (Vercel)

1. Import the repo in [Vercel](https://vercel.com).
2. Set **Root Directory** to `UI` (monorepo).
3. **Environment variables** (Production — and Preview if you want previews to hit a real model):

   | Name            | Value |
   |-----------------|--------|
   | `FLASK_API_URL` | `https://<your-api-host>` (no trailing slash) |

4. Deploy. The UI calls `/api/predict` on the Vercel deployment; the serverless route forwards JSON to `${FLASK_API_URL}/predict`.

If `FLASK_API_URL` is unset, the app uses a **mock** predictor (not your trained models).

---

## 3. Local check before deploy

```bash
# Terminal 1 — API
cd api
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
set FLASK_DEBUG=1
python app.py

# Terminal 2 — UI
cd UI
npm install
# .env.local:
# FLASK_API_URL=http://127.0.0.1:5000
npm run dev
```

Open the Next.js URL and submit the form; predictions should match your Flask logs.
