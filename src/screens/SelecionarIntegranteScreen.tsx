import React, { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ScreenContainer } from '../components/ScreenContainer';
import { SearchInput } from '../components/SearchInput';
import { SectionCard } from '../components/SectionCard';
import { AppButton } from '../components/AppButton';
import { theme } from '../constants/theme';
import { Integrante } from '../types/domain';
import { listIntegrantes } from '../repositories/integrantesRepository';
import { iniciarPedido } from '../services/pedidosService';
import { EmptyState } from '../components/EmptyState';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function SelecionarIntegranteScreen() {
  const navigation = useNavigation<Navigation>();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);

  const load = useCallback(async () => {
    const data = await listIntegrantes(deferredSearch);
    setIntegrantes(data);
  }, [deferredSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSelectMember(integrante: Integrante) {
    try {
      const pedidoId = await iniciarPedido(integrante);
      navigation.replace('NovoPedido', { pedidoId });
    } catch (error) {
      Alert.alert('Erro ao iniciar pedido', error instanceof Error ? error.message : 'Tente novamente.');
    }
  }

  return (
    <ScreenContainer>
      <SectionCard title="Buscar integrante" subtitle="Digite o nome e a lista filtra automaticamente enquanto você escreve.">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Nome do integrante" />
        <View style={styles.quickActionsRow}>
          <AppButton
            label="Cadastrar integrante"
            variant="outline"
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('GerenciarIntegrantes')}
          />
          <AppButton
            label="Importar CSV"
            variant="secondary"
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('ImportacaoCsv', { mode: 'integrantes' })}
          />
        </View>
      </SectionCard>

      <SectionCard title="Integrantes disponíveis">
        {integrantes.length === 0 ? (
          <>
            <EmptyState
              title="Nenhum integrante encontrado"
              description="Cadastre manualmente um integrante, importe um CSV ou ajuste a busca digitada."
            />
            <AppButton label="Cadastrar integrante" onPress={() => navigation.navigate('GerenciarIntegrantes')} variant="outline" />
            <AppButton label="Importar integrantes" onPress={() => navigation.navigate('ImportacaoCsv', { mode: 'integrantes' })} />
          </>
        ) : (
          integrantes.map((integrante) => (
            <Pressable key={integrante.id} style={styles.memberCard} onPress={() => void handleSelectMember(integrante)}>
              <View style={styles.memberContent}>
                <Text style={styles.memberName}>{integrante.nome}</Text>
                <Text style={styles.memberRank}>{integrante.patente}</Text>
              </View>
              <Text style={styles.memberAction}>Selecionar</Text>
            </Pressable>
          ))
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  quickActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  quickActionButton: {
    flex: 1,
  },
  memberCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberContent: {
    gap: 4,
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  memberRank: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  memberAction: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
