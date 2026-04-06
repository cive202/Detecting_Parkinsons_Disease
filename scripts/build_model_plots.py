from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def _slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def _safe_json_dump(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")


MODEL_ALIASES = {
    # normalize common names
    "k-nearest neighbors": "KNN",
    "knn": "KNN",
    "svm": "SVM",
    "support vector machine": "SVM",
    "xgboost": "XGBoost",
    "random forest": "Random Forest",
    "decision tree": "Decision Tree",
    "logistic regression": "Logistic Regression",
    "gaussian nb": "Gaussian NB",
    "bernoulli nb": "Bernoulli NB",
    "naive bayes": "Naive Bayes",
    "voting": "Voting ensemble",
    "mlp": "MLP",
}


PLOT_KINDS = [
    ("roc", ["roc", "receiver operating characteristic", "auc"]),
    ("confusion_matrix", ["confusion matrix"]),
    ("classification_report", ["classification_report", "classification report"]),
    ("label_distribution", ["label distribution", "countplot", "label imbalance"]),
    ("correlation_heatmap", ["correlation heatmap", "heatmap"]),
    ("distribution", ["histplot", "distplot", "distribution"]),
    ("boxplot", ["boxplot"]),
]


def _detect_plot_kind(text: str) -> str:
    t = text.lower()
    for kind, keys in PLOT_KINDS:
        if any(k in t for k in keys):
            return kind
    return "plot"


def _detect_models(text: str) -> list[str]:
    t = text.lower()
    found: set[str] = set()

    # match explicit model keys used in the notebook bundle construction
    explicit = [
        "Logistic Regression",
        "Decision Tree",
        "Random Forest (gini)",
        "Random Forest (entropy)",
        "SVM",
        "KNN (k=3)",
        "Gaussian NB",
        "Bernoulli NB",
        "Voting ensemble",
        "XGBoost",
        "Naive Bayes",
        "MLP",
    ]
    for name in explicit:
        if name.lower() in t:
            found.add(name)

    # alias-based fuzzy hits
    for key, canonical in MODEL_ALIASES.items():
        if key in t:
            found.add(canonical)

    # Special: KNN with k parameter in text
    m = re.search(r"knn.*k\s*=\s*(\d+)", t)
    if m:
        found.add(f"KNN (k={m.group(1)})")

    return sorted(found)


@dataclass
class ManifestImage:
    filename: str
    cell_index: int
    output_index: int
    context_before: str
    context_after: str


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a model-plots manifest from notebook image export manifest.")
    parser.add_argument(
        "--images-manifest",
        type=Path,
        default=Path("UI/data/notebook-images.manifest.json"),
        help="Path to notebook-images.manifest.json",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("UI/data/model-plots.json"),
        help="Output model-plots.json",
    )
    args = parser.parse_args()

    data = json.loads(args.images_manifest.read_text(encoding="utf-8"))
    images_in = data.get("images") or []

    images: list[ManifestImage] = []
    for it in images_in:
        if not isinstance(it, dict):
            continue
        images.append(
            ManifestImage(
                filename=str(it.get("filename", "")),
                cell_index=int(it.get("cell_index", -1)),
                output_index=int(it.get("output_index", -1)),
                context_before=str(it.get("context_before", "")),
                context_after=str(it.get("context_after", "")),
            )
        )

    # Build groups
    general: list[dict] = []
    models: dict[str, dict] = {}

    for img in images:
        context = f"{img.context_before}\n\n{img.context_after}".strip()
        kind = _detect_plot_kind(context)
        detected_models = _detect_models(context)

        entry = {
            "filename": img.filename,
            "cell_index": img.cell_index,
            "output_index": img.output_index,
            "kind": kind,
        }

        if not detected_models:
            general.append(entry)
            continue

        for model in detected_models:
            m = models.setdefault(
                model,
                {
                    "model": model,
                    "slug": _slugify(model),
                    "plots": [],
                },
            )
            m["plots"].append(entry)

    # sort plots by cell order
    for m in models.values():
        m["plots"].sort(key=lambda e: (e["cell_index"], e["output_index"]))

    out_obj = {
        "source": "Detecting_Parkinson’s_Disease_.ipynb",
        "images_manifest": str(args.images_manifest).replace("\\", "/"),
        "public_base": "/docs",
        "general": sorted(general, key=lambda e: (e["cell_index"], e["output_index"])),
        "models": sorted(models.values(), key=lambda m: m["model"].lower()),
        # manual overrides can be added later if needed
        "overrides": {
            "modelSlugAliases": {
                # Example: "K-Nearest Neighbors": "knn-k-3"
            }
        },
    }

    _safe_json_dump(args.out, out_obj)
    print(f"Wrote {args.out} with {len(out_obj['models'])} model sections and {len(out_obj['general'])} general plots")


if __name__ == "__main__":
    main()

