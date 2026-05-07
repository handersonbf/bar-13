import { getDatabase } from '../database/connection';
import {
  ComprovanteAnexo,
  Integrante,
  ItemBar,
  OrderStatus,
  PaymentMethod,
  PaymentMethodWithProof,
  PedidoDetalhado,
  PedidoItem,
} from '../types/domain';
import { getNowParts } from '../utils/date';
import { readFileAsBase64 } from '../utils/file';
import { ensureBlobForAttachmentOnDatabase } from './syncBlobsRepository';
import { buildEntitySyncId, getNextLocalEventMetadata, recordLocalSyncEvent } from './syncEventsRepository';

type PagamentoPedido =
  | { metodo: PaymentMethodWithProof; comprovante: ComprovanteAnexo }
  | { metodo: 'DINHEIRO' };

type OrderJoinRow = {
  pedido_id: number;
  pedido_sync_id: string;
  integrante_id: number;
  nome_integrante_snapshot: string;
  patente_integrante_snapshot: string;
  operador_sync_id_snapshot: string;
  nome_operador_snapshot: string;
  device_id_origem: string;
  data_pedido: string;
  hora_pedido: string;
  data_hora_pedido: string;
  status: OrderStatus;
  total: number;
  cancelado: number;
  cancelado_em: string;
  metodo_pagamento: PaymentMethod | '';
  comprovante_uri: string;
  comprovante_nome: string;
  comprovante_mime_type: string;
  comprovante_adicionado_em: string;
  created_at: string;
  updated_at: string;
  pedido_item_id: number | null;
  pedido_item_sync_id: string | null;
  item_id: number | null;
  item_sync_id: string | null;
  nome_item_snapshot: string | null;
  valor_unitario_snapshot: number | null;
  quantidade: number | null;
  subtotal: number | null;
};

async function updateOrderTotal(orderId: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(subtotal), 0) AS total FROM pedido_itens WHERE pedido_id = ?;',
    [orderId]
  );
  const { iso } = getNowParts();
  await db.runAsync('UPDATE pedidos SET total = ?, updated_at = ? WHERE id = ?;', [row?.total ?? 0, iso, orderId]);
}

async function assertPedidoAberto(orderId: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ status: OrderStatus; cancelado: number }>(
    'SELECT status, cancelado FROM pedidos WHERE id = ?;',
    [orderId]
  );

  if (!row) {
    throw new Error('Pedido não encontrado.');
  }

  if (row.status !== 'ABERTO' || Boolean(row.cancelado)) {
    throw new Error('Somente pedidos abertos podem ser editados.');
  }
}

async function assertOperadorAtualConfigurado() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ operador_atual_sync_id: string; operador_atual_nome: string; operador_ativo: number }>(
    `SELECT
       c.operador_atual_sync_id,
       c.operador_atual_nome,
       COALESCE(o.ativo, 0) as operador_ativo
     FROM configuracoes c
     LEFT JOIN operadores o ON o.sync_id = c.operador_atual_sync_id
     WHERE c.id = 1;`
  );

  if (!row?.operador_atual_sync_id || !row.operador_atual_nome) {
    throw new Error('Selecione quem está operando este aparelho antes de continuar.');
  }

  if (!row.operador_ativo) {
    throw new Error('O operador atual deste aparelho foi desativado. Escolha outro operador antes de continuar.');
  }

  return {
    syncId: row.operador_atual_sync_id,
    nome: row.operador_atual_nome,
  };
}

async function getPedidoSyncInfo(orderId: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    sync_id: string;
    nome_integrante_snapshot: string;
    patente_integrante_snapshot: string;
    operador_sync_id_snapshot: string;
    nome_operador_snapshot: string;
    device_id_origem: string;
    data_pedido: string;
    hora_pedido: string;
    data_hora_pedido: string;
    status: OrderStatus;
    total: number;
    cancelado: number;
    cancelado_em: string;
    metodo_pagamento: PaymentMethod | '';
    comprovante_nome: string;
    comprovante_mime_type: string;
    comprovante_adicionado_em: string;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM pedidos WHERE id = ?;', [orderId]);

  if (!row?.sync_id) {
    throw new Error('Pedido sem identificador de sincronização.');
  }

  return row;
}

