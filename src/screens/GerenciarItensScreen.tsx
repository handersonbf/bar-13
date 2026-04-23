import React, { useCallback, useDeferredValue, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { ScreenContainer } from '../components/ScreenContainer';
import { SearchInput } from '../components/SearchInput';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import { createItem, deleteItem, listItens, updateItem } from '../repositories/itensRepository';
import { ItemBar, ItemBarInput } from '../types/domain';
import { RootStackParamList } from '../types/navigation';
import { formatCurrency } from '../utils/format';
import { parseCurrencyInput } from '../utils/validation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type ItemFormState = {
  nome: string;
  valor: string;
  qtdEstoque: string;
};

const emptyForm: ItemFormState = {
  nome: '',
  valor: '',
  qtdEstoque: '',
};

function toItemPayload(form: ItemFormState): ItemBarInput {
  return {
    nome: form.nome,
    valor: parseCurrencyInput(form.valor),
    qtdEstoque: Number(form.qtdEstoque.trim()),
  };
}

function toForm(item: ItemBar): ItemFormState {
  return {
    nome: item.nome,
    valor: item.valor.toFixed(2).replace('.', ','),
    qtdEstoque: String(item.qtdEstoque),
  };
}

export function GerenciarItensScreen() {
  const navigation = useNavigation<Navigation>();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [showOutOfStockOnly, setShowOutOfStockOnly] = useState(false);
  const [itens, setItens] = useState<ItemBar[]>([]);
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await listItens(deferredSearch);
    setItens(showOutOfStockOnly ? data.filter((item) => item.qtdEstoque <= 0) : data);
  }, [deferredSearch, showOutOfStockOnly]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function updateField(field: keyof ItemFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave() {
    setSaving(true);

    try {
      const payload = toItemPayload(form);

      if (editingId) {
        await updateItem(editingId, payload);
        Alert.alert('Item atualizado', 'Os dados do item foram salvos localmente.');
      } else {
        await createItem(payload);
        Alert.alert('Item cadastrado', 'O novo item já está disponível para pedidos.');
      }

      resetForm();
      await load();
    } catch (error) {
      Alert.alert(
        editingId ? 'Erro ao atualizar item' : 'Erro ao cadastrar item',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(item: ItemBar) {
    setEditingId(item.id);
    setForm(toForm(item));
  }

  function handleDelete(item: ItemBar) {
    Alert.alert(
      'Excluir item',
      `Deseja remover ${item.nome}? Se ele já tiver sido usado em pedidos, a exclusão será bloqueada para preservar o histórico.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void deleteItem(item.id)
              .then(async () => {
                if (editingId === item.id) {
                  resetForm();
                }

                await load();
                Alert.alert('Item excluído', 'O cadastro do item foi removido com sucesso.');
              })
              .catch((error) =>
                Alert.alert('Erro ao excluir item', error instanceof Error ? error.message : 'Tente novamente.')
              );
          },
        },
      ]
    );
  }

  return (
    <ScreenContainer>
      <SectionCard
        title={editingId ? 'Editar item' : 'Novo item'}
        subtitle="Cadastre manualmente quando precisar incluir, corrigir preço, atualizar estoque ou remover itens sem depender do CSV."
      >
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={form.nome}
          onChangeText={(value) => updateField('nome', value)}
          placeholder="Ex.: Cerveja lata"
          placeholderTextColor={theme.colors.textDim}
          autoCapitalize="sentences"
        />

        <View style={styles.formGrid}>
          <View style={styles.formGridItem}>
            <Text style={styles.label}>Valor</Text>
            <TextInput
              style={styles.input}
              value={form.valor}
              onChangeText={(value) => updateField('valor', value)}
              placeholder="Ex.: 7,50"
              placeholderTextColor={theme.colors.textDim}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formGridItem}>
            <Text style={styles.label}>Estoque</Text>
            <TextInput
              style={styles.input}
              value={form.qtdEstoque}
              onChangeText={(value) => updateField('qtdEstoque', value)}
              placeholder="Ex.: 24"
              placeholderTextColor={theme.colors.textDim}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.formActionsRow}>
          <AppButton
            label={saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Cadastrar item'}
            onPress={() => void handleSave()}
            disabled={saving}
            style={styles.formActionButton}
          />
          <AppButton
            label={editingId ? 'Cancelar edição' : 'Importar CSV'}
            variant="outline"
            onPress={editingId ? resetForm : () => navigation.navigate('ImportacaoCsv', { mode: 'itens' })}
            style={styles.formActionButton}
          />
        </View>
      </SectionCard>

      <SectionCard title="Buscar item" subtitle="Use o nome para localizar e corrigir rapidamente o item certo.">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Digite o nome do item" />
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Mostrar só itens sem estoque</Text>
          <Switch
            value={showOutOfStockOnly}
            onValueChange={setShowOutOfStockOnly}
            trackColor={{ false: theme.colors.border, true: theme.colors.primaryMuted }}
            thumbColor={showOutOfStockOnly ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>
      </SectionCard>

      <SectionCard
        title="Lista de itens"
        subtitle={`${itens.length} resultado(s) encontrado(s)${deferredSearch || showOutOfStockOnly ? ' com os filtros atuais.' : '.'}`}
      >
        {itens.length === 0 ? (
          <EmptyState
            title="Nenhum item nessa lista"
            description="Cadastre manualmente acima, importe um CSV ou revise a busca e os filtros ativos."
          />
        ) : (
          <View style={styles.cardsGrid}>
            {itens.map((item) => (
              <View key={item.id} style={styles.memberCard}>
                <Pressable style={styles.itemInfo} onPress={() => handleEdit(item)}>
                  <Text style={styles.itemName}>{item.nome}</Text>
                  <Text style={styles.itemValue}>{formatCurrency(item.valor)}</Text>
                  <Text style={[styles.itemStock, item.qtdEstoque <= 0 ? styles.itemStockEmpty : null]}>
                    Estoque: {item.qtdEstoque}
                  </Text>
                </Pressable>

                <View style={styles.memberActions}>
                  <Pressable style={styles.memberActionButton} onPress={() => handleEdit(item)}>
                    <Text style={styles.memberActionText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.memberActionButton, styles.memberDeleteButton]}
                    onPress={() => handleDelete(item)}
                  >
                    <Text style={[styles.memberActionText, styles.memberDeleteText]}>Excluir</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
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
  formGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  formGridItem: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  formActionButton: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  memberCard: {
    width: '48%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  itemInfo: {
    gap: 6,
  },
  itemName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  itemValue: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  itemStock: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  itemStockEmpty: {
    color: theme.colors.danger,
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
