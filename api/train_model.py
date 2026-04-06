"""
Train XGBoost on PCA + MinMaxScaler pipeline (matches Detecting_Parkinson's_Disease_.ipynb).
Run from repo root: python api/train_model.py
Writes api/models/parkinson_models.joblib
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_API_DIR = Path(__file__).resolve().parent
if str(_API_DIR) not in sys.path:
    sys.path.insert(0, str(_API_DIR))

import joblib
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import MinMaxScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

from feature_config import FEATURE_COLUMNS

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA = REPO_ROOT / "parkinsons.data"
MODELS_DIR = Path(__file__).resolve().parent / "models"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--out", type=Path, default=MODELS_DIR / "parkinson_models.joblib")
    args = parser.parse_args()

    df = pd.read_csv(args.data)
    x = df.drop(["status", "name"], axis=1)
    y = df["status"]
    assert list(x.columns) == FEATURE_COLUMNS, "CSV column order drift; update feature_config.py"

    scaler = MinMaxScaler((-1, 1))
    x_scaled = scaler.fit_transform(x)

    pca = PCA(0.95)
    x_pca = pca.fit_transform(x_scaled)

    x_train, x_test, y_train, y_test = train_test_split(
        x_pca, y, test_size=0.2, random_state=7
    )

    models = {
        "Logistic Regression": LogisticRegression(max_iter=2000),
        "Naive Bayes": GaussianNB(),
        "K-Nearest Neighbors": KNeighborsClassifier(n_neighbors=5),
        "Random Forest": RandomForestClassifier(random_state=7, n_estimators=300),
        "Decision Tree": DecisionTreeClassifier(random_state=7),
        "Support Vector Machine": SVC(probability=True, random_state=7),
        "MLP": MLPClassifier(random_state=7, max_iter=2000),
        "XGBoost": XGBClassifier(),
    }

    for name, m in models.items():
        m.fit(x_train, y_train)

    bundle = {
        "scaler": scaler,
        "pca": pca,
        "models": models,
        "feature_columns": FEATURE_COLUMNS,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, args.out)
    print(f"Saved bundle to {args.out}")
    print(f"PCA components: {pca.n_components_}, models: {', '.join(models.keys())}")


if __name__ == "__main__":
    main()