async function getItemSyncInfo(itemId: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ sync_id: string; nome: string; valor: number }>(
    'SELECT sync_id, nome, valor FROM itens_bar WHERE id = ?;',
    [itemId]
  );

  if (!row?.sync_id) {
    throw new Error('Item sem identificador de sincronização.');
  }

  return row;
}

function mapJoinedOrders(rows: OrderJoinRow[]): PedidoDetalhado[] {
  const ordersMap = new Map<number, PedidoDetalhado>();

  rows.forEach((row) => {
    if (!ordersMap.has(row.pedido_id)) {
      ordersMap.set(row.pedido_id, {
        id: row.pedido_id,
        syncId: row.pedido_sync_id,
        integranteId: row.integrante_id,
        nomeIntegranteSnapshot: row.nome_integrante_snapshot,
        patenteIntegranteSnapshot: row.patente_integrante_snapshot,
        operadorSyncIdSnapshot: row.operador_sync_id_snapshot,
        nomeOperadorSnapshot: row.nome_operador_snapshot,
        deviceIdOrigem: row.device_id_origem,
        dataPedido: row.data_pedido,
        horaPedido: row.hora_pedido,
        dataHoraPedido: row.data_hora_pedido,
        status: row.status,
        total: row.total,
        cancelado: Boolean(row.cancelado),
        canceladoEm: row.cancelado_em,
        metodoPagamento: row.metodo_pagamento,
        comprovanteUri: row.comprovante_uri,
        comprovanteNome: row.comprovante_nome,
        comprovanteMimeType: row.comprovante_mime_type,
        comprovanteAdicionadoEm: row.comprovante_adicionado_em,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        itens: [],
      });
    }

    if (row.pedido_item_id && row.item_id && row.nome_item_snapshot && row.valor_unitario_snapshot !== null) {
      const orderItem: PedidoItem = {
        id: row.pedido_item_id,
        syncId: row.pedido_item_sync_id ?? '',
        pedidoId: row.pedido_id,
        itemId: row.item_id,
        nomeItemSnapshot: row.nome_item_snapshot,
        valorUnitarioSnapshot: row.valor_unitario_snapshot,
        quantidade: row.quantidade ?? 0,
        subtotal: row.subtotal ?? 0,
      };

      ordersMap.get(row.pedido_id)?.itens.push(orderItem);
    }
  });

  return Array.from(ordersMap.values());
}

async function listOrdersByWhere(whereClause: string, params: (string | number)[]) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OrderJoinRow>(
    `SELECT
        p.id AS pedido_id,
        p.sync_id AS pedido_sync_id,
        p.integrante_id,
        p.nome_integrante_snapshot,
        p.patente_integrante_snapshot,
        p.operador_sync_id_snapshot,
        p.nome_operador_snapshot,
        p.device_id_origem,
        p.data_pedido,
        p.hora_pedido,
        p.data_hora_pedido,
        p.status,
        p.total,
        p.cancelado,
        p.cancelado_em,
        p.metodo_pagamento,
        p.comprovante_uri,
        p.comprovante_nome,
        p.comprovante_mime_type,
        p.comprovante_adicionado_em,
        p.created_at,
        p.updated_at,
        pi.id AS pedido_item_id,
        pi.sync_id AS pedido_item_sync_id,
        pi.item_id,
        ib.sync_id AS item_sync_id,
        pi.nome_item_snapshot,
        pi.valor_unitario_snapshot,
        pi.quantidade,
        pi.subtotal
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
      LEFT JOIN itens_bar ib ON ib.id = pi.item_id
      ${whereClause}
      ORDER BY p.data_pedido DESC, p.hora_pedido DESC, pi.nome_item_snapshot ASC;`,
    params
  );

  return mapJoinedOrders(rows);
}

