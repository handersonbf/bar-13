import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { PedidoCard } from '../components/PedidoCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { ReturnToGuideButton } from '../components/ReturnToGuideButton';
import { usePeriodFilter } from '../hooks/usePeriodFilter';
import { Configuracao, PedidoDetalhado } from '../types/domain';
import { getPendentesPeriodo } from '../services/relatoriosService';
import { getConfiguracao } from '../repositories/configuracaoRepository';
import { copiarMensagemCobranca } from '../services/cobrancaService';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function PendentesScreen() {
  const navigation = useNavigation<Navigation>();
  const { periodo, activePresetDays, applyPreset, updateField } = usePeriodFilter(30);
  const [pedidos, setPedidos] = useState<PedidoDetalhado[]>([]);
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);

  const load = useCallback(async () => {
    const [pendingOrders, config] = await Promise.all([getPendentesPeriodo(periodo), getConfiguracao()]);
    setPedidos(pendingOrders);
    setConfiguracao(config);
  }, [periodo]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleCopy(pedido: PedidoDetalhado) {
    if (!configuracao) {
      return;
    }

    await copiarMensagemCobranca(pedido, configuracao);
    Alert.alert('Mensagem copiada', 'A cobrança foi copiada com um toque.');
  }

  return (
    <ScreenContainer>
      <ReturnToGuideButton />
      <SectionCard title="Pendentes de pagamento" subtitle="Lista de contas fechadas aguardando marcação manual como PAGO.">
        <DateRangeFilter
          periodo={periodo}
          activePresetDays={activePresetDays}
          onChange={updateField}
          onPreset={applyPreset}
        />
      </SectionCard>

      {pedidos.length === 0 ? (
        <EmptyState title="Nenhum pendente encontrado" description="O período atual não possui contas aguardando pagamento." />
      ) : (
        pedidos.map((pedido) => (
          <PedidoCard
            key={pedido.id}
            pedido={pedido}
            footer={
              <>
                <AppButton label="Copiar mensagem" variant="secondary" onPress={() => void handleCopy(pedido)} />
                <AppButton label="Abrir pagamento" onPress={() => navigation.navigate('FechamentoConta', { pedidoId: pedido.id })} />
              </>
            }
          />
        ))
      )}
    </ScreenContainer>
  );
}
