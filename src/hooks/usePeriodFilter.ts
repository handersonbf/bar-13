import { useState } from 'react';
import { PeriodoFiltro } from '../types/domain';
import { getDateRangePreset } from '../utils/date';

export function usePeriodFilter(initialDays = 30) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>(getDateRangePreset(initialDays));

  function applyPreset(days: number) {
    setPeriodo(getDateRangePreset(days));
  }

  function updateField(field: keyof PeriodoFiltro, value: string) {
    setPeriodo((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return {
    periodo,
    setPeriodo,
    applyPreset,
    updateField,
  };
}
