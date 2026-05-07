const BAR13_CENTRAL_CONFIG = {
  timezone: 'America/Fortaleza',
  expectedToken: 'TROCAR_ESTE_TOKEN',
  sheets: {
    devices: 'devices',
    operators: 'operadores',
    orders: 'pedidos_fato',
    orderItems: 'pedido_itens_fato',
    auditEvents: 'auditoria_eventos',
    log: 'importacoes_log',
  },
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Bar13 Central')
    .addItem('Preparar planilha', 'configurarCentralBar13')
    .addToUi();
}

function doGet() {
  return jsonOutput_({
    ok: true,
    status: 'ready',
  });
}

function doPost(e) {
  const executedAt = formatDateTime_(new Date());

  try {
    const body = parseRequestBody_(e);

    if (body.centralToken !== BAR13_CENTRAL_CONFIG.expectedToken) {
      throw new Error('Token da central inválido.');
    }

    const payload = body.payload;
    validatePayload_(payload);

    configurarCentralBar13();

    const ordersUpserted = upsertRows_(
      ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.orders, getOrdersHeaders_()),
      'pedido_sync_id',
      payload.orders.map((row) => ({
        pedido_sync_id: row.pedidoSyncId,
        bar_nome: payload.bar.nome,
        bar_slug: payload.bar.slug,
        device_id_origem: row.deviceIdOrigem,
        operador_responsavel_sync_id: row.operadorResponsavelSyncId,
        operador_responsavel_nome: row.operadorResponsavelNome,
        integrante_id: row.integranteId,
        integrante: row.integrante,
        patente: row.patente,
        data_pedido: row.dataPedido,
        hora_pedido: row.horaPedido,
        data_hora_pedido: row.dataHoraPedido,
        status: row.status,
        cancelado: row.cancelado ? 'SIM' : 'NAO',
        cancelado_em: row.canceladoEm,
        metodo_pagamento: row.metodoPagamento,
        comprovante_nome: row.comprovanteNome,
        total: row.total,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
        batch_id: payload.batchId,
        exported_at: payload.exportedAt,
      }))
    );

    const orderItemsUpserted = upsertRows_(
      ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.orderItems, getOrderItemsHeaders_()),
      'pedido_item_sync_id',
      payload.orderItems.map((row) => ({
        pedido_item_sync_id: row.pedidoItemSyncId,
        pedido_sync_id: row.pedidoSyncId,
        item_id: row.itemId,
        item_nome: row.itemNome,
        quantidade: row.quantidade,
        valor_unitario: row.valorUnitario,
        subtotal: row.subtotal,
        batch_id: payload.batchId,
        exported_at: payload.exportedAt,
      }))
    );

    const auditEventsUpserted = upsertRows_(
      ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.auditEvents, getAuditHeaders_()),
      'event_id',
      payload.auditEvents.map((row) => ({
        event_id: row.eventId,
        device_id: row.deviceId,
        device_name: row.deviceName,
        entity_type: row.entityType,
        entity_sync_id: row.entitySyncId,
        event_type: row.eventType,
        actor_operator_sync_id: row.actorOperatorSyncId,
        actor_operator_name: row.actorOperatorName,
        created_at: row.createdAt,
        batch_id: payload.batchId,
      }))
    );

    const operatorsUpserted = upsertRows_(
      ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.operators, getOperatorsHeaders_()),
      'operador_sync_id',
      payload.operators.map((row) => ({
        operador_sync_id: row.syncId,
        nome: row.nome,
        ativo: row.ativo ? 'SIM' : 'NAO',
        created_at: row.createdAt,
        updated_at: row.updatedAt,
        batch_id: payload.batchId,
      }))
    );

    const devicesUpserted = upsertRows_(
      ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.devices, getDevicesHeaders_()),
      'device_id',
      payload.devices.map((row) => ({
        device_id: row.deviceId,
        nome_aparelho: row.nomeAparelho,
        first_seen_at: row.firstSeenAt,
        last_seen_at: row.lastSeenAt,
        last_exported_at: row.lastExportedAt,
        last_imported_at: row.lastImportedAt,
        batch_id: payload.batchId,
      }))
    );

    appendLog_({
      executedAt,
      status: 'OK',
      batchId: payload.batchId,
      deviceId: payload.sourceDevice.deviceId,
      detail: `Pedidos ${ordersUpserted}, itens ${orderItemsUpserted}, auditoria ${auditEventsUpserted}.`,
    });

    return jsonOutput_({
      ok: true,
      batchId: payload.batchId,
      ordersUpserted,
      orderItemsUpserted,
      auditEventsUpserted,
      operatorsUpserted,
      devicesUpserted,
      message: 'Central atualizada com sucesso.',
    });
  } catch (error) {
    appendLog_({
      executedAt,
      status: 'ERRO',
      batchId: '',
      deviceId: '',
      detail: error instanceof Error ? error.message : 'Falha ao processar envio do Bar13.',
    });

    return jsonOutput_({
      ok: false,
      message: error instanceof Error ? error.message : 'Falha ao processar envio do Bar13.',
    });
  }
}

