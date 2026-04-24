---
name: implement-feature
description: Implementar uma feature no Bar13 respeitando a arquitetura Expo/React Native/TypeScript e a persistencia SQLite existente.
---

## Quando usar

Use quando a tarefa pedir nova funcionalidade ou extensao de fluxo existente no app.

## Fluxo obrigatorio

1. Ler `AGENTS.md`, `package.json` e os arquivos do modulo afetado.
2. Mapear o fluxo completo entre `screens`, `services`, `repositories` e `utils`.
3. Implementar a menor mudanca util possivel sem refatoracao ampla.
4. Se houver persistencia, centralizar SQL em `src/repositories` e manter migracoes idempotentes.
5. Rodar `./scripts/codex-check.sh` ou, no minimo, `./scripts/ai-typecheck.sh` e `./scripts/ai-lint.sh`.
6. Revisar diff antes de concluir.

## Restricoes

- Nao mexer em `.env`, certificados, secrets ou arquivos de producao.
- Nao criar backend ou servicos online.
- Nao adicionar dependencia nova sem justificar.
- Nao espalhar SQL pelas telas.

## Criterios de verificacao

- Fluxo principal continua coerente com o app local-first.
- Regras de negocio ficam em `services` ou `repositories`.
- Tipagem continua estrita e sem `any` novo.
- Validacoes executadas e reportadas.

## Formato de resposta final

- O que foi implementado.
- Arquivos principais alterados.
- Validacoes executadas.
- Risco residual ou pendencia, se houver.
