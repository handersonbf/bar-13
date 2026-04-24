import * as Sharing from 'expo-sharing';
import { PeriodoFiltro } from '../types/domain';
import { getItensByIds } from '../repositories/itensRepository';
import { getConfiguracao } from '../repositories/configuracaoRepository';
import { buildFileStamp, clampPeriod, getNowParts } from '../utils/date';
import { formatCurrency, formatOrderItemsForDisplay } from '../utils/format';
import { stringifyCsv } from '../utils/csv';
import { writeTextFile } from '../utils/file';
import { getConsolidadoPeriodo, getPendentesPeriodo, getResumoPeriodo } from './relatoriosService';

type TipoRelatorioCsv =
  | 'vendas_periodo'
  | 'devedores_periodo'
  | 'consolidado_periodo'
  | 'resumo_consumo_periodo';

async function shareFileIfAvailable(uri: string) {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri);
  }
  return uri;
}

function slugify(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'bar13';
}

function buildMetadata(periodo: PeriodoFiltro, tipoRelatorio: TipoRelatorioCsv, nomeBar: string) {
  const range = clampPeriod(periodo.dataInicial, periodo.dataFinal);
  const { date, time, iso } = getNowParts();
  const barName = nomeBar.trim() || 'Bar13';
  const barSlug = slugify(barName);

  return {
    bar_nome: barName,
    bar_slug: barSlug,
    tipo_relatorio: tipoRelatorio,
    periodo_inicial: range.dataInicial,
    periodo_final: range.dataFinal,
    exportado_em_data: date,
    exportado_em_hora: time,
    exportado_em_iso: iso,
    chave_importacao: `${barSlug}__${tipoRelatorio}__${range.dataInicial}__${range.dataFinal}`,
  };
}

export async function exportarVendasPeriodo(periodo: PeriodoFiltro) {
  const range = clampPeriod(periodo.dataInicial, periodo.dataFinal);
  const [resumo, configuracao] = await Promise.all([getResumoPeriodo(range), getConfiguracao()]);
  const metadata = buildMetadata(range, 'vendas_periodo', configuracao.nomeBar);
  const rows = resumo.pedidos.map((pedido) => ({
    ...metadata,
    pedido_id: pedido.id,
    data: pedido.dataPedido,
    hora: pedido.horaPedido,
    integrante: pedido.nomeIntegranteSnapshot,
    patente: pedido.patenteIntegranteSnapshot,
    status: pedido.cancelado ? 'CANCELADO' : pedido.status,
    metodo_pagamento: pedido.metodoPagamento || 'NAO_INFORMADO',
    itens_formatados: formatOrderItemsForDisplay(pedido.itens),
    comprovante_nome: pedido.comprovanteNome,
    comprovante_anexado: pedido.comprovanteNome ? 'SIM' : 'NAO',
    total: pedido.total.toFixed(2),
  }));

  const content = stringifyCsv(rows);
  const fileName = `bar13_vendas_${range.dataInicial}_${range.dataFinal}_${buildFileStamp()}.csv`;
  const uri = await writeTextFile(fileName, content);
  return shareFileIfAvailable(uri);
}

export async function exportarDevedoresPeriodo(periodo: PeriodoFiltro) {
  const range = clampPeriod(periodo.dataInicial, periodo.dataFinal);
  const [pedidos, configuracao] = await Promise.all([getPendentesPeriodo(range), getConfiguracao()]);
  const metadata = buildMetadata(range, 'devedores_periodo', configuracao.nomeBar);
  const rows = pedidos.map((pedido) => ({
    ...metadata,
    pedido_id: pedido.id,
    data: pedido.dataPedido,
    hora: pedido.horaPedido,
    integrante: pedido.nomeIntegranteSnapshot,
    patente: pedido.patenteIntegranteSnapshot,
    metodo_pagamento: pedido.metodoPagamento || 'NAO_INFORMADO',
    itens_formatados: formatOrderItemsForDisplay(pedido.itens),
    comprovante_nome: pedido.comprovanteNome,
    comprovante_anexado: pedido.comprovanteNome ? 'SIM' : 'NAO',
    total: pedido.total.toFixed(2),
    status: pedido.cancelado ? 'CANCELADO' : pedido.status,
  }));

  const content = stringifyCsv(rows);
  const fileName = `bar13_devedores_${range.dataInicial}_${range.dataFinal}_${buildFileStamp()}.csv`;
  const uri = await writeTextFile(fileName, content);
  return shareFileIfAvailable(uri);
}

