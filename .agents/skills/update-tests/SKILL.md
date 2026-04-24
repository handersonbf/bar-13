---
name: update-tests
description: Atualizar a estrategia de validacao do projeto sem inflar a stack nem introduzir complexidade desnecessaria.
---

## Quando usar

Use quando a tarefa pedir ajuste de testes, checks ou validacoes automatizadas.

## Fluxo obrigatorio

1. Verificar quais checks ja existem em `package.json` e `scripts/`.
2. Preferir wrappers AI-safe e validacoes leves quando nao houver suite formal.
3. Se adicionar teste real, manter o menor escopo possivel e explicar a necessidade.
4. Executar os checks alterados.
5. Atualizar docs se o fluxo de validacao mudar.

## Restricoes

- Nao adicionar framework de teste so por padrao.
- Nao tornar o ciclo de validacao pesado sem ganho claro.
- Nao tocar em build/deploy para simular teste.

## Criterios de verificacao

- Check novo ou atualizado funciona localmente.
- Saida e filtrada o suficiente para uso do Codex.
- AGENTS/docs refletem o novo fluxo.

## Formato de resposta final

- Checks adicionados ou ajustados.
- Como rodar.
- Resultado da execucao.
- Limitacoes restantes.
