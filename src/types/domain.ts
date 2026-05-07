export type OrderStatus = 'ABERTO' | 'FECHADO_AGUARDANDO_PAGAMENTO' | 'PAGO';
export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO';
export type PaymentMethodWithProof = Exclude<PaymentMethod, 'DINHEIRO'>;

export interface ComprovanteAnexo {
  uri: string;
  nome: string;
  mimeType: string;
}

export interface Integrante {
  id: number;
  syncId: string;
  nome: string;
  patente: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegranteInput {
  nome: string;
  patente: string;
}

export interface ItemBar {
  id: number;
  syncId: string;
  nome: string;
  valor: number;
  qtdEstoque: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemBarInput {
  nome: string;
  valor: number;
  qtdEstoque: number;
}

export interface Pedido {
  id: number;
  syncId: string;
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
  metodoPagamento: PaymentMethod | '';
  comprovanteUri: string;
  comprovanteNome: string;
  comprovanteMimeType: string;
  comprovanteAdicionadoEm: string;
  createdAt: string;
  updatedAt: string;
}

export interface PedidoItem {
  id: number;
  syncId: string;
  pedidoId: number;
  itemId: number;
  nomeItemSnapshot: string;
  valorUnitarioSnapshot: number;
  quantidade: number;
  subtotal: number;
}

export interface Configuracao {
  id: number;
  deviceId: string;
  nomeAparelho: string;
  chavePix: string;
  caminhoImagemQrCode: string;
  nomeBar: string;
  textoPadraoCobranca: string;
  lastExportedAt: string;
  lastImportedAt: string;
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
  nome: string;
  valor: string;
  qtdestoque: string;
}
