import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
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
import { CentralSendProgress, carregarResumoCentral, enviarCentralAgoraComOpcoes } from '../services/centralService';
import { getHomeStats } from '../services/relatoriosService';
import { formatCurrency } from '../utils/format';
import { EmptyState } from '../components/EmptyState';
import { CentralPushSummary, PedidoDetalhado, Configuracao, HomeStats } from '../types/domain';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [pedidosAbertos, setPedidosAbertos] = useState<PedidoDetalhado[]>([]);
  const [centralSummary, setCentralSummary] = useState<CentralPushSummary | null>(null);
  const [sendingCentral, setSendingCentral] = useState(false);
  const [centralProgress, setCentralProgress] = useState<CentralSendProgress | null>(null);

  const load = useCallback(async () => {
    const [currentConfig, currentStats, openOrders, currentCentralSummary] = await Promise.all([
      getConfiguracao(),
      getHomeStats(),
      listPedidosAbertos(),
      carregarResumoCentral(),
    ]);
    setConfiguracao(currentConfig);
    setStats(currentStats);
    setPedidosAbertos(openOrders);
    setCentralSummary(currentCentralSummary);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function handleNewOrder() {
    if (!configuracao?.operadorAtualSyncId) {
      Alert.alert(
        'Selecione o operador',
        'Defina quem está operando este aparelho antes de abrir um novo pedido.',
        [
          { text: 'Agora não', style: 'cancel' },
          {
            text: 'Abrir operadores',
            onPress: () => navigation.navigate('GerenciarOperadores'),
          },
        ]
      );
      return;
    }

    navigation.navigate('SelecionarIntegrante');
  }

  async function handleSendCentral() {
    setSendingCentral(true);
    setCentralProgress(null);

    try {
      const result = await enviarCentralAgoraComOpcoes({
        onProgress: (progress) => setCentralProgress(progress),
      });
      await load();
      Alert.alert(
        'Central atualizada',
        result.latestResponse
          ? `${result.latestResponse.ordersUpserted} pedido(s), ${result.latestResponse.orderItemsUpserted} item(ns) e ${result.latestResponse.auditEventsUpserted} evento(s) de auditoria foram enviados.`
          : `${result.sentBatches} lote(s) foram enviados para a central.`
      );
    } catch (error) {
      await load();
      Alert.alert('Falha ao enviar', error instanceof Error ? error.message : 'Não foi possível enviar para a central.');
    } finally {
      setCentralProgress(null);
      setSendingCentral(false);
    }
  }

  const centralButtonLabel = sendingCentral
    ? centralProgress
      ? `Enviando ${centralProgress.sentBatches}/${centralProgress.totalBatches} (${centralProgress.percentage}%)`
      : 'Enviando para a central...'
    : 'Enviar para a central';

  return (
    <ScreenContainer>
      <ReturnToGuideButton />
      <SectionCard subtitle="Operação local-first para balcão, histórico e cobrança sem backend.">
        <Text style={styles.brand}>Abutres - Bar13</Text>
        <Text style={styles.barName}>{configuracao?.nomeBar ?? 'Bar13'}</Text>
        <Text style={styles.description}>Solução rápida e robusta para o Bar dos Abutres.</Text>
        <Text style={styles.operatorBadge}>
          Operador atual: {configuracao?.operadorAtualNome ? configuracao.operadorAtualNome : 'Nenhum selecionado'}
        </Text>
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
          <AppButton label="Novo pedido" onPress={handleNewOrder} />
          <AppButton label="Pendentes de pagamento" onPress={() => navigation.navigate('HomeTabs', { screen: 'Pendentes' })} variant="secondary" />
          <AppButton
            label={centralButtonLabel}
            onPress={() => void handleSendCentral()}
            variant="secondary"
            loading={sendingCentral}
            disabled={sendingCentral}
          />
          <AppButton label="Exportar CSVs" onPress={() => navigation.navigate('ExportacaoCsv')} variant="outline" />
          <AppButton label="Guia rápido" onPress={() => navigation.navigate('Ajuda')} variant="outline" />
        </View>
        <Text style={styles.centralHint}>
          {centralSummary?.configured
            ? `Central configurada${centralSummary.pendingBatches > 0 ? ` • ${centralSummary.pendingBatches} lote(s) pendente(s)` : ''}.`
            : 'Central ainda não configurada em Configurações.'}
        </Text>
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
  operatorBadge: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsColumn: {
    gap: 10,
  },
  centralHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
