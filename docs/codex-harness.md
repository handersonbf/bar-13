# Codex Harness do Bar13

## O que foi criado

- `AGENTS.md`: guia curto e aderente ao repositorio.
- `AGENTS.override.example.md`: modelo local seguro para overrides pessoais.
- `.codex/config.toml`: configuracao conservadora de sandbox e approval.
- `.codex/hooks.json`: template local de hooks para runtimes que suportem esse formato.
- `.codex/hooks/*.py`: guardas para comandos perigosos e resumo de saidas longas.
- `.codex/rules/safety.rules`: regras extras de seguranca operacional.
- `.codex/agents/*.toml`: subagentes focados para exploracao, arquitetura, testes e seguranca.
- `.agents/skills/*/SKILL.md`: skills reutilizaveis para fluxos comuns.
- `scripts/ai-typecheck.sh`, `scripts/ai-lint.sh`, `scripts/codex-check.sh`: validacoes AI-safe.

## Como usar no dia a dia

- Comece lendo `AGENTS.md`.
- Para validar mudancas comuns, rode `./scripts/codex-check.sh`.
- Para checks isolados, use `./scripts/ai-typecheck.sh` e `./scripts/ai-lint.sh`.
- Use subagentes quando quiser especializar a analise por arquitetura, seguranca, testes ou exploracao de fluxo.
- Use as skills locais quando a tarefa combinar com `implement-feature`, `fix-bug`, `review-pr`, `update-tests` ou `generate-docs`.
- Trate `hooks.json` e `rules/` como templates locais ate confirmar compatibilidade com o runtime real do seu Codex.

## Quando usar /compact

- Depois de concluir um bloco grande de trabalho.
- Quando a conversa acumular muito historico irrelevante.
- Antes de trocar de modulo, deixando no resumo: objetivo, arquivos alterados, checks e proximo passo.

## Quando usar /clear ou nova sessao

- Ao mudar completamente de assunto.
- Quando o contexto anterior estiver puxando o agente para um fluxo errado.
- Quando for iniciar uma tarefa administrativa separada do desenvolvimento atual.

## Como usar subagentes

- `codebase-explorer`: localizar arquivos e funcoes certas antes de editar.
- `architecture-reviewer`: conferir alinhamento com `screens/services/repositories/database`.
- `security-reviewer`: revisar risco operacional, arquivos e dados locais.
- `test-reviewer`: sugerir ou revisar checks relevantes sem inflar a stack.

## Como usar skills

- As skills vivem em `.agents/skills/`.
- Cada uma define quando usar, fluxo obrigatorio, restricoes, verificacao e formato de resposta.
- Elas servem como guia de execucao repetivel para tarefas comuns do repositorio.

## AGENTS.override.md

- Nao crie com dados inventados.
- Se quiser personalizar seu ambiente, copie `AGENTS.override.example.md` para `AGENTS.override.md`.
- Nunca coloque secrets nesse arquivo.

## Validacao principal

```bash
./scripts/codex-check.sh
```

Esse script detecta a stack Node/Expo, roda typecheck e lint se existirem, nao executa build/distribuicao e retorna erro se algum check falhar.

## O que nao deve ser feito

- Nao usar comandos destrutivos no repo.
- Nao expor `.env`, credenciais ou chaves.
- Nao rodar build/deploy EAS como validacao padrao.
- Nao adicionar dependencia nova sem justificativa curta e revisao humana.
- Nao assumir que hooks ou rules estejam ativos sem validar compatibilidade no runtime do Codex em uso.