export async function createOpenOrder(integrante: Integrante) {
  const db = await getDatabase();
  const operadorAtual = await assertOperadorAtualConfigurado();
  const { date, time, iso } = getNowParts();
  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM pedidos WHERE integrante_id = ? AND data_pedido = ? AND status = 'ABERTO' AND cancelado = 0 LIMIT 1;",
    [integrante.id, date]
  );

  if (existing) {
    return existing.id;
  }

  const metadata = await getNextLocalEventMetadata(db);
  const pedidoSyncId = buildEntitySyncId('pedido', metadata.deviceId, metadata.sequence);
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    const result = await db.runAsync(
      `INSERT INTO pedidos (
        sync_id,
        integrante_id,
        nome_integrante_snapshot,
        patente_integrante_snapshot,
        operador_sync_id_snapshot,
        nome_operador_snapshot,
        device_id_origem,
        data_pedido,
        hora_pedido,
        data_hora_pedido,
        status,
        total,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABERTO', 0, ?, ?);`,
      [
        pedidoSyncId,
        integrante.id,
        integrante.nome,
        integrante.patente,
        operadorAtual.syncId,
        operadorAtual.nome,
        metadata.deviceId,
        date,
        time,
        iso,
        iso,
        iso,
      ]
    );

    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'PEDIDO',
      entitySyncId: pedidoSyncId,
      eventType: 'PEDIDO_CRIADO',
      payload: {
        integranteSyncId: integrante.syncId,
        nomeIntegranteSnapshot: integrante.nome,
        patenteIntegranteSnapshot: integrante.patente,
        operadorSyncIdSnapshot: operadorAtual.syncId,
        nomeOperadorSnapshot: operadorAtual.nome,
        deviceIdOrigem: metadata.deviceId,
        dataPedido: date,
        horaPedido: time,
        dataHoraPedido: iso,
        status: 'ABERTO',
        total: 0,
        cancelado: false,
        canceladoEm: '',
        createdAt: iso,
        updatedAt: iso,
      },
    });
    await db.execAsync('COMMIT;');
    return result.lastInsertRowId;
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function getPedidoById(orderId: number) {
  const orders = await listOrdersByWhere('WHERE p.id = ?', [orderId]);
  return orders[0] ?? null;
}

export async function listPedidosAbertos() {
  return listOrdersByWhere("WHERE p.status = 'ABERTO' AND p.cancelado = 0", []);
}

export async function listPedidosPendentes() {
  return listOrdersByWhere("WHERE p.status = 'FECHADO_AGUARDANDO_PAGAMENTO' AND p.cancelado = 0", []);
}

export async function listPedidosPorData(date: string) {
  return listOrdersByWhere('WHERE p.data_pedido = ?', [date]);
}

export async function listPedidosPorPeriodo(dataInicial: string, dataFinal: string, statuses?: OrderStatus[]) {
  const params: (string | number)[] = [dataInicial, dataFinal];
  let whereClause = 'WHERE p.data_pedido BETWEEN ? AND ?';

  if (statuses && statuses.length > 0) {
    whereClause += ` AND p.status IN (${statuses.map(() => '?').join(', ')})`;
    params.push(...statuses);
  }

  return listOrdersByWhere(whereClause, params);
}

export async function listTodosPedidos() {
  return listOrdersByWhere('WHERE 1 = 1', []);
}

export async function countPedidoItens(orderId: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM pedido_itens WHERE pedido_id = ?;',
    [orderId]
  );
  return row?.total ?? 0;
}

