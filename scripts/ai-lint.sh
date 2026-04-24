#!/usr/bin/env bash
set -euo pipefail

# Wrapper curto para lint sem acionar fluxos extras.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[ai-lint] Iniciando lint"
npm run lint --silent
