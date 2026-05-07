const BAR13_DASH_CONFIG = {
  timezone: 'America/Fortaleza',
  sheets: {
    config: 'config',
    baseOrders: 'dash_base_pedidos',
    baseItems: 'dash_base_itens',
    baseAudit: 'dash_base_auditoria',
    alerts: 'dash_alertas',
    operationDashboard: 'dashboard_operacao',
    managementDashboard: 'dashboard_gerencial',
  },
  fallbackRawSheets: {
    devices: 'devices',
    operators: 'operadores',
    orders: 'pedidos_fato',
    orderItems: 'pedido_itens_fato',
    auditEvents: 'auditoria_eventos',
    log: 'importacoes_log',
  },
  visual: {
    dark: '#111827',
    darker: '#0B0F19',
    card: '#1F2937',
    card2: '#374151',
    gold: '#F59E0B',
    goldLight: '#FBBF24',
    text: '#F9FAFB',
    muted: '#D1D5DB',
    danger: '#B91C1C',
    success: '#047857',
    warning: '#B45309',
    border: '#4B5563',
  },
};

function configurarEstruturaDashboardBar13() {
  if (typeof configurarCentralBar13 === 'function') {
    configurarCentralBar13();
  }

  criarAbaConfigBar13_();
  criarDashBasePedidosBar13_();
  criarDashBaseItensBar13_();
  criarDashBaseAuditoriaBar13_();
  criarDashAlertasBar13_();
  criarDashboardOperacaoBar13_();
  criarDashboardGerencialBar13_();
  aplicarPadraoVisualBar13_();

  SpreadsheetApp.flush();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Estrutura de dashboards criada/atualizada com sucesso.',
    'Bar13 Central',
    5
  );
}

function atualizarAlertasBar13() {
  criarDashAlertasBar13_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Alertas operacionais atualizados com sucesso.',
    'Bar13 Central',
    5
  );
}

