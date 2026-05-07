# Dashboard da Central no Google Planilhas

Este documento descreve a camada de dashboard criada sobre a central gerencial do `Bar13`.

Ela funciona por cima das abas brutas preenchidas pelo Web App, sem mudar o contrato do app e sem interferir no `doPost`.

## Objetivo

O dashboard existe para transformar a planilha central em uma visão operacional e gerencial pronta para consulta.

Na prática, ele ajuda a responder:

- quanto foi vendido no período
- quanto já foi recebido
- quantos pedidos ainda estão pendentes
- quem está vendendo mais
- quais itens mais giram
- quais aparelhos estão sem sincronização recente
- quais eventos operacionais aconteceram por último

## Separação de responsabilidades

O fluxo está dividido em dois arquivos de Apps Script:

- [bar13-central-webapp.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-central-webapp.gs): recebe JSON do app, valida token, cria as abas brutas e faz `upsert`
- [bar13-dashboard-estrutura.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-dashboard-estrutura.gs): cria bases auxiliares, alertas, dashboards e formatação visual

Essa separação é intencional.

O arquivo da central continua responsável apenas pela integração `App -> Web App -> Planilha`.

O arquivo do dashboard é uma camada analítica por cima da base bruta.

## Como funciona

Depois que a planilha central já existe e recebe dados do app:

1. a função `configurarEstruturaDashboardBar13` garante que as abas brutas existam
2. recria a aba `config`
3. recria as bases auxiliares `dash_base_pedidos`, `dash_base_itens` e `dash_base_auditoria`
4. recalcula a aba `dash_alertas`
5. recria os painéis `dashboard_operacao` e `dashboard_gerencial`
6. aplica o padrão visual escuro do Bar13 nas abas envolvidas

As abas brutas não são limpas nem reprocessadas por essa etapa.

O foco é só leitura, fórmulas, agregação e apresentação.

## Menu criado na planilha

Quando os dois arquivos `.gs` estão no mesmo projeto, o menu `Bar13 Central` passa a oferecer:

- `Preparar planilha`
- `Criar/atualizar dashboards`

O segundo item chama `configurarEstruturaDashboardBar13`.

## Abas brutas usadas como fonte

O dashboard depende destas abas:

- `devices`
- `operadores`
- `pedidos_fato`
- `pedido_itens_fato`
- `auditoria_eventos`
- `importacoes_log`

Essas abas continuam sendo a fonte bruta de verdade da central gerencial.

## Abas criadas pelo dashboard

### `config`

Centraliza os filtros e parâmetros usados nos painéis.

Campos principais:

- `Data inicial`
- `Data final`
- `Operador`
- `Aparelho`
- `Método de pagamento`
- `Atualizado em`
- `Limite alerta sincronização horas`

Observações importantes:

- os filtros são usados pelas fórmulas dos dashboards
- o filtro de aparelho trabalha com `device_id`
- `Atualizado em` usa `NOW()`
- o limite de alerta padrão é `6` horas

### `dash_base_pedidos`

É a base tratada a partir de `pedidos_fato`.

Colunas derivadas mais importantes:

- `mes`
- `dia`
- `faixa_horario`
- `pedido_valido`
- `pedido_pago`
- `pedido_pendente`
- `pedido_cancelado`

Uso principal:

- cards de faturamento
- ticket médio
- ranking por operador
- análise por aparelho, status e forma de pagamento

### `dash_base_itens`

Cruza `pedido_itens_fato` com dados do pedido original.

Ela adiciona ao item:

- `data_pedido`
- `operador`
- `aparelho`
- `metodo_pagamento`
- `status_pedido`
- `cancelado`
- `item_valido`

Uso principal:

- top itens por quantidade
- top itens por faturamento
- análise de mix por período e por operador

### `dash_base_auditoria`

É a base tratada de `auditoria_eventos`.

Além dos campos originais, classifica o `event_type` em `grupo_evento`:

- `Criação`
- `Edição`
- `Fechamento`
- `Pagamento`
- `Cancelamento`
- `Outros`

Uso principal:

- bloco de últimos eventos
- leitura rápida da atividade operacional

### `dash_alertas`

Consolida alertas operacionais a partir de pedidos, aparelhos e log de importação.

Tipos atualmente implementados:

- `Pedido pendente`
- `Pedido cancelado`
- `Aparelho sem sincronização`
- `Aparelho sem sincronização recente`
- `Erro de importação`

