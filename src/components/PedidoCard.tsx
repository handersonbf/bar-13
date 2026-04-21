import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OrderStatus, PedidoDetalhado } from '../types/domain';
import { formatCurrency, formatDate } from '../utils/format';
import { theme } from '../constants/theme';

const statusLabels: Record<OrderStatus | 'CANCELADO', string> = {
  ABERTO: 'Aberto',
  FECHADO_AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
};

const statusColors: Record<OrderStatus | 'CANCELADO', string> = {
  ABERTO: theme.colors.warning,
  FECHADO_AGUARDANDO_PAGAMENTO: theme.colors.accent,
  PAGO: theme.colors.success,
  CANCELADO: theme.colors.textDim,
};

interface PedidoCardProps {
  pedido: PedidoDetalhado;
  footer?: React.ReactNode;
}

export function PedidoCard({ pedido, footer }: PedidoCardProps) {
  const effectiveStatus = pedido.cancelado ? 'CANCELADO' : pedido.status;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{pedido.nomeIntegranteSnapshot}</Text>
          <Text style={styles.meta}>
            {pedido.patenteIntegranteSnapshot} • {formatDate(pedido.dataPedido)} • {pedido.horaPedido.slice(0, 5)}
          </Text>
        </View>
        <View style={[styles.statusChip, { borderColor: statusColors[effectiveStatus] }]}>
          <Text style={[styles.statusText, { color: statusColors[effectiveStatus] }]}>{statusLabels[effectiveStatus]}</Text>
        </View>
      </View>

      <View style={styles.itemsList}>
        {pedido.itens.map((item) => (
          <Text style={styles.itemText} key={item.id}>
            {item.quantidade}x {item.nomeItemSnapshot} • {formatCurrency(item.subtotal)}
          </Text>
        ))}
      </View>

      <Text style={styles.total}>Total: {formatCurrency(pedido.total)}</Text>
      {pedido.comprovanteNome ? <Text style={styles.proof}>Comprovante: {pedido.comprovanteNome}</Text> : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  itemsList: {
    gap: 4,
  },
  itemText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  total: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  proof: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    gap: 10,
  },
});
