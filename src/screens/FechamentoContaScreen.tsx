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
import {
  carregarPedido,
  concluirPedido,
  pagarPedido,
  pagarPedidoComCartao,
  pagarPedidoEmDinheiro,
  reabrirConta,
  trocarComprovantePedido,
} from '../services/pedidosService';
import { copiarMensagemCobranca } from '../services/cobrancaService';
import { getConfiguracao } from '../repositories/configuracaoRepository';
import { ComprovanteAnexo, Configuracao, PaymentMethodWithProof, PedidoDetalhado } from '../types/domain';
import { formatCurrency, formatDate } from '../utils/format';
import { formatPaymentMethod, proofPaymentMethodLabels } from '../utils/payment';
import { theme } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { copyAttachmentToAppDirectory, deleteFileIfExists } from '../utils/file';
import QRCode from 'react-native-qrcode-svg';
import { gerarPayloadPix } from '../utils/pix';

type Route = RouteProp<RootStackParamList, 'FechamentoConta'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function FechamentoContaScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);

  const codigoPix = (configuracao?.chavePix && pedido?.total) ? gerarPayloadPix(configuracao.chavePix, pedido.total, configuracao.nomeBar) : '';

  const load = useCallback(async () => {
    const [order, config] = await Promise.all([carregarPedido(route.params.pedidoId), getConfiguracao()]);
    setPedido(order);
    setConfiguracao(config);
  }, [route.params.pedidoId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pickComprovante(orderId: number): Promise<ComprovanteAnexo | null> {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled) {
      return null;
    }

    const asset = picked.assets[0];
    const comprovanteUri = await copyAttachmentToAppDirectory(
      asset.uri,
      asset.name ?? 'comprovante',
      `comprovante_pedido_${orderId}`
    );

    return {
      uri: comprovanteUri,
      nome: asset.name ?? `comprovante_pedido_${orderId}`,
      mimeType: asset.mimeType ?? '',
    };
  }

  async function handlePayWithProof(method: PaymentMethodWithProof) {
    if (!pedido) {
      return;
    }

    try {
      const comprovante = await pickComprovante(pedido.id);

      if (!comprovante) {
        return;
      }

      if (method === 'PIX') {
        await pagarPedido(pedido.id, comprovante);
      } else {
        await pagarPedidoComCartao(pedido.id, comprovante);
      }

      await load();
      Alert.alert(
        'Pagamento registrado',
        `O pedido foi marcado como PAGO via ${proofPaymentMethodLabels[method]} com o comprovante anexado.`
      );
    } catch (error) {
      Alert.alert('Erro ao registrar pagamento', error instanceof Error ? error.message : 'Não foi possível anexar o comprovante.');
    }
  }

  function handlePayWithCash() {
    if (!pedido) {
      return;
    }

    Alert.alert(
      'Confirmar dinheiro',
      `Confirma que o valor de ${formatCurrency(pedido.total)} foi recebido em dinheiro?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar dinheiro',
          onPress: () => {
            void pagarPedidoEmDinheiro(pedido.id)
              .then(() => load())
              .then(() => {
                Alert.alert('Pagamento registrado', 'O pedido foi marcado como PAGO via dinheiro.');
              })
              .catch((error) =>
                Alert.alert(
                  'Erro ao registrar pagamento',
                  error instanceof Error ? error.message : 'Não foi possível confirmar o recebimento.'
                )
              );
          },
        },
      ]
    );
  }

  async function handleCopyMessage() {
    if (!pedido || !configuracao) {
      return;
    }

    await copiarMensagemCobranca(pedido, configuracao);
    Alert.alert('Mensagem copiada', 'A cobrança pronta foi copiada para a área de transferência.');
  }

  async function handleCloseOrder() {
    if (!pedido) {
      return;
    }

    Alert.alert(
      'Fechar conta',
      'Tem certeza que deseja encerrar essa conta agora? Você irá para a etapa de pagamento e a conta passará a ficar pendente até ser marcada como paga.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Fechar conta',
          onPress: () => {
            void concluirPedido(pedido.id)
              .then(() => load())
              .catch((error) =>
                Alert.alert(
                  'Não foi possível fechar a conta',
                  error instanceof Error ? error.message : 'Tente novamente.'
                )
              );
          },
        },
      ]
    );
  }

  async function handleReopenOrder() {
    if (!pedido) {
      return;
    }

    try {
      await reabrirConta(pedido.id);
      navigation.replace('NovoPedido', { pedidoId: pedido.id });
    } catch (error) {
      Alert.alert('Não foi possível reabrir a conta', error instanceof Error ? error.message : 'Tente novamente.');
    }
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

  async function handleReplaceProof() {
    if (!pedido) {
      return;
    }

    try {
      const oldProofUri = pedido.comprovanteUri;
      const comprovante = await pickComprovante(pedido.id);

      if (!comprovante) {
        return;
      }

      await trocarComprovantePedido(pedido.id, comprovante);

      if (oldProofUri && oldProofUri !== comprovante.uri) {
        await deleteFileIfExists(oldProofUri);
      }

      await load();
      Alert.alert('Comprovante trocado', 'O novo comprovante substituiu o anterior com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao trocar comprovante', error instanceof Error ? error.message : 'Não foi possível substituir o comprovante.');
    }
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
        {pedido.nomeOperadorSnapshot ? <Text style={styles.status}>Responsável: {pedido.nomeOperadorSnapshot}</Text> : null}
        {pedido.metodoPagamento ? <Text style={styles.status}>Pagamento confirmado por: {formatPaymentMethod(pedido.metodoPagamento)}</Text> : null}
      </SectionCard>

      <SectionCard title="Itens da conta">
        {pedido.itens.map((item) => (
          <OrderItemRow key={item.id} item={item} locked />
        ))}
      </SectionCard>

      <SectionCard title="Pagamento PIX" subtitle="Se o pagamento for PIX, use o QRCode e depois anexe o comprovante.">
        {codigoPix ? (
          <View style={styles.qrImage}>
            <QRCode value={codigoPix} size={200} />
          </View>
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
          {pedido.status === 'PAGO' && pedido.metodoPagamento && pedido.metodoPagamento !== 'DINHEIRO' ? (
            <AppButton label="Trocar comprovante" variant="outline" onPress={() => void handleReplaceProof()} />
          ) : null}
        </SectionCard>
      ) : null}

      {pedido.status === 'FECHADO_AGUARDANDO_PAGAMENTO' && !pedido.cancelado ? (
        <SectionCard
          title="Registrar pagamento"
          subtitle="PIX e cartão de crédito exigem comprovante salvo localmente no pedido."
        >
          <Text style={styles.paymentHelp}>Escolha a forma recebida. Nos pagamentos com comprovante, selecione a imagem ou PDF do aparelho.</Text>
          <View style={styles.paymentActions}>
            <AppButton label="PIX com comprovante" onPress={() => void handlePayWithProof('PIX')} />
            <AppButton
              label="Cartão de crédito"
              variant="secondary"
              onPress={() => void handlePayWithProof('CARTAO_CREDITO')}
            />
            <AppButton label="Dinheiro" variant="outline" onPress={handlePayWithCash} />
          </View>
        </SectionCard>
      ) : null}

      <View style={styles.actions}>
        {pedido.status === 'ABERTO' && !pedido.cancelado ? (
          <AppButton label="Fechar conta" onPress={() => void handleCloseOrder()} />
        ) : null}
        {pedido.status === 'FECHADO_AGUARDANDO_PAGAMENTO' && !pedido.cancelado ? (
          <AppButton label="Reabrir conta" variant="outline" onPress={() => void handleReopenOrder()} />
        ) : null}
        {pedido.status === 'FECHADO_AGUARDANDO_PAGAMENTO' && !pedido.cancelado ? (
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
    alignItems: 'center',
    padding: 25,
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
  paymentHelp: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  paymentActions: {
    gap: 10,
  },
  actions: {
    gap: 10,
    paddingBottom: 20,
  },
});
