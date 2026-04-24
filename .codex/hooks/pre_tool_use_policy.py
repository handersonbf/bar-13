#!/usr/bin/env python3
"""Conservative PreToolUse guard for exec_command.

The script reads JSON from stdin, inspects the command when possible and returns
a deny payload for clearly dangerous commands. If the input shape is unknown or
cannot be parsed, it fails open so the Codex session is not broken.
"""

from __future__ import annotations

import json
import re
import sys
from typing import Any


FORBIDDEN_PATTERNS = [
    (re.compile(r"\brm\s+-rf\b"), "Bloqueado: remocao destrutiva em massa."),
    (re.compile(r"\bgit\s+reset\s+--hard\b"), "Bloqueado: reset destrutivo do git."),
    (re.compile(r"\bgit\s+clean\s+-fdx?\b"), "Bloqueado: limpeza destrutiva do worktree."),
    (re.compile(r"\bchmod\s+-R\s+777\b"), "Bloqueado: permissao insegura em massa."),
    (re.compile(r"\bdd\s+if="), "Bloqueado: comando de baixo nivel potencialmente destrutivo."),
    (re.compile(r"\bmkfs(?:\.[a-z0-9_+-]+)?\b"), "Bloqueado: formatacao de filesystem."),
    (re.compile(r"\b(?:cat|sed|grep|rg|less|more|head|tail)\b[^\n]*\.env(?:\.|$|\s)"), "Bloqueado: leitura direta de arquivo .env."),
    (re.compile(r"\b(?:rm|unlink|shred)\b[^\n]*\.env(?:\.|$|\s)"), "Bloqueado: exclusao de arquivo .env."),
    (re.compile(r"\b(?:printenv|env)\b"), "Bloqueado: impressao ampla de variaveis de ambiente."),
    (
        re.compile(r"\b(?:cat|sed|grep|rg)\b[^\n]*(secret|token|apikey|api_key|private[_-]?key|aws_access_key_id|aws_secret_access_key)", re.I),
        "Bloqueado: tentativa de expor secret conhecido.",
    ),
    (
        re.compile(r"\b(?:DROP\s+DATABASE|DROP\s+SCHEMA|TRUNCATE\s+TABLE|DELETE\s+FROM\s+\w+\s*;)\b", re.I),
        "Bloqueado: operacao destrutiva de banco detectada.",
    ),
]


def _extract_command(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""

    for key in ("cmd", "command", "input", "tool_input", "updatedInput"):
        value = payload.get(key)
        if isinstance(value, str):
            return value
        if isinstance(value, list):
            return " ".join(str(part) for part in value)
        if isinstance(value, dict):
            nested = _extract_command(value)
            if nested:
                return nested

    for value in payload.values():
        if isinstance(value, dict):
          nested = _extract_command(value)
          if nested:
              return nested

    return ""


def _deny(reason: str) -> None:
    response = {
        "decision": "deny",
        "message": reason + " Use um script AI-safe ou peca aprovacao explicita se houver justificativa valida."
    }
    print(json.dumps(response, ensure_ascii=True))


def _allow() -> None:
    print(json.dumps({"decision": "allow"}, ensure_ascii=True))


def main() -> int:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            _allow()
            return 0

        payload = json.loads(raw)
        command = _extract_command(payload)

        if not command:
            _allow()
            return 0

        normalized = " ".join(command.strip().split())
        for pattern, reason in FORBIDDEN_PATTERNS:
            if pattern.search(normalized):
                _deny(reason)
                return 0

        _allow()
        return 0
    except Exception:
        # Falha aberta por seguranca operacional do proprio agente:
        # se o hook nao entender o payload, ele nao deve quebrar a sessao.
        _allow()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
