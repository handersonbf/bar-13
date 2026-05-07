# Arquitetura e Dados

Este documento resume como o `Bar13` está estruturado tecnicamente hoje.

## 1. Arquitetura em camadas

O app segue uma divisão prática entre interface, regras e persistência.

## Interface

Arquivos envolvidos:

- `src/screens`
- `src/components`
- `src/navigation`

Responsabilidade:

- renderizar telas
- receber interação do usuário
- disparar ações
- apresentar feedback visual

## Regras de negócio

Arquivos envolvidos:

- `src/services`
- `src/hooks`
- parte de `src/utils`

Responsabilidade:

- controlar o fluxo do pedido
- consolidar relatórios
- importar e exportar CSV
- montar cobrança
- padronizar filtros de período

## Persistência

Arquivos envolvidos:

- `src/repositories`
- `src/database`

Responsabilidade:

- abrir o SQLite
- criar schema
- executar queries
- isolar SQL das telas

## Tipagem e utilidades

Arquivos envolvidos:

- `src/types`
- `src/utils`
- `src/constants`

Responsabilidade:

- definir contratos de dados
- formatar datas e moeda
- validar entradas
- organizar tema visual

## 2. Inicialização do app

Fluxo de bootstrap:

1. `App.tsx` monta `DatabaseProvider`
2. `DatabaseProvider` chama `initializeDatabase()`
3. o banco `bar13.db` é aberto
4. o schema é criado se ainda não existir
5. colunas faltantes são adicionadas por rotina idempotente
6. a configuração principal é garantida
7. a navegação é liberada

Se esse processo falhar:

- `isReady` continua falso
- o app exibe erro de inicialização

## 3. Navegação

Arquivos principais:

- [AppNavigator.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/navigation/AppNavigator.tsx)
- [navigation.ts](/Users/handersonfrota/Abutres/Projetos/bar-13/src/types/navigation.ts)

Modelo usado:

- abas para seções principais
- stack para fluxos de detalhe

## 4. Banco SQLite

Arquivo de schema:

- [migrations.ts](/Users/handersonfrota/Abutres/Projetos/bar-13/src/database/migrations.ts)

Arquivo de conexão:

- [connection.ts](/Users/handersonfrota/Abutres/Projetos/bar-13/src/database/connection.ts)

Nome do banco:

- `bar13.db`

## 5. Tabelas principais

## `integrantes`

Guarda os consumidores cadastrados.

Campos centrais:

- `id`
- `nome`
- `patente`
- `created_at`
- `updated_at`

Observações:

- `nome` é único no schema
- a regra real de negócio também normaliza o nome para bloquear duplicidade por variações de acento, caixa e espaços
- a busca em tela ainda é filtrada em memória após leitura ordenada

## `itens_bar`

Guarda os produtos vendidos.

Campos centrais:

- `id`
- `numero_item`
- `nome`
- `valor`
- `qtd_estoque`
- `ativo`
- `created_at`
- `updated_at`

Observações:

- `numero_item` é único
- apenas itens `ativo = 1` aparecem nas listagens usuais
- o fluxo atual usa `nome`, `valor` e `qtd_estoque`; `numero_item` permanece como coluna interna

## `pedidos`

Guarda a conta principal.

Campos centrais:

- `id`
- `integrante_id`
- `nome_integrante_snapshot`
- `patente_integrante_snapshot`
- `data_pedido`
- `hora_pedido`
- `data_hora_pedido`
- `status`
- `total`
- `cancelado`
- `cancelado_em`
- `metodo_pagamento`
- `comprovante_uri`
- `comprovante_nome`
- `comprovante_mime_type`
- `comprovante_adicionado_em`
- `created_at`
- `updated_at`

Observações:

- o status é controlado por `CHECK`
- cancelamento é modelado por coluna própria, não por status separado

## `pedido_itens`

Guarda as linhas do pedido.

Campos centrais:

- `id`
- `pedido_id`
- `item_id`
- `numero_item_snapshot`
- `nome_item_snapshot`
- `valor_unitario_snapshot`
- `quantidade`
- `subtotal`

Observações:

- a linha preserva snapshot do item vendido
- o snapshot operacional relevante hoje é de nome e valor
- `numero_item_snapshot` continua no schema, mas não é usado pela interface atual como dado visível

## `configuracoes`

Guarda a configuração fixa do app.

Campos centrais:

- `id`
- `chave_pix`
- `caminho_imagem_qr_code`
- `nome_bar`
- `texto_padrao_cobranca`

