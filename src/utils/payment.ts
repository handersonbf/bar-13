import { type PaymentMethod, type PaymentMethodWithProof } from '../types/domain';

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de crédito',
};

export const proofPaymentMethodLabels: Record<PaymentMethodWithProof, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de crédito',
};

export function formatPaymentMethod(method: PaymentMethod | '') {
  return method ? paymentMethodLabels[method] : 'Não informado';
}
