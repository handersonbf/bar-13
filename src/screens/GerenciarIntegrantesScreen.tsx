import React, { useCallback, useDeferredValue, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { ScreenContainer } from '../components/ScreenContainer';
import { SearchInput } from '../components/SearchInput';
import { SectionCard } from '../components/SectionCard';
import { ReturnToGuideButton } from '../components/ReturnToGuideButton';
import { theme } from '../constants/theme';
import {
  createIntegrante,
  deleteIntegrante,
  listIntegrantes,
  updateIntegrante,
} from '../repositories/integrantesRepository';
import { Integrante, IntegranteInput } from '../types/domain';
import { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const emptyForm: IntegranteInput = {
  nome: '',
  patente: '',
};

export function GerenciarIntegrantesScreen() {
  const navigation = useNavigation<Navigation>();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [form, setForm] = useState<IntegranteInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await listIntegrantes(deferredSearch);
    setIntegrantes(data);
  }, [deferredSearch]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function updateField(field: keyof IntegranteInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave() {
    setSaving(true);

    try {
      if (editingId) {
        await updateIntegrante(editingId, form);
        Alert.alert('Integrante atualizado', 'Os dados foram salvos localmente.');
      } else {
        await createIntegrante(form);
        Alert.alert('Integrante cadastrado', 'O novo integrante já está disponível para novos pedidos.');
      }

      resetForm();
      await load();
    } catch (error) {
      Alert.alert(
        editingId ? 'Erro ao atualizar integrante' : 'Erro ao cadastrar integrante',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(integrante: Integrante) {
    setEditingId(integrante.id);
    setForm({
      nome: integrante.nome,
      patente: integrante.patente,
    });
  }

  function handleDelete(integrante: Integrante) {
    Alert.alert(
      'Excluir integrante',
      `Deseja remover ${integrante.nome}? Se ele já tiver pedidos no histórico, a exclusão será bloqueada para preservar os registros.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void deleteIntegrante(integrante.id)
              .then(async () => {
                if (editingId === integrante.id) {
                  resetForm();
                }

                await load();
                Alert.alert('Integrante excluído', 'O cadastro foi removido com sucesso.');
              })
              .catch((error) =>
                Alert.alert('Erro ao excluir integrante', error instanceof Error ? error.message : 'Tente novamente.')
              );
          },
        },
      ]
    );
  }

  return (
    <ScreenContainer>
      <ReturnToGuideButton />
      <SectionCard
        title={editingId ? 'Editar integrante' : 'Novo integrante'}
        subtitle="Cadastre manualmente quando precisar incluir, corrigir ou remover nomes sem depender do CSV."
      >
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={form.nome}
          onChangeText={(value) => updateField('nome', value)}
          placeholder="Ex.: João Silva"
          placeholderTextColor={theme.colors.textDim}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Patente</Text>
        <TextInput
          style={styles.input}
          value={form.patente}
          onChangeText={(value) => updateField('patente', value)}
          placeholder="Ex.: CB, SGT, TEN"
          placeholderTextColor={theme.colors.textDim}
          autoCapitalize="characters"
        />

        <View style={styles.formActionsRow}>
          <AppButton
            label={saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Cadastrar integrante'}
            onPress={() => void handleSave()}
            disabled={saving}
            style={styles.formActionButton}
          />
          <AppButton
            label={editingId ? 'Cancelar edição' : 'Importar CSV'}
            variant="outline"
            onPress={editingId ? resetForm : () => navigation.navigate('ImportacaoCsv', { mode: 'integrantes' })}
            style={styles.formActionButton}
          />
        </View>
      </SectionCard>

      <SectionCard title="Buscar integrante" subtitle="A busca filtra a lista em tempo real para facilitar correções rápidas no balcão.">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Digite o nome do integrante" />
      </SectionCard>

      <SectionCard
        title="Lista de integrantes"
        subtitle={`${integrantes.length} resultado(s) encontrado(s)${deferredSearch ? ' para a busca atual.' : '.'}`}
      >
        {integrantes.length === 0 ? (
          <EmptyState
            title="Nenhum integrante nessa lista"
            description="Cadastre manualmente acima, importe um CSV ou revise o texto digitado na busca."
          />
        ) : (
          integrantes.map((integrante) => (
            <View key={integrante.id} style={styles.memberCard}>
              <Pressable style={styles.memberInfo} onPress={() => handleEdit(integrante)}>
                <Text style={styles.memberName}>{integrante.nome}</Text>
                <Text style={styles.memberRank}>{integrante.patente}</Text>
              </Pressable>

              <View style={styles.memberActions}>
                <Pressable style={styles.memberActionButton} onPress={() => handleEdit(integrante)}>
                  <Text style={styles.memberActionText}>Editar</Text>
                </Pressable>
                <Pressable
                  style={[styles.memberActionButton, styles.memberDeleteButton]}
                  onPress={() => handleDelete(integrante)}
                >
                  <Text style={[styles.memberActionText, styles.memberDeleteText]}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  formActionButton: {
    flex: 1,
  },
  memberCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  memberInfo: {
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
  memberActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  memberActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A1908',
  },
  memberDeleteButton: {
    borderColor: '#9B2A3A',
    backgroundColor: theme.colors.accent,
  },
  memberActionText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  memberDeleteText: {
    color: theme.colors.text,
  },
});
