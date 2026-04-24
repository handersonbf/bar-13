---
name: generate-docs
description: Produzir ou atualizar documentacao tecnica e operacional aderente ao estado real do codigo do Bar13.
---

## Quando usar

Use para README, docs internas, guias de fluxo, notas de arquitetura ou documentacao de tooling.

## Fluxo obrigatorio

1. Confirmar o estado real no codigo antes de escrever.
2. Preferir textos curtos, operacionais e ancorados em arquivos reais.
3. Explicitar limitacoes ou TODOs apenas quando nao for possivel inferir algo com seguranca.
4. Evitar contradizer `README.md`, `AGENTS.md` e `documentacao/`.
5. Revisar links e comandos citados.

## Restricoes

- Nao inventar features nao implementadas.
- Nao expor secrets nem detalhes sensiveis de build.
- Nao transformar docs em especificacao generica.

## Criterios de verificacao

- Comandos e caminhos conferidos.
- Texto alinhado ao codigo atual.
- Mudancas documentais nao conflitam com o repositorio.

## Formato de resposta final

- O que foi documentado.
- Arquivos atualizados ou criados.
- Pontos que merecem revisao humana.