export async function exportarConsolidadoPeriodo(periodo: PeriodoFiltro) {
  const range = clampPeriod(periodo.dataInicial, periodo.dataFinal);
  const [consolidado, configuracao] = await Promise.all([getConsolidadoPeriodo(range), getConfiguracao()]);
  const metadata = buildMetadata(range, 'consolidado_periodo', configuracao.nomeBar);
  const rows = [
    {
      ...metadata,
      total_de_pedidos: consolidado.totalPedidos,
      total_vendido: consolidado.totalVendido.toFixed(2),
      total_pago: consolidado.totalPago.toFixed(2),
      total_pendente: consolidado.totalPendente.toFixed(2),
      quantidade_devedores: consolidado.quantidadeDevedores,
      quantidade_comprovantes: consolidado.quantidadeComprovantes,
      resumo_legivel: `Vendido ${formatCurrency(consolidado.totalVendido)} | Pago ${formatCurrency(consolidado.totalPago)} | Pendente ${formatCurrency(consolidado.totalPendente)}`,
    },
  ];

  const content = stringifyCsv(rows);
  const fileName = `bar13_consolidado_${range.dataInicial}_${range.dataFinal}_${buildFileStamp()}.csv`;
  const uri = await writeTextFile(fileName, content);
  return shareFileIfAvailable(uri);
}

export async function exportarResumoConsumoPeriodo(periodo: PeriodoFiltro) {
  const range = clampPeriod(periodo.dataInicial, periodo.dataFinal);
  const [resumo, configuracao] = await Promise.all([getResumoPeriodo(range), getConfiguracao()]);
  const metadata = buildMetadata(range, 'resumo_consumo_periodo', configuracao.nomeBar);
  const consumoMap = new Map<
    string,
    {
      itemId: number;
      item: string;
      quantidade: number;
      total: number;
    }
  >();

  resumo.pedidos
    .filter((pedido) => !pedido.cancelado)
    .forEach((pedido) => {
      pedido.itens.forEach((item) => {
        const key = `${item.itemId}::${item.nomeItemSnapshot}`;
        const current = consumoMap.get(key);

        if (current) {
          current.quantidade += item.quantidade;
          current.total += item.subtotal;
        } else {
          consumoMap.set(key, {
            itemId: item.itemId,
            item: item.nomeItemSnapshot,
            quantidade: item.quantidade,
            total: item.subtotal,
          });
        }
      });
    });

  const itensAtuais = await getItensByIds(Array.from(new Set(Array.from(consumoMap.values()).map((consumo) => consumo.itemId))));
  const estoqueAtualPorItemId = new Map(itensAtuais.map((item) => [item.id, item.qtdEstoque]));
  const consumoAgrupado = Array.from(consumoMap.values()).sort((a, b) => b.total - a.total);
  const rows = consumoAgrupado.map((consumo, index) => ({
    ...metadata,
    posicao: index + 1,
    item: consumo.item,
    quantidade_total: consumo.quantidade,
    valor_total: consumo.total.toFixed(2),
    valor_unitario_medio: (consumo.total / consumo.quantidade).toFixed(2),
    estoque_atual: estoqueAtualPorItemId.get(consumo.itemId) ?? '',
    resumo_legivel: `${consumo.item} | ${consumo.quantidade} unidade(s) | ${formatCurrency(consumo.total)} | Estoque atual ${estoqueAtualPorItemId.get(consumo.itemId) ?? 'N/D'}`,
  }));

  const content = stringifyCsv(rows);
  const fileName = `bar13_resumo_consumo_${range.dataInicial}_${range.dataFinal}_${buildFileStamp()}.csv`;
  const uri = await writeTextFile(fileName, content);
  return shareFileIfAvailable(uri);
}
