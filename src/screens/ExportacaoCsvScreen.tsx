import React from 'react';
import { Alert } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { AppButton } from '../components/AppButton';
import { usePeriodFilter } from '../hooks/usePeriodFilter';
import { exportarConsolidadoPeriodo, exportarDevedoresPeriodo, exportarVendasPeriodo } from '../services/exportacaoCsvService';

export function ExportacaoCsvScreen() {
  const { periodo, applyPreset, updateField } = usePeriodFilter(30);

  async function handleExport(action: () => Promise<string>, label: string) {
    try {
      const uri = await action();
      Alert.alert('CSV gerado', `${label} salvo localmente e compartilhado quando disponível.\n\n${uri}`);
    } catch (error) {
      Alert.alert('Erro na exportação', error instanceof Error ? error.message : 'Não foi possível gerar o CSV.');
    }
  }

  return (
    <ScreenContainer>
      <SectionCard title="Exportação CSV" subtitle="As datas abaixo controlam vendas, devedores e consolidado.">
        <DateRangeFilter periodo={periodo} onChange={updateField} onPreset={applyPreset} />
      </SectionCard>

      <SectionCard title="Arquivos disponíveis">
        <AppButton label="Exportar vendas por período" onPress={() => void handleExport(() => exportarVendasPeriodo(periodo), 'CSV de vendas')} />
        <AppButton label="Exportar devedores por período" variant="secondary" onPress={() => void handleExport(() => exportarDevedoresPeriodo(periodo), 'CSV de devedores')} />
        <AppButton label="Exportar consolidado por período" variant="outline" onPress={() => void handleExport(() => exportarConsolidadoPeriodo(periodo), 'CSV consolidado')} />
      </SectionCard>
    </ScreenContainer>
  );
}
