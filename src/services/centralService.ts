import { CentralPushSummary, Configuracao, PedidoDetalhado } from '../types/domain';
import {
  countPendingCentralPushBatches,
  createCentralPushBatch,
  getLatestCentralPushBatch,
  listPendingCentralPushBatches,
  markCentralPushBatchAttempt,
  markCentralPushBatchError,
  markCentralPushBatchSuccess,
} from '../repositories/centralPushRepository';
import { getConfiguracao } from '../repositories/configuracaoRepository';
import { listOperadores } from '../repositories/operatorsRepository';
import { listTodosPedidos } from '../repositories/pedidosRepository';
import { listKnownDevices, listSyncEvents } from '../repositories/syncEventsRepository';
import { getNowParts } from '../utils/date';

type CentralPayload = {
  schemaVersion: 1;
  batchId: string;
  exportedAt: string;
  bar: {
    nome: string;
    slug: string;
  };
  sourceDevice: {
    deviceId: string;
    name: string;
  };
  devices: {
    deviceId: string;
    nomeAparelho: string;
    firstSeenAt: string;
    lastSeenAt: string;
    lastExportedAt: string;
    lastImportedAt: string;
  }[];
  operators: {
    syncId: string;
    nome: string;
    ativo: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  orders: {
    pedidoSyncId: string;
    integranteId: number;
    integrante: string;
    patente: string;
    operadorResponsavelSyncId: string;
    operadorResponsavelNome: string;
    deviceIdOrigem: string;
    dataPedido: string;
    horaPedido: string;
    dataHoraPedido: string;
    status: string;
    cancelado: boolean;
    canceladoEm: string;
    metodoPagamento: string;
    comprovanteNome: string;
    total: number;
    createdAt: string;
    updatedAt: string;
  }[];
  orderItems: {
    pedidoItemSyncId: string;
    pedidoSyncId: string;
    itemId: number;
    itemNome: string;
    quantidade: number;
    valorUnitario: number;
    subtotal: number;
  }[];
  auditEvents: {
    eventId: string;
    deviceId: string;
    deviceName: string;
    entityType: string;
    entitySyncId: string;
    eventType: string;
    actorOperatorSyncId: string;
    actorOperatorName: string;
    createdAt: string;
  }[];
};

type CentralResponse = {
  ok: boolean;
  batchId: string;
  ordersUpserted: number;
  orderItemsUpserted: number;
  auditEventsUpserted: number;
  operatorsUpserted: number;
  devicesUpserted: number;
  message?: string;
};

export type CentralSendProgress = {
  sentBatches: number;
  totalBatches: number;
  percentage: number;
};

type EnviarCentralAgoraOptions = {
  onProgress?: (progress: CentralSendProgress) => void;
};

const CENTRAL_RESPONSE_PREVIEW_LIMIT = 160;

const AUDIT_EVENT_TYPES = new Set([
  'PEDIDO_CRIADO',
  'PEDIDO_ITEM_ADICIONADO',
  'PEDIDO_ITEM_REMOVIDO',
  'PEDIDO_FECHADO',
  'PEDIDO_REABERTO',
  'PEDIDO_PAGO',
  'PEDIDO_CANCELADO',
  'COMPROVANTE_ANEXADO',
]);

function slugify(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'bar13';
}

function validateCentralConfig(configuracao: Configuracao) {
  if (!configuracao.centralWebAppUrl.trim()) {
    throw new Error('Informe a URL do Google Apps Script Web App antes de enviar para a central.');
  }

  if (!configuracao.centralToken.trim()) {
    throw new Error('Informe o token da central antes de enviar para a central.');
  }

  if (!configuracao.deviceId.trim()) {
    throw new Error('Este aparelho ainda não possui identidade fixa para a central.');
  }
}

function buildResponsePreview(rawText: string) {
  const normalized = rawText.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.length <= CENTRAL_RESPONSE_PREVIEW_LIMIT) {
    return normalized;
  }

  return `${normalized.slice(0, CENTRAL_RESPONSE_PREVIEW_LIMIT)}...`;
}

