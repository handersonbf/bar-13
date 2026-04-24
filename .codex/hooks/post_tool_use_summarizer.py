#!/usr/bin/env python3
"""Best-effort PostToolUse summarizer.

This script is intentionally conservative because Codex hook payloads may vary
between versions. When it sees a large textual output, it surfaces likely
errors or warnings without hiding the raw output completely.
"""

from __future__ import annotations

import json
import re
import sys
from typing import Any


HIGHLIGHT_RE = re.compile(
    r"(error|failed|failure|exception|warning|build failed|test failed)",
    re.IGNORECASE,
)


def _collect_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "\n".join(part for part in (_collect_text(item) for item in value) if part)
    if isinstance(value, dict):
        chunks = []
        for nested in value.values():
            text = _collect_text(nested)
            if text:
                chunks.append(text)
        return "\n".join(chunks)
    return ""


def main() -> int:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return 0

        payload = json.loads(raw)
        text = _collect_text(payload)
        if not text:
            return 0

        lines = text.splitlines()
        if len(lines) < 80 and len(text) < 6000:
            return 0

        matches = []
        for line in lines:
            if HIGHLIGHT_RE.search(line):
                cleaned = line.strip()
                if cleaned and cleaned not in matches:
                    matches.append(cleaned)
            if len(matches) >= 12:
                break

        if not matches:
            matches = [line.strip() for line in lines[:8] if line.strip()]

        result = {
            "summary": {
                "kind": "large-output",
                "message": "Saida longa detectada; prefira resumir e destacar falhas antes de colar logs completos.",
                "highlights": matches,
            }
        }
        print(json.dumps(result, ensure_ascii=True))
        return 0
    except Exception:
        # Nao interromper a execucao principal por falha do sumarizador.
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