function configurarCentralBar13() {
  ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.devices, getDevicesHeaders_());
  ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.operators, getOperatorsHeaders_());
  ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.orders, getOrdersHeaders_());
  ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.orderItems, getOrderItemsHeaders_());
  ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.auditEvents, getAuditHeaders_());
  ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.log, ['executado_em', 'status', 'batch_id', 'device_id', 'detalhe']);
}

function validatePayload_(payload) {
  if (!payload || payload.schemaVersion !== 1) {
    throw new Error('Payload da central inválido.');
  }

  if (!payload.batchId || !payload.exportedAt) {
    throw new Error('Payload sem identificação de lote.');
  }

  if (!payload.sourceDevice || !payload.sourceDevice.deviceId) {
    throw new Error('Payload sem aparelho de origem.');
  }

  ['devices', 'operators', 'orders', 'orderItems', 'auditEvents'].forEach((field) => {
    if (!Array.isArray(payload[field])) {
      throw new Error(`Campo obrigatório ausente no payload: ${field}.`);
    }
  });
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Requisição sem corpo JSON.');
  }

  return JSON.parse(e.postData.contents);
}

function ensureSheet_(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  ensureHeaderRow_(sheet, headers);
  return sheet;
}

function ensureHeaderRow_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsUpdate = headers.some((header, index) => currentHeaders[index] !== header);

  if (needsUpdate) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function buildRowIndexByKey_(sheet, keyColumnName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyIndex = headers.indexOf(keyColumnName);
  const index = new Map();

  if (keyIndex < 0 || sheet.getLastRow() <= 1) {
    return index;
  }

  const values = sheet.getRange(2, keyIndex + 1, sheet.getLastRow() - 1, 1).getValues();
  values.forEach((row, offset) => {
    const key = String(row[0] || '').trim();
    if (key) {
      index.set(key, offset + 2);
    }
  });

  return index;
}

function upsertRows_(sheet, keyColumnName, rows) {
  if (!rows.length) {
    return 0;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowIndexByKey = buildRowIndexByKey_(sheet, keyColumnName);
  let touched = 0;

  rows.forEach((row) => {
    const key = String(row[keyColumnName] || '').trim();
    if (!key) {
      throw new Error(`Linha sem chave obrigatória: ${keyColumnName}.`);
    }

    const values = headers.map((header) => row[header] ?? '');
    const existingRowNumber = rowIndexByKey.get(key);

    if (existingRowNumber) {
      sheet.getRange(existingRowNumber, 1, 1, values.length).setValues([values]);
    } else {
      sheet.appendRow(values);
      rowIndexByKey.set(key, sheet.getLastRow());
    }

    touched += 1;
  });

  return touched;
}

function appendLog_(entry) {
  const sheet = ensureSheet_(BAR13_CENTRAL_CONFIG.sheets.log, ['executado_em', 'status', 'batch_id', 'device_id', 'detalhe']);
  sheet.appendRow([entry.executedAt, entry.status, entry.batchId, entry.deviceId, entry.detail]);
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, BAR13_CENTRAL_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function getDevicesHeaders_() {
  return ['device_id', 'nome_aparelho', 'first_seen_at', 'last_seen_at', 'last_exported_at', 'last_imported_at', 'batch_id'];
}

function getOperatorsHeaders_() {
  return ['operador_sync_id', 'nome', 'ativo', 'created_at', 'updated_at', 'batch_id'];
}

function getOrdersHeaders_() {
  return [
    'pedido_sync_id',
    'bar_nome',
    'bar_slug',
    'device_id_origem',
    'operador_responsavel_sync_id',
    'operador_responsavel_nome',
    'integrante_id',
    'integrante',
    'patente',
    'data_pedido',
    'hora_pedido',
    'data_hora_pedido',
    'status',
    'cancelado',
    'cancelado_em',
    'metodo_pagamento',
    'comprovante_nome',
    'total',
    'created_at',
    'updated_at',
    'batch_id',
    'exported_at',
  ];
}

function getOrderItemsHeaders_() {
  return ['pedido_item_sync_id', 'pedido_sync_id', 'item_id', 'item_nome', 'quantidade', 'valor_unitario', 'subtotal', 'batch_id', 'exported_at'];
}

function getAuditHeaders_() {
  return [
    'event_id',
    'device_id',
    'device_name',
    'entity_type',
    'entity_sync_id',
    'event_type',
    'actor_operator_sync_id',
    'actor_operator_name',
    'created_at',
    'batch_id',
  ];
}
