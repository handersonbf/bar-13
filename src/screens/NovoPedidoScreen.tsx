import React, { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { SearchInput } from '../components/SearchInput';
import { ItemCard } from '../components/ItemCard';
import { OrderItemRow } from '../components/OrderItemRow';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { listItens } from '../repositories/itensRepository';
import { adicionarItemAoPedido, cancelarPedido, carregarPedido, concluirPedido, removerUnidadeDoPedido } from '../services/pedidosService';
import { ItemBar, PedidoDetalhado } from '../types/domain';
import { formatCurrency } from '../utils/format';
import { theme } from '../constants/theme';

type Route = RouteProp<RootStackParamList, 'NovoPedido'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function NovoPedidoScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
  const [itens, setItens] = useState<ItemBar[]>([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    const [currentPedido, availableItems] = await Promise.all([
      carregarPedido(route.params.pedidoId),
      listItens(deferredSearch),
    ]);
    setPedido(currentPedido);
    setItens(availableItems);
  }, [deferredSearch, route.params.pedidoId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAddItem(item: ItemBar) {
    try {
      if (item.qtdEstoque <= 0) {
        Alert.alert('Item sem estoque', `${item.nome} está esgotado no momento.`);
        return;
      }

      await adicionarItemAoPedido(route.params.pedidoId, item);
      setFeedback(`+ ${item.nome} adicionado`);
      await load();
    } catch (error) {
      Alert.alert('Erro ao adicionar item', error instanceof Error ? error.message : 'Tente novamente.');
    }
  }

  async function handleRemove(orderItemId: number) {
    await removerUnidadeDoPedido(orderItemId);
    const updated = await carregarPedido(route.params.pedidoId);

    if (updated.cancelado) {
      Alert.alert('Pedido cancelado', 'O último item foi removido e o pedido ficou salvo como cancelado.');
      navigation.popToTop();
      return;
    }

    setPedido(updated);
    const availableItems = await listItens(deferredSearch);
    setItens(availableItems);
  }

  async function handleCloseOrder() {
    try {
      if (!pedido) {
        return;
      }
      await concluirPedido(pedido.id);
      navigation.replace('FechamentoConta', { pedidoId: pedido.id });
    } catch (error) {
      Alert.alert('Não foi possível fechar o pedido', error instanceof Error ? error.message : 'Tente novamente.');
    }
  }

  async function handleCancelOrder() {
    if (!pedido) {
      return;
    }

    Alert.alert('Cancelar pedido', 'Esse pedido aberto será removido da base local. Deseja continuar?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, cancelar',
        style: 'destructive',
        onPress: () => {
          void cancelarPedido(pedido.id)
            .then(() => navigation.popToTop())
            .catch((error) =>
              Alert.alert('Erro ao cancelar', error instanceof Error ? error.message : 'Não foi possível cancelar.')
            );
        },
      },
    ]);
  }

  if (!pedido) {
    return (
      <ScreenContainer>
        <EmptyState title="Carregando pedido" description="Buscando dados do pedido aberto no SQLite local." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionCard title={pedido.nomeIntegranteSnapshot} subtitle={`${pedido.patenteIntegranteSnapshot} • Pedido ${pedido.id}`}>
        <Text style={styles.summary}>Data {pedido.dataPedido} • Hora {pedido.horaPedido.slice(0, 5)}</Text>
        <Text style={styles.total}>Total em tempo real: {formatCurrency(pedido.total)}</Text>
      </SectionCard>

      <SectionCard title="Buscar item" subtitle="Os itens ficam em cards clicáveis para operação rápida no balcão.">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Nome ou número do item" />
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        <View style={styles.itemsGrid}>
          {itens.map((item) => (
            <ItemCard key={item.id} item={item} onPress={() => void handleAddItem(item)} disabled={item.qtdEstoque <= 0} />
          ))}
        </View>
        {itens.length === 0 ? <EmptyState title="Nenhum item encontrado" description="Importe o CSV de itens ou refine a busca digitada." /> : null}
      </SectionCard>

      <SectionCard title="Itens do pedido">
        {pedido.itens.length === 0 ? (
          <EmptyState title="Pedido sem itens" description="Adicione itens pelos cards antes de fechar a conta." />
        ) : (
          pedido.itens.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              onAdd={() => {
                const match = itens.find((availableItem) => availableItem.id === item.itemId);
                if (match) {
                  void handleAddItem(match);
                }
              }}
              onRemove={() => void handleRemove(item.id)}
            />
          ))
        )}
      </SectionCard>

      <View style={styles.footerActions}>
        <AppButton label="Cancelar pedido" variant="danger" onPress={handleCancelOrder} />
        <AppButton label="Fechar conta" onPress={handleCloseOrder} disabled={pedido.itens.length === 0} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summary: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  total: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  feedback: {
    color: theme.colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerActions: {
    gap: 10,
    paddingBottom: 20,
  },
});
