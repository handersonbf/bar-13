import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PeriodoFiltro } from '../types/domain';
import { theme } from '../constants/theme';
import { AppButton } from './AppButton';

interface DateRangeFilterProps {
  periodo: PeriodoFiltro;
  onChange: (field: keyof PeriodoFiltro, value: string) => void;
  onPreset: (days: number) => void;
}

export function DateRangeFilter({ periodo, onChange, onPreset }: DateRangeFilterProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Período</Text>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Data inicial</Text>
          <TextInput
            style={styles.input}
            value={periodo.dataInicial}
            onChangeText={(value) => onChange('dataInicial', value)}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={theme.colors.textDim}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Data final</Text>
          <TextInput
            style={styles.input}
            value={periodo.dataFinal}
            onChangeText={(value) => onChange('dataFinal', value)}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={theme.colors.textDim}
          />
        </View>
      </View>
      <View style={styles.buttonsRow}>
        <AppButton label="Hoje" onPress={() => onPreset(1)} variant="secondary" style={styles.smallButton} />
        <AppButton label="7 dias" onPress={() => onPreset(7)} variant="secondary" style={styles.smallButton} />
        <AppButton label="30 dias" onPress={() => onPreset(30)} variant="secondary" style={styles.smallButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  label: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.text,
    paddingHorizontal: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    flex: 1,
  },
});
