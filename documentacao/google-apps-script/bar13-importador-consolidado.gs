const BAR13_IMPORT_CONFIG = {
  timezone: 'America/Fortaleza',
  fileNamePrefix: 'bar13_consolidado_',
  dataSheetName: 'bar13_consolidado_importado',
  logSheetName: 'bar13_importacoes_log',
  sources: [
    {
      unidade: 'Capital',
      pathSegments: ['Estado', 'Bar', 'Bar-Capital-Imports'],
    },
    {
      unidade: 'Baturite',
      pathSegments: ['Estado', 'Bar', 'Bar-Baturite-Imports'],
    },
  ],
};

const BAR13_REQUIRED_HEADERS = [
  'bar_nome',
  'bar_slug',
  'tipo_relatorio',
  'periodo_inicial',
  'periodo_final',
  'exportado_em_data',
  'exportado_em_hora',
  'exportado_em_iso',
  'chave_importacao',
  'total_de_pedidos',
  'total_vendido',
  'total_pago',
  'total_pendente',
  'quantidade_devedores',
  'quantidade_comprovantes',
  'resumo_legivel',
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Bar13')
    .addItem('Preparar planilha', 'configurarPlanilhaBar13')
    .addItem('Importar agora', 'importarArquivosBar13')
    .addItem('Instalar gatilho horário', 'instalarGatilhoHorarioBar13')
    .addItem('Remover gatilhos', 'removerGatilhosBar13')
    .addToUi();
}

function configurarPlanilhaBar13() {
  ensureDataSheet_();
  ensureLogSheet_();
  SpreadsheetApp.flush();
}

function importarArquivosBar13() {
  const dataSheet = ensureDataSheet_();
  const logSheet = ensureLogSheet_();
  const properties = PropertiesService.getDocumentProperties();
  const rowIndexByKey = buildRowIndexByKey_(dataSheet);
  const summary = {
    processedFiles: 0,
    importedRows: 0,
    updatedRows: 0,
    skippedFiles: 0,
  };

  BAR13_IMPORT_CONFIG.sources.forEach((source) => {
    const folder = getFolderByPath_(source.pathSegments);
    const files = listCandidateFiles_(folder);

    files.forEach((file) => {
      const processedVersionKey = `processed:${file.getId()}`;
      const lastUpdatedMs = String(file.getLastUpdated().getTime());

      if (properties.getProperty(processedVersionKey) === lastUpdatedMs) {
        logImport_(logSheet, {
          unidade: source.unidade,
          folderPath: source.pathSegments.join('/'),
          fileName: file.getName(),
          fileId: file.getId(),
          status: 'IGNORADO',
          detail: 'Arquivo sem alterações desde a última importação.',
        });
        summary.skippedFiles += 1;
        return;
      }

      try {
        const rows = parseConsolidatedCsv_(file);
        rows.forEach((row) => {
          const rowKey = `${source.unidade}::${row.chave_importacao}`;
          const importedAt = formatDateTime_(new Date());
          const values = buildSheetRowValues_(source, file, rowKey, importedAt, row);
          const existingRowNumber = rowIndexByKey.get(rowKey);

          if (existingRowNumber) {
            dataSheet.getRange(existingRowNumber, 1, 1, values.length).setValues([values]);
            summary.updatedRows += 1;
          } else {
            dataSheet.appendRow(values);
            rowIndexByKey.set(rowKey, dataSheet.getLastRow());
            summary.importedRows += 1;
          }
        });

        properties.setProperty(processedVersionKey, lastUpdatedMs);
        logImport_(logSheet, {
          unidade: source.unidade,
          folderPath: source.pathSegments.join('/'),
          fileName: file.getName(),
          fileId: file.getId(),
          status: 'OK',
          detail: `Linhas processadas: ${rows.length}.`,
        });
        summary.processedFiles += 1;
      } catch (error) {
        logImport_(logSheet, {
          unidade: source.unidade,
          folderPath: source.pathSegments.join('/'),
          fileName: file.getName(),
          fileId: file.getId(),
          status: 'ERRO',
          detail: error instanceof Error ? error.message : 'Falha ao importar arquivo.',
        });
      }
    });
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    `Arquivos lidos: ${summary.processedFiles} | novas linhas: ${summary.importedRows} | atualizadas: ${summary.updatedRows} | ignorados: ${summary.skippedFiles}`,
    'Bar13',
    8
  );
}

function instalarGatilhoHorarioBar13() {
  removerGatilhosBar13();
  ScriptApp.newTrigger('importarArquivosBar13').timeBased().everyHours(1).create();
}

function removerGatilhosBar13() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers
    .filter((trigger) => trigger.getHandlerFunction() === 'importarArquivosBar13')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
}

function ensureDataSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(BAR13_IMPORT_CONFIG.dataSheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(BAR13_IMPORT_CONFIG.dataSheetName);
  }

  const headers = getDataSheetHeaders_();
  ensureHeaderRow_(sheet, headers);
  return sheet;
}

function ensureLogSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(BAR13_IMPORT_CONFIG.logSheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(BAR13_IMPORT_CONFIG.logSheetName);
  }

  ensureHeaderRow_(sheet, ['executado_em', 'unidade', 'pasta', 'arquivo_nome', 'arquivo_id', 'status', 'detalhe']);
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

function getDataSheetHeaders_() {
  return [
    'row_key',
    'unidade',
    'pasta_origem',
    'arquivo_nome',
    'arquivo_id',
    'arquivo_atualizado_em',
    'importado_em',
    ...BAR13_REQUIRED_HEADERS,
  ];
}

function buildRowIndexByKey_(sheet) {
  const map = new Map();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return map;
  }

  const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  keys.forEach((value, index) => {
    const key = String(value[0] || '').trim();
    if (key) {
      map.set(key, index + 2);
    }
  });

  return map;
}

function getFolderByPath_(pathSegments) {
  let currentFolder = DriveApp.getRootFolder();

  pathSegments.forEach((segment) => {
    const folders = currentFolder.getFoldersByName(segment);
    if (!folders.hasNext()) {
      throw new Error(`Pasta não encontrada em Meu Drive: ${pathSegments.join('/')}`);
    }
    currentFolder = folders.next();
  });

  return currentFolder;
}

function listCandidateFiles_(folder) {
  const files = [];
  const iterator = folder.getFiles();

  while (iterator.hasNext()) {
    const file = iterator.next();
    const name = file.getName();
    if (!name.toLowerCase().endsWith('.csv')) {
      continue;
    }
    if (!name.startsWith(BAR13_IMPORT_CONFIG.fileNamePrefix)) {
      continue;
    }
    files.push(file);
  }

  files.sort((left, right) => left.getLastUpdated().getTime() - right.getLastUpdated().getTime());
  return files;
}

function parseConsolidatedCsv_(file) {
  const content = file.getBlob().getDataAsString('UTF-8').replace(/^\uFEFF/, '').trim();
  if (!content) {
    throw new Error('O arquivo CSV está vazio.');
  }

  const rows = Utilities.parseCsv(content);
  const headers = rows.shift();

  if (!headers || headers.length === 0) {
    throw new Error('Não foi possível ler o cabeçalho do CSV.');
  }

  const missingHeaders = BAR13_REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`);
  }

  return rows
    .filter((row) => row.some((cell) => String(cell).trim() !== ''))
    .map((row) => {
      const mapped = {};
      headers.forEach((header, index) => {
        mapped[header] = row[index] || '';
      });
      return mapped;
    });
}

function buildSheetRowValues_(source, file, rowKey, importedAt, row) {
  return [
    rowKey,
    source.unidade,
    source.pathSegments.join('/'),
    file.getName(),
    file.getId(),
    formatDateTime_(file.getLastUpdated()),
    importedAt,
    ...BAR13_REQUIRED_HEADERS.map((header) => row[header] || ''),
  ];
}

function logImport_(sheet, entry) {
  sheet.appendRow([
    formatDateTime_(new Date()),
    entry.unidade,
    entry.folderPath,
    entry.fileName,
    entry.fileId,
    entry.status,
    entry.detail,
  ]);
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, BAR13_IMPORT_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
}
