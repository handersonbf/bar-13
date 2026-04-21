import * as Sharing from 'expo-sharing';
import { PeriodoFiltro } from '../types/domain';
import { buildFileStamp } from '../utils/date';
import { formatCurrency, formatOrderItemsForDisplay } from '../utils/format';
import { stringifyCsv } from '../utils/csv';
import { writeTextFile } from '../utils/file';
import { getConsolidadoPeriodo, getPendentesPeriodo, getResumoPeriodo } from './relatoriosService';

async function shareFileIfAvailable(uri: string) {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri);
  }
  return uri;
}

export async function exportarVendasPeriodo(periodo: PeriodoFiltro) {
  const resumo = await getResumoPeriodo(periodo);
  const rows = resumo.pedidos.map((pedido) => ({
    data: pedido.dataPedido,
    hora: pedido.horaPedido,
    integrante: pedido.nomeIntegranteSnapshot,
    patente: pedido.patenteIntegranteSnapshot,
    status: pedido.cancelado ? 'CANCELADO' : pedido.status,
    itens_formatados: formatOrderItemsForDisplay(pedido.itens),
    comprovante_nome: pedido.comprovanteNome,
    comprovante_anexado: pedido.comprovanteNome ? 'SIM' : 'NAO',
    total: pedido.total.toFixed(2),
  }));

  const content = stringifyCsv(rows);
  const fileName = `bar13_vendas_${periodo.dataInicial}_${periodo.dataFinal}_${buildFileStamp()}.csv`;
  const uri = await writeTextFile(fileName, content);
  return shareFileIfAvailable(uri);
}

export async function exportarDevedoresPeriodo(periodo: PeriodoFiltro) {
  const pedidos = await getPendentesPeriodo(periodo);
  const rows = pedidos.map((pedido) => ({
    data: pedido.dataPedido,
    hora: pedido.horaPedido,
    integrante: pedido.nomeIntegranteSnapshot,
    patente: pedido.patenteIntegranteSnapshot,
    itens_formatados: formatOrderItemsForDisplay(pedido.itens),
    comprovante_nome: pedido.comprovanteNome,
    comprovante_anexado: pedido.comprovanteNome ? 'SIM' : 'NAO',
    total: pedido.total.toFixed(2),
    status: pedido.cancelado ? 'CANCELADO' : pedido.status,
  }));

  const content = stringifyCsv(rows);
  const fileName = `bar13_devedores_${periodo.dataInicial}_${periodo.dataFinal}_${buildFileStamp()}.csv`;
  const uri = await writeTextFile(fileName, content);
  return shareFileIfAvailable(uri);
}

export async function exportarConsolidadoPeriodo(periodo: PeriodoFiltro) {
  const consolidado = await getConsolidadoPeriodo(periodo);
  const rows = [
    {
      periodo_inicial: periodo.dataInicial,
      periodo_final: periodo.dataFinal,
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
  const fileName = `bar13_consolidado_${periodo.dataInicial}_${periodo.dataFinal}_${buildFileStamp()}.csv`;
  const uri = await writeTextFile(fileName, content);
  return shareFileIfAvailable(uri);
}