function buildInvalidCentralResponseMessage(response: Response, rawText: string) {
  const trimmed = rawText.trim();
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const statusLabel = `status ${response.status}`;
  const preview = buildResponsePreview(rawText);

  if (!trimmed) {
    return `A central respondeu sem JSON (${statusLabel}). Verifique a publicação do Web App e tente novamente.`;
  }

  if (trimmed.startsWith('<') || contentType.includes('text/html')) {
    return `A central respondeu HTML em vez de JSON (${statusLabel}). Verifique se a URL do Web App está correta e se a implantação do Apps Script está ativa.`;
  }

  return preview
    ? `A central respondeu em formato inválido (${statusLabel}). Resposta recebida: ${preview}`
    : `A central respondeu em formato inválido (${statusLabel}).`;
}

async function parseCentralHttpResponse(response: Response) {
  const rawText = await response.text();
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error(buildInvalidCentralResponseMessage(response, rawText));
  }

  try {
    return JSON.parse(trimmed) as Partial<CentralResponse>;
  } catch {
    throw new Error(buildInvalidCentralResponseMessage(response, rawText));
  }
}

function buildPayload(batchId: string, configuracao: Configuracao, pedidos: PedidoDetalhado[], devices: Awaited<ReturnType<typeof listKnownDevices>>, operators: Awaited<ReturnType<typeof listOperadores>>, events: Awaited<ReturnType<typeof listSyncEvents>>): CentralPayload {
  const { iso } = getNowParts();
  const barSlug = slugify(configuracao.nomeBar);
  const knownDevices = devices.some((device) => device.deviceId === configuracao.deviceId)
    ? devices
    : [
        ...devices,
        {
          deviceId: configuracao.deviceId,
          nomeAparelho: configuracao.nomeAparelho,
          firstSeenAt: iso,
          lastSeenAt: iso,
          lastPackageId: '',
          lastExportedAt: configuracao.lastExportedAt,
          lastImportedAt: configuracao.lastImportedAt,
        },
      ];

  return {
    schemaVersion: 1,
    batchId,
    exportedAt: iso,
    bar: {
      nome: configuracao.nomeBar.trim() || 'Bar13',
      slug: barSlug,
    },
    sourceDevice: {
      deviceId: configuracao.deviceId,
      name: configuracao.nomeAparelho,
    },
    devices: knownDevices.map((device) => ({
      deviceId: device.deviceId,
      nomeAparelho: device.nomeAparelho,
      firstSeenAt: device.firstSeenAt,
      lastSeenAt: device.lastSeenAt,
      lastExportedAt: device.lastExportedAt,
      lastImportedAt: device.lastImportedAt,
    })),
    operators: operators.map((operator) => ({
      syncId: operator.syncId,
      nome: operator.nome,
      ativo: operator.ativo,
      createdAt: operator.createdAt,
      updatedAt: operator.updatedAt,
    })),
    orders: pedidos.map((pedido) => ({
      pedidoSyncId: pedido.syncId,
      integranteId: pedido.integranteId,
      integrante: pedido.nomeIntegranteSnapshot,
      patente: pedido.patenteIntegranteSnapshot,
      operadorResponsavelSyncId: pedido.operadorSyncIdSnapshot,
      operadorResponsavelNome: pedido.nomeOperadorSnapshot,
      deviceIdOrigem: pedido.deviceIdOrigem,
      dataPedido: pedido.dataPedido,
      horaPedido: pedido.horaPedido,
      dataHoraPedido: pedido.dataHoraPedido,
      status: pedido.status,
      cancelado: pedido.cancelado,
      canceladoEm: pedido.canceladoEm,
      metodoPagamento: pedido.metodoPagamento,
      comprovanteNome: pedido.comprovanteNome,
      total: pedido.total,
      createdAt: pedido.createdAt,
      updatedAt: pedido.updatedAt,
    })),
    orderItems: pedidos.flatMap((pedido) =>
      pedido.itens.map((item) => ({
        pedidoItemSyncId: item.syncId,
        pedidoSyncId: pedido.syncId,
        itemId: item.itemId,
        itemNome: item.nomeItemSnapshot,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitarioSnapshot,
        subtotal: item.subtotal,
      }))
    ),
    auditEvents: events
      .filter((event) => AUDIT_EVENT_TYPES.has(event.eventType))
      .map((event) => ({
        eventId: event.eventId,
        deviceId: event.deviceId,
        deviceName: event.deviceName,
        entityType: event.entityType,
        entitySyncId: event.entitySyncId,
        eventType: event.eventType,
        actorOperatorSyncId: event.actorOperatorSyncId,
        actorOperatorName: event.actorOperatorName,
        createdAt: event.createdAt,
      })),
  };
}

