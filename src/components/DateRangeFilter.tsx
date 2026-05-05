import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PeriodoFiltro } from '../types/domain';
import { theme } from '../constants/theme';
import { AppButton } from './AppButton';
import { type PeriodPresetDays } from '../hooks/usePeriodFilter';

interface DateRangeFilterProps {
  periodo: PeriodoFiltro;
  onChange: (field: keyof PeriodoFiltro, value: string) => void;
  onPreset: (days: PeriodPresetDays) => void;
  activePresetDays?: PeriodPresetDays | null;
}

const presets: { days: PeriodPresetDays; label: string; description: string }[] = [
  { days: 1, label: 'Hoje', description: 'Hoje' },
  { days: 7, label: '7 dias', description: 'Últimos 7 dias' },
  { days: 30, label: '30 dias', description: 'Últimos 30 dias' },
];

export function DateRangeFilter({ periodo, onChange, onPreset, activePresetDays }: DateRangeFilterProps) {
  const activePreset = presets.find((preset) => preset.days === activePresetDays);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Período</Text>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Data inicial</Text>
          <TextInput
            style={[styles.input, activePreset ? styles.inputFromPreset : null]}
            value={periodo.dataInicial}
            onChangeText={(value) => onChange('dataInicial', value)}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={theme.colors.textDim}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Data final</Text>
          <TextInput
            style={[styles.input, activePreset ? styles.inputFromPreset : null]}
            value={periodo.dataFinal}
            onChangeText={(value) => onChange('dataFinal', value)}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={theme.colors.textDim}
          />
        </View>
      </View>
      <View style={styles.buttonsRow}>
        {presets.map((preset) => {
          const isActive = preset.days === activePresetDays;

          return (
            <AppButton
              key={preset.days}
              label={preset.label}
              onPress={() => onPreset(preset.days)}
              variant={isActive ? 'primary' : 'secondary'}
              style={styles.smallButton}
            />
          );
        })}
      </View>
      <Text style={[styles.helper, activePreset ? styles.helperActive : null]}>
        {activePreset ? `Período selecionado: ${activePreset.description}` : 'Período definido manualmente'}
      </Text>
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
  inputFromPreset: {
    borderColor: theme.colors.primary,
    backgroundColor: '#221B0E',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    flex: 1,
  },
  helper: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  helperActive: {
    color: theme.colors.primary,
  },
});
