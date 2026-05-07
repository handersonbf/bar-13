# Bar13

Aplicativo mobile local-first para Android e iOS, feito com Expo, React Native, TypeScript e SQLite, voltado para operacao de balcao sem backend e sem depender de internet no uso diario.

## Estado atual do projeto

O repositório já implementa o fluxo principal de operação:

- cadastro manual e importação CSV de integrantes
- cadastro manual e importação CSV de itens
- busca incremental de integrante por nome
- busca de itens por nome com cards clicáveis
- criação e retomada de pedido aberto no mesmo dia para o mesmo integrante
- controle de estoque durante a montagem do pedido
- fechamento de conta com status `ABERTO`, `FECHADO_AGUARDANDO_PAGAMENTO` e `PAGO`
- pagamento manual por `PIX`, `DINHEIRO` e `CARTAO_CREDITO`
- QR Code fixo configurável por imagem local
- chave PIX textual configurável
- comprovante obrigatório para `PIX` e `CARTAO_CREDITO`
- troca e compartilhamento de comprovante após pagamento
- identidade fixa do aparelho para sincronização offline
- cadastro local de operadores para ranking e auditoria
- exportação e importação manual de pacotes `.bar13sync`
- sincronização idempotente de integrantes, itens, pedidos e comprovantes
- envio direto para central gerencial no Google Sheets via Web App
- mensagem de cobrança copiável para a área de transferência
- histórico por data
- pendentes por período
- relatórios por período
- exportação CSV de vendas, devedores, consolidado e resumo de consumo
- guia rápido do operador dentro do app

## O que o app faz hoje

- persiste dados localmente em SQLite
- mantém snapshots do integrante e dos itens no momento da venda
- impede edição de pedidos fechados, pagos ou cancelados
- reaproveita o mesmo pedido aberto do integrante no mesmo dia
- baixa estoque ao adicionar item no pedido
- devolve estoque ao remover item ou cancelar pedido aberto
- marca o pedido como cancelado quando o último item é removido
- preserva pedidos cancelados no histórico
- salva QR Code, comprovantes e exportações em armazenamento local do app
- preserva eventos importados para evitar sobrescrever ou duplicar dados de outro aparelho

## Regras atuais importantes

- integrantes são deduplicados por nome normalizado
- itens são deduplicados por nome normalizado no fluxo atual de importação e cadastro
- o CSV de integrantes esperado é `nome,patente`
- o CSV de itens esperado é `nome,valor,qtdestoque`
- o parser CSV atual usa vírgula como separador
- pagamento `PIX` exige anexo de comprovante
- pagamento `CARTAO_CREDITO` também exige anexo de comprovante
- pagamento em `DINHEIRO` não exige comprovante
- existe no máximo um pedido aberto por integrante por dia

## Observação sobre cartão

O app já permite registrar pagamento manual como `CARTAO_CREDITO`, com comprovante local anexado ao pedido. Não existe integração com maquininha, TEF, gateway ou adquirente no código atual. Também não há fluxo separado para débito.

## Observação sobre itens

O banco SQLite ainda possui as colunas internas `numero_item` e `numero_item_snapshot`, mas a interface atual e o fluxo de importação operam por `nome`, `valor` e `qtdEstoque`. Hoje o número do item é gerado automaticamente no cadastro interno e não faz parte do CSV importado nem do tipo exposto nas telas.

## Sincronização offline no MVP atual

- cada aparelho passa a ter `device_id` fixo e `nome_aparelho` editável
- integrantes, itens, pedidos e linhas de pedido recebem `sync_id`
- mudanças operacionais relevantes geram eventos locais em `sync_events`
- a sincronização exporta e importa JSON `.bar13sync` com eventos e comprovantes anexados
- a importação é idempotente: pacotes e eventos já vistos são ignorados

### Limitação atual do MVP

O estoque ainda continua sendo mantido por `qtd_estoque` local em `itens_bar`. Ou seja: este primeiro MVP já sincroniza histórico operacional e comprovantes sem sobrescrever vendas, mas o particionamento de estoque por aparelho e as transferências entre aparelhos ainda pertencem à próxima fase.

## Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- SQLite local com `expo-sqlite`
- navegação com `@react-navigation/native`, `native-stack` e `bottom-tabs`
- importação de arquivos com `expo-document-picker`
- seleção de imagem com `expo-image-picker`
- exportação e compartilhamento com `expo-file-system` e `expo-sharing`
- área de transferência com `expo-clipboard`

## Estrutura

```text
.
├── App.tsx
├── app.json
├── samples
│   ├── integrantes_exemplo.csv
│   └── itens_exemplo.csv
├── documentacao
└── src
    ├── components
    ├── constants
    ├── context
    ├── database
    ├── hooks
    ├── navigation
    ├── repositories
    ├── screens
    ├── services
    ├── types
    └── utils
```

## Como rodar

### Requisitos

