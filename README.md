# Bar13

App mobile local-first para Android e iOS, feito com Expo + React Native + TypeScript + SQLite, usado na operacao de balcao para abrir pedidos, controlar estoque, cobrar via PIX ou dinheiro, anexar comprovantes, consultar historico, gerar relatorios, exportar CSVs e sincronizar dados entre aparelhos sem depender de backend no uso diario.

## Visao geral

O app trabalha com banco SQLite local como fonte principal de verdade. A internet nao e necessaria para o fluxo diario de atendimento. Quando existir conectividade, o projeto tambem suporta:

- envio opcional para uma central gerencial no Google Sheets via Web App
- compartilhamento de CSVs exportados
- sincronizacao manual entre aparelhos por arquivo `.bar13sync`

## O que o app faz hoje

- abre e retoma pedidos por integrante
- impede mais de um pedido aberto por integrante no mesmo dia
- adiciona itens por cards com baixa imediata de estoque
- devolve estoque ao remover item ou cancelar pedido aberto
- fecha a conta e registra pagamento manual
- suporta pagamento por `PIX`, `DINHEIRO` e `CARTAO_CREDITO`
- exige comprovante para `PIX` e `CARTAO_CREDITO`
- copia mensagem pronta de cobranca para a area de transferencia
- salva QR Code fixo, comprovantes, pacotes de sincronizacao e CSVs no armazenamento local do app
- consulta historico por data, pendentes por periodo e relatorios consolidados
- exporta CSVs de vendas, devedores, consolidado e resumo de consumo
- cadastra operadores e vincula o responsavel aos pedidos e eventos de auditoria
- sincroniza integrantes, itens, operadores, pedidos, itens do pedido e comprovantes entre aparelhos
- envia um snapshot operacional para uma central gerencial no Google Sheets

## Fluxo operacional principal

1. Em `Configuracoes`, ajuste nome do bar, chave PIX, QR Code fixo e, se quiser, a central gerencial.
2. Em `Operadores`, cadastre a equipe e selecione quem esta operando o aparelho.
3. Cadastre integrantes e itens manualmente ou importe os CSVs.
4. Na `Home`, toque em `Novo pedido`.
5. Escolha o integrante e adicione itens pelos cards.
6. Feche a conta quando o consumo terminar.
7. Registre o pagamento:
   - `PIX`: usa QR fixo e exige comprovante
   - `CARTAO_CREDITO`: registro manual e exige comprovante
   - `DINHEIRO`: confirmacao manual, sem comprovante
8. Consulte `Pendentes`, `Historico`, `Relatorios` e `Exportacao CSV` conforme a operacao precisar.

## Navegacao atual

Abas principais:

- `Home`
- `Historico`
- `Relatorios`
- `Pendentes`
- `Configuracoes`

Telas de apoio em stack:

- `Selecionar integrante`
- `Gerenciar integrantes`
- `Gerenciar itens`
- `Gerenciar operadores`
- `Novo pedido`
- `Fechamento da conta`
- `Importacao CSV`
- `Sincronizacao`
- `Exportacao CSV`
- `Ajuda`

## Regras de negocio importantes

- somente pedidos com status `ABERTO` podem ser editados
- pedido sem item nao pode ser fechado
- pedido `FECHADO_AGUARDANDO_PAGAMENTO` pode ser reaberto
- pedido `PAGO` nao pode voltar para edicao
- pedido cancelado continua salvo no historico
- se o ultimo item for removido, o pedido fica cancelado
- integrantes sao deduplicados por nome normalizado
- itens sao deduplicados por nome normalizado
- operadores precisam estar ativos para assumir o aparelho
- nao e possivel abrir pedido sem operador atual valido
- integrantes com pedidos no historico nao podem ser excluidos
- itens usados em pedidos no historico nao podem ser excluidos
- o historico do pedido preserva snapshots de integrante, operador e item para nao ser afetado por mudancas futuras no cadastro

## CSVs e arquivos locais

Arquivos de exemplo:

- [`samples/integrantes_exemplo.csv`](samples/integrantes_exemplo.csv)
- [`samples/itens_exemplo.csv`](samples/itens_exemplo.csv)

Cabecalhos esperados:

- integrantes: `nome,patente`
- itens: `nome,valor,qtdestoque`

Comportamento atual:

- o parser CSV usa virgula como separador
- reimportacoes fazem upsert por nome normalizado
- exportacoes geram arquivos locais e tentam compartilhar quando o dispositivo permitir

## Sincronizacao offline entre aparelhos

