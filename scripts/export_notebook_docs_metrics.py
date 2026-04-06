"""
Reproduce Detecting_Parkinson's_Disease_.ipynb pipeline (PCA 0.95, train_test_split rs=7)
and export metrics + ROC points for the UI docs page.

Run from repo root: python scripts/export_notebook_docs_metrics.py
Writes: UI/data/notebook-docs-metrics.json
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import BernoulliNB, GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

REPO_ROOT = Path(__file__).resolve().parent.parent
_API = REPO_ROOT / "api"
if str(_API) not in sys.path:
    sys.path.insert(0, str(_API))

from feature_config import FEATURE_COLUMNS  # noqa: E402

DEFAULT_DATA = REPO_ROOT / "parkinsons.data"
OUT_JSON = REPO_ROOT / "UI" / "data" / "notebook-docs-metrics.json"

# Matches model-plots.json / model-plot-slug.ts
SLUGS: dict[str, str] = {
    "Logistic Regression": "logistic-regression",
    "Decision Tree": "decision-tree",
    "Random Forest (gini)": "random-forest-gini",
    "Random Forest (entropy)": "random-forest-entropy",
    "SVM": "svm",
    "KNN (k=3)": "knn-k-3",
    "Gaussian NB": "gaussian-nb",
    "Bernoulli NB": "bernoulli-nb",
    "Voting ensemble": "voting-ensemble",
    "XGBoost": "xgboost",
}


def _downsample_curve(fpr: np.ndarray, tpr: np.ndarray, max_points: int = 72) -> tuple[list[float], list[float]]:
    n = len(fpr)
    if n <= max_points:
        return fpr.tolist(), tpr.tolist()
    idx = np.linspace(0, n - 1, max_points, dtype=int)
    return fpr[idx].tolist(), tpr[idx].tolist()


def _binary_scores(model, X: np.ndarray) -> np.ndarray:
    """Scores for roc_curve / roc_auc_score (positive class = 1)."""
    if hasattr(model, "predict_proba"):
        try:
            proba = model.predict_proba(X)
            return proba[:, 1].astype(float)
        except (AttributeError, IndexError, ValueError):
            pass
    if hasattr(model, "decision_function"):
        s = model.decision_function(X)
        s = np.asarray(s, dtype=float).ravel()
        # Map to [0,1] for consistency with proba scale (optional; roc_auc works on raw scores)
        return s
    raise RuntimeError("No predict_proba or decision_function")


def _voting_scores(model: VotingClassifier, X: np.ndarray) -> np.ndarray:
    """Hard VotingClassifier: average score vectors from each base estimator (proba or decision_function)."""
    if hasattr(model, "predict_proba"):
        try:
            return model.predict_proba(X)[:, 1].astype(float)
        except Exception:
            pass
    parts = [_binary_scores(est, X) for est in model.estimators_]
    return np.mean(parts, axis=0)


def main() -> None:
    data_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DATA
    raw = data_path.read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()[:16]

    df = pd.read_csv(data_path)
    x = df.drop(["status", "name"], axis=1).reindex(columns=FEATURE_COLUMNS)
    y = df["status"].astype(int)

    # Notebook: PCA on raw features (no MinMaxScaler)
    pca = PCA(0.95)
    x_pca = pca.fit_transform(x)
    x_train, x_test, y_train, y_test = train_test_split(
        x_pca, y, test_size=0.2, random_state=7
    )

    classifier = LogisticRegression(C=0.4, max_iter=1000, solver="liblinear")
    lr = classifier.fit(x_train, y_train)

    classifier2 = DecisionTreeClassifier(random_state=14)
    dt = classifier2.fit(x_train, y_train)

    classifier3 = RandomForestClassifier(random_state=14)
    rfi = classifier3.fit(x_train, y_train)

    classifier4 = RandomForestClassifier(criterion="entropy", random_state=14)
    rfe = classifier4.fit(x_train, y_train)

    model_svm = SVC(cache_size=100)
    svm = model_svm.fit(x_train, y_train)

    model_knn3 = KNeighborsClassifier(n_neighbors=3)
    knn = model_knn3.fit(x_train, y_train)

    gnb = GaussianNB().fit(x_train, y_train)

    model_bnb = BernoulliNB()
    bnb = model_bnb.fit(x_train, y_train)

    evc = VotingClassifier(
        estimators=[
            ("lr", lr),
            ("rfi", rfi),
            ("rfe", rfe),
            ("DT", dt),
            ("svm", svm),
            ("knn", knn),
            ("gnb", gnb),
            ("bnb", bnb),
        ],
        voting="hard",
    )
    model_evc = evc.fit(x_train, y_train)

    # Notebook uses XGBClassifier(); we pin random_state for reproducible JSON.
    model_xg = XGBClassifier(random_state=7)
    model_xg.fit(x_train, y_train)

    models: list[tuple[str, object]] = [
        ("Logistic Regression", lr),
        ("Decision Tree", dt),
        ("Random Forest (gini)", rfi),
        ("Random Forest (entropy)", rfe),
        ("SVM", svm),
        ("KNN (k=3)", knn),
        ("Gaussian NB", gnb),
        ("Bernoulli NB", bnb),
        ("Voting ensemble", model_evc),
        ("XGBoost", model_xg),
    ]

    rows: list[dict] = []
    for name, m in models:
        y_pred = m.predict(x_test)
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average="binary", zero_division=0))
        rec = float(recall_score(y_test, y_pred, average="binary", zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average="binary", zero_division=0))

        if name == "Voting ensemble":
            scores = _voting_scores(m, x_test)  # type: ignore[arg-type]
        else:
            scores = _binary_scores(m, x_test)

        fpr, tpr, _ = roc_curve(y_test, scores)
        auc_val = float(roc_auc_score(y_test, scores))
        fpr_ds, tpr_ds = _downsample_curve(fpr, tpr)

        rows.append(
            {
                "slug": SLUGS[name],
                "name": name,
                "accuracy": acc,
                "precision": prec,
                "recall": rec,
                "f1": f1,
                "roc_auc": auc_val,
                "roc_curve": {"fpr": fpr_ds, "tpr": tpr_ds},
            }
        )

    try:
        data_rel = str(data_path.relative_to(REPO_ROOT))
    except ValueError:
        data_rel = str(data_path)

    meta = {
        "source_notebook": "Detecting_Parkinson's_Disease_.ipynb",
        "data_file": data_rel,
        "data_sha256_prefix": checksum,
        "pipeline": {
            "pca_variance_ratio": 0.95,
            "pca_n_components": int(pca.n_components_),
            "train_test_split": {"test_size": 0.2, "random_state": 7},
            "features": "raw (no scaler before PCA), matches notebook",
        },
        "deviations_from_notebook": [
            "RandomForestClassifier(criterion='entropy') uses random_state=14 (notebook omitted).",
            "XGBClassifier(random_state=7) (notebook used default XGBClassifier()).",
        ],
        "sklearn_note": "SVC uses decision_function for ROC when predict_proba is unavailable.",
    }

    payload = {"meta": meta, "models": rows}

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_JSON}")
    for r in rows:
        print(f"  {r['name']}: acc={r['accuracy']:.6f} auc={r['roc_auc']:.6f}")


if __name__ == "__main__":
    main()
