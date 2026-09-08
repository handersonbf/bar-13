# Contrato `.bar13sync`

**Versão do envelope:** 1. **Formato:** JSON UTF-8 identado, terminado por quebra de linha, sem compressão/criptografia. Fonte tipada: [sync.ts](../../src/types/sync.ts). Implementação: [sincronizacaoService](../../src/services/sincronizacaoService.ts).

## Envelope

| Campo | Tipo | Conteúdo |
| --- | --- | --- |
| `schemaVersion` | literal number 1 | Versão aceita |
| `packageId` | string | `package_<deviceId>_<timestamp base36>` no exportador |
| `exportedAt` | string | Instante local sem offset |
| `sourceDevice` | object | `deviceId: string`, `name: string` do aparelho exportador |
| `events` | array | Todos os eventos conhecidos, inclusive de outras origens |
| `blobs` | array | Arquivos referenciados pelos eventos e encontrados em `sync_blobs` |

Exemplo estrutural fictício mínimo, sem dados operacionais:

```json
{
  "schemaVersion": 1,
  "packageId": "package_device_exemplo_01",
  "exportedAt": "2026-09-08T10:00:00",
  "sourceDevice": { "deviceId": "device_exemplo", "name": "Caixa teste" },
  "events": [],
  "blobs": []
}
```

Nome local: `bar13_sync_<YYYY-MM-DD_HH-mm>.bar13sync`. Conteúdo, não extensão, é validado. Validação inicial confere objeto, versão, tipos de packageId/exportedAt/origem e arrays; não garante que cada elemento respeite as tabelas abaixo.

## Evento

Campos emitidos: `eventId: string`, `deviceId: string`, `deviceName: string`, `sequence: number`, `entityType: string`, `entitySyncId: string`, `eventType: string`, `actorOperatorSyncId: string`, `actorOperatorName: string`, `payload: object`, `createdAt: string`.

Ator ausente em pacote antigo é convertido para string vazia ao gravar. `eventId` identifica a operação; `entitySyncId` identifica seu alvo. Ordenação é textual por createdAt, depois deviceId e sequência numérica. A criação local usa prefixos de entidade e fragmento de seis caracteres do aparelho; não usa UUID completo para IDs de entidade/evento.

## Catálogo de eventos e payload emitido

Todos os campos abaixo são emitidos pelo fluxo indicado, embora o importador tolere ausência de vários deles por defaults. Strings de data seguem convenção local sem timezone.

| `eventType` | `entityType` e alvo | Campos do payload |
| --- | --- | --- |
| `INTEGRANTE_UPSERTED` | INTEGRANTE / sync ID do integrante | `nome: string`, `patente: string`, `createdAt: string`, `updatedAt: string` |
| `ITEM_UPSERTED` | ITEM / sync ID do item | `nome: string`, `valor: number`, `qtdEstoque: number`, `ativo: boolean`, `createdAt: string`, `updatedAt: string` |
| `OPERADOR_UPSERTED` | OPERADOR / sync ID do operador | `nome: string`, `ativo: boolean`, `createdAt: string`, `updatedAt: string` |
| `PEDIDO_CRIADO` | PEDIDO / sync ID do pedido | `integranteSyncId`, `nomeIntegranteSnapshot`, `patenteIntegranteSnapshot`, `operadorSyncIdSnapshot`, `nomeOperadorSnapshot`, `deviceIdOrigem`, `dataPedido`, `horaPedido`, `dataHoraPedido`, `status`, `canceladoEm`, `createdAt`, `updatedAt` como strings; `total: number`, `cancelado: boolean` |
| `PEDIDO_ITEM_ADICIONADO` | PEDIDO_ITEM / sync ID da linha | `pedidoSyncId`, `itemSyncId`, `nomeItemSnapshot`, `updatedAt` como strings; `valorUnitarioSnapshot`, `quantidade`, `subtotal`, `pedidoTotal` como numbers |
| `PEDIDO_ITEM_REMOVIDO` | PEDIDO_ITEM / sync ID da linha | Mesmos campos da adição, com quantidade final reduzida ou zero |
| `PEDIDO_FECHADO` | PEDIDO / sync ID do pedido | `status: string`, `total: number`, `updatedAt: string` |
| `PEDIDO_REABERTO` | PEDIDO / sync ID do pedido | `status: string`, `total: number`, `updatedAt: string` |
| `PEDIDO_CANCELADO` | PEDIDO / sync ID do pedido | `status: string`, `cancelado: boolean`, `canceladoEm: string`, `total: number`, `updatedAt: string` |
| `PEDIDO_PAGO` | PEDIDO / sync ID do pedido | `metodoPagamento`, `comprovanteNome`, `comprovanteMimeType`, `comprovanteAdicionadoEm`, `blobId`, `blobHash`, `updatedAt` como strings |
| `COMPROVANTE_ANEXADO` | PEDIDO / sync ID do pedido | `comprovanteNome`, `comprovanteMimeType`, `comprovanteAdicionadoEm`, `blobId`, `blobHash`, `updatedAt` como strings |

Embora o union `SyncEntityType` inclua `CONFIGURACAO` e `COMPROVANTE`, não existem eventos de configuração; troca de comprovante usa entidade **PEDIDO**. O dispatcher escolhe pelo `eventType`, não valida toda combinação com `entityType`. Tipo de evento desconhecido é recusado.

Quantidades de linha são **estado absoluto**, não incremento/decremento. Criação no destino inicia aberto/zero independentemente de campos equivalentes do payload; eventos seguintes recompõem consumo/status. Eventos de estado escolhem o status pela função de aplicação. Cancelamento força marca/total zero. A dependência de integrante/item/pedido precisa estar disponível quando o evento for aplicado.

## Blob

| Campo | Tipo | Conteúdo |
| --- | --- | --- |
| `blobId` | string | Identidade do anexo |
| `nome` | string | Nome original para exibição |
| `mimeType` | string | MIME ou vazio |
| `hash` | string | Hexadecimal de oito caracteres na geração local |
| `base64` | string | Conteúdo integral do arquivo |
| `createdAt` | string | Data do anexo/registro |

Hash local usa FNV-1a de 32 bits sobre a string Base64. Importação procura hash já existente, associa ID recebido ao blob encontrado no mapa daquela importação ou grava arquivo novo. Não verifica novamente hash/conteúdo e não persiste uma tabela de aliases para diferentes blob IDs com mesmo hash. `blobHash` no evento não serve como fallback geral para resolver referência.

## Prévia e resultado

Prévia: `packageId`, `exportedAt`, `sourceDeviceId`, `sourceDeviceName`, `totalEvents`, `newEvents`, `pedidos`, `comprovantes`, `integrantes`, `itens`, `warnings: string[]`. Contagens de entidades usam IDs distintos; comprovantes é tamanho do array de blobs. Não há contador próprio de operadores na prévia.

Resultado de importação: `importedEvents`, `importedBlobs`, `importedPackages` (1 após sucesso), `preview`. Histórico local guarda volume total do pacote, não apenas essas contagens novas.

Repetição do mesmo pacote gera erro; repetição de evento em pacote novo é ignorada. Pacote mais antigo ou do mesmo aparelho gera aviso. Limites de ordenação, estoques e validação estão em [sincronização](../funcionalidades/007-sincronizacao.md).
