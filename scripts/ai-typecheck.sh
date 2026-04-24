#!/usr/bin/env bash
set -euo pipefail

# Wrapper curto para reduzir ruido no Codex.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[ai-typecheck] Iniciando TypeScript typecheck"
npm run typecheck --silent
