import React, { useCallback, useDeferredValue, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { ReturnToGuideButton } from '../components/ReturnToGuideButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SearchInput } from '../components/SearchInput';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import {
  createOperador,
  definirOperadorAtual,
  getOperadorAtual,
  limparOperadorAtual,
  listOperadores,
  updateOperador,
  updateOperadorAtivo,
} from '../repositories/operatorsRepository';
import { Operador, OperadorInput } from '../types/domain';

const emptyForm: OperadorInput = {
  nome: '',
};

export function GerenciarOperadoresScreen() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [form, setForm] = useState<OperadorInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [operadorAtualSyncId, setOperadorAtualSyncId] = useState('');
  const [operadorAtualNome, setOperadorAtualNome] = useState('');

  const load = useCallback(async () => {
    const [currentOperadores, currentOperator] = await Promise.all([
      listOperadores(deferredSearch, true),
      getOperadorAtual(),
    ]);
    setOperadores(currentOperadores);
    setOperadorAtualSyncId(currentOperator.operadorAtualSyncId);
    setOperadorAtualNome(currentOperator.operadorAtualNome);
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

  function updateField(field: keyof OperadorInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave() {
    setSaving(true);

    try {
      if (editingId) {
        await updateOperador(editingId, form);
        Alert.alert('Operador atualizado', 'Os dados do operador foram salvos localmente.');
      } else {
        await createOperador(form);
        Alert.alert('Operador cadastrado', 'O novo operador já pode assumir este aparelho.');
      }

      resetForm();
      await load();
    } catch (error) {
      Alert.alert(
        editingId ? 'Erro ao atualizar operador' : 'Erro ao cadastrar operador',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(operador: Operador) {
    setEditingId(operador.id);
    setForm({
      nome: operador.nome,
    });
  }

  async function handleAssumirAparelho(operador: Operador) {
    try {
      await definirOperadorAtual(operador.syncId);
      await load();
      Alert.alert('Operador selecionado', `${operador.nome} agora está operando este aparelho.`);
    } catch (error) {
      Alert.alert('Erro ao selecionar operador', error instanceof Error ? error.message : 'Tente novamente.');
    }
  }

  function handleToggleAtivo(operador: Operador) {
    const nextAtivo = !operador.ativo;
    const successMessage = nextAtivo
      ? `${operador.nome} voltou a aparecer como opção de operador.`
      : `${operador.nome} foi removido da seleção ativa com sucesso.`;

    Alert.alert(
      `${nextAtivo ? 'Reativar' : 'Desativar'} operador`,
      nextAtivo
        ? `${operador.nome} voltará a aparecer na seleção do aparelho.`
        : `${operador.nome} deixará de aparecer na seleção. Se ele estiver operando este aparelho agora, a seleção atual será limpa.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: nextAtivo ? 'Reativar' : 'Desativar',
          onPress: () => {
            void updateOperadorAtivo(operador.id, nextAtivo)
              .then(() => load())
              .then(() => {
                Alert.alert('Operador atualizado', successMessage);
              })
              .catch((error) =>
                Alert.alert('Erro ao atualizar operador', error instanceof Error ? error.message : 'Tente novamente.')
              );
          },
        },
      ]
    );
  }

  function handleClearCurrentOperator() {
    Alert.alert('Limpar operador atual', 'Este aparelho ficará sem operador definido até que alguém assuma novamente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar agora',
        style: 'destructive',
        onPress: () => {
          void limparOperadorAtual()
            .then(() => load())
            .then(() => {
              Alert.alert('Operador removido', 'Este aparelho ficou sem operador ativo.');
            })
            .catch((error) =>
              Alert.alert('Erro ao limpar operador', error instanceof Error ? error.message : 'Tente novamente.')
            );
        },
      },
    ]);
  }

  return (
    <ScreenContainer>
      <ReturnToGuideButton />

      <SectionCard
        title="Operador deste aparelho"
        subtitle="Escolha quem está atendendo agora. Esse nome passa a valer para novos pedidos e para a trilha de auditoria."
      >
        {operadorAtualSyncId ? (
          <>
            <Text style={styles.currentOperatorName}>{operadorAtualNome}</Text>
            <Text style={styles.currentOperatorHint}>Operador atual selecionado neste aparelho.</Text>
            <AppButton label="Limpar operador atual" variant="outline" onPress={handleClearCurrentOperator} />
          </>
        ) : (
          <EmptyState
            title="Nenhum operador selecionado"
            description="Selecione um operador ativo abaixo antes de abrir ou alterar pedidos neste aparelho."
          />
        )}
      </SectionCard>

      <SectionCard
        title={editingId ? 'Editar operador' : 'Novo operador'}
        subtitle="Cadastre a equipe uma vez no aparelho mestre e depois distribua pelos demais usando a sincronização operacional."
      >
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={form.nome}
          onChangeText={(value) => updateField('nome', value)}
          placeholder="Ex.: João, Maria, Pedro"
          placeholderTextColor={theme.colors.textDim}
          autoCapitalize="words"
        />

        <View style={styles.formActionsRow}>
          <AppButton
            label={saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Cadastrar operador'}
            onPress={() => void handleSave()}
            disabled={saving}
            style={styles.formActionButton}
          />
          <AppButton
            label={editingId ? 'Cancelar edição' : 'Limpar'}
            variant="outline"
            onPress={resetForm}
            style={styles.formActionButton}
          />
        </View>
      </SectionCard>

      <SectionCard title="Buscar operador" subtitle="Filtre a lista em tempo real para assumir o aparelho ou corrigir um cadastro.">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Digite o nome do operador" />
      </SectionCard>

      <SectionCard
        title="Equipe cadastrada"
        subtitle={`${operadores.length} operador(es) encontrado(s)${deferredSearch ? ' para a busca atual.' : '.'}`}
      >
        {operadores.length === 0 ? (
          <EmptyState
            title="Nenhum operador nessa lista"
            description="Cadastre a equipe acima para habilitar ranking, auditoria e a seleção do aparelho."
          />
        ) : (
          operadores.map((operador) => {
            const isCurrentOperator = operador.syncId === operadorAtualSyncId;

            return (
              <View key={operador.id} style={styles.operatorCard}>
                <Pressable style={styles.operatorInfo} onPress={() => handleEdit(operador)}>
                  <Text style={styles.operatorName}>{operador.nome}</Text>
                  <Text style={[styles.operatorMeta, !operador.ativo ? styles.operatorInactive : null]}>
                    {operador.ativo ? 'Ativo' : 'Inativo'}
                    {isCurrentOperator ? ' • Operando este aparelho' : ''}
                  </Text>
                </Pressable>

                <View style={styles.operatorActions}>
                  <Pressable
                    style={[styles.operatorActionButton, !operador.ativo ? styles.operatorActionDisabled : null]}
                    onPress={() => void handleAssumirAparelho(operador)}
                    disabled={!operador.ativo}
                  >
                    <Text style={styles.operatorActionText}>{isCurrentOperator ? 'Selecionado' : 'Assumir aparelho'}</Text>
                  </Pressable>
                  <Pressable style={styles.operatorActionButton} onPress={() => handleEdit(operador)}>
                    <Text style={styles.operatorActionText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.operatorActionButton, styles.operatorToggleButton]}
                    onPress={() => handleToggleAtivo(operador)}
                  >
                    <Text style={styles.operatorToggleText}>{operador.ativo ? 'Desativar' : 'Reativar'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
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
  currentOperatorName: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  currentOperatorHint: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  operatorCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  operatorInfo: {
    gap: 4,
  },
  operatorName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  operatorMeta: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  operatorInactive: {
    color: theme.colors.accent,
  },
  operatorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  operatorActionButton: {
    flexGrow: 1,
    minHeight: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A1908',
    paddingHorizontal: 12,
  },
  operatorActionDisabled: {
    opacity: 0.45,
  },
  operatorToggleButton: {
    borderColor: theme.colors.accent,
    backgroundColor: '#311217',
  },
  operatorActionText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  operatorToggleText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
});
