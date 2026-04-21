import { getDatabase } from '../database/connection';
import { Integrante, ItemBar, OrderStatus, PedidoDetalhado, PedidoItem } from '../types/domain';
import { getNowParts } from '../utils/date';

type OrderJoinRow = {
  pedido_id: number;
  integrante_id: number;
  nome_integrante_snapshot: string;
  patente_integrante_snapshot: string;
  data_pedido: string;
  hora_pedido: string;
  data_hora_pedido: string;
  status: OrderStatus;
  total: number;
  cancelado: number;
  cancelado_em: string;
  comprovante_uri: string;
  comprovante_nome: string;
  comprovante_mime_type: string;
  comprovante_adicionado_em: string;
  created_at: string;
  updated_at: string;
  pedido_item_id: number | null;
  item_id: number | null;
  numero_item_snapshot: number | null;
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

function mapJoinedOrders(rows: OrderJoinRow[]): PedidoDetalhado[] {
  const ordersMap = new Map<number, PedidoDetalhado>();

  rows.forEach((row) => {
    if (!ordersMap.has(row.pedido_id)) {
      ordersMap.set(row.pedido_id, {
        id: row.pedido_id,
        integranteId: row.integrante_id,
        nomeIntegranteSnapshot: row.nome_integrante_snapshot,
        patenteIntegranteSnapshot: row.patente_integrante_snapshot,
        dataPedido: row.data_pedido,
        horaPedido: row.hora_pedido,
        dataHoraPedido: row.data_hora_pedido,
        status: row.status,
        total: row.total,
        cancelado: Boolean(row.cancelado),
        canceladoEm: row.cancelado_em,
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
        pedidoId: row.pedido_id,
        itemId: row.item_id,
        numeroItemSnapshot: row.numero_item_snapshot ?? 0,
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
        p.integrante_id,
        p.nome_integrante_snapshot,
        p.patente_integrante_snapshot,
        p.data_pedido,
        p.hora_pedido,
        p.data_hora_pedido,
        p.status,
        p.total,
        p.cancelado,
        p.cancelado_em,
        p.comprovante_uri,
        p.comprovante_nome,
        p.comprovante_mime_type,
        p.comprovante_adicionado_em,
        p.created_at,
        p.updated_at,
        pi.id AS pedido_item_id,
        pi.item_id,
        pi.numero_item_snapshot,
        pi.nome_item_snapshot,
        pi.valor_unitario_snapshot,
        pi.quantidade,
        pi.subtotal
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
      ${whereClause}
      ORDER BY p.data_pedido DESC, p.hora_pedido DESC, pi.numero_item_snapshot ASC;`,
    params
  );

  return mapJoinedOrders(rows);
}

export async function createOpenOrder(integrante: Integrante) {
  const db = await getDatabase();
  const { date, time, iso } = getNowParts();
  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM pedidos WHERE integrante_id = ? AND data_pedido = ? AND status = 'ABERTO' AND cancelado = 0 LIMIT 1;",
    [integrante.id, date]
  );

  if (existing) {
    return existing.id;
  }

  const result = await db.runAsync(
    `INSERT INTO pedidos (
      integrante_id,
      nome_integrante_snapshot,
      patente_integrante_snapshot,
      data_pedido,
      hora_pedido,
      data_hora_pedido,
      status,
      total,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'ABERTO', 0, ?, ?);`,
    [integrante.id, integrante.nome, integrante.patente, date, time, iso, iso, iso]
  );

  return result.lastInsertRowId;
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
  const db = await getDatabase();
  const itemAtual = await db.getFirstAsync<{ qtd_estoque: number }>('SELECT qtd_estoque FROM itens_bar WHERE id = ?;', [item.id]);

  if (!itemAtual) {
    throw new Error('Item não encontrado no estoque.');
  }

  if (itemAtual.qtd_estoque <= 0) {
    throw new Error(`Sem estoque disponível para ${item.nome}.`);
  }

  const { iso } = getNowParts();
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await db.runAsync('UPDATE itens_bar SET qtd_estoque = qtd_estoque - 1, updated_at = ? WHERE id = ?;', [iso, item.id]);
  const existing = await db.getFirstAsync<{ id: number; quantidade: number }>(
    'SELECT id, quantidade FROM pedido_itens WHERE pedido_id = ? AND item_id = ?;',
    [orderId, item.id]
  );

    if (existing) {
      const nextQuantity = existing.quantidade + 1;
      await db.runAsync(
        'UPDATE pedido_itens SET quantidade = ?, subtotal = ? WHERE id = ?;',
        [nextQuantity, nextQuantity * item.valor, existing.id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO pedido_itens (
          pedido_id,
          item_id,
          numero_item_snapshot,
          nome_item_snapshot,
          valor_unitario_snapshot,
          quantidade,
          subtotal
        ) VALUES (?, ?, ?, ?, ?, 1, ?);`,
        [orderId, item.id, item.numeroItem, item.nome, item.valor, item.valor]
      );
    }

    await updateOrderTotal(orderId);
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function decrementPedidoItem(orderItemId: number) {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ pedido_id: number; quantidade: number; valor_unitario_snapshot: number }>(
    'SELECT pedido_id, quantidade, valor_unitario_snapshot FROM pedido_itens WHERE id = ?;',
    [orderItemId]
  );

  if (!existing) {
    return;
  }

  await assertPedidoAberto(existing.pedido_id);
  const item = await db.getFirstAsync<{ id: number }>('SELECT id FROM pedido_itens WHERE id = ?;', [orderItemId]);
  const linhasNoPedido = await countPedidoItens(existing.pedido_id);
  const { iso } = getNowParts();

  await db.execAsync('BEGIN TRANSACTION;');

  try {
    if (!item) {
      throw new Error('Item do pedido não encontrado.');
    }

    await db.runAsync('UPDATE itens_bar SET qtd_estoque = qtd_estoque + 1, updated_at = ? WHERE id = ?;', [
      iso,
      item.id,
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
    } else if (existing.quantidade <= 1) {
      await db.runAsync('DELETE FROM pedido_itens WHERE id = ?;', [orderItemId]);
      await updateOrderTotal(existing.pedido_id);
    } else {
      const nextQuantity = existing.quantidade - 1;
      await db.runAsync('UPDATE pedido_itens SET quantidade = ?, subtotal = ? WHERE id = ?;', [
        nextQuantity,
        nextQuantity * existing.valor_unitario_snapshot,
        orderItemId,
      ]);
      await updateOrderTotal(existing.pedido_id);
    }

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function deletePedidoAberto(orderId: number) {
  const db = await getDatabase();
  const order = await getPedidoById(orderId);
  if (!order || order.status !== 'ABERTO' || order.cancelado) {
    throw new Error('Apenas pedidos abertos podem ser cancelados.');
  }

  const { iso } = getNowParts();
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
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function fecharPedido(orderId: number) {
  await assertPedidoAberto(orderId);
  const db = await getDatabase();
  const itemsCount = await countPedidoItens(orderId);
  if (itemsCount === 0) {
    throw new Error('Adicione pelo menos um item antes de fechar o pedido.');
  }

  const { iso } = getNowParts();
  await db.runAsync(
    "UPDATE pedidos SET status = 'FECHADO_AGUARDANDO_PAGAMENTO', updated_at = ? WHERE id = ? AND status = 'ABERTO' AND cancelado = 0;",
    [iso, orderId]
  );
}

export async function marcarPedidoComoPago(
  orderId: number,
  comprovante: { uri: string; nome: string; mimeType: string }
) {
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

  if (!comprovante.uri || !comprovante.nome) {
    throw new Error('É obrigatório anexar o comprovante ao marcar como PAGO.');
  }

  const { iso } = getNowParts();
  await db.runAsync(
    `UPDATE pedidos
     SET status = 'PAGO',
         comprovante_uri = ?,
         comprovante_nome = ?,
         comprovante_mime_type = ?,
         comprovante_adicionado_em = ?,
         updated_at = ?
     WHERE id = ?;`,
    [comprovante.uri, comprovante.nome, comprovante.mimeType, iso, iso, orderId]
  );
}