export async function incrementPedidoItem(orderId: number, item: ItemBar) {
  await assertPedidoAberto(orderId);
  await assertOperadorAtualConfigurado();
  const db = await getDatabase();
  const itemAtual = await db.getFirstAsync<{ qtd_estoque: number }>('SELECT qtd_estoque FROM itens_bar WHERE id = ?;', [item.id]);

  if (!itemAtual) {
    throw new Error('Item não encontrado no estoque.');
  }

  if (itemAtual.qtd_estoque <= 0) {
    throw new Error(`Sem estoque disponível para ${item.nome}.`);
  }

  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await db.runAsync('UPDATE itens_bar SET qtd_estoque = qtd_estoque - 1, updated_at = ? WHERE id = ?;', [iso, item.id]);
    const existing = await db.getFirstAsync<{ id: number; sync_id: string; quantidade: number; nome_item_snapshot: string }>(
      'SELECT id, sync_id, quantidade, nome_item_snapshot FROM pedido_itens WHERE pedido_id = ? AND item_id = ?;',
      [orderId, item.id]
    );
    const nomeItemSnapshot = existing?.nome_item_snapshot ?? item.nome;
    const itemSyncInfo = await getItemSyncInfo(item.id);
    let pedidoItemSyncId = existing?.sync_id ?? buildEntitySyncId('pedido_item', metadata.deviceId, metadata.sequence);
    let nextQuantity = 1;
    let nextSubtotal = item.valor;

    if (existing) {
      nextQuantity = existing.quantidade + 1;
      nextSubtotal = nextQuantity * item.valor;
      await db.runAsync(
        'UPDATE pedido_itens SET quantidade = ?, subtotal = ? WHERE id = ?;',
        [nextQuantity, nextSubtotal, existing.id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO pedido_itens (
          sync_id,
          pedido_id,
          item_id,
          numero_item_snapshot,
          nome_item_snapshot,
          valor_unitario_snapshot,
          quantidade,
          subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?);`,
        [pedidoItemSyncId, orderId, item.id, 0, nomeItemSnapshot, item.valor, item.valor]
      );
    }

    await updateOrderTotal(orderId);
    const pedidoSyncInfo = await getPedidoSyncInfo(orderId);
    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'PEDIDO_ITEM',
      entitySyncId: pedidoItemSyncId,
      eventType: 'PEDIDO_ITEM_ADICIONADO',
      payload: {
        pedidoSyncId: pedidoSyncInfo.sync_id,
        itemSyncId: itemSyncInfo.sync_id,
        nomeItemSnapshot,
        valorUnitarioSnapshot: item.valor,
        quantidade: nextQuantity,
        subtotal: nextSubtotal,
        pedidoTotal: pedidoSyncInfo.total,
        updatedAt: pedidoSyncInfo.updated_at,
      },
    });
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function decrementPedidoItem(orderItemId: number) {
  await assertOperadorAtualConfigurado();
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{
    sync_id: string;
    pedido_id: number;
    item_id: number;
    nome_item_snapshot: string;
    quantidade: number;
    valor_unitario_snapshot: number;
  }>(
    'SELECT sync_id, pedido_id, item_id, nome_item_snapshot, quantidade, valor_unitario_snapshot FROM pedido_itens WHERE id = ?;',
    [orderItemId]
  );

  if (!existing) {
    return;
  }

  await assertPedidoAberto(existing.pedido_id);
  const linhasNoPedido = await countPedidoItens(existing.pedido_id);
  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);
  const itemSyncInfo = await getItemSyncInfo(existing.item_id);

  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await db.runAsync('UPDATE itens_bar SET qtd_estoque = qtd_estoque + 1, updated_at = ? WHERE id = ?;', [
      iso,
      existing.item_id,
    ]);

    if (existing.quantidade <= 1 && linhasNoPedido === 1) {
      await db.runAsync(
        `UPDATE pedidos
         SET cancelado = 1,
             cancelado_em = ?,
             total = 0,
             updated_at = ?
         WHERE id = ?;`,
        [iso, iso, existing.pedido_id]
      );
      const pedidoSyncInfo = await getPedidoSyncInfo(existing.pedido_id);
      await recordLocalSyncEvent(db, {
        metadata,
        entityType: 'PEDIDO',
        entitySyncId: pedidoSyncInfo.sync_id,
        eventType: 'PEDIDO_CANCELADO',
        payload: {
          status: pedidoSyncInfo.status,
          cancelado: true,
          canceladoEm: pedidoSyncInfo.cancelado_em,
          total: pedidoSyncInfo.total,
          updatedAt: pedidoSyncInfo.updated_at,
        },
      });
    } else if (existing.quantidade <= 1) {
      await db.runAsync('DELETE FROM pedido_itens WHERE id = ?;', [orderItemId]);
      await updateOrderTotal(existing.pedido_id);
      const pedidoSyncInfo = await getPedidoSyncInfo(existing.pedido_id);
      await recordLocalSyncEvent(db, {
        metadata,
        entityType: 'PEDIDO_ITEM',
        entitySyncId: existing.sync_id,
        eventType: 'PEDIDO_ITEM_REMOVIDO',
        payload: {
          pedidoSyncId: pedidoSyncInfo.sync_id,
          itemSyncId: itemSyncInfo.sync_id,
          nomeItemSnapshot: existing.nome_item_snapshot,
          valorUnitarioSnapshot: existing.valor_unitario_snapshot,
          quantidade: 0,
          subtotal: 0,
          pedidoTotal: pedidoSyncInfo.total,
          updatedAt: pedidoSyncInfo.updated_at,
        },
      });
    } else {
      const nextQuantity = existing.quantidade - 1;
      await db.runAsync('UPDATE pedido_itens SET quantidade = ?, subtotal = ? WHERE id = ?;', [
        nextQuantity,
        nextQuantity * existing.valor_unitario_snapshot,
        orderItemId,
      ]);
      await updateOrderTotal(existing.pedido_id);
      const pedidoSyncInfo = await getPedidoSyncInfo(existing.pedido_id);
      await recordLocalSyncEvent(db, {
        metadata,
        entityType: 'PEDIDO_ITEM',
        entitySyncId: existing.sync_id,
        eventType: 'PEDIDO_ITEM_REMOVIDO',
        payload: {
          pedidoSyncId: pedidoSyncInfo.sync_id,
          itemSyncId: itemSyncInfo.sync_id,
          nomeItemSnapshot: existing.nome_item_snapshot,
          valorUnitarioSnapshot: existing.valor_unitario_snapshot,
          quantidade: nextQuantity,
          subtotal: nextQuantity * existing.valor_unitario_snapshot,
          pedidoTotal: pedidoSyncInfo.total,
          updatedAt: pedidoSyncInfo.updated_at,
        },
      });
    }

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function deletePedidoAberto(orderId: number) {
  await assertOperadorAtualConfigurado();
  const db = await getDatabase();
  const order = await getPedidoById(orderId);
  if (!order || order.status !== 'ABERTO' || order.cancelado) {
    throw new Error('Apenas pedidos abertos podem ser cancelados.');
  }

  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    for (const pedidoItem of order.itens) {
      await db.runAsync('UPDATE itens_bar SET qtd_estoque = qtd_estoque + ?, updated_at = ? WHERE id = ?;', [
        pedidoItem.quantidade,
        iso,
        pedidoItem.itemId,
      ]);
    }

    await db.runAsync(
      `UPDATE pedidos
       SET cancelado = 1,
           cancelado_em = ?,
           total = 0,
           updated_at = ?
       WHERE id = ?;`,
      [iso, iso, orderId]
    );
    const pedidoSyncInfo = await getPedidoSyncInfo(orderId);
    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'PEDIDO',
      entitySyncId: pedidoSyncInfo.sync_id,
      eventType: 'PEDIDO_CANCELADO',
      payload: {
        status: pedidoSyncInfo.status,
        cancelado: true,
        canceladoEm: pedidoSyncInfo.cancelado_em,
        total: pedidoSyncInfo.total,
        updatedAt: pedidoSyncInfo.updated_at,
      },
    });
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function fecharPedido(orderId: number) {
  await assertPedidoAberto(orderId);
  await assertOperadorAtualConfigurado();
  const db = await getDatabase();
  const itemsCount = await countPedidoItens(orderId);
  if (itemsCount === 0) {
    throw new Error('Adicione pelo menos um item antes de fechar o pedido.');
  }

  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await db.runAsync(
      "UPDATE pedidos SET status = 'FECHADO_AGUARDANDO_PAGAMENTO', updated_at = ? WHERE id = ? AND status = 'ABERTO' AND cancelado = 0;",
      [iso, orderId]
    );
    const pedidoSyncInfo = await getPedidoSyncInfo(orderId);
    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'PEDIDO',
      entitySyncId: pedidoSyncInfo.sync_id,
      eventType: 'PEDIDO_FECHADO',
      payload: {
        status: 'FECHADO_AGUARDANDO_PAGAMENTO',
        total: pedidoSyncInfo.total,
        updatedAt: pedidoSyncInfo.updated_at,
      },
    });
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function reabrirPedido(orderId: number) {
  await assertOperadorAtualConfigurado();
  const db = await getDatabase();
  const order = await db.getFirstAsync<{ status: OrderStatus; cancelado: number }>(
    'SELECT status, cancelado FROM pedidos WHERE id = ?;',
    [orderId]
  );

  if (!order) {
    throw new Error('Pedido não encontrado.');
  }

  if (Boolean(order.cancelado)) {
    throw new Error('Pedido cancelado não pode ser reaberto.');
  }

  if (order.status === 'PAGO') {
    throw new Error('Pedido pago não pode ser reaberto.');
  }

  if (order.status === 'ABERTO') {
    return;
  }

  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await db.runAsync(
      "UPDATE pedidos SET status = 'ABERTO', updated_at = ? WHERE id = ? AND status = 'FECHADO_AGUARDANDO_PAGAMENTO' AND cancelado = 0;",
      [iso, orderId]
    );
    const pedidoSyncInfo = await getPedidoSyncInfo(orderId);
    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'PEDIDO',
      entitySyncId: pedidoSyncInfo.sync_id,
      eventType: 'PEDIDO_REABERTO',
      payload: {
        status: 'ABERTO',
        total: pedidoSyncInfo.total,
        updatedAt: pedidoSyncInfo.updated_at,
      },
    });
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function marcarPedidoComoPago(
  orderId: number,
  pagamento: PagamentoPedido
) {
  await assertOperadorAtualConfigurado();
  const db = await getDatabase();
  const order = await db.getFirstAsync<{ status: OrderStatus }>('SELECT status FROM pedidos WHERE id = ?;', [orderId]);
  if (!order) {
    throw new Error('Pedido não encontrado.');
  }
  const canceled = await db.getFirstAsync<{ cancelado: number }>('SELECT cancelado FROM pedidos WHERE id = ?;', [orderId]);
  if (canceled?.cancelado) {
    throw new Error('Pedido cancelado não pode ser marcado como PAGO.');
  }
  if (order.status === 'ABERTO') {
    throw new Error('Feche a conta antes de marcar como PAGO.');
  }

  if (
    pagamento.metodo !== 'DINHEIRO' &&
    (!pagamento.comprovante.uri || !pagamento.comprovante.nome)
  ) {
    throw new Error('É obrigatório anexar o comprovante ao marcar como PAGO.');
  }

  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);
  const comprovanteUri = pagamento.metodo !== 'DINHEIRO' ? pagamento.comprovante.uri : '';
  const comprovanteNome = pagamento.metodo !== 'DINHEIRO' ? pagamento.comprovante.nome : '';
  const comprovanteMimeType = pagamento.metodo !== 'DINHEIRO' ? pagamento.comprovante.mimeType : '';
  const comprovanteAdicionadoEm = pagamento.metodo !== 'DINHEIRO' ? iso : '';
  const comprovanteBase64 =
    pagamento.metodo !== 'DINHEIRO' ? await readFileAsBase64(pagamento.comprovante.uri) : '';
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    const blob =
      pagamento.metodo !== 'DINHEIRO'
        ? await ensureBlobForAttachmentOnDatabase(db, {
            nome: comprovanteNome,
            mimeType: comprovanteMimeType,
            localUri: comprovanteUri,
            base64: comprovanteBase64,
          })
        : null;

    await db.runAsync(
      `UPDATE pedidos
       SET status = 'PAGO',
           metodo_pagamento = ?,
           comprovante_uri = ?,
           comprovante_nome = ?,
           comprovante_mime_type = ?,
           comprovante_adicionado_em = ?,
           updated_at = ?
       WHERE id = ?;`,
      [pagamento.metodo, comprovanteUri, comprovanteNome, comprovanteMimeType, comprovanteAdicionadoEm, iso, orderId]
    );
    const pedidoSyncInfo = await getPedidoSyncInfo(orderId);
    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'PEDIDO',
      entitySyncId: pedidoSyncInfo.sync_id,
      eventType: 'PEDIDO_PAGO',
      payload: {
        metodoPagamento: pagamento.metodo,
        comprovanteNome,
        comprovanteMimeType,
        comprovanteAdicionadoEm,
        blobId: blob?.blobId ?? '',
        blobHash: blob?.hash ?? '',
        updatedAt: pedidoSyncInfo.updated_at,
      },
    });
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function substituirComprovantePedido(
  orderId: number,
  comprovante: ComprovanteAnexo
) {
  await assertOperadorAtualConfigurado();
  const db = await getDatabase();
  const order = await db.getFirstAsync<{ status: OrderStatus; cancelado: number; metodo_pagamento: PaymentMethod | '' }>(
    'SELECT status, cancelado, metodo_pagamento FROM pedidos WHERE id = ?;',
    [orderId]
  );

  if (!order) {
    throw new Error('Pedido não encontrado.');
  }

  if (Boolean(order.cancelado)) {
    throw new Error('Pedido cancelado não permite troca de comprovante.');
  }

  if (order.status !== 'PAGO') {
    throw new Error('O comprovante só pode ser trocado depois que o pedido estiver pago.');
  }

  if (order.metodo_pagamento === 'DINHEIRO' || !order.metodo_pagamento) {
    throw new Error('Somente pagamentos com comprovante permitem troca de anexo.');
  }

  if (!comprovante.uri || !comprovante.nome) {
    throw new Error('Selecione um novo comprovante válido.');
  }

  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);
  const comprovanteBase64 = await readFileAsBase64(comprovante.uri);
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    const blob = await ensureBlobForAttachmentOnDatabase(db, {
      nome: comprovante.nome,
      mimeType: comprovante.mimeType,
      localUri: comprovante.uri,
      base64: comprovanteBase64,
    });

    await db.runAsync(
      `UPDATE pedidos
       SET comprovante_uri = ?,
           comprovante_nome = ?,
           comprovante_mime_type = ?,
           comprovante_adicionado_em = ?,
           updated_at = ?
       WHERE id = ?;`,
      [comprovante.uri, comprovante.nome, comprovante.mimeType, iso, iso, orderId]
    );
    const pedidoSyncInfo = await getPedidoSyncInfo(orderId);
    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'PEDIDO',
      entitySyncId: pedidoSyncInfo.sync_id,
      eventType: 'COMPROVANTE_ANEXADO',
      payload: {
        comprovanteNome: comprovante.nome,
        comprovanteMimeType: comprovante.mimeType,
        comprovanteAdicionadoEm: iso,
        blobId: blob.blobId,
        blobHash: blob.hash,
        updatedAt: pedidoSyncInfo.updated_at,
      },
    });
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}
