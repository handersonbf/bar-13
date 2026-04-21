import { HomeStats, PedidoDetalhado, PeriodoFiltro } from '../types/domain';
import {
  listPedidosAbertos,
  listPedidosPendentes,
  listPedidosPorData,
  listPedidosPorPeriodo,
} from '../repositories/pedidosRepository';
import { clampPeriod, getTodayDate } from '../utils/date';
import { formatCurrency } from '../utils/format';

export interface DevedorAgrupado {
  nome: string;
  patente: string;
  total: number;
  pedidos: number;
}

export interface ConsumoAgrupado {
  item: string;
  quantidade: number;
  total: number;
}

export interface ConsolidadoPeriodo {
  totalPedidos: number;
  totalVendido: number;
  totalPago: number;
  totalPendente: number;
  quantidadeDevedores: number;
  quantidadeComprovantes: number;
  devedoresAgrupados: DevedorAgrupado[];
  consumoAgrupado: ConsumoAgrupado[];
}

function sumOrders(orders: PedidoDetalhado[]) {
  const activeOrders = orders.filter((order) => !order.cancelado);
  const totalVendido = activeOrders.reduce((accumulator, order) => accumulator + order.total, 0);
  const totalPago = orders
    .filter((order) => order.status === 'PAGO' && !order.cancelado)
    .reduce((accumulator, order) => accumulator + order.total, 0);
  const totalPendente = orders
    .filter((order) => order.status !== 'PAGO' && !order.cancelado)
    .reduce((accumulator, order) => accumulator + order.total, 0);

  return {
    totalVendido,
    totalPago,
    totalPendente,
  };
}

export async function getHistoricoPorData(date: string) {
  return listPedidosPorData(date);
}

export async function getResumoPeriodo(periodo: PeriodoFiltro) {
  const range = clampPeriod(periodo.dataInicial, periodo.dataFinal);
  const pedidos = await listPedidosPorPeriodo(range.dataInicial, range.dataFinal);
  const totals = sumOrders(pedidos);

  return {
    pedidos,
    totalPedidos: pedidos.filter((pedido) => !pedido.cancelado).length,
    totalVendido: totals.totalVendido,
    totalPago: totals.totalPago,
    totalPendente: totals.totalPendente,
    quantidadeDevedores: pedidos.filter((pedido) => pedido.status === 'FECHADO_AGUARDANDO_PAGAMENTO' && !pedido.cancelado).length,
  };
}

export async function getPendentesPeriodo(periodo: PeriodoFiltro) {
  const range = clampPeriod(periodo.dataInicial, periodo.dataFinal);
  return listPedidosPorPeriodo(range.dataInicial, range.dataFinal, ['FECHADO_AGUARDANDO_PAGAMENTO']);
}

export async function getConsolidadoPeriodo(periodo: PeriodoFiltro): Promise<ConsolidadoPeriodo> {
  const resumo = await getResumoPeriodo(periodo);
  const devedoresMap = new Map<string, DevedorAgrupado>();
  const consumoMap = new Map<string, ConsumoAgrupado>();

  resumo.pedidos
    .filter((pedido) => pedido.status === 'FECHADO_AGUARDANDO_PAGAMENTO' && !pedido.cancelado)
    .forEach((pedido) => {
      const key = `${pedido.nomeIntegranteSnapshot}::${pedido.patenteIntegranteSnapshot}`;
      const current = devedoresMap.get(key);

      if (current) {
        current.total += pedido.total;
        current.pedidos += 1;
      } else {
        devedoresMap.set(key, {
          nome: pedido.nomeIntegranteSnapshot,
          patente: pedido.patenteIntegranteSnapshot,
          total: pedido.total,
          pedidos: 1,
        });
      }
    });

  resumo.pedidos.filter((pedido) => !pedido.cancelado).forEach((pedido) => {
    pedido.itens.forEach((item) => {
      const current = consumoMap.get(item.nomeItemSnapshot);
      if (current) {
        current.quantidade += item.quantidade;
        current.total += item.subtotal;
      } else {
        consumoMap.set(item.nomeItemSnapshot, {
          item: item.nomeItemSnapshot,
          quantidade: item.quantidade,
          total: item.subtotal,
        });
      }
    });
  });

  return {
    totalPedidos: resumo.totalPedidos,
    totalVendido: resumo.totalVendido,
    totalPago: resumo.totalPago,
    totalPendente: resumo.totalPendente,
    quantidadeDevedores: resumo.quantidadeDevedores,
    quantidadeComprovantes: resumo.pedidos.filter((pedido) => Boolean(pedido.comprovanteNome) && !pedido.cancelado).length,
    devedoresAgrupados: Array.from(devedoresMap.values()).sort((a, b) => b.total - a.total),
    consumoAgrupado: Array.from(consumoMap.values()).sort((a, b) => b.total - a.total),
  };
}

export async function getHomeStats(): Promise<HomeStats> {
  const today = getTodayDate();
  const [pedidosHoje, pedidosAbertos, pendentes] = await Promise.all([
    listPedidosPorData(today),
    listPedidosAbertos(),
    listPedidosPendentes(),
  ]);
  const totaisHoje = sumOrders(pedidosHoje);

  return {
    pedidosHoje: pedidosHoje.filter((pedido) => !pedido.cancelado).length,
    totalHoje: totaisHoje.totalVendido,
    pendenteHoje: totaisHoje.totalPendente,
    pagosHoje: pedidosHoje.filter((pedido) => pedido.status === 'PAGO' && !pedido.cancelado).length,
    abertos: pedidosAbertos.length,
    pendentesGerais: pendentes.length,
  };
}

export function buildResumoTexto(periodo: PeriodoFiltro, total: number) {
  return `Período ${periodo.dataInicial} até ${periodo.dataFinal} • ${formatCurrency(total)}`;
}