O projeto possui um MVP funcional de sincronizacao local-first baseado em eventos.

- cada aparelho recebe um `device_id` fixo
- registros operacionais recebem `sync_id`
- alteracoes relevantes geram `sync_events`
- exportacao e importacao acontecem por arquivo `.bar13sync`
- a importacao e idempotente e ignora pacotes ou eventos ja vistos
- comprovantes anexados podem viajar junto com o pacote

Limitacao atual:

- o estoque continua sendo mantido por `qtd_estoque` local em `itens_bar`
- historico e comprovantes sincronizam bem, mas estoque distribuido por aparelho e transferencias entre aparelhos ainda nao fazem parte desta fase

## Central gerencial

O app tambem suporta envio opcional para uma central gerencial no Google Sheets via Google Apps Script Web App.

- a configuracao usa `central_web_app_url` e `central_token`
- o envio pode ser disparado pela `Home` ou pela tela `Sincronizacao`
- os lotes ficam enfileirados localmente
- o progresso do envio aparece no app
- o fluxo e unidirecional: a planilha nao devolve dados para o app

Documentacao relacionada:

- [`documentacao/google-planilhas-central-webapp.md`](documentacao/google-planilhas-central-webapp.md)
- [`documentacao/google-apps-script/bar13-central-webapp.gs`](documentacao/google-apps-script/bar13-central-webapp.gs)

## Relatorios e exportacoes

O app oferece filtros por periodo compartilhados entre relatorios e CSVs.

Relatorios na interface:

- total de pedidos
- total vendido
- total pago
- total pendente
- quantidade de devedores
- quantidade de comprovantes
- consolidado de devedores
- resumo consolidado de consumo
- relatorio de estoque com vendido no periodo versus saldo atual

CSV disponiveis:

- vendas por periodo
- devedores por periodo
- consolidado por periodo
- resumo de consumo por periodo

## Stack real do projeto

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript strict
- SQLite local com `expo-sqlite`
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- `expo-document-picker`
- `expo-image-picker`
- `expo-file-system`
- `expo-sharing`
- `expo-clipboard`

## Estrutura do repositorio

```text
.
├── App.tsx
├── documentacao/
├── samples/
├── scripts/
└── src/
    ├── components/
    ├── constants/
    ├── context/
    ├── database/
    ├── hooks/
    ├── navigation/
    ├── repositories/
    ├── screens/
    ├── services/
    ├── types/
    └── utils/
```

Resumo por camada:

- `screens`: telas do fluxo operacional
- `components`: UI reutilizavel
- `repositories`: acesso ao SQLite e SQL centralizado
- `services`: regras de negocio, sincronizacao, central e exportacoes
- `database`: conexao e schema idempotente
- `utils`: datas, moeda, arquivos, CSV e validacoes

## Como rodar

Requisitos:

- Node.js LTS
- npm
- Expo Go ou emulador Android/iOS

Instalacao:

```bash
npm install
```

Desenvolvimento:

```bash
npm run start
```

Abrir no Android:

```bash
npm run android
```

Abrir no iOS:

```bash
npm run ios
```

## Validacao

Checks leves recomendados:

```bash
npm run typecheck
npm run lint
./scripts/ai-typecheck.sh
./scripts/ai-lint.sh
./scripts/codex-check.sh
```

Observacao:

- `./scripts/codex-check.sh` nao roda build de proposito
- os comandos de build com Expo/EAS existem no projeto, mas nao sao a validacao padrao

## Builds existentes

```bash
npm run build:android:internal
npm run build:android:local
npm run install:android:usb
```

Use esses fluxos apenas quando houver necessidade explicita de distribuicao ou teste em aparelho.

## Documentacao util

- [`documentacao/manual-do-operador.md`](documentacao/manual-do-operador.md)
- [`documentacao/visao-geral.md`](documentacao/visao-geral.md)
- [`documentacao/funcionalidades.md`](documentacao/funcionalidades.md)
- [`documentacao/arquitetura-e-dados.md`](documentacao/arquitetura-e-dados.md)
- [`documentacao/mapa-de-navegacao.md`](documentacao/mapa-de-navegacao.md)
- [`documentacao/fluxo-principal.md`](documentacao/fluxo-principal.md)

## O que o projeto nao faz hoje

- nao depende de backend para operar
- nao possui integracao com maquininha, TEF, gateway ou adquirente
- nao possui sincronizacao online automatica entre aparelhos
- nao controla estoque distribuido por aparelho nesta fase