Observações:

- existe apenas um registro com `id = 1`

## 6. Índices

Índices existentes hoje:

- `idx_pedidos_data_pedido`
- `idx_pedidos_status`
- `idx_pedido_itens_pedido_id`

Esses índices ajudam principalmente em:

- histórico por data
- consultas por status
- montagem de pedidos com join de itens

## 7. Estratégia de snapshots

O projeto usa snapshots em dois pontos importantes.

### Snapshot de integrante

Ao criar o pedido:

- nome do integrante é copiado para o pedido
- patente do integrante é copiada para o pedido

### Snapshot de item

Ao adicionar item:

- nome do item é copiado
- valor unitário é copiado

Benefício:

- o histórico continua consistente mesmo que o cadastro mude depois

Observação:

- apesar de existir `numero_item_snapshot` no banco, o fluxo atual não depende dele na interface nem nas exportações

## 8. Transações críticas

Existem transações explícitas em operações sensíveis.

### Adição de item

Na mesma transação:

- baixa estoque
- cria ou atualiza linha do pedido
- recalcula total

### Remoção de item

Na mesma transação:

- devolve estoque
- ajusta ou exclui linha do pedido
- recalcula total
- ou cancela o pedido quando aplicável

### Cancelamento de pedido aberto

Na mesma transação:

- devolve estoque de todas as linhas
- marca o pedido como cancelado
- zera o total

## 9. Persistência de arquivos locais

Arquivo principal:

- [file.ts](/Users/handersonfrota/Abutres/Projetos/bar-13/src/utils/file.ts)

Diretório base usado pelo app:

- `documentDirectory/bar13`

Arquivos armazenados nesse diretório:

- QR Code escolhido nas configurações
- comprovantes de pagamento com anexo
- subpasta `exports` com CSVs gerados

## 10. Regras de armazenamento

### QR Code

- é selecionado da galeria
- é copiado para a pasta interna do app
- a configuração guarda apenas o caminho salvo

### Comprovantes

- podem ser imagem ou PDF
- são copiados para a pasta interna do app
- o pedido guarda URI, nome, tipo MIME e data de anexação
- hoje são usados por `PIX` e `CARTAO_CREDITO`

### CSV exportado

- é escrito em `bar13/exports`
- o nome recebe carimbo de data e hora
- o compartilhamento é tentado quando disponível no dispositivo

## 11. Regras importantes de integridade

- apenas pedido `ABERTO` pode ser editado
- pedido `FECHADO_AGUARDANDO_PAGAMENTO` pode ser reaberto
- pedido `PAGO` não pode ser reaberto
- pedido cancelado não pode ser reaberto
- pagamento `PIX` exige comprovante
- pagamento `CARTAO_CREDITO` exige comprovante
- item sem estoque não pode ser adicionado
- integrante com pedido não pode ser excluído
- item com uso em pedido não pode ser excluído

## 12. Importação e exportação

### Importação

Arquivos principais:

- [importacaoCsvService.ts](/Users/handersonfrota/Abutres/Projetos/bar-13/src/services/importacaoCsvService.ts)
- [ImportacaoCsvScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/ImportacaoCsvScreen.tsx)

Comportamento:

- valida cabeçalhos
- valida campos obrigatórios
- normaliza nomes
- faz deduplicação do próprio arquivo
- executa `upsert`

Layouts aceitos:

- integrantes: `nome,patente`
- itens: `nome,valor,qtdestoque`

### Exportação

Arquivos principais:

- [exportacaoCsvService.ts](/Users/handersonfrota/Abutres/Projetos/bar-13/src/services/exportacaoCsvService.ts)
- [ExportacaoCsvScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/ExportacaoCsvScreen.tsx)

Comportamento:

- usa o mesmo filtro de período aplicado nos relatórios
- gera CSV local
- tenta compartilhar o arquivo
- exporta o método de pagamento já formatado para leitura

## 13. Observações de manutenção

Pontos importantes para futuras evoluções:

- a camada de repositório já centraliza o SQL e deve continuar sendo o lugar das queries
- as telas devem continuar sem SQL direto
- qualquer nova regra de pedido deve respeitar snapshots e integridade de estoque
- filtros de relatório e exportação devem permanecer alinhados
- operações destrutivas precisam continuar claramente sinalizadas
- se o número do item voltar a ser relevante na interface, a documentação precisa ser revisada para refletir o uso real de `numero_item` e `numero_item_snapshot`
