import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { AppButton } from '../components/AppButton';
import { ReturnToGuideButton } from '../components/ReturnToGuideButton';
import { StatCard } from '../components/StatCard';
import { PedidoCard } from '../components/PedidoCard';
import { theme } from '../constants/theme';
import { getConfiguracao } from '../repositories/configuracaoRepository';
import { listPedidosAbertos } from '../repositories/pedidosRepository';
import { getHomeStats } from '../services/relatoriosService';
import { formatCurrency } from '../utils/format';
import { EmptyState } from '../components/EmptyState';
import { PedidoDetalhado, Configuracao, HomeStats } from '../types/domain';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [pedidosAbertos, setPedidosAbertos] = useState<PedidoDetalhado[]>([]);

  const load = useCallback(async () => {
    const [currentConfig, currentStats, openOrders] = await Promise.all([
      getConfiguracao(),
      getHomeStats(),
      listPedidosAbertos(),
    ]);
    setConfiguracao(currentConfig);
    setStats(currentStats);
    setPedidosAbertos(openOrders);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <ScreenContainer>
      <ReturnToGuideButton />
      <SectionCard subtitle="Operação local-first para balcão, histórico e cobrança sem backend.">
        <Text style={styles.brand}>Abutres - Bar13</Text>
        <Text style={styles.barName}>{configuracao?.nomeBar ?? 'Bar13'}</Text>
        <Text style={styles.description}>Solução rápida e robusta para o Bar dos Abutres.</Text>
      </SectionCard>

      <View style={styles.grid}>
        <StatCard label="Pedidos hoje" value={String(stats?.pedidosHoje ?? 0)} />
        <StatCard label="Total hoje" value={formatCurrency(stats?.totalHoje ?? 0)} />
      </View>
      <View style={styles.grid}>
        <StatCard label="Pendentes hoje" value={formatCurrency(stats?.pendenteHoje ?? 0)} />
        <StatCard label="Abertos agora" value={String(stats?.abertos ?? 0)} />
      </View>

      <SectionCard title="Ações rápidas">
        <View style={styles.actionsColumn}>
          <AppButton label="Novo pedido" onPress={() => navigation.navigate('SelecionarIntegrante')} />
          <AppButton label="Pendentes de pagamento" onPress={() => navigation.navigate('HomeTabs', { screen: 'Pendentes' })} variant="secondary" />
          <AppButton label="Exportar CSVs" onPress={() => navigation.navigate('ExportacaoCsv')} variant="outline" />
          <AppButton label="Guia rápido" onPress={() => navigation.navigate('Ajuda')} variant="outline" />
        </View>
      </SectionCard>

      <SectionCard title="Pedidos em aberto" subtitle="Pedidos abertos continuam salvos localmente até serem fechados ou cancelados.">
        {pedidosAbertos.length === 0 ? (
          <EmptyState title="Nenhum pedido aberto" description="Ao iniciar um pedido ele aparecerá aqui para retomada rápida." />
        ) : (
          pedidosAbertos.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              footer={<AppButton label="Continuar pedido" onPress={() => navigation.navigate('NovoPedido', { pedidoId: pedido.id })} />}
            />
          ))
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: theme.colors.primary,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  barName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsColumn: {
    gap: 10,
  },
});
