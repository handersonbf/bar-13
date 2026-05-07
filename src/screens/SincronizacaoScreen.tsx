import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { AppButton } from '../components/AppButton';
import { CentralSendProgress, carregarResumoCentral, enviarCentralAgoraComOpcoes } from '../services/centralService';
import { EmptyState } from '../components/EmptyState';
import { ReturnToGuideButton } from '../components/ReturnToGuideButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import {
  carregarResumoSincronizacao,
  exportarPacoteSincronizacao,
  importarPacoteSincronizacao,
  lerResumoPacoteSincronizacao,
} from '../services/sincronizacaoService';
import { CentralPushSummary, Configuracao } from '../types/domain';
import { KnownDevice, SyncImportRecord, SyncPackagePreview } from '../types/sync';
import { formatDateTime } from '../utils/format';

type SyncSummary = {
  configuracao: Configuracao;
  devices: KnownDevice[];
  imports: SyncImportRecord[];
};

function formatOptionalDateTime(value: string) {
  return value ? formatDateTime(value) : 'Ainda não registrado';
}

function buildPreviewMessage(preview: SyncPackagePreview) {
  const lines = [
    `Origem: ${preview.sourceDeviceName}`,
    `Exportado em: ${formatOptionalDateTime(preview.exportedAt)}`,
    `Eventos novos: ${preview.newEvents} de ${preview.totalEvents}`,
    `Pedidos no pacote: ${preview.pedidos}`,
    `Integrantes: ${preview.integrantes}`,
    `Itens: ${preview.itens}`,
    `Comprovantes: ${preview.comprovantes}`,
  ];

  if (preview.warnings.length > 0) {
    lines.push('', 'Alertas:');
    preview.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  return lines.join('\n');
}

export function SincronizacaoScreen() {
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [centralSummary, setCentralSummary] = useState<CentralPushSummary | null>(null);
  const [busy, setBusy] = useState<'export' | 'import' | 'central' | null>(null);
  const [centralProgress, setCentralProgress] = useState<CentralSendProgress | null>(null);

  const load = useCallback(async () => {
    const [nextSummary, nextCentralSummary] = await Promise.all([carregarResumoSincronizacao(), carregarResumoCentral()]);
    setSummary(nextSummary);
    setCentralSummary(nextCentralSummary);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleExport() {
    setBusy('export');

    try {
      const result = await exportarPacoteSincronizacao();
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(result.uri);
      }

      await load();
      Alert.alert(
        'Pacote exportado',
        `${result.preview.totalEvents} evento(s) e ${result.preview.comprovantes} comprovante(s) foram incluídos no arquivo.`
      );
    } catch (error) {
      Alert.alert('Erro ao exportar', error instanceof Error ? error.message : 'Não foi possível gerar o pacote.');
    } finally {
      setBusy(null);
    }
  }

  async function handleImport() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled) {
      return;
    }

    const asset = picked.assets[0];

    try {
      const preview = await lerResumoPacoteSincronizacao(asset.uri);

      if (preview.warnings.includes('Este pacote já foi importado.')) {
        Alert.alert('Pacote já importado', buildPreviewMessage(preview));
        return;
      }

      Alert.alert('Importar sincronização', buildPreviewMessage(preview), [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar agora',
          onPress: () => {
            setBusy('import');
            void importarPacoteSincronizacao(asset.uri)
              .then(async (result) => {
                await load();
                Alert.alert(
                  'Sincronização concluída',
                  `${result.importedEvents} evento(s) novo(s) e ${result.importedBlobs} comprovante(s) foram incorporados neste aparelho.`
                );
              })
              .catch((error) =>
                Alert.alert('Erro ao importar', error instanceof Error ? error.message : 'Não foi possível aplicar o pacote.')
              )
              .finally(() => setBusy(null));
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Pacote inválido', error instanceof Error ? error.message : 'Não foi possível ler o arquivo selecionado.');
    }
  }

  async function handleSendCentral() {
    setBusy('central');
    setCentralProgress(null);

    try {
      const result = await enviarCentralAgoraComOpcoes({
        onProgress: (progress) => setCentralProgress(progress),
      });
      await load();
      Alert.alert(
        'Central atualizada',
        result.latestResponse
          ? `${result.latestResponse.ordersUpserted} pedido(s), ${result.latestResponse.orderItemsUpserted} item(ns) e ${result.latestResponse.auditEventsUpserted} evento(s) foram enviados para o Google Sheets.`
          : `${result.sentBatches} lote(s) foram enviados para a central.`
      );
    } catch (error) {
      await load();
      Alert.alert('Erro ao enviar para a central', error instanceof Error ? error.message : 'Não foi possível enviar o lote.');
    } finally {
      setCentralProgress(null);
      setBusy(null);
    }
  }

  const centralButtonLabel =
    busy === 'central'
      ? centralProgress
        ? `Enviando ${centralProgress.sentBatches}/${centralProgress.totalBatches} (${centralProgress.percentage}%)`
        : 'Enviando para a central...'
      : 'Enviar para a central';

  if (!summary) {
    return (
      <ScreenContainer>
        <EmptyState title="Carregando sincronização" description="Preparando identidade do aparelho, eventos e histórico local." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ReturnToGuideButton />

      <SectionCard title="Este aparelho" subtitle="A identidade do aparelho permanece fixa para não quebrar a sincronização futura.">
        <Text style={styles.label}>Nome atual</Text>
        <Text style={styles.value}>{summary.configuracao.nomeAparelho}</Text>
        <Text style={styles.label}>Identificador fixo</Text>
        <Text style={styles.mono}>{summary.configuracao.deviceId || 'Gerando...'}</Text>
        <Text style={styles.label}>Última exportação</Text>
        <Text style={styles.value}>{formatOptionalDateTime(summary.configuracao.lastExportedAt)}</Text>
        <Text style={styles.label}>Última importação</Text>
        <Text style={styles.value}>{formatOptionalDateTime(summary.configuracao.lastImportedAt)}</Text>
      </SectionCard>

      <SectionCard title="Ações" subtitle="No MVP atual, os pedidos, integrantes, itens e comprovantes são sincronizados por eventos idempotentes.">
        <AppButton
          label={busy === 'export' ? 'Exportando...' : 'Exportar sincronização'}
          onPress={() => void handleExport()}
          disabled={busy !== null}
        />
        <AppButton
          label={busy === 'import' ? 'Importando...' : 'Importar sincronização'}
          variant="secondary"
          onPress={() => void handleImport()}
          disabled={busy !== null}
        />
      </SectionCard>

      <SectionCard
        title="Central gerencial"
        subtitle="Este envio é só de saída para o Google Sheets. A planilha não volta dados para o app nem interfere na operação local-first."
      >
        <Text style={styles.label}>Operador atual</Text>
        <Text style={styles.value}>{summary.configuracao.operadorAtualNome || 'Nenhum selecionado'}</Text>
        <Text style={styles.label}>Configuração da central</Text>
        <Text style={styles.value}>{centralSummary?.configured ? 'Pronta para envio' : 'Pendente de URL/token nas Configurações'}</Text>
        <Text style={styles.label}>Fila local</Text>
        <Text style={styles.value}>{centralSummary ? `${centralSummary.pendingBatches} lote(s) pendente(s)` : 'Carregando...'}</Text>
        <Text style={styles.label}>Último lote</Text>
        <Text style={styles.value}>
          {centralSummary?.latestBatch
            ? `${centralSummary.latestBatch.status} em ${formatOptionalDateTime(
                centralSummary.latestBatch.lastSuccessAt || centralSummary.latestBatch.lastAttemptAt || centralSummary.latestBatch.createdAt
              )}`
            : 'Nenhum envio registrado ainda'}
        </Text>
        {centralSummary?.latestBatch?.errorMessage ? <Text style={styles.errorText}>{centralSummary.latestBatch.errorMessage}</Text> : null}
        <AppButton
          label={centralButtonLabel}
          onPress={() => void handleSendCentral()}
          loading={busy === 'central'}
          disabled={busy !== null}
        />
      </SectionCard>

      <SectionCard
        title="Aparelhos conhecidos"
        subtitle={`${summary.devices.length} aparelho(s) registrado(s) localmente depois das sincronizações já vistas.`}
      >
        {summary.devices.length === 0 ? (
          <EmptyState
            title="Nenhum outro aparelho conhecido"
            description="Assim que você importar um pacote externo, a origem aparecerá aqui com o último contato registrado."
          />
        ) : (
          summary.devices.map((device) => (
            <View key={device.deviceId} style={styles.deviceCard}>
              <Text style={styles.deviceName}>{device.nomeAparelho}</Text>
              <Text style={styles.deviceMeta}>ID: {device.deviceId}</Text>
              <Text style={styles.deviceMeta}>Último pacote: {device.lastPackageId || 'Ainda não registrado'}</Text>
              <Text style={styles.deviceMeta}>Última exportação vista: {formatOptionalDateTime(device.lastExportedAt)}</Text>
              <Text style={styles.deviceMeta}>Última importação local: {formatOptionalDateTime(device.lastImportedAt)}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="Pacotes importados"
        subtitle="Histórico local dos últimos pacotes já aceitos neste aparelho para evitar reprocessamento duplicado."
      >
        {summary.imports.length === 0 ? (
          <EmptyState title="Nada importado ainda" description="O primeiro pacote importado passa a aparecer aqui com origem, horário e volume." />
        ) : (
          summary.imports.slice(0, 8).map((item) => (
            <View key={item.packageId} style={styles.importCard}>
              <Text style={styles.deviceName}>{item.sourceDeviceName}</Text>
              <Text style={styles.deviceMeta}>Pacote: {item.packageId}</Text>
              <Text style={styles.deviceMeta}>Exportado em: {formatOptionalDateTime(item.exportedAt)}</Text>
              <Text style={styles.deviceMeta}>Importado em: {formatOptionalDateTime(item.importedAt)}</Text>
              <Text style={styles.deviceMeta}>
                Eventos: {item.eventCount} • Comprovantes: {item.blobCount}
              </Text>
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
  value: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  mono: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  deviceCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: 6,
  },
  importCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: 6,
  },
  deviceName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  deviceMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
});
