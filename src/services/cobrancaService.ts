import * as Clipboard from 'expo-clipboard';
import { Configuracao, PedidoDetalhado } from '../types/domain';
import { formatDate, formatCurrency, formatOrderItemsForDisplay } from '../utils/format';

export function montarMensagemCobranca(pedido: PedidoDetalhado, configuracao: Configuracao) {
  const bodyTemplate = configuracao.textoPadraoCobranca || '';
  const header = `🏴 COMUNICADO ${configuracao.nomeBar.toUpperCase()} 🍻`;
  const body = bodyTemplate
    .replaceAll('{data_do_pedido}', formatDate(pedido.dataPedido))
    .replaceAll('{chave_pix}', configuracao.chavePix || 'Chave PIX não configurada.')
    .replaceAll('{itens_consumidos_formatados}', formatOrderItemsForDisplay(pedido.itens))
    .replaceAll('{total_formatado}', formatCurrency(pedido.total));

  return `${header}\n\n${body}`;
}

export async function copiarMensagemCobranca(pedido: PedidoDetalhado, configuracao: Configuracao) {
  const message = montarMensagemCobranca(pedido, configuracao);
  await Clipboard.setStringAsync(message);
  return message;
}
