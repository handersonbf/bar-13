import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { PedidoCard } from '../components/PedidoCard';
import { ReturnToGuideButton } from '../components/ReturnToGuideButton';
import { listPedidosPorData } from '../repositories/pedidosRepository';
import { PedidoDetalhado } from '../types/domain';
import { getTodayDate, shiftDate } from '../utils/date';
import { formatCurrency, formatDate } from '../utils/format';
import { theme } from '../constants/theme';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function HistoricoScreen() {
  const navigation = useNavigation<Navigation>();
  const [date, setDate] = useState(getTodayDate());
  const [pedidos, setPedidos] = useState<PedidoDetalhado[]>([]);

  const load = useCallback(async () => {
    const orders = await listPedidosPorData(date);
    setPedidos(orders);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const totalDia = pedidos.reduce((accumulator, pedido) => accumulator + pedido.total, 0);

  return (
    <ScreenContainer>
      <ReturnToGuideButton />
      <SectionCard title="Histórico por data">
        <Text style={styles.dateLabel}>{formatDate(date)}</Text>
        <View style={styles.actionsRow}>
          <AppButton label="Dia anterior" variant="secondary" onPress={() => setDate((current) => shiftDate(current, -1))} style={styles.flexButton} />
          <AppButton label="Hoje" variant="outline" onPress={() => setDate(getTodayDate())} style={styles.flexButton} />
          <AppButton label="Próximo dia" variant="secondary" onPress={() => setDate((current) => shiftDate(current, 1))} style={styles.flexButton} />
        </View>
        <Text style={styles.summary}>Pedidos: {pedidos.length} • Total: {formatCurrency(totalDia)}</Text>
      </SectionCard>

      {pedidos.length === 0 ? (
        <EmptyState title="Nenhuma venda nesta data" description="Quando houver pedidos salvos para o dia, eles aparecerão aqui agrupados pelo filtro atual." />
      ) : (
        pedidos.map((pedido) => (
          <PedidoCard
            key={pedido.id}
            pedido={pedido}
            footer={
              <AppButton
                label={
                  pedido.cancelado
                    ? 'Ver cancelamento'
                    : pedido.status === 'PAGO'
                      ? 'Ver comprovante'
                      : pedido.status === 'ABERTO'
                        ? 'Continuar pedido'
                        : 'Abrir fechamento'
                }
                onPress={() =>
                  pedido.status === 'ABERTO' && !pedido.cancelado
                    ? navigation.navigate('NovoPedido', { pedidoId: pedido.id })
                    : navigation.navigate('FechamentoConta', { pedidoId: pedido.id })
                }
                variant="secondary"
              />
            }
          />
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  dateLabel: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flexButton: {
    flex: 1,
  },
  summary: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
});
