import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { RootStackParamList } from '../types/navigation';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { OrderItemRow } from '../components/OrderItemRow';
import { AppButton } from '../components/AppButton';
import { carregarPedido, pagarPedido } from '../services/pedidosService';
import { copiarMensagemCobranca } from '../services/cobrancaService';
import { getConfiguracao } from '../repositories/configuracaoRepository';
import { Configuracao, PedidoDetalhado } from '../types/domain';
import { formatCurrency, formatDate } from '../utils/format';
import { theme } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { copyAttachmentToAppDirectory } from '../utils/file';

type Route = RouteProp<RootStackParamList, 'FechamentoConta'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function FechamentoContaScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);

  const load = useCallback(async () => {
    const [order, config] = await Promise.all([carregarPedido(route.params.pedidoId), getConfiguracao()]);
    setPedido(order);
    setConfiguracao(config);
  }, [route.params.pedidoId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePay() {
    if (!pedido) {
      return;
    }

    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled) {
        return;
      }

      const asset = picked.assets[0];
      const comprovanteUri = await copyAttachmentToAppDirectory(
        asset.uri,
        asset.name ?? 'comprovante',
        `comprovante_pedido_${pedido.id}`
      );

      await pagarPedido(pedido.id, {
        uri: comprovanteUri,
        nome: asset.name ?? `comprovante_pedido_${pedido.id}`,
        mimeType: asset.mimeType ?? '',
      });
      await load();
      Alert.alert('Pagamento registrado', 'O pedido foi marcado como PAGO com o comprovante anexado.');
    } catch (error) {
      Alert.alert('Erro ao registrar pagamento', error instanceof Error ? error.message : 'Não foi possível anexar o comprovante.');
    }
  }

  async function handleCopyMessage() {
    if (!pedido || !configuracao) {
      return;
    }

    await copiarMensagemCobranca(pedido, configuracao);
    Alert.alert('Mensagem copiada', 'A cobrança pronta foi copiada para a área de transferência.');
  }

  async function handleShareProof() {
    if (!pedido?.comprovanteUri) {
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Compartilhamento indisponível', 'Este dispositivo não suporta abrir/compartilhar o comprovante por aqui.');
      return;
    }

    await Sharing.shareAsync(pedido.comprovanteUri);
  }

  const statusLabel = pedido?.cancelado ? 'CANCELADO' : pedido?.status;

  if (!pedido || !configuracao) {
    return (
      <ScreenContainer>
        <EmptyState title="Carregando fechamento" description="Montando dados do pedido e do QR Code configurado." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionCard title={pedido.nomeIntegranteSnapshot} subtitle={`${pedido.patenteIntegranteSnapshot} • ${formatDate(pedido.dataPedido)} às ${pedido.horaPedido.slice(0, 5)}`}>
        <Text style={styles.total}>Total da conta: {formatCurrency(pedido.total)}</Text>
        <Text style={styles.status}>Status atual: {statusLabel}</Text>
      </SectionCard>

      <SectionCard title="Itens da conta">
        {pedido.itens.map((item) => (
          <OrderItemRow key={item.id} item={item} locked />
        ))}
      </SectionCard>

      <SectionCard title="Pagamento PIX" subtitle="QR fixo e chave textual configurados no próprio app.">
        {configuracao.caminhoImagemQrCode ? (
          <Image source={{ uri: configuracao.caminhoImagemQrCode }} style={styles.qrImage} resizeMode="contain" />
        ) : (
          <EmptyState title="QR Code não configurado" description="Abra Configurações para escolher a imagem fixa do QR Code." />
        )}
        <Text style={styles.pixLabel}>Chave PIX</Text>
        <Text style={styles.pixValue}>{configuracao.chavePix || 'Não configurada'}</Text>
      </SectionCard>

      {pedido.comprovanteNome ? (
        <SectionCard title="Comprovante anexado" subtitle={pedido.comprovanteNome}>
          {pedido.comprovanteMimeType.startsWith('image/') ? (
            <Image source={{ uri: pedido.comprovanteUri }} style={styles.proofImage} resizeMode="contain" />
          ) : (
            <Text style={styles.pixValue}>Arquivo salvo localmente e vinculado ao pedido.</Text>
          )}
          <AppButton label="Abrir / compartilhar comprovante" variant="secondary" onPress={() => void handleShareProof()} />
        </SectionCard>
      ) : null}

      <View style={styles.actions}>
        {pedido.status !== 'PAGO' && !pedido.cancelado ? <AppButton label="Marcar como pago" onPress={() => void handlePay()} /> : null}
        {pedido.status !== 'PAGO' && !pedido.cancelado ? (
          <AppButton label="Copiar mensagem" variant="secondary" onPress={() => void handleCopyMessage()} />
        ) : null}
        <AppButton label="Voltar para a home" variant="outline" onPress={() => navigation.popToTop()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  total: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  status: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  qrImage: {
    width: '100%',
    height: 240,
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFFFFF',
  },
  pixLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  pixValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  proofImage: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.lg,
    backgroundColor: '#101010',
  },
  actions: {
    gap: 10,
    paddingBottom: 20,
  },
});
