import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PedidoItem } from '../types/domain';
import { formatCurrency } from '../utils/format';
import { theme } from '../constants/theme';

interface OrderItemRowProps {
  item: PedidoItem;
  locked?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}

export function OrderItemRow({ item, locked = false, onAdd, onRemove }: OrderItemRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.nomeItemSnapshot}</Text>
        <Text style={styles.meta}>
          {item.quantidade}x • {formatCurrency(item.valorUnitarioSnapshot)}
        </Text>
      </View>
      <View style={styles.actions}>
        {!locked ? (
          <>
            <Pressable style={styles.control} onPress={onRemove}>
              <Text style={styles.controlText}>-</Text>
            </Pressable>
            <Pressable style={styles.control} onPress={onAdd}>
              <Text style={styles.controlText}>+</Text>
            </Pressable>
          </>
        ) : null}
        <Text style={styles.total}>{formatCurrency(item.subtotal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  control: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  total: {
    minWidth: 84,
    textAlign: 'right',
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
});
