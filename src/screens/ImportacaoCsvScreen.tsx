import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList } from '../types/navigation';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { AppButton } from '../components/AppButton';
import { CsvImportResult } from '../types/domain';
import { importIntegrantesCsv, importItensCsv } from '../services/importacaoCsvService';
import { clearIntegrantes, countIntegrantes } from '../repositories/integrantesRepository';
import { clearItens, countItens } from '../repositories/itensRepository';
import { theme } from '../constants/theme';

type Route = RouteProp<RootStackParamList, 'ImportacaoCsv'>;

export function ImportacaoCsvScreen() {
  const route = useRoute<Route>();
  const mode = route.params.mode;
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [count, setCount] = useState(0);

  const refreshCount = useCallback(async () => {
    const total = mode === 'integrantes' ? await countIntegrantes() : await countItens();
    setCount(total);
  }, [mode]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  async function handlePickDocument() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (picked.canceled) {
        return;
      }

      const file = picked.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const importResult = mode === 'integrantes' ? await importIntegrantesCsv(content) : await importItensCsv(content);
      setResult(importResult);
      await refreshCount();
      Alert.alert('Importação concluída', `${importResult.totalProcessed} linha(s) processadas com sucesso.`);
    } catch (error) {
      Alert.alert('Falha na importação', error instanceof Error ? error.message : 'Verifique o arquivo CSV selecionado.');
    }
  }

  function handleClearCurrentBase() {
    const targetLabel = mode === 'integrantes' ? 'integrantes' : 'itens';
    const warningMessage =
      mode === 'integrantes'
        ? 'Isso remove todos os integrantes cadastrados e também apaga os pedidos e o histórico vinculados a eles. Deseja continuar?'
        : 'Isso remove todos os itens cadastrados e também apaga os pedidos e o histórico vinculados a eles. Deseja continuar?';

    Alert.alert(`Limpar ${targetLabel}`, warningMessage, [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: () => {
          const action = mode === 'integrantes' ? clearIntegrantes : clearItens;

          void action()
            .then(async () => {
              setResult(null);
              await refreshCount();
              Alert.alert('Base limpa', `Os ${targetLabel} foram removidos com sucesso.`);
            })
            .catch((error) =>
              Alert.alert('Erro ao limpar', error instanceof Error ? error.message : 'Não foi possível limpar a base.')
            );
        },
      },
    ]);
  }

  return (
    <ScreenContainer>
      <SectionCard
        title={mode === 'integrantes' ? 'Importação de integrantes' : 'Importação de itens'}
        subtitle={
          mode === 'integrantes'
            ? 'CSV esperado: nome,patente'
            : 'CSV esperado: nome,valor,qtdestoque'
        }
      >
        <Text style={styles.currentCount}>Registros atuais no banco local: {count}</Text>
        <AppButton label="Selecionar arquivo CSV" onPress={() => void handlePickDocument()} />
        <AppButton
          label={mode === 'integrantes' ? 'Limpar integrantes' : 'Limpar itens'}
          onPress={handleClearCurrentBase}
          variant="danger"
        />
      </SectionCard>

      {result ? (
        <SectionCard title="Resultado da última importação">
          <Text style={styles.resultText}>Inseridos: {result.inserted}</Text>
          <Text style={styles.resultText}>Atualizados: {result.updated}</Text>
          <Text style={styles.resultText}>Processados: {result.totalProcessed}</Text>
        </SectionCard>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  currentCount: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  resultText: {
    color: theme.colors.textMuted,
    fontSize: 15,
  },
});
