---
name: fix-bug
description: Corrigir bugs no Bar13 com foco em causa raiz, baixo impacto colateral e validacao objetiva.
---

## Quando usar

Use quando houver bug funcional, regressao ou inconsistencia entre tela, servico, repositorio ou exportacao.

## Fluxo obrigatorio

1. Reproduzir logicamente o bug lendo o fluxo afetado.
2. Localizar a causa raiz antes de editar.
3. Corrigir no ponto mais central possivel.
4. Verificar se relatorios, exportacoes ou persistencia compartilham a mesma regra.
5. Rodar validacoes leves relevantes.
6. Conferir diff final.

## Restricoes

- Nao mascarar o problema com workaround em tela se a causa estiver em `services` ou `repositories`.
- Nao fazer refatoracao ampla sem beneficio direto.
- Nao alterar dados sensiveis nem configuracoes de deploy.

## Criterios de verificacao

- Bug corrigido na origem.
- Comportamentos relacionados nao foram quebrados.
- Validacoes executadas e resumidas.

## Formato de resposta final

- Causa raiz.
- Correcao aplicada.
- Validacoes executadas.
- Qualquer area que merece teste manual complementar.
