from __future__ import annotations

import os
from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request

from feature_config import API_KEYS, API_KEY_TO_COLUMN, FEATURE_COLUMNS

app = Flask(__name__)


@app.after_request
def _cors(response):
    """Avoid flask-cors so the app runs with any Python that has Flask only."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

_BUNDLE = None
_BUNDLE_PATH = Path(__file__).resolve().parent / "models" / "parkinson_models.joblib"


def _normalize_artifact(artifact):
    """
    Normalizes supported artifact shapes into a dict with:
      - models: dict[str, estimator]
      - feature_columns: list[str]
      - scaler: optional transformer with .transform
      - pca: optional transformer with .transform
    """
    if isinstance(artifact, dict):
        if isinstance(artifact.get("models"), dict) and artifact["models"]:
            return {
                "models": artifact["models"],
                "feature_columns": artifact.get("feature_columns") or FEATURE_COLUMNS,
                "scaler": artifact.get("scaler"),
                "pca": artifact.get("pca"),
            }
        if artifact.get("model") is not None:
            return {
                "models": {"ArtifactModel": artifact["model"]},
                "feature_columns": artifact.get("feature_columns") or FEATURE_COLUMNS,
                "scaler": artifact.get("scaler"),
                "pca": artifact.get("pca"),
            }

    if hasattr(artifact, "predict"):
        return {
            "models": {"ArtifactModel": artifact},
            "feature_columns": FEATURE_COLUMNS,
            "scaler": None,
            "pca": None,
        }

    raise TypeError(
        "Unsupported artifact format. Expected a bundle dict with 'models' (and optional "
        "'scaler'/'pca'/'feature_columns'), or a dict with 'model', or a single estimator."
    )


def load_bundle():
    global _BUNDLE
    if _BUNDLE is None:
        path = os.environ.get("PARKINSON_MODEL_PATH", str(_BUNDLE_PATH))
        if not os.path.isfile(path):
            raise FileNotFoundError(
                f"Model artifact not found at {path}. Expected something like "
                f"{_BUNDLE_PATH}. If you have a different artifacts path, set "
                f"PARKINSON_MODEL_PATH."
            )
        artifact = joblib.load(path)
        _BUNDLE = _normalize_artifact(artifact)
    return _BUNDLE


def body_to_feature_frame(data: dict, feature_columns: list) -> pd.DataFrame:
    missing = [k for k in API_KEYS if k not in data]
    if missing:
        raise ValueError(f"Missing keys: {missing}")
    row = []
    for api_key in API_KEYS:
        v = data[api_key]
        if not isinstance(v, (int, float)):
            raise ValueError(f"Invalid type for {api_key}")
        row.append(float(v))
    return pd.DataFrame([row], columns=feature_columns)


def _label_from_class(c: int) -> str:
    return "Parkinsons" if int(c) == 1 else "Healthy"


def build_response(classifier_votes: dict) -> dict:
    """
    Returns:
    - primary: preferred model prediction (KNN when available)
    - classifier_votes: all model predictions
    - prediction: summary for the main box
    """
    primary_key = None
    for k in classifier_votes.keys():
        lk = str(k).lower()
        if "knn" in lk or "k-nearest" in lk:
            primary_key = k
            break
    if primary_key is None and classifier_votes:
        primary_key = next(iter(classifier_votes.keys()))

    primary_label = classifier_votes.get(primary_key) if primary_key is not None else None
    counts = {"Parkinsons": 0, "Healthy": 0}
    for v in classifier_votes.values():
        if v in counts:
            counts[v] += 1

    summary = (
        f"Primary: {primary_label} | "
        f"Votes — Parkinsons: {counts['Parkinsons']}, Healthy: {counts['Healthy']}"
    )

    return {
        "primary": {"model": str(primary_key) if primary_key is not None else None, "prediction": primary_label},
        "prediction": summary,
        "classifier_votes": classifier_votes,
    }


@app.get("/health")
def health():
    try:
        load_bundle()
        return jsonify({"status": "ok", "model": "loaded", "api_version": "optionA-multimodel-v1"})
    except FileNotFoundError as e:
        return jsonify({"status": "error", "detail": str(e)}), 503


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return "", 204
    try:
        data = request.get_json(force=True, silent=False)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if not isinstance(data, dict):
        return jsonify({"error": "Body must be a JSON object"}), 400

    try:
        bundle = load_bundle()
        cols = bundle["feature_columns"]
        X_raw = body_to_feature_frame(data, cols)
        scaler = bundle.get("scaler")
        pca = bundle.get("pca")

        X = X_raw
        if scaler is not None:
            X = scaler.transform(X)
        if pca is not None:
            X = pca.transform(X)

        models = bundle.get("models")
        if not isinstance(models, dict) or not models:
            raise KeyError(
                "Loaded artifact does not contain a usable models dict. Ensure your "
                "artifact includes either {'models': {...}} or {'model': estimator}."
            )

        votes = {}
        for name, m in models.items():
            pred = int(m.predict(X)[0])
            votes[name] = _label_from_class(pred)

        resp = build_response(votes)
        resp["api_version"] = "optionA-multimodel-v1"
        return jsonify(resp)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    except KeyError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "Prediction failed", "detail": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
