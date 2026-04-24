---
name: review-pr
description: Revisar mudancas neste repositorio com mentalidade de code review, priorizando bugs, riscos e lacunas de validacao.
---

## Quando usar

Use para revisar um diff, uma branch local ou um conjunto de arquivos alterados.

## Fluxo obrigatorio

1. Ler o diff antes de resumir.
2. Priorizar achados de comportamento, seguranca, persistencia, CSV, pagamentos e historico.
3. Checar aderencia a `screens -> services -> repositories -> database`.
4. Verificar se as validacoes propostas cobrem a mudanca.
5. Responder com findings primeiro.

## Restricoes

- Nao focar em estilo se houver risco funcional mais importante.
- Nao assumir testes inexistentes.
- Nao omitir risco so porque o diff e pequeno.

## Criterios de verificacao

- Findings ordenados por severidade.
- Referencias de arquivo claras.
- Gaps de teste ou validacao mencionados.

## Formato de resposta final

- Lista de findings com arquivo e motivo.
- Perguntas abertas ou suposicoes, se houver.
- Resumo curto apenas depois dos findings.