- Node.js LTS
- npm
- Expo Go ou emulador Android/iOS
- para builds Android compartilháveis: conta Expo e `EAS CLI`

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run start
```

Para abrir no Android:

```bash
npm run android
```

Para abrir no iOS:

```bash
npm run ios
```

## Builds Android

Gerar build compartilhável via Expo:

```bash
npm run build:android:internal
```

Gerar APK localmente:

```bash
npm run build:android:local
```

Instalar build debug via USB:

```bash
npm run install:android:usb
```

O package Android atual é `com.bar13.app`.

## Validações

```bash
npm run typecheck
npm run lint
```

## Fluxo principal

1. Em `Configurações`, ajuste `nome do bar`, `chave PIX`, `texto padrão de cobrança` e a imagem fixa do QR Code.
2. Se houver mais de um aparelho, ajuste também `Nome deste aparelho` e valide `Sincronização`.
3. Em `Operadores`, cadastre a equipe e selecione quem está operando este aparelho.
4. Cadastre integrantes manualmente ou importe [samples/integrantes_exemplo.csv](/Users/handersonfrota/Abutres/Projetos/bar-13/samples/integrantes_exemplo.csv).
5. Cadastre itens manualmente ou importe [samples/itens_exemplo.csv](/Users/handersonfrota/Abutres/Projetos/bar-13/samples/itens_exemplo.csv).
6. Na Home, inicie um novo pedido.
7. Busque o integrante pelo nome.
8. Adicione itens pelos cards.
9. Feche a conta quando terminar o consumo.
10. Se o pagamento for `PIX`, mostre o QR fixo e anexe o comprovante.
11. Se o pagamento for `CARTAO_CREDITO`, registre manualmente o recebimento e anexe o comprovante.
12. Se o pagamento for `DINHEIRO`, confirme manualmente o recebimento.
13. Use `Sincronização` para exportar/importar eventos e comprovantes entre aparelhos.
14. Configure a central gerencial em `Configurações` e use `Enviar para a central` para atualizar o Google Sheets.
15. Consulte `Histórico`, `Pendentes`, `Relatórios` e `Exportação CSV`.

## Manual do operador

Para treinamento e uso diario no balcao, consulte [documentacao/manual-do-operador.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/manual-do-operador.md).

O manual resume preparacao inicial, rotina de pedidos, cobranca por PIX, cartão ou dinheiro, pendentes, historico, relatorios e exportacao CSV.

## Exportações CSV

As exportações atuais respeitam o filtro de período informado na tela e geram arquivos locais com compartilhamento quando disponível:

- vendas por período
- devedores por período
- consolidado por período
- resumo de consumo por período

Os arquivos são gravados localmente dentro do diretório do app antes do compartilhamento.

## Google Planilhas

O app não possui integração nativa direta com Google Drive ou Google Planilhas. O que existe hoje é um fluxo operacional documentado:

1. exportar o `CSV consolidado por período`
2. compartilhar o arquivo manualmente para a pasta desejada no Google Drive
3. usar o Apps Script de apoio para atualizar a planilha

Arquivos de apoio:

- guia: [documentacao/google-planilhas-importacao.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-planilhas-importacao.md)
- script: [documentacao/google-apps-script/bar13-importador-consolidado.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-importador-consolidado.gs)

## Central gerencial

Agora o app também suporta envio direto para uma central gerencial no Google Sheets por `Web App` do Apps Script.

Arquivos de apoio:

- guia: [documentacao/google-planilhas-central-webapp.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-planilhas-central-webapp.md)
- script: [documentacao/google-apps-script/bar13-central-webapp.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-central-webapp.gs)

## Modelo de dados exposto no app

### Integrante

- `id`
- `nome`
- `patente`
- `createdAt`
- `updatedAt`

### ItemBar

- `id`
- `nome`
- `valor`
- `qtdEstoque`
- `ativo`
- `createdAt`
- `updatedAt`

### Pedido

- `id`
- `integranteId`
- `nomeIntegranteSnapshot`
- `patenteIntegranteSnapshot`
- `dataPedido`
- `horaPedido`
- `dataHoraPedido`
- `status`
- `total`
- `cancelado`
- `canceladoEm`
- `metodoPagamento`
- `comprovanteUri`
- `comprovanteNome`
- `comprovanteMimeType`
- `comprovanteAdicionadoEm`

### PedidoItem

- `id`
- `pedidoId`
- `itemId`
- `nomeItemSnapshot`
- `valorUnitarioSnapshot`
- `quantidade`
- `subtotal`

### Configuracao

- `id`
- `chavePix`
- `caminhoImagemQrCode`
- `nomeBar`
- `textoPadraoCobranca`

## Documentação complementar

Há documentação adicional na pasta [documentacao/README.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/README.md), incluindo fluxo funcional, navegação, arquitetura, telas e apoio para o fluxo com Google Planilhas.
