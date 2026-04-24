# AGENTS.md

## Objetivo

O projeto `Bar13` e um app mobile local-first para Android e iOS, feito com Expo + React Native, usado no balcao para registrar pedidos, cobrar via PIX ou dinheiro, anexar comprovante, consultar historico, gerar relatorios e exportar CSVs sem depender de backend no uso diario.

## Stack real detectada

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript strict
- SQLite local com `expo-sqlite`
- Navegacao com `@react-navigation/native`, `native-stack` e `bottom-tabs`
- Arquivos locais com `expo-document-picker`, `expo-image-picker`, `expo-file-system` e `expo-sharing`
- Clipboard com `expo-clipboard`

## Estrutura do repositorio

- `App.tsx`: bootstrap do app, providers e navegacao
- `src/screens`: telas do fluxo operacional
- `src/components`: componentes reutilizaveis da UI
- `src/context`: bootstrap do banco e contexto global
- `src/database`: conexao SQLite e migracoes idempotentes
- `src/repositories`: acesso a dados e SQL centralizado
- `src/services`: regras de negocio e fluxos de app
- `src/utils`: formatacao, arquivos, datas, CSV e validacoes
- `src/types`: tipos de dominio e navegacao
- `samples`: CSVs de exemplo
- `documentacao`: documentacao funcional e tecnica existente
- `scripts`: scripts AI-safe de validacao e apoio ao Codex
- `.codex`: harness local do Codex para este projeto
- `.agents/skills`: skills reutilizaveis especificas do repositorio

## Comandos detectados

### Instalar

```bash
npm install
```

### Rodar localmente

```bash
npm run start
npm run android
npm run ios
```

### Validar

```bash
npm run typecheck
npm run lint
./scripts/ai-typecheck.sh
./scripts/ai-lint.sh
./scripts/codex-check.sh
```

### Build existente

```bash
npm run build:android:internal
npm run build:android:local
npm run install:android:usb
```

Observacao: os comandos de build usam Expo/EAS e nao devem ser executados pelo Codex como validacao padrao sem necessidade explicita. O `./scripts/codex-check.sh` deliberadamente nao roda build.

## Convencoes observadas no codigo

- Tipagem explicita com `strict: true`.
- Logica de persistencia centralizada em `repositories`; evitar SQL em telas.
- Regras de negocio ficam em `services`.
- UI escura e operacional, com textos em portugues-BR.
- Banco inicializado no bootstrap via `DatabaseProvider`.
- Pedidos usam snapshots de integrante e item para preservar historico.
- Exportacoes CSV e relatorios reaproveitam servicos dedicados.
- Itens hoje sao deduplicados por nome no fluxo real de importacao e cadastro.
- O banco ainda possui `numero_item` interno, mas a interface atual trabalha por nome, valor e estoque.

## Restricoes importantes

- Nao introduzir backend, Firebase, Supabase ou qualquer servico online para o fluxo principal.
- Nao trocar Expo/React Native/TypeScript/SQLite.
- Nao alterar `.env`, certificados, chaves, credenciais, arquivos de assinatura ou secrets.
- Nao executar comandos destrutivos como `rm -rf`, `git reset --hard`, `git clean -fd` ou wipes de banco.
- Nao criar dependencias novas sem justificativa tecnica curta e impacto claro.
- Nao editar codigo de negocio quando a tarefa for apenas de harness, docs ou tooling.
- Nao sobrescrever arquivos existentes cegamente; sempre ler e fazer merge incremental.

## Criterios de Done

- Mudanca limitada ao escopo pedido.
- Diff revisado antes de concluir.
- Validacoes leves executadas quando possivel.
- Nenhum arquivo sensivel exposto ou alterado.
- Comandos e docs atualizados se o fluxo de trabalho mudar.
- Se houver limitacao ou suposicao, registrar de forma objetiva no resumo final.

## Fluxo recomendado para o Codex

1. Ler `AGENTS.md`, `package.json`, `README.md` e os arquivos do modulo afetado.
2. Mapear o fluxo impactado primeiro em `screens`, `services` e `repositories`.
3. Fazer a menor mudanca util possivel, preservando a arquitetura atual.
4. Preferir comandos filtrados:
   - `./scripts/ai-typecheck.sh`
   - `./scripts/ai-lint.sh`
   - `./scripts/codex-check.sh`
   - `rg` e `sed -n`
5. Revisar o diff final com `git diff --stat` e `git diff -- <arquivos>`.
6. Resumir o que mudou, o que foi validado e qualquer risco residual.

## Compactacao de contexto

- Use `/compact` depois de concluir um sub-bloco maior de trabalho ou quando a conversa acumular muito historico irrelevante.
- Antes de compactar, preserve no resumo: objetivo atual, arquivos alterados, validacoes feitas e proximos passos.
- Use `/clear` ou nova sessao quando mudar completamente de assunto ou quando o contexto anterior comecar a induzir o agente ao modulo errado.
- Evite recarregar arquivos grandes inteiros se so algumas secoes importam; prefira `rg` e `sed -n`.

## Arquivos sensiveis e locais

- Nunca editar ou exibir conteudo de `.env*`, certificados, chaves privadas, credenciais de build, provisioning profiles ou artefatos de assinatura.
- `AGENTS.override.md` e apenas local e nao deve ser commitado.
- Mudancas em `app.json`, `eas.json` ou configuracoes de build pedem cautela extra porque afetam distribuicao.

## Dependencias e comandos AI-safe

- Prefira scripts em `scripts/` para validacao resumida em vez de inflar `package.json` sem necessidade.
- Se precisar adicionar dependencia, explique o motivo, o impacto no app Expo e por que as libs atuais nao resolvem.
- Nao altere scripts existentes de build/deploy para encaixar no Codex; crie wrappers seguros quando necessario.
- Trate `.codex/hooks.json` e `.codex/rules/` como templates locais ate confirmar compatibilidade com o runtime real do Codex.
