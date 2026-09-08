# Contrato HTTP da central gerencial

**Versão do payload:** 1. Fontes: [cliente](../../src/services/centralService.ts) e [receptor](../../documentacao/google-apps-script/bar13-central-webapp.gs). A URL é configurada no aparelho; nenhum endpoint real faz parte desta spec.

## Requisição

`POST <centralWebAppUrl>`, headers `Accept: application/json` e `Content-Type: application/json`.

Corpo: objeto com `centralToken: string` e `payload: CentralPayload`. O token vem da configuração atual a cada tentativa. Só o payload interno é salvo em `central_push_batches.payload_json`. A propriedade de configuração do receptor é `BAR13_CENTRAL_TOKEN`; seu conteúdo deve ser configurado fora do repositório e não é reproduzido aqui.

## Envelope de `CentralPayload`

| Campo | Tipo | Semântica |
| --- | --- | --- |
| `schemaVersion` | 1 | Versão |
| `batchId` | string | ID estável daquela tentativa enfileirada: `central_<deviceId>_<timestamp base36>` |
| `exportedAt` | string | Momento em que o snapshot foi montado, em horário local sem offset |
| `bar` | object | `nome: string`, `slug: string` |
| `sourceDevice` | object | `deviceId: string`, `name: string` |
| `devices` | array | Aparelhos conhecidos e aparelho local caso ainda não esteja na lista |
| `operators` | array | Todos os operadores, ativos e inativos |
| `orders` | array | Todos os pedidos, inclusive abertos e cancelados |
| `orderItems` | array | Todas as linhas atualmente associadas aos pedidos |
| `auditEvents` | array | Eventos de pedido e comprovante, sem payload completo |

Slug do bar remove acentos, converte para minúsculas, substitui grupos não alfanuméricos por `_` e remove bordas; fallback `bar13`.

### `devices[]`

Campos string: `deviceId`, `nomeAparelho`, `firstSeenAt`, `lastSeenAt`, `lastExportedAt`, `lastImportedAt`. `lastPackageId` não é enviado. Datas ausentes podem ser vazias. Aparelho local acrescentado pelo cliente recebe datas iniciais do momento da montagem se ainda não estiver entre conhecidos.

### `operators[]`

`syncId: string`, `nome: string`, `ativo: boolean`, `createdAt: string`, `updatedAt: string`.

### `orders[]`

| Campo | Tipo | Origem |
| --- | --- | --- |
| `pedidoSyncId` | string | Identidade global declarada do pedido |
| `integranteId` | number | ID local do integrante, não chave global |
| `integrante`, `patente` | string | Snapshots do integrante |
| `operadorResponsavelSyncId`, `operadorResponsavelNome` | string | Snapshots do responsável pela abertura |
| `deviceIdOrigem` | string | Aparelho de origem do pedido |
| `dataPedido`, `horaPedido`, `dataHoraPedido` | string | Data/hora de criação operacional |
| `status` | string | Enum original, mesmo se cancelado |
| `cancelado` | boolean | Marca separada |
| `canceladoEm` | string | Data ou vazio |
| `metodoPagamento` | string | Enum técnico ou vazio, sem tradução de rótulo |
| `comprovanteNome` | string | Nome ou vazio; não inclui arquivo |
| `total` | number | Valor persistido |
| `createdAt`, `updatedAt` | string | Timestamps do registro |

### `orderItems[]`

`pedidoItemSyncId: string`, `pedidoSyncId: string`, `itemId: number` (local), `itemNome: string` (snapshot), `quantidade: number`, `valorUnitario: number` (snapshot), `subtotal: number`. Não há itemSyncId, saldo, URI, blob ou timestamp próprio de linha nesse contrato.

### `auditEvents[]`

Campos string: `eventId`, `deviceId`, `deviceName`, `entityType`, `entitySyncId`, `eventType`, `actorOperatorSyncId`, `actorOperatorName`, `createdAt`.

Tipos enviados: `PEDIDO_CRIADO`, `PEDIDO_ITEM_ADICIONADO`, `PEDIDO_ITEM_REMOVIDO`, `PEDIDO_FECHADO`, `PEDIDO_REABERTO`, `PEDIDO_PAGO`, `PEDIDO_CANCELADO`, `COMPROVANTE_ANEXADO`. Não inclui sequência nem payload do evento, embora esses existam no log local.

## Resposta

Sucesso do receptor:

```json
{
  "ok": true,
  "batchId": "central_device_exemplo_01",
  "ordersUpserted": 1,
  "orderItemsUpserted": 2,
  "auditEventsUpserted": 5,
  "operatorsUpserted": 1,
  "devicesUpserted": 1,
  "message": "Central atualizada com sucesso."
}
```

Contagens indicam linhas tocadas, tanto novas como substituídas. Erro retorna `ok: false, message: string`. `GET` retorna `ok: true, status: ready`, sem dados operacionais.

Cliente considera sucesso quando `response.ok` e `parsed.ok` forem truthy; faz parse JSON, mas não valida formalmente o schema completo. Campos de contagem omitidos são normalizados para zero e batchId omitido para o ID enviado. JSON/HTML inválido, corpo vazio, erro lógico ou HTTP interrompem a fila conforme [central](../funcionalidades/008-central.md).

## Persistência no receptor

| Aba | Chave de upsert | Campos gravados, em ordem |
| --- | --- | --- |
| `devices` | `device_id` | `device_id,nome_aparelho,first_seen_at,last_seen_at,last_exported_at,last_imported_at,batch_id` |
| `operadores` | `operador_sync_id` | `operador_sync_id,nome,ativo,created_at,updated_at,batch_id` |
| `pedidos_fato` | `pedido_sync_id` | `pedido_sync_id,bar_nome,bar_slug,device_id_origem,operador_responsavel_sync_id,operador_responsavel_nome,integrante_id,integrante,patente,data_pedido,hora_pedido,data_hora_pedido,status,cancelado,cancelado_em,metodo_pagamento,comprovante_nome,total,created_at,updated_at,batch_id,exported_at` |
| `pedido_itens_fato` | `pedido_item_sync_id` | `pedido_item_sync_id,pedido_sync_id,item_id,item_nome,quantidade,valor_unitario,subtotal,batch_id,exported_at` |
| `auditoria_eventos` | `event_id` | `event_id,device_id,device_name,entity_type,entity_sync_id,event_type,actor_operator_sync_id,actor_operator_name,created_at,batch_id` |
| `importacoes_log` | Sem upsert | `executado_em,status,batch_id,device_id,detalhe` |

Booleans de ativo/cancelado são convertidos em `SIM`/`NAO` na planilha. Cabeçalhos ausentes/divergentes são preparados pelo script. Log usa timezone `America/Fortaleza` com offset no instante de execução. No erro, log recebe batch/device vazios no handler atual.

Upsert não usa bar_slug como parte da chave, não verifica versão temporal, não apaga ausências e não deduplica log por batchId. Não há transação abrangendo todas as abas nem bloqueio de concorrência no receptor distribuído. Esta API é um snapshot gerencial de saída, não o protocolo `.bar13sync` e não um backup de anexos.
