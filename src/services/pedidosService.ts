import { Integrante, ItemBar } from '../types/domain';
import {
  createOpenOrder,
  decrementPedidoItem,
  deletePedidoAberto,
  fecharPedido,
  getPedidoById,
  incrementPedidoItem,
  marcarPedidoComoPago,
  reabrirPedido,
  substituirComprovantePedido,
} from '../repositories/pedidosRepository';

export async function iniciarPedido(integrante: Integrante) {
  return createOpenOrder(integrante);
}

export async function adicionarItemAoPedido(orderId: number, item: ItemBar) {
  return incrementPedidoItem(orderId, item);
}

export async function removerUnidadeDoPedido(orderItemId: number) {
  return decrementPedidoItem(orderItemId);
}

export async function cancelarPedido(orderId: number) {
  return deletePedidoAberto(orderId);
}

export async function concluirPedido(orderId: number) {
  return fecharPedido(orderId);
}

export async function reabrirConta(orderId: number) {
  return reabrirPedido(orderId);
}

export async function pagarPedido(orderId: number, comprovante: { uri: string; nome: string; mimeType: string }) {
  return marcarPedidoComoPago(orderId, { metodo: 'PIX', comprovante });
}

export async function pagarPedidoEmDinheiro(orderId: number) {
  return marcarPedidoComoPago(orderId, { metodo: 'DINHEIRO' });
}

export async function trocarComprovantePedido(orderId: number, comprovante: { uri: string; nome: string; mimeType: string }) {
  return substituirComprovantePedido(orderId, comprovante);
}

export async function carregarPedido(orderId: number) {
  const pedido = await getPedidoById(orderId);
  if (!pedido) {
    throw new Error('Pedido não encontrado.');
  }
  return pedido;
}
