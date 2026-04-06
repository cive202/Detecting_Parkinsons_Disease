from __future__ import annotations

import argparse
import base64
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def _slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def _cell_source(cell: dict) -> str:
    src = cell.get("source", "")
    if isinstance(src, list):
        return "".join(src)
    if isinstance(src, str):
        return src
    return ""


def _safe_json_dump(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")


@dataclass
class ExportedImage:
    filename: str
    cell_index: int
    output_index: int
    mime: str
    context_before: str
    context_after: str


def export_images(ipynb_path: Path, out_dir: Path, manifest_path: Path, context_window: int = 2) -> list[ExportedImage]:
    nb = json.loads(ipynb_path.read_text(encoding="utf-8"))
    cells: list[dict] = nb.get("cells", [])

    out_dir.mkdir(parents=True, exist_ok=True)

    exported: list[ExportedImage] = []
    for ci, cell in enumerate(cells):
        outputs = cell.get("outputs") or []
        if not isinstance(outputs, list):
            continue

        for oi, out in enumerate(outputs):
            data = out.get("data") if isinstance(out, dict) else None
            if not isinstance(data, dict):
                continue

            b64 = data.get("image/png")
            if not b64:
                continue

            # Jupyter can store base64 as list of lines.
            if isinstance(b64, list):
                b64 = "".join(b64)
            if not isinstance(b64, str):
                continue

            raw = base64.b64decode(b64)
            filename = f"cell-{ci:04d}-out-{oi}.png"
            (out_dir / filename).write_bytes(raw)

            before_cells = cells[max(0, ci - context_window) : ci]
            after_cells = cells[ci + 1 : min(len(cells), ci + 1 + context_window)]
            context_before = "\n\n".join(_cell_source(c) for c in before_cells).strip()
            context_after = "\n\n".join(_cell_source(c) for c in after_cells).strip()

            exported.append(
                ExportedImage(
                    filename=filename,
                    cell_index=ci,
                    output_index=oi,
                    mime="image/png",
                    context_before=context_before,
                    context_after=context_after,
                )
            )

    _safe_json_dump(
        manifest_path,
        {
            "notebook": str(ipynb_path),
            "out_dir": str(out_dir),
            "count": len(exported),
            "images": [
                {
                    "filename": e.filename,
                    "cell_index": e.cell_index,
                    "output_index": e.output_index,
                    "mime": e.mime,
                    "context_before": e.context_before,
                    "context_after": e.context_after,
                }
                for e in exported
            ],
        },
    )

    return exported


def main() -> None:
    parser = argparse.ArgumentParser(description="Export embedded image/png outputs from a notebook.")
    parser.add_argument(
        "--notebook",
        type=Path,
        default=Path("Detecting_Parkinson’s_Disease_.ipynb"),
        help="Path to the .ipynb notebook",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("UI/public/docs"),
        help="Directory to write exported PNGs (served by Next.js)",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("UI/data/notebook-images.manifest.json"),
        help="Manifest JSON output path",
    )
    args = parser.parse_args()

    exported = export_images(args.notebook, args.out_dir, args.manifest)
    print(f"Exported {len(exported)} images to {args.out_dir}")
    print(f"Wrote manifest to {args.manifest}")


if __name__ == "__main__":
    main()

