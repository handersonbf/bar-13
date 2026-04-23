# Visão Geral do Projeto

## O que é o Bar13

O `Bar13` é um aplicativo mobile local-first, feito com `Expo`, `React Native`, `TypeScript` e `SQLite`, voltado para operação de balcão em ambiente de bar.

O app funciona sem backend e sem depender de internet no uso diário. Toda a base principal fica salva localmente no aparelho.

## Objetivo operacional

O app foi construído para permitir que o atendente:

- selecione rapidamente um integrante
- abra um pedido local
- adicione itens em poucos toques
- feche a conta
- exiba QR Code fixo para pagamento PIX
- copie mensagem pronta de cobrança
- marque a conta como paga manualmente
- acompanhe histórico, pendências, relatórios e exportações CSV

## Stack atual

- `Expo`
- `React Native`
- `TypeScript`
- `expo-sqlite`
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- `expo-document-picker`
- `expo-image-picker`
- `expo-file-system`
- `expo-sharing`
- `expo-clipboard`

## Estrutura funcional do app

O projeto está organizado em camadas simples e diretas:

- `screens`: telas visíveis para o usuário
- `components`: componentes reutilizáveis de interface
- `repositories`: acesso ao SQLite e queries centralizadas
- `services`: regras de negócio e orquestração dos fluxos
- `database`: bootstrap e criação do schema
- `types`: tipos de domínio e navegação
- `utils`: formatação, datas, CSV, arquivos e validações

## Linguagem e experiência de uso

O app foi construído com foco em operação rápida de balcão.

Características perceptíveis na interface:

- idioma principal em português-BR
- moeda formatada em real brasileiro
- tema escuro
- ações em botões grandes e diretos
- cards clicáveis para acelerar a adição de itens
- filtros visíveis em histórico, pendentes, relatórios e exportações
- navegação curta entre pedido, fechamento e pagamento

## Como o app inicia

Quando o aplicativo abre:

1. o `DatabaseProvider` inicializa o banco local
2. as tabelas são criadas se ainda não existirem
3. colunas novas são adicionadas quando necessário
4. a configuração principal é garantida no banco
5. só depois disso a navegação é exibida

Isso evita que as telas tentem usar dados antes do SQLite estar pronto.

## Navegação atual

O app usa uma combinação de abas e stack.

### Abas principais

- `Home`
- `Histórico`
- `Relatórios`
- `Pendentes`
- `Configurações`

### Telas extras abertas por navegação stack

- `Selecionar integrante`
- `Cadastro de integrantes`
- `Cadastro de itens`
- `Novo pedido`
- `Fechamento da conta`
- `Importação CSV`
- `Exportação CSV`

Mais detalhes estão em [mapa-de-navegacao.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/mapa-de-navegacao.md).

## Modelo de dados principal

### Integrantes

Representam as pessoas que podem consumir no bar.

Campos principais:

- nome
- patente

### Itens do bar

Representam os produtos vendidos.

Campos principais:

- número do item
- nome
- valor
- quantidade em estoque
- ativo

### Pedidos

Representam a conta aberta, fechada ou paga.

Status possíveis:

- `ABERTO`
- `FECHADO_AGUARDANDO_PAGAMENTO`
- `PAGO`

Campos importantes:

- integrante vinculado
- snapshots de nome e patente
- data e hora do pedido
- total
- flag de cancelamento
- método de pagamento
- dados do comprovante

### Itens do pedido

Cada linha do pedido salva snapshot próprio do item vendido:

- número do item no momento da venda
- nome do item no momento da venda
- valor unitário no momento da venda
- quantidade
- subtotal

Esse snapshot preserva o histórico mesmo se o cadastro do item mudar depois.

### Configuração

Há um registro fixo de configuração no banco com:

- nome do bar
- chave PIX
- caminho da imagem do QR Code
- texto padrão de cobrança

Mais detalhes técnicos das tabelas estão em [arquitetura-e-dados.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/arquitetura-e-dados.md).

## Regras centrais já implementadas

- o banco local é a fonte principal de verdade
- as telas não fazem SQL direto
- o app inicializa o schema antes de liberar a navegação
- pedidos pagos não podem ser reabertos
- pedidos cancelados permanecem no histórico
- somente pedidos abertos podem ser editados
- não é possível fechar pedido sem item
- o estoque baixa ao adicionar item
- o estoque retorna ao remover item ou cancelar pedido aberto
- se o último item for removido, o pedido fica marcado como cancelado
- cada integrante pode ter no máximo um pedido aberto por dia
- integrantes com pedidos no histórico não podem ser excluídos
- itens usados em pedidos no histórico não podem ser excluídos
- pagamento via PIX exige comprovante
- pagamento em dinheiro não exige comprovante
- relatórios e exportações usam a mesma base de período

## Visão macro dos fluxos

Os fluxos principais do projeto hoje podem ser divididos em seis blocos:

1. configuração inicial do bar
2. cadastro e manutenção de integrantes
3. cadastro e manutenção de itens
4. operação do pedido no balcão
5. cobrança e confirmação de pagamento
6. consulta histórica, relatórios e exportação

## Ciclo de vida de um pedido

Todo pedido percorre uma trilha simples de estados:

1. `ABERTO`
2. `FECHADO_AGUARDANDO_PAGAMENTO`
3. `PAGO`

Existe ainda uma condição paralela de cancelamento:

- `cancelado = true`

Na prática, isso significa:

- pedido aberto pode receber itens, perder itens, ser cancelado ou ser fechado
- pedido fechado pode ser reaberto ou marcado como pago
- pedido pago vira registro final de histórico
- pedido cancelado continua aparecendo para preservação histórica, mas deixa de ser operacional

## Persistência e segurança funcional

O app preserva o histórico mesmo após reinício porque:

- o banco é SQLite local
- pedidos e itens ficam gravados no aparelho
- o QR Code escolhido é copiado para uma pasta interna do app
- comprovantes anexados também são copiados para armazenamento interno
- exportações CSV são geradas localmente

Arquivos locais usados pelo app:

- QR Code salvo internamente
- comprovantes de PIX salvos internamente
- CSVs exportados em subpasta de `exports`

## Ponto de atenção importante

Na tela de importação, limpar a base de integrantes ou itens também apaga os pedidos e o histórico vinculados. Isso está implementado no código atual e precisa ser tratado como ação destrutiva.

Outros cuidados importantes:

- pagamento PIX sem comprovante é bloqueado
- conta paga não pode ser reaberta
- integrante com histórico não pode ser excluído
- item com histórico não pode ser excluído
- pedido aberto vazio tende a terminar cancelado se o último item for removido
