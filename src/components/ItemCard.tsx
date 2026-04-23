import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ItemBar } from '../types/domain';
import { formatCurrency } from '../utils/format';
import { theme } from '../constants/theme';

interface ItemCardProps {
  item: ItemBar;
  onPress: () => void;
  disabled?: boolean;
}

export function ItemCard({ item, onPress, disabled = false }: ItemCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && !disabled ? styles.pressed : null, disabled ? styles.disabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.content}>
        <Text style={styles.name}>{item.nome}</Text>
        <Text style={styles.price}>{formatCurrency(item.valor)}</Text>
        <Text style={[styles.stock, item.qtdEstoque <= 0 ? styles.stockEmpty : null]}>
          Estoque: {item.qtdEstoque}
        </Text>
      </View>
      <Text style={styles.action}>{item.qtdEstoque <= 0 ? 'Esgotado' : 'Toque para adicionar'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    minHeight: 132,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  pressed: {
    borderColor: theme.colors.primary,
    backgroundColor: '#21180B',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  price: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  stock: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  stockEmpty: {
    color: theme.colors.danger,
  },
  action: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