function criarAbaConfigBar13_() {
  var sheetName = BAR13_DASH_CONFIG.sheets.config;
  var existing = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var saved = {
    dataInicial: existing ? existing.getRange('B4').getValue() : '',
    dataFinal: existing ? existing.getRange('B5').getValue() : '',
    operador: existing ? existing.getRange('B6').getValue() : '',
    aparelho: existing ? existing.getRange('B7').getValue() : '',
    metodoPagamento: existing ? existing.getRange('B8').getValue() : '',
    limiteHoras: existing ? existing.getRange('B10').getValue() : '',
  };

  var sheet = bar13DashResetSheet_(sheetName);
  var rawOrders = bar13DashRawSheetName_('orders');
  var rawOperators = bar13DashRawSheetName_('operators');
  var rawDevices = bar13DashRawSheetName_('devices');

  sheet.setHiddenGridlines(true);
  sheet.setColumnWidths(1, 1, 210);
  sheet.setColumnWidths(2, 1, 220);
  sheet.setColumnWidths(3, 1, 420);
  sheet.setColumnWidths(6, 3, 220);

  sheet.getRange('A1:C1')
    .merge()
    .setValue('BAR13 CENTRAL - CONFIGURAÇÕES DO DASHBOARD')
    .setFontWeight('bold')
    .setFontSize(14)
    .setFontColor(BAR13_DASH_CONFIG.visual.goldLight)
    .setBackground(BAR13_DASH_CONFIG.visual.darker)
    .setHorizontalAlignment('center');

  sheet.getRange('A3:C3')
    .setValues([['Parâmetro', 'Valor', 'Observação']]);
  bar13DashFormatHeader_(sheet, 3, 1, 3);

  sheet.getRange('A4:C10').setValues([
    ['Data inicial', '', 'Filtro usado nos dashboards. Pode ser alterado manualmente.'],
    ['Data final', '', 'Filtro usado nos dashboards. Pode ser alterado manualmente.'],
    ['Operador', saved.operador || 'Todos', 'Use Todos para considerar todos os operadores.'],
    ['Aparelho', saved.aparelho || 'Todos', 'Use Todos para considerar todos os aparelhos.'],
    ['Método de pagamento', saved.metodoPagamento || 'Todos', 'Use Todos para considerar todos os métodos.'],
    ['Atualizado em', '', 'Data/hora da última atualização visual.'],
    ['Limite alerta sincronização horas', saved.limiteHoras || 6, 'Aparelho acima desse limite sem envio gera alerta.'],
  ]);

  if (saved.dataInicial) {
    sheet.getRange('B4').setValue(saved.dataInicial);
  } else {
    sheet.getRange('B4').setFormula("=IFERROR(MIN(ARRAYFORMULA(DATEVALUE(FILTER('" + rawOrders + "'!J2:J,'" + rawOrders + "'!J2:J<>\"\")))),TODAY())");
  }

  if (saved.dataFinal) {
    sheet.getRange('B5').setValue(saved.dataFinal);
  } else {
    sheet.getRange('B5').setFormula("=IFERROR(MAX(ARRAYFORMULA(DATEVALUE(FILTER('" + rawOrders + "'!J2:J,'" + rawOrders + "'!J2:J<>\"\")))),TODAY())");
  }

  sheet.getRange('B9').setFormula('=NOW()');
  sheet.getRange('B4:B5').setNumberFormat('dd/mm/yyyy');
  sheet.getRange('B9').setNumberFormat('dd/mm/yyyy hh:mm:ss');

  sheet.getRange('F3:H3').setValues([['Operadores', 'Aparelhos', 'Métodos pagamento']]);
  bar13DashFormatHeader_(sheet, 3, 6, 3);

  sheet.getRange('F4').setValue('Todos');
  sheet.getRange('F5').setFormula("=IFERROR(SORT(UNIQUE(FILTER('" + rawOperators + "'!B2:B,'" + rawOperators + "'!B2:B<>\"\"))),\"\")");

  sheet.getRange('G4').setValue('Todos');
  sheet.getRange('G5').setFormula("=IFERROR(SORT(UNIQUE(FILTER('" + rawDevices + "'!A2:A,'" + rawDevices + "'!A2:A<>\"\"))),\"\")");

  sheet.getRange('H4').setValue('Todos');
  sheet.getRange('H5').setFormula("=IFERROR(SORT(UNIQUE(FILTER('" + rawOrders + "'!P2:P,'" + rawOrders + "'!P2:P<>\"\"))),\"\")");

  bar13DashApplyValidationFromRange_(sheet, 'B6', sheet.getRange('F4:F500'));
  bar13DashApplyValidationFromRange_(sheet, 'B7', sheet.getRange('G4:G500'));
  bar13DashApplyValidationFromRange_(sheet, 'B8', sheet.getRange('H4:H500'));

  sheet.getRange('A4:A10').setFontWeight('bold');
  sheet.getRange('A4:C10').setBorder(true, true, true, true, true, true, BAR13_DASH_CONFIG.visual.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.hideColumns(6, 3);
  sheet.setFrozenRows(3);
}

function criarDashBasePedidosBar13_() {
  var raw = bar13DashRawSheetName_('orders');
  var sheet = bar13DashResetSheet_(BAR13_DASH_CONFIG.sheets.baseOrders);

  var headers = [
    'pedido_sync_id',
    'data_pedido',
    'hora_pedido',
    'data_hora_pedido',
    'mes',
    'dia',
    'faixa_horario',
    'operador',
    'aparelho',
    'metodo_pagamento',
    'status',
    'cancelado',
    'total',
    'pedido_valido',
    'pedido_pago',
    'pedido_pendente',
    'pedido_cancelado',
    'exported_at',
    'bar_nome',
    'integrante',
  ];

  bar13DashSetHeaders_(sheet, headers);

  sheet.getRange('A2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!A2:A))");
  sheet.getRange('B2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",IFERROR(DATEVALUE('" + raw + "'!J2:J),'" + raw + "'!J2:J)))");
  sheet.getRange('C2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",IFERROR(TIMEVALUE('" + raw + "'!K2:K),'" + raw + "'!K2:K)))");
  sheet.getRange('D2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",IFERROR(DATEVALUE(LEFT('" + raw + "'!L2:L,10))+TIMEVALUE(MID('" + raw + "'!L2:L,12,8)),'" + raw + "'!L2:L)))");
  sheet.getRange('E2').setFormula('=ARRAYFORMULA(IF(A2:A="","",TEXT(B2:B,"yyyy-mm")))');
  sheet.getRange('F2').setFormula('=ARRAYFORMULA(IF(A2:A="","",TEXT(B2:B,"dd/mm/yyyy")))');
  sheet.getRange('G2').setFormula('=ARRAYFORMULA(IF(A2:A="","",IFERROR(IF(HOUR(C2:C)<6,"Madrugada",IF(HOUR(C2:C)<12,"Manhã",IF(HOUR(C2:C)<18,"Tarde","Noite"))),"Não informado")))');
  sheet.getRange('H2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!F2:F))");
  sheet.getRange('I2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!D2:D))");
  sheet.getRange('J2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!P2:P))");
  sheet.getRange('K2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!M2:M))");
  sheet.getRange('L2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!N2:N))");
  sheet.getRange('M2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",IFERROR(VALUE('" + raw + "'!R2:R),0)))");
  sheet.getRange('N2').setFormula('=ARRAYFORMULA(IF(A2:A="","",L2:L<>"SIM"))');
  sheet.getRange('O2').setFormula('=ARRAYFORMULA(IF(A2:A="","",((K2:K="PAGO")*(L2:L<>"SIM"))=1))');
  sheet.getRange('P2').setFormula('=ARRAYFORMULA(IF(A2:A="","",((REGEXMATCH(UPPER(K2:K),"AGUARDANDO|PENDENTE"))*(L2:L<>"SIM"))=1))');
  sheet.getRange('Q2').setFormula('=ARRAYFORMULA(IF(A2:A="","",L2:L="SIM"))');
  sheet.getRange('R2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",IFERROR(DATEVALUE(LEFT('" + raw + "'!V2:V,10))+TIMEVALUE(MID('" + raw + "'!V2:V,12,8)),'" + raw + "'!V2:V)))");
  sheet.getRange('S2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!B2:B))");
  sheet.getRange('T2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!H2:H))");

  sheet.getRange('B:B').setNumberFormat('dd/mm/yyyy');
  sheet.getRange('C:C').setNumberFormat('hh:mm:ss');
  sheet.getRange('D:D').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  sheet.getRange('M:M').setNumberFormat('R$ #,##0.00');
  sheet.getRange('R:R').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function criarDashBaseItensBar13_() {
  var rawItems = bar13DashRawSheetName_('orderItems');
  var rawOrders = bar13DashRawSheetName_('orders');
  var sheet = bar13DashResetSheet_(BAR13_DASH_CONFIG.sheets.baseItems);

  var headers = [
    'pedido_item_sync_id',
    'pedido_sync_id',
    'item_id',
    'item_nome',
    'quantidade',
    'valor_unitario',
    'subtotal',
    'data_pedido',
    'operador',
    'aparelho',
    'metodo_pagamento',
    'status_pedido',
    'cancelado',
    'item_valido',
    'exported_at',
  ];

  bar13DashSetHeaders_(sheet, headers);

  sheet.getRange('A2').setFormula("=ARRAYFORMULA(IF('" + rawItems + "'!A2:A=\"\",\"\",'" + rawItems + "'!A2:A))");
  sheet.getRange('B2').setFormula("=ARRAYFORMULA(IF('" + rawItems + "'!A2:A=\"\",\"\",'" + rawItems + "'!B2:B))");
  sheet.getRange('C2').setFormula("=ARRAYFORMULA(IF('" + rawItems + "'!A2:A=\"\",\"\",'" + rawItems + "'!C2:C))");
  sheet.getRange('D2').setFormula("=ARRAYFORMULA(IF('" + rawItems + "'!A2:A=\"\",\"\",'" + rawItems + "'!D2:D))");
  sheet.getRange('E2').setFormula("=ARRAYFORMULA(IF('" + rawItems + "'!A2:A=\"\",\"\",IFERROR(VALUE('" + rawItems + "'!E2:E),0)))");
  sheet.getRange('F2').setFormula("=ARRAYFORMULA(IF('" + rawItems + "'!A2:A=\"\",\"\",IFERROR(VALUE('" + rawItems + "'!F2:F),0)))");
  sheet.getRange('G2').setFormula("=ARRAYFORMULA(IF('" + rawItems + "'!A2:A=\"\",\"\",IFERROR(VALUE('" + rawItems + "'!G2:G),0)))");
  sheet.getRange('H2').setFormula("=ARRAYFORMULA(IF(A2:A=\"\",\"\",IFERROR(DATEVALUE(VLOOKUP(B2:B,'" + rawOrders + "'!A:V,10,FALSE)),VLOOKUP(B2:B,'" + rawOrders + "'!A:V,10,FALSE))))");
  sheet.getRange('I2').setFormula("=ARRAYFORMULA(IF(A2:A=\"\",\"\",IFERROR(VLOOKUP(B2:B,'" + rawOrders + "'!A:V,6,FALSE),\"\")))");
  sheet.getRange('J2').setFormula("=ARRAYFORMULA(IF(A2:A=\"\",\"\",IFERROR(VLOOKUP(B2:B,'" + rawOrders + "'!A:V,4,FALSE),\"\")))");
  sheet.getRange('K2').setFormula("=ARRAYFORMULA(IF(A2:A=\"\",\"\",IFERROR(VLOOKUP(B2:B,'" + rawOrders + "'!A:V,16,FALSE),\"\")))");
  sheet.getRange('L2').setFormula("=ARRAYFORMULA(IF(A2:A=\"\",\"\",IFERROR(VLOOKUP(B2:B,'" + rawOrders + "'!A:V,13,FALSE),\"\")))");
  sheet.getRange('M2').setFormula("=ARRAYFORMULA(IF(A2:A=\"\",\"\",IFERROR(VLOOKUP(B2:B,'" + rawOrders + "'!A:V,14,FALSE),\"\")))");
  sheet.getRange('N2').setFormula('=ARRAYFORMULA(IF(A2:A="","",M2:M<>"SIM"))');
  sheet.getRange('O2').setFormula("=ARRAYFORMULA(IF('" + rawItems + "'!A2:A=\"\",\"\",IFERROR(DATEVALUE(LEFT('" + rawItems + "'!I2:I,10))+TIMEVALUE(MID('" + rawItems + "'!I2:I,12,8)),'" + rawItems + "'!I2:I)))");

  sheet.getRange('E:E').setNumberFormat('#,##0.00');
  sheet.getRange('F:G').setNumberFormat('R$ #,##0.00');
  sheet.getRange('H:H').setNumberFormat('dd/mm/yyyy');
  sheet.getRange('O:O').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function criarDashBaseAuditoriaBar13_() {
  var raw = bar13DashRawSheetName_('auditEvents');
  var sheet = bar13DashResetSheet_(BAR13_DASH_CONFIG.sheets.baseAudit);

  var headers = [
    'event_id',
    'device_id',
    'device_name',
    'entity_type',
    'entity_sync_id',
    'event_type',
    'grupo_evento',
    'actor_operator_name',
    'created_at',
    'batch_id',
  ];

  bar13DashSetHeaders_(sheet, headers);

  sheet.getRange('A2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!A2:A))");
  sheet.getRange('B2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!B2:B))");
  sheet.getRange('C2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!C2:C))");
  sheet.getRange('D2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!D2:D))");
  sheet.getRange('E2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!E2:E))");
  sheet.getRange('F2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!F2:F))");
  sheet.getRange('G2').setFormula('=ARRAYFORMULA(IF(A2:A="","",IF(REGEXMATCH(UPPER(F2:F),"CANCEL"),"Cancelamento",IF(REGEXMATCH(UPPER(F2:F),"PAG|PAY|PAGO"),"Pagamento",IF(REGEXMATCH(UPPER(F2:F),"CREATE|CRIAD|INSERT"),"Criação",IF(REGEXMATCH(UPPER(F2:F),"UPDATE|EDIT|ALTER"),"Edição",IF(REGEXMATCH(UPPER(F2:F),"CLOSE|FECH"),"Fechamento","Outros")))))))');
  sheet.getRange('H2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!H2:H))");
  sheet.getRange('I2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",IFERROR(DATEVALUE(LEFT('" + raw + "'!I2:I,10))+TIMEVALUE(MID('" + raw + "'!I2:I,12,8)),'" + raw + "'!I2:I)))");
  sheet.getRange('J2').setFormula("=ARRAYFORMULA(IF('" + raw + "'!A2:A=\"\",\"\",'" + raw + "'!J2:J))");

  sheet.getRange('I:I').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function criarDashAlertasBar13_() {
  var sheet = bar13DashResetSheet_(BAR13_DASH_CONFIG.sheets.alerts);
  var headers = ['tipo', 'gravidade', 'referencia', 'detalhe', 'data_evento', 'status'];
  bar13DashSetHeaders_(sheet, headers);

  var rows = [];
  var rawOrders = bar13DashReadObjects_(bar13DashRawSheetName_('orders'));
  var rawDevices = bar13DashReadObjects_(bar13DashRawSheetName_('devices'));
  var rawLog = bar13DashReadObjects_(bar13DashRawSheetName_('log'));
  var limiteHoras = bar13DashGetAlertLimitHours_();
  var now = new Date();

  rawOrders.forEach(function(order) {
    var pedidoId = bar13DashString_(order.pedido_sync_id);
    if (!pedidoId) return;

    var status = bar13DashString_(order.status).toUpperCase();
    var cancelado = bar13DashString_(order.cancelado).toUpperCase();
    var operador = bar13DashString_(order.operador_responsavel_nome) || 'Operador não informado';
    var integrante = bar13DashString_(order.integrante) || 'Integrante não informado';
    var total = bar13DashNumber_(order.total);
    var data = order.data_hora_pedido || order.data_pedido || order.updated_at || '';

    if (cancelado === 'SIM') {
      rows.push([
        'Pedido cancelado',
        'MÉDIA',
        pedidoId,
        'Operador: ' + operador + ' | Integrante: ' + integrante + ' | Total: R$ ' + bar13DashMoneyText_(total),
        data,
        'VERIFICAR',
      ]);
    }

    if (cancelado !== 'SIM' && /AGUARDANDO|PENDENTE/.test(status)) {
      rows.push([
        'Pedido pendente',
        'ALTA',
        pedidoId,
        'Operador: ' + operador + ' | Integrante: ' + integrante + ' | Total: R$ ' + bar13DashMoneyText_(total),
        data,
        'ABERTO',
      ]);
    }
  });

  rawDevices.forEach(function(device) {
    var deviceId = bar13DashString_(device.device_id);
    if (!deviceId) return;

    var lastExported = device.last_exported_at || device.last_seen_at || '';
    var parsed = bar13DashParseDate_(lastExported);
    var nome = bar13DashString_(device.nome_aparelho) || 'Aparelho sem nome';

    if (!parsed) {
      rows.push([
        'Aparelho sem sincronização',
        'ALTA',
        deviceId,
        nome + ' sem data de última exportação registrada.',
        '',
        'ABERTO',
      ]);
      return;
    }

    var diffHours = (now.getTime() - parsed.getTime()) / 1000 / 60 / 60;
    if (diffHours > limiteHoras) {
      rows.push([
        'Aparelho sem sincronização recente',
        'ALTA',
        deviceId,
        nome + ' sem envio há aproximadamente ' + diffHours.toFixed(1).replace('.', ',') + ' horas.',
        lastExported,
        'ABERTO',
      ]);
    }
  });

  rawLog.forEach(function(log) {
    var status = bar13DashString_(log.status).toUpperCase();
    if (status !== 'ERRO') return;

    rows.push([
      'Erro de importação',
      'ALTA',
      bar13DashString_(log.batch_id) || bar13DashString_(log.device_id) || 'Sem referência',
      bar13DashString_(log.detalhe) || 'Erro sem detalhe registrado.',
      log.executado_em || '',
      'ABERTO',
    ]);
  });

  if (rows.length) {
    sheet.getRange(2, 1, Math.min(rows.length, 500), headers.length).setValues(rows.slice(0, 500));
  }

  sheet.getRange('E:E').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function criarDashboardOperacaoBar13_() {
  var sheet = bar13DashResetSheet_(BAR13_DASH_CONFIG.sheets.operationDashboard);
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(3);
  sheet.setColumnWidths(1, 12, 125);
  bar13DashApplyDashboardBaseStyle_(sheet);

  bar13DashDashboardTitle_(sheet, 'A1:L1', 'BAR13 CENTRAL - DASHBOARD OPERACIONAL');

  sheet.getRange('A3:L3')
    .merge()
    .setFormula('="Período: "&TEXT(config!B4,"dd/mm/yyyy")&" até "&TEXT(config!B5,"dd/mm/yyyy")&"  |  Operador: "&config!B6&"  |  Aparelho: "&config!B7&"  |  Método: "&config!B8')
    .setBackground(BAR13_DASH_CONFIG.visual.card)
    .setFontColor(BAR13_DASH_CONFIG.visual.muted)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  bar13DashWriteCard_(sheet, 5, 1, 3, 'Total vendido', bar13DashFormulaTotalVendido_(), 'R$ #,##0.00');
  bar13DashWriteCard_(sheet, 5, 4, 3, 'Caixa recebido', bar13DashFormulaCaixaRecebido_(), 'R$ #,##0.00');
  bar13DashWriteCard_(sheet, 5, 7, 3, 'Pedidos pagos', bar13DashFormulaCountPedidos_([bar13DashPedidosSheet_() + 'O2:O=TRUE'], true), '#,##0');
  bar13DashWriteCard_(sheet, 5, 10, 3, 'Última sincronização', '=IFERROR(TEXT(MAX(FILTER(\'' + BAR13_DASH_CONFIG.sheets.baseOrders + '\'!R2:R,\'' + BAR13_DASH_CONFIG.sheets.baseOrders + '\'!R2:R<>"")),"dd/mm/yyyy hh:mm"),"Sem envio")', '@');

  bar13DashWriteCard_(sheet, 9, 1, 3, 'Pedidos pendentes', bar13DashFormulaCountPedidos_([bar13DashPedidosSheet_() + 'P2:P=TRUE'], false), '#,##0');
  bar13DashWriteCard_(sheet, 9, 4, 3, 'Valor pendente', bar13DashFormulaValorPendente_(), 'R$ #,##0.00');
  bar13DashWriteCard_(sheet, 9, 7, 3, 'Cancelados', bar13DashFormulaCountPedidos_([bar13DashPedidosSheet_() + 'Q2:Q=TRUE'], false), '#,##0');
  bar13DashWriteCard_(sheet, 9, 10, 3, 'Ticket médio', '=IFERROR(' + bar13DashFormulaTotalVendido_().replace('=', '') + '/' + bar13DashFormulaCountPedidos_([], true).replace('=', '') + ',0)', 'R$ #,##0.00');

  bar13DashSectionTitle_(sheet, 'A14:D14', 'Vendas por operador');
  sheet.getRange('A15').setFormula(bar13DashFormulaQueryPedidos_(
    bar13DashPedidosSheet_() + 'H2:H,' + bar13DashPedidosSheet_() + 'M2:M',
    'select Col1, sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc label Col1 \'Operador\', sum(Col2) \'Total\'',
    [],
    true
  ));
  sheet.getRange('B:B').setNumberFormat('R$ #,##0.00');

  bar13DashSectionTitle_(sheet, 'E14:H14', 'Vendas por método de pagamento');
  sheet.getRange('E15').setFormula(bar13DashFormulaQueryPedidos_(
    bar13DashPedidosSheet_() + 'J2:J,' + bar13DashPedidosSheet_() + 'M2:M',
    'select Col1, sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc label Col1 \'Método\', sum(Col2) \'Total\'',
    [],
    true
  ));
  sheet.getRange('F:F').setNumberFormat('R$ #,##0.00');

  bar13DashSectionTitle_(sheet, 'I14:L14', 'Pedidos pendentes');
  sheet.getRange('I15:L15').setValues([['Pedido', 'Operador', 'Integrante', 'Total']]);
  bar13DashFormatHeader_(sheet, 15, 9, 4);
  sheet.getRange('I16').setFormula('=IFERROR(FILTER({' + bar13DashPedidosSheet_() + 'A2:A,' + bar13DashPedidosSheet_() + 'H2:H,' + bar13DashPedidosSheet_() + 'T2:T,' + bar13DashPedidosSheet_() + 'M2:M},' + bar13DashPedidosCriteria_([bar13DashPedidosSheet_() + 'P2:P=TRUE'], false) + '),"Sem pendências")');
  sheet.getRange('L:L').setNumberFormat('R$ #,##0.00');

  bar13DashSectionTitle_(sheet, 'A34:F34', 'Últimos eventos de auditoria');
  sheet.getRange('A35').setFormula('=IFERROR(QUERY(SORT(FILTER({\'' + BAR13_DASH_CONFIG.sheets.baseAudit + '\'!I2:I,\'' + BAR13_DASH_CONFIG.sheets.baseAudit + '\'!G2:G,\'' + BAR13_DASH_CONFIG.sheets.baseAudit + '\'!H2:H,\'' + BAR13_DASH_CONFIG.sheets.baseAudit + '\'!F2:F,\'' + BAR13_DASH_CONFIG.sheets.baseAudit + '\'!D2:D},\'' + BAR13_DASH_CONFIG.sheets.baseAudit + '\'!A2:A<>""),1,FALSE),"select * limit 20",0),"Sem eventos")');
  sheet.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm:ss');

  bar13DashSectionTitle_(sheet, 'G34:L34', 'Alertas operacionais');
  sheet.getRange('G35').setFormula('=IFERROR(FILTER(\'' + BAR13_DASH_CONFIG.sheets.alerts + '\'!A2:F,\'' + BAR13_DASH_CONFIG.sheets.alerts + '\'!A2:A<>""),"Sem alertas")');

}

function criarDashboardGerencialBar13_() {
  var sheet = bar13DashResetSheet_(BAR13_DASH_CONFIG.sheets.managementDashboard);
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(3);
  sheet.setColumnWidths(1, 12, 125);
  bar13DashApplyDashboardBaseStyle_(sheet);

  bar13DashDashboardTitle_(sheet, 'A1:L1', 'BAR13 CENTRAL - DASHBOARD GERENCIAL');

  sheet.getRange('A3:L3')
    .merge()
    .setFormula('="Período: "&TEXT(config!B4,"dd/mm/yyyy")&" até "&TEXT(config!B5,"dd/mm/yyyy")&"  |  Operador: "&config!B6&"  |  Aparelho: "&config!B7&"  |  Método: "&config!B8')
    .setBackground(BAR13_DASH_CONFIG.visual.card)
    .setFontColor(BAR13_DASH_CONFIG.visual.muted)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  bar13DashWriteCard_(sheet, 5, 1, 3, 'Faturamento válido', bar13DashFormulaTotalVendido_(), 'R$ #,##0.00');
  bar13DashWriteCard_(sheet, 5, 4, 3, 'Faturamento recebido', bar13DashFormulaCaixaRecebido_(), 'R$ #,##0.00');
  bar13DashWriteCard_(sheet, 5, 7, 3, 'Faturamento pendente', bar13DashFormulaValorPendente_(), 'R$ #,##0.00');
  bar13DashWriteCard_(sheet, 5, 10, 3, 'Pedidos válidos', bar13DashFormulaCountPedidos_([], true), '#,##0');

  bar13DashWriteCard_(sheet, 9, 1, 3, 'Produto mais vendido', bar13DashFormulaProdutoMaisVendido_(), '@');
  bar13DashWriteCard_(sheet, 9, 4, 3, 'Produto maior faturamento', bar13DashFormulaProdutoMaiorFaturamento_(), '@');
  bar13DashWriteCard_(sheet, 9, 7, 3, 'Melhor operador', bar13DashFormulaMelhorOperador_(), '@');
  bar13DashWriteCard_(sheet, 9, 10, 3, '% cancelamento', bar13DashFormulaPercentualCancelamento_(), '0.00%');

  bar13DashSectionTitle_(sheet, 'A14:D14', 'Top 10 itens por quantidade');
  sheet.getRange('A15').setFormula(bar13DashFormulaQueryItens_(
    bar13DashItensSheet_() + 'D2:D,' + bar13DashItensSheet_() + 'E2:E',
    'select Col1, sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc limit 10 label Col1 \'Item\', sum(Col2) \'Quantidade\'',
    [],
    true
  ));

  bar13DashSectionTitle_(sheet, 'E14:H14', 'Top 10 itens por faturamento');
  sheet.getRange('E15').setFormula(bar13DashFormulaQueryItens_(
    bar13DashItensSheet_() + 'D2:D,' + bar13DashItensSheet_() + 'G2:G',
    'select Col1, sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc limit 10 label Col1 \'Item\', sum(Col2) \'Total\'',
    [],
    true
  ));
  sheet.getRange('F:F').setNumberFormat('R$ #,##0.00');

  bar13DashSectionTitle_(sheet, 'I14:L14', 'Ranking de operadores');
  sheet.getRange('I15').setFormula(bar13DashFormulaQueryPedidos_(
    bar13DashPedidosSheet_() + 'H2:H,' + bar13DashPedidosSheet_() + 'M2:M,' + bar13DashPedidosSheet_() + 'A2:A',
    'select Col1, count(Col3), sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc label Col1 \'Operador\', count(Col3) \'Pedidos\', sum(Col2) \'Total\'',
    [],
    true
  ));
  sheet.getRange('K:K').setNumberFormat('R$ #,##0.00');

  bar13DashSectionTitle_(sheet, 'A34:D34', 'Faturamento por dia');
  sheet.getRange('A35').setFormula(bar13DashFormulaQueryPedidos_(
    bar13DashPedidosSheet_() + 'B2:B,' + bar13DashPedidosSheet_() + 'M2:M',
    'select Col1, sum(Col2) where Col1 is not null group by Col1 order by Col1 asc label Col1 \'Data\', sum(Col2) \'Total\'',
    [],
    true
  ));
  sheet.getRange('A:A').setNumberFormat('dd/mm/yyyy');
  sheet.getRange('B:B').setNumberFormat('R$ #,##0.00');

  bar13DashSectionTitle_(sheet, 'E34:H34', 'Vendas por aparelho');
  sheet.getRange('E35').setFormula(bar13DashFormulaQueryPedidos_(
    bar13DashPedidosSheet_() + 'I2:I,' + bar13DashPedidosSheet_() + 'M2:M,' + bar13DashPedidosSheet_() + 'A2:A',
    'select Col1, count(Col3), sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc label Col1 \'Aparelho\', count(Col3) \'Pedidos\', sum(Col2) \'Total\'',
    [],
    true
  ));
  sheet.getRange('G:G').setNumberFormat('R$ #,##0.00');

  bar13DashSectionTitle_(sheet, 'I34:L34', 'Resumo por status');
  sheet.getRange('I35').setFormula(bar13DashFormulaQueryPedidos_(
    bar13DashPedidosSheet_() + 'K2:K,' + bar13DashPedidosSheet_() + 'A2:A,' + bar13DashPedidosSheet_() + 'M2:M',
    'select Col1, count(Col2), sum(Col3) where Col1 is not null group by Col1 order by count(Col2) desc label Col1 \'Status\', count(Col2) \'Pedidos\', sum(Col3) \'Total\'',
    [],
    false
  ));
  sheet.getRange('K:K').setNumberFormat('R$ #,##0.00');

}

function aplicarPadraoVisualBar13_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var rawNames = [
    bar13DashRawSheetName_('devices'),
    bar13DashRawSheetName_('operators'),
    bar13DashRawSheetName_('orders'),
    bar13DashRawSheetName_('orderItems'),
    bar13DashRawSheetName_('auditEvents'),
    bar13DashRawSheetName_('log'),
  ];

  rawNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) return;
    sheet.setTabColor('#6B7280');
    if (sheet.getLastColumn() > 0) {
      bar13DashFormatHeader_(sheet, 1, 1, sheet.getLastColumn());
      sheet.setFrozenRows(1);
    }
  });

  var baseSheets = [
    BAR13_DASH_CONFIG.sheets.baseOrders,
    BAR13_DASH_CONFIG.sheets.baseItems,
    BAR13_DASH_CONFIG.sheets.baseAudit,
    BAR13_DASH_CONFIG.sheets.alerts,
  ];

  baseSheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) return;
    sheet.setTabColor('#B45309');
  });

  var configSheet = ss.getSheetByName(BAR13_DASH_CONFIG.sheets.config);
  if (configSheet) configSheet.setTabColor('#1F2937');

  var operation = ss.getSheetByName(BAR13_DASH_CONFIG.sheets.operationDashboard);
  if (operation) operation.setTabColor('#F59E0B');

  var management = ss.getSheetByName(BAR13_DASH_CONFIG.sheets.managementDashboard);
  if (management) management.setTabColor('#FBBF24');
}

function ocultarAbasAuxiliaresBar13() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [
    BAR13_DASH_CONFIG.sheets.baseOrders,
    BAR13_DASH_CONFIG.sheets.baseItems,
    BAR13_DASH_CONFIG.sheets.baseAudit,
    BAR13_DASH_CONFIG.sheets.alerts,
  ].forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) sheet.hideSheet();
  });
}

function exibirAbasAuxiliaresBar13() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [
    BAR13_DASH_CONFIG.sheets.baseOrders,
    BAR13_DASH_CONFIG.sheets.baseItems,
    BAR13_DASH_CONFIG.sheets.baseAudit,
    BAR13_DASH_CONFIG.sheets.alerts,
  ].forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) sheet.showSheet();
  });
}

function bar13DashRawSheetName_(key) {
  if (
    typeof BAR13_CENTRAL_CONFIG !== 'undefined' &&
    BAR13_CENTRAL_CONFIG &&
    BAR13_CENTRAL_CONFIG.sheets &&
    BAR13_CENTRAL_CONFIG.sheets[key]
  ) {
    return BAR13_CENTRAL_CONFIG.sheets[key];
  }

  return BAR13_DASH_CONFIG.fallbackRawSheets[key];
}

function bar13DashResetSheet_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear();
  sheet.clearConditionalFormatRules();

  var charts = sheet.getCharts();
  charts.forEach(function(chart) {
    sheet.removeChart(chart);
  });

  return sheet;
}

function bar13DashSetHeaders_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  bar13DashFormatHeader_(sheet, 1, 1, headers.length);
  sheet.setFrozenRows(1);
}

function bar13DashFormatHeader_(sheet, row, col, numCols) {
  sheet.getRange(row, col, 1, numCols)
    .setBackground(BAR13_DASH_CONFIG.visual.dark)
    .setFontColor(BAR13_DASH_CONFIG.visual.goldLight)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, BAR13_DASH_CONFIG.visual.border, SpreadsheetApp.BorderStyle.SOLID);
}

function bar13DashDashboardTitle_(sheet, rangeA1, title) {
  sheet.getRange(rangeA1)
    .merge()
    .setValue(title)
    .setBackground(BAR13_DASH_CONFIG.visual.darker)
    .setFontColor(BAR13_DASH_CONFIG.visual.goldLight)
    .setFontWeight('bold')
    .setFontSize(16)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 42);
}

function bar13DashSectionTitle_(sheet, rangeA1, title) {
  sheet.getRange(rangeA1)
    .merge()
    .setValue(title)
    .setBackground(BAR13_DASH_CONFIG.visual.card2)
    .setFontColor(BAR13_DASH_CONFIG.visual.goldLight)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}

function bar13DashWriteCard_(sheet, row, col, width, title, formula, numberFormat) {
  var titleRange = sheet.getRange(row, col, 1, width);
  var valueRange = sheet.getRange(row + 1, col, 2, width);

  titleRange.merge()
    .setValue(title)
    .setBackground(BAR13_DASH_CONFIG.visual.card2)
    .setFontColor(BAR13_DASH_CONFIG.visual.goldLight)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  valueRange.merge()
    .setFormula(formula)
    .setBackground(BAR13_DASH_CONFIG.visual.card)
    .setFontColor(BAR13_DASH_CONFIG.visual.text)
    .setFontWeight('bold')
    .setFontSize(16)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, BAR13_DASH_CONFIG.visual.border, SpreadsheetApp.BorderStyle.SOLID);

  if (numberFormat) {
    valueRange.setNumberFormat(numberFormat);
  }
}

function bar13DashApplyDashboardBaseStyle_(sheet) {
  var maxRows = Math.max(sheet.getMaxRows(), 60);
  var maxCols = Math.max(sheet.getMaxColumns(), 12);

  sheet.getRange(1, 1, maxRows, maxCols)
    .setBackground(BAR13_DASH_CONFIG.visual.darker)
    .setFontColor(BAR13_DASH_CONFIG.visual.text)
    .setVerticalAlignment('middle');

  sheet.getRange('A1:L1').setBackground(BAR13_DASH_CONFIG.visual.darker);
  sheet.getRange('A3:L3').setBackground(BAR13_DASH_CONFIG.visual.card);

  [5, 9].forEach(function(row) {
    sheet.setRowHeight(row, 28);
    sheet.setRowHeight(row + 1, 32);
    sheet.setRowHeight(row + 2, 32);
  });
}

function bar13DashApplyValidationFromRange_(sheet, cellA1, sourceRange) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sourceRange, true)
    .setAllowInvalid(true)
    .build();

  sheet.getRange(cellA1).setDataValidation(rule);
}

function bar13DashPedidosSheet_() {
  return "'" + BAR13_DASH_CONFIG.sheets.baseOrders + "'!";
}

function bar13DashItensSheet_() {
  return "'" + BAR13_DASH_CONFIG.sheets.baseItems + "'!";
}

function bar13DashConfigSheet_() {
  return "'" + BAR13_DASH_CONFIG.sheets.config + "'!";
}

function bar13DashPedidosCriteria_(extraCriteria, includeValid) {
  var p = bar13DashPedidosSheet_();
  var c = bar13DashConfigSheet_();
  var criteria = [
    p + 'A2:A<>""',
    p + 'B2:B>=' + c + '$B$4',
    p + 'B2:B<=' + c + '$B$5',
    'IF(' + c + '$B$6="Todos",' + p + 'H2:H<>"",' + p + 'H2:H=' + c + '$B$6)',
    'IF(' + c + '$B$7="Todos",' + p + 'I2:I<>"",' + p + 'I2:I=' + c + '$B$7)',
    'IF(' + c + '$B$8="Todos",' + p + 'J2:J<>"",' + p + 'J2:J=' + c + '$B$8)',
  ];

  if (includeValid) {
    criteria.push(p + 'N2:N=TRUE');
  }

  if (extraCriteria && extraCriteria.length) {
    criteria = criteria.concat(extraCriteria);
  }

  return criteria.join(',');
}

function bar13DashItensCriteria_(extraCriteria, includeValid) {
  var i = bar13DashItensSheet_();
  var c = bar13DashConfigSheet_();
  var criteria = [
    i + 'A2:A<>""',
    i + 'H2:H>=' + c + '$B$4',
    i + 'H2:H<=' + c + '$B$5',
    'IF(' + c + '$B$6="Todos",' + i + 'I2:I<>"",' + i + 'I2:I=' + c + '$B$6)',
    'IF(' + c + '$B$7="Todos",' + i + 'J2:J<>"",' + i + 'J2:J=' + c + '$B$7)',
    'IF(' + c + '$B$8="Todos",' + i + 'K2:K<>"",' + i + 'K2:K=' + c + '$B$8)',
  ];

  if (includeValid) {
    criteria.push(i + 'N2:N=TRUE');
  }

  if (extraCriteria && extraCriteria.length) {
    criteria = criteria.concat(extraCriteria);
  }

  return criteria.join(',');
}

function bar13DashFormulaTotalVendido_() {
  return '=IFERROR(SUM(FILTER(' + bar13DashPedidosSheet_() + 'M2:M,' + bar13DashPedidosCriteria_([], true) + ')),0)';
}

function bar13DashFormulaCaixaRecebido_() {
  return '=IFERROR(SUM(FILTER(' + bar13DashPedidosSheet_() + 'M2:M,' + bar13DashPedidosCriteria_([bar13DashPedidosSheet_() + 'O2:O=TRUE'], true) + ')),0)';
}

function bar13DashFormulaValorPendente_() {
  return '=IFERROR(SUM(FILTER(' + bar13DashPedidosSheet_() + 'M2:M,' + bar13DashPedidosCriteria_([bar13DashPedidosSheet_() + 'P2:P=TRUE'], false) + ')),0)';
}

function bar13DashFormulaCountPedidos_(extraCriteria, includeValid) {
  return '=IFERROR(ROWS(FILTER(' + bar13DashPedidosSheet_() + 'A2:A,' + bar13DashPedidosCriteria_(extraCriteria || [], includeValid) + ')),0)';
}

function bar13DashFormulaPercentualCancelamento_() {
  var totalPeriodo = 'IFERROR(ROWS(FILTER(' + bar13DashPedidosSheet_() + 'A2:A,' + bar13DashPedidosCriteria_([], false) + ')),0)';
  var cancelados = 'IFERROR(ROWS(FILTER(' + bar13DashPedidosSheet_() + 'A2:A,' + bar13DashPedidosCriteria_([bar13DashPedidosSheet_() + 'Q2:Q=TRUE'], false) + ')),0)';
  return '=IFERROR((' + cancelados + ')/(' + totalPeriodo + '),0)';
}

function bar13DashFormulaQueryPedidos_(arrayExpression, query, extraCriteria, includeValid) {
  return '=IFERROR(QUERY(FILTER({' + arrayExpression + '},' + bar13DashPedidosCriteria_(extraCriteria || [], includeValid) + '),"' + query + '",0),"Sem dados")';
}

function bar13DashFormulaQueryItens_(arrayExpression, query, extraCriteria, includeValid) {
  return '=IFERROR(QUERY(FILTER({' + arrayExpression + '},' + bar13DashItensCriteria_(extraCriteria || [], includeValid) + '),"' + query + '",0),"Sem dados")';
}

function bar13DashFormulaProdutoMaisVendido_() {
  return '=IFERROR(INDEX(QUERY(FILTER({' + bar13DashItensSheet_() + 'D2:D,' + bar13DashItensSheet_() + 'E2:E},' + bar13DashItensCriteria_([], true) + '),"select Col1, sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc limit 1",0),1,1),"Sem dados")';
}

function bar13DashFormulaProdutoMaiorFaturamento_() {
  return '=IFERROR(INDEX(QUERY(FILTER({' + bar13DashItensSheet_() + 'D2:D,' + bar13DashItensSheet_() + 'G2:G},' + bar13DashItensCriteria_([], true) + '),"select Col1, sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc limit 1",0),1,1),"Sem dados")';
}

function bar13DashFormulaMelhorOperador_() {
  return '=IFERROR(INDEX(QUERY(FILTER({' + bar13DashPedidosSheet_() + 'H2:H,' + bar13DashPedidosSheet_() + 'M2:M},' + bar13DashPedidosCriteria_([], true) + '),"select Col1, sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc limit 1",0),1,1),"Sem dados")';
}

function bar13DashReadObjects_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
    return [];
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  return values.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      if (header) obj[header] = row[index];
    });
    return obj;
  });
}

function bar13DashGetAlertLimitHours_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BAR13_DASH_CONFIG.sheets.config);
  if (!sheet) return 6;

  var value = Number(sheet.getRange('B10').getValue());
  return value && value > 0 ? value : 6;
}

function bar13DashParseDate_(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  var text = String(value).trim();
  if (!text) return null;

  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;

  var match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function bar13DashString_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function bar13DashNumber_(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  var text = String(value).replace('R$', '').trim();
  text = text.replace(/\./g, '').replace(',', '.');
  var parsed = Number(text);
  return isNaN(parsed) ? 0 : parsed;
}

function bar13DashMoneyText_(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}
