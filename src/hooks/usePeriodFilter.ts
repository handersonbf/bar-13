import { useState } from 'react';
import { PeriodoFiltro } from '../types/domain';
import { getDateRangePreset } from '../utils/date';

export type PeriodPresetDays = 1 | 7 | 30;

function isPeriodPresetDays(value: number): value is PeriodPresetDays {
  return value === 1 || value === 7 || value === 30;
}

export function usePeriodFilter(initialDays: PeriodPresetDays = 30) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>(getDateRangePreset(initialDays));
  const [activePresetDays, setActivePresetDays] = useState<PeriodPresetDays | null>(
    isPeriodPresetDays(initialDays) ? initialDays : null
  );

  function applyPreset(days: PeriodPresetDays) {
    setPeriodo(getDateRangePreset(days));
    setActivePresetDays(days);
  }

  function updateField(field: keyof PeriodoFiltro, value: string) {
    setPeriodo((current) => ({
      ...current,
      [field]: value,
    }));
    setActivePresetDays(null);
  }

  return {
    periodo,
    activePresetDays,
    setPeriodo,
    applyPreset,
    updateField,
  };
}
