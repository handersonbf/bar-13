export type OrderStatus = 'ABERTO' | 'FECHADO_AGUARDANDO_PAGAMENTO' | 'PAGO';

export interface Integrante {
  id: number;
  nome: string;
  patente: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemBar {
  id: number;
  numeroItem: number;
  nome: string;
  valor: number;
  qtdEstoque: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pedido {
  id: number;
  integranteId: number;
  nomeIntegranteSnapshot: string;
  patenteIntegranteSnapshot: string;
  dataPedido: string;
  horaPedido: string;
  dataHoraPedido: string;
  status: OrderStatus;
  total: number;
  cancelado: boolean;
  canceladoEm: string;
  comprovanteUri: string;
  comprovanteNome: string;
  comprovanteMimeType: string;
  comprovanteAdicionadoEm: string;
  createdAt: string;
  updatedAt: string;
}

export interface PedidoItem {
  id: number;
  pedidoId: number;
  itemId: number;
  numeroItemSnapshot: number;
  nomeItemSnapshot: string;
  valorUnitarioSnapshot: number;
  quantidade: number;
  subtotal: number;
}

export interface Configuracao {
  id: number;
  chavePix: string;
  caminhoImagemQrCode: string;
  nomeBar: string;
  textoPadraoCobranca: string;
}

export interface PedidoDetalhado extends Pedido {
  itens: PedidoItem[];
}

export interface CsvImportResult {
  inserted: number;
  updated: number;
  totalProcessed: number;
}

export interface PeriodoFiltro {
  dataInicial: string;
  dataFinal: string;
}

export interface ResumoPeriodo {
  pedidos: PedidoDetalhado[];
  totalPedidos: number;
  totalVendido: number;
  totalPago: number;
  totalPendente: number;
  quantidadeDevedores: number;
}

export interface HomeStats {
  pedidosHoje: number;
  totalHoje: number;
  pendenteHoje: number;
  pagosHoje: number;
  abertos: number;
  pendentesGerais: number;
}

export interface CsvIntegranteRow {
  nome: string;
  patente: string;
}

export interface CsvItemRow {
  numero_item: string;
  nome: string;
  valor: string;
  qtdestoque: string;
}
