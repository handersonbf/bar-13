#!/usr/bin/env bash
set -euo pipefail

# Validador AI-safe do repositorio.
# - Detecta uma stack Node/Expo pelo package.json
# - Executa checks leves e filtrados
# - Nao roda deploy, EAS build ou comandos destrutivos

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f package.json ]]; then
  echo "[codex-check] package.json nao encontrado; nada para validar."
  exit 0
fi

echo "[codex-check] Stack detectada: Node + Expo + TypeScript"

FAILURES=0

run_check() {
  local label="$1"
  shift

  echo
  echo "[codex-check] >>> $label"
  if "$@"; then
    echo "[codex-check] OK: $label"
  else
    echo "[codex-check] FALHOU: $label"
    FAILURES=$((FAILURES + 1))
  fi
}

if node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.typecheck ? 0 : 1)"; then
  run_check "typecheck" ./scripts/ai-typecheck.sh
fi

if node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.lint ? 0 : 1)"; then
  run_check "lint" ./scripts/ai-lint.sh
fi

if node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.test ? 0 : 1)"; then
  run_check "test" npm run test --silent
else
  echo
  echo "[codex-check] teste automatizado nao detectado em package.json; pulando."
fi

echo
echo "[codex-check] build foi omitido de proposito para evitar acionar fluxos de distribuicao."

echo
if [[ "$FAILURES" -gt 0 ]]; then
  echo "[codex-check] Concluido com ${FAILURES} falha(s)."
  exit 1
fi

echo "[codex-check] Todas as validacoes disponiveis passaram."