Cada linha traz:

- `tipo`
- `gravidade`
- `referencia`
- `detalhe`
- `data_evento`
- `status`

## Dashboards criados

### `dashboard_operacao`

É o painel mais voltado para acompanhamento do dia.

Cards principais:

- `Total vendido`
- `Caixa recebido`
- `Pedidos pagos`
- `Última sincronização`
- `Pedidos pendentes`
- `Valor pendente`
- `Cancelados`
- `Ticket médio`

Blocos de consulta:

- vendas por operador
- vendas por método de pagamento
- pedidos pendentes
- últimos eventos de auditoria
- alertas operacionais

### `dashboard_gerencial`

É o painel mais voltado para leitura consolidada.

Cards principais:

- `Faturamento válido`
- `Faturamento recebido`
- `Faturamento pendente`
- `Pedidos válidos`
- `Produto mais vendido`
- `Produto maior faturamento`
- `Melhor operador`
- `% cancelamento`

Blocos de consulta:

- top 10 itens por quantidade
- top 10 itens por faturamento
- ranking de operadores
- faturamento por dia
- vendas por aparelho
- resumo por status

## Regras de negócio aplicadas no dashboard

O dashboard já incorpora algumas regras para não distorcer os números:

- `faturamento válido` usa pedidos com `cancelado <> SIM`
- `caixa recebido` usa pedidos `PAGO` e não cancelados
- `valor pendente` usa status que batem com `AGUARDANDO` ou `PENDENTE`, sem cancelados
- ranking de vendas usa `operador_responsavel_nome` do pedido, não o ator da auditoria
- análise de itens usa `item_valido`, que exclui itens de pedidos cancelados
- alertas de sincronização usam `last_exported_at` e, na falta dele, `last_seen_at`
- o limite para alertar aparelho parado vem de `config!B10`

## O que esta implementação já entrega

- painel operacional e gerencial prontos na mesma planilha
- filtros por período, operador, aparelho e método de pagamento
- cards KPI automáticos
- tabelas dinâmicas por fórmula
- classificação básica de auditoria
- alertas operacionais sem depender de backend
- recriação segura da estrutura sem mexer na base bruta

## O que não está automatizado hoje

Alguns pontos fazem sentido, mas ainda não estão implementados automaticamente no script:

- gráficos nativos do Google Planilhas
- alerta de operador ativo sem venda no período
- uso de `nome_aparelho` como filtro amigável no lugar do `device_id`
- ocultação automática das abas auxiliares ao final da configuração

Observação:

- existem as funções `ocultarAbasAuxiliaresBar13` e `exibirAbasAuxiliaresBar13`, mas elas precisam ser executadas manualmente no Apps Script quando desejado

## Instalação recomendada

1. configure primeiro a central com [google-planilhas-central-webapp.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-planilhas-central-webapp.md)
2. adicione também o arquivo [bar13-dashboard-estrutura.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-dashboard-estrutura.gs) no mesmo projeto Apps Script
3. recarregue a planilha
4. use o menu `Bar13 Central > Criar/atualizar dashboards`

## Rotina de uso

Fluxo sugerido:

1. o app envia dados para a central
2. a planilha recebe ou atualiza as abas brutas
3. o responsável roda `Criar/atualizar dashboards` quando quiser remontar a estrutura
4. no dia a dia, os filtros da aba `config` podem ser alterados sem mexer no código
5. se quiser recalcular só os alertas, rode `atualizarAlertasBar13`

## Cuidados práticos

- não edite manualmente as abas brutas para montar indicadores
- prefira usar as bases auxiliares ou os painéis prontos
- se fizer ajustes manuais nas abas `config`, `dash_base_*`, `dash_alertas` ou `dashboard_*`, eles podem ser sobrescritos quando `configurarEstruturaDashboardBar13` for executada novamente
- os valores principais de filtro da aba `config` são preservados na recriação, mas formatações e anotações manuais fora desse fluxo não são garantidas

## Melhor leitura do conjunto

Pensando no desenho geral:

- `bar13-central-webapp.gs` cuida da entrada e do armazenamento bruto
- `bar13-dashboard-estrutura.gs` cuida da visualização analítica
- a planilha passa a funcionar como uma central gerencial leve, com rastreabilidade, operação e leitura de desempenho no mesmo lugar
