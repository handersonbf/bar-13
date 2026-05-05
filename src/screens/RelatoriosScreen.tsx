import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { PedidoCard } from '../components/PedidoCard';
import { EmptyState } from '../components/EmptyState';
import { AppButton } from '../components/AppButton';
import { ReturnToGuideButton } from '../components/ReturnToGuideButton';
import { StatCard } from '../components/StatCard';
import { usePeriodFilter } from '../hooks/usePeriodFilter';
import { getConsolidadoPeriodo, getResumoPeriodo, type RelatorioEstoqueItem } from '../services/relatoriosService';
import { PedidoDetalhado } from '../types/domain';
import { formatCurrency } from '../utils/format';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function RelatoriosScreen() {
  const navigation = useNavigation<Navigation>();
  const { periodo, activePresetDays, applyPreset, updateField } = usePeriodFilter(30);
  const [pedidos, setPedidos] = useState<PedidoDetalhado[]>([]);
  const [totais, setTotais] = useState({
    totalPedidos: 0,
    totalVendido: 0,
    totalPago: 0,
    totalPendente: 0,
    quantidadeDevedores: 0,
    quantidadeComprovantes: 0,
  });
  const [devedores, setDevedores] = useState<{ nome: string; patente: string; total: number; pedidos: number }[]>([]);
  const [consumo, setConsumo] = useState<{ item: string; quantidade: number; total: number }[]>([]);
  const [estoque, setEstoque] = useState<RelatorioEstoqueItem[]>([]);

  const load = useCallback(async () => {
    const [resumo, consolidado] = await Promise.all([getResumoPeriodo(periodo), getConsolidadoPeriodo(periodo)]);
    setPedidos(resumo.pedidos);
    setTotais({
      totalPedidos: resumo.totalPedidos,
      totalVendido: resumo.totalVendido,
      totalPago: resumo.totalPago,
      totalPendente: resumo.totalPendente,
      quantidadeDevedores: resumo.quantidadeDevedores,
      quantidadeComprovantes: consolidado.quantidadeComprovantes,
    });
    setDevedores(consolidado.devedoresAgrupados);
    setConsumo(consolidado.consumoAgrupado);
    setEstoque(consolidado.estoqueItens);
  }, [periodo]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <ScreenContainer>
      <ReturnToGuideButton />
      <SectionCard title="Relatório por período" subtitle="Os filtros aqui alimentam a mesma base usada na exportação CSV.">
        <DateRangeFilter
          periodo={periodo}
          activePresetDays={activePresetDays}
          onChange={updateField}
          onPreset={applyPreset}
        />
        <AppButton label="Abrir exportação CSV" variant="outline" onPress={() => navigation.navigate('ExportacaoCsv')} />
      </SectionCard>

      <View style={styles.grid}>
        <StatCard label="Pedidos" value={String(totais.totalPedidos)} />
        <StatCard label="Vendido" value={formatCurrency(totais.totalVendido)} />
      </View>
      <View style={styles.grid}>
        <StatCard label="Pago" value={formatCurrency(totais.totalPago)} />
        <StatCard label="Pendente" value={formatCurrency(totais.totalPendente)} />
      </View>
      <View style={styles.grid}>
        <StatCard label="Devedores" value={String(totais.quantidadeDevedores)} />
        <StatCard label="Comprovantes" value={String(totais.quantidadeComprovantes)} />
      </View>

      <SectionCard title="Pedidos no período">
        {pedidos.length === 0 ? (
          <EmptyState title="Sem pedidos no intervalo" description="Ajuste as datas ou registre novas vendas para alimentar os relatórios." />
        ) : (
          pedidos.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              footer={
                pedido.status !== 'ABERTO' || pedido.cancelado ? (
                  <AppButton
                    label={pedido.cancelado ? 'Ver cancelamento' : pedido.comprovanteNome ? 'Ver comprovante' : 'Abrir fechamento'}
                    variant="secondary"
                    onPress={() => navigation.navigate('FechamentoConta', { pedidoId: pedido.id })}
                  />
                ) : undefined
              }
            />
          ))
        )}
      </SectionCard>

      <SectionCard title="Consolidado de devedores" subtitle={`Quantidade de devedores no período: ${totais.quantidadeDevedores}`}>
        {devedores.length === 0 ? (
          <EmptyState title="Nenhum devedor no período" description="Quando houver pedidos pendentes, o consolidado aparecerá aqui." />
        ) : (
          devedores.map((devedor) => (
            <View style={styles.listRow} key={`${devedor.nome}-${devedor.patente}`}>
              <View>
                <Text style={styles.listTitle}>{devedor.nome}</Text>
                <Text style={styles.listSubtitle}>
                  {devedor.patente} • {devedor.pedidos} pedido(s)
                </Text>
              </View>
              <Text style={styles.listValue}>{formatCurrency(devedor.total)}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Resumo consolidado de consumo">
        {consumo.length === 0 ? (
          <EmptyState title="Sem consumo no período" description="O consolidado de itens vendidos aparecerá aqui." />
        ) : (
          consumo.map((item) => (
            <View style={styles.listRow} key={item.item}>
              <View>
                <Text style={styles.listTitle}>{item.item}</Text>
                <Text style={styles.listSubtitle}>{item.quantidade} unidade(s)</Text>
              </View>
              <Text style={styles.listValue}>{formatCurrency(item.total)}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Relatório de estoque" subtitle="Vendido calculado pelos pedidos do período; em estoque vem do cadastro atual.">
        {estoque.length === 0 ? (
          <EmptyState title="Sem itens cadastrados" description="Cadastre itens para acompanhar saída e saldo de estoque." />
        ) : (
          estoque.map((item) => (
            <View style={styles.stockRow} key={item.itemId}>
              <Text style={styles.listTitle}>{item.item}</Text>
              <View style={styles.stockNumbers}>
                <View style={styles.stockMetric}>
                  <Text style={styles.stockLabel}>Vendido</Text>
                  <Text style={styles.stockValue}>{item.vendido}</Text>
                </View>
                <View style={styles.stockMetric}>
                  <Text style={styles.stockLabel}>Em estoque</Text>
                  <Text style={[styles.stockValue, item.emEstoque <= 0 ? styles.stockEmpty : null]}>{item.emEstoque}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A2A',
  },
  listTitle: {
    color: '#F4F1EA',
    fontSize: 16,
    fontWeight: '800',
  },
  listSubtitle: {
    color: '#A7A29A',
    fontSize: 13,
  },
  listValue: {
    color: '#D4A437',
    fontSize: 15,
    fontWeight: '800',
  },
  stockRow: {
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A2A',
  },
  stockNumbers: {
    flexDirection: 'row',
    gap: 10,
  },
  stockMetric: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  stockLabel: {
    color: '#A7A29A',
    fontSize: 12,
    fontWeight: '700',
  },
  stockValue: {
    color: '#F4F1EA',
    fontSize: 18,
    fontWeight: '900',
  },
  stockEmpty: {
    color: '#C44545',
  },
});