async function buildCentralSnapshotPayload(configuracao: Configuracao, batchId: string) {
  const [pedidos, devices, operators, events] = await Promise.all([
    listTodosPedidos(),
    listKnownDevices(),
    listOperadores('', true),
    listSyncEvents(),
  ]);

  return buildPayload(batchId, configuracao, pedidos, devices, operators, events);
}

async function sendBatchToCentral(configuracao: Configuracao, batchId: string, payloadJson: string) {
  await markCentralPushBatchAttempt(batchId);

  const response = await fetch(configuracao.centralWebAppUrl.trim(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      centralToken: configuracao.centralToken.trim(),
      payload: JSON.parse(payloadJson) as CentralPayload,
    }),
  });

  const parsed = await parseCentralHttpResponse(response);

  if (!response.ok || !parsed.ok) {
    const message = parsed.message || `A central respondeu com status ${response.status}.`;
    throw new Error(message);
  }

  const normalizedResponse: CentralResponse = {
    ok: true,
    batchId: parsed.batchId ?? batchId,
    ordersUpserted: parsed.ordersUpserted ?? 0,
    orderItemsUpserted: parsed.orderItemsUpserted ?? 0,
    auditEventsUpserted: parsed.auditEventsUpserted ?? 0,
    operatorsUpserted: parsed.operatorsUpserted ?? 0,
    devicesUpserted: parsed.devicesUpserted ?? 0,
    message: parsed.message,
  };

  await markCentralPushBatchSuccess(batchId, JSON.stringify(normalizedResponse));
  return normalizedResponse;
}

export async function carregarResumoCentral(): Promise<CentralPushSummary> {
  const [configuracao, latestBatch, pendingBatches] = await Promise.all([
    getConfiguracao(),
    getLatestCentralPushBatch(),
    countPendingCentralPushBatches(),
  ]);

  return {
    configured: Boolean(configuracao.centralWebAppUrl.trim() && configuracao.centralToken.trim()),
    pendingBatches,
    latestBatch,
  };
}

export async function enviarCentralAgora() {
  return enviarCentralAgoraComOpcoes();
}

function notifyProgress(totalBatches: number, sentBatches: number, onProgress?: (progress: CentralSendProgress) => void) {
  if (!onProgress) {
    return;
  }

  const percentage = totalBatches > 0 ? Math.round((sentBatches / totalBatches) * 100) : 100;

  onProgress({
    sentBatches,
    totalBatches,
    percentage,
  });
}

export async function enviarCentralAgoraComOpcoes(options?: EnviarCentralAgoraOptions) {
  const configuracao = await getConfiguracao();
  validateCentralConfig(configuracao);

  const batchId = `central_${configuracao.deviceId}_${Date.now().toString(36)}`;
  const payload = await buildCentralSnapshotPayload(configuracao, batchId);
  await createCentralPushBatch(batchId, JSON.stringify(payload));

  const pendingBatches = await listPendingCentralPushBatches();
  const totalBatches = pendingBatches.length;
  let sentBatches = 0;
  let latestResponse: CentralResponse | null = null;

  notifyProgress(totalBatches, sentBatches, options?.onProgress);

  for (const batch of pendingBatches) {
    try {
      latestResponse = await sendBatchToCentral(configuracao, batch.batchId, batch.payloadJson);
      sentBatches += 1;
      notifyProgress(totalBatches, sentBatches, options?.onProgress);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar lote para a central.';
      await markCentralPushBatchError(batch.batchId, message);
      throw new Error(message);
    }
  }

  return {
    sentBatches,
    latestResponse,
  };
}
