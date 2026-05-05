import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type GuideSection = {
  title: string;
  items: string[];
  actions?: {
    label: string;
    variant?: 'primary' | 'secondary' | 'outline';
    onPress: (navigation: Navigation) => void;
  }[];
};

const firstUseSteps = [
  'Configure nome do bar, chave PIX e QR Code.',
  'Cadastre ou importe integrantes.',
  'Cadastre ou importe itens com estoque inicial.',
  'Abra um pedido de teste e confira a baixa de estoque.',
  'Feche a conta, copie a cobrança e registre o pagamento.',
];

const guideSections: GuideSection[] = [
  {
    title: 'Preparação inicial',
    items: [
      'Ajuste nome do bar, chave PIX, QR Code e texto padrão de cobrança.',
      'Use os cadastros manuais quando precisar corrigir ou incluir dados pontuais.',
      'Use importação CSV quando a base de integrantes ou itens vier pronta de fora.',
    ],
    actions: [
      {
        label: 'Abrir configurações',
        variant: 'secondary',
        onPress: (navigation) =>
          navigation.navigate('HomeTabs', { screen: 'Configuracoes', params: { returnToAjuda: true } }),
      },
      {
        label: 'Gerenciar integrantes',
        variant: 'outline',
        onPress: (navigation) => navigation.navigate('GerenciarIntegrantes', { returnToAjuda: true }),
      },
      {
        label: 'Gerenciar itens',
        variant: 'outline',
        onPress: (navigation) => navigation.navigate('GerenciarItens', { returnToAjuda: true }),
      },
      {
        label: 'Importar integrantes',
        variant: 'outline',
        onPress: (navigation) => navigation.navigate('ImportacaoCsv', { mode: 'integrantes', returnToAjuda: true }),
      },
      {
        label: 'Importar itens',
        variant: 'outline',
        onPress: (navigation) => navigation.navigate('ImportacaoCsv', { mode: 'itens', returnToAjuda: true }),
      },
    ],
  },
  {
    title: 'Operação no balcão',
    items: [
      'Toque em Novo pedido e selecione o integrante pelo nome.',
      'Adicione itens pelos cards e confira quantidade, subtotal e total.',
      'Se o integrante já tiver pedido aberto no dia, o app retoma esse pedido.',
      'Feche a conta quando o consumo terminar.',
    ],
    actions: [
      {
        label: 'Iniciar novo pedido',
        onPress: (navigation) => navigation.navigate('SelecionarIntegrante', { returnToAjuda: true }),
      },
      {
        label: 'Voltar para Home',
        variant: 'outline',
        onPress: (navigation) => navigation.navigate('HomeTabs', { screen: 'Home', params: { returnToAjuda: true } }),
      },
    ],
  },
  {
    title: 'Cobrança e pagamento',
    items: [
      'Use Copiar mensagem para enviar a cobrança pronta.',
      'PIX exige comprovante em imagem ou PDF antes de marcar como pago.',
      'Dinheiro exige apenas confirmação manual do recebimento.',
      'Conta pendente pode ser reaberta; conta paga ou cancelada não volta para edição.',
    ],
    actions: [
      {
        label: 'Ver pendentes',
        variant: 'secondary',
        onPress: (navigation) =>
          navigation.navigate('HomeTabs', { screen: 'Pendentes', params: { returnToAjuda: true } }),
      },
      {
        label: 'Consultar histórico',
        variant: 'outline',
        onPress: (navigation) =>
          navigation.navigate('HomeTabs', { screen: 'Historico', params: { returnToAjuda: true } }),
      },
    ],
  },
  {
    title: 'Pendentes e histórico',
    items: [
      'Pendentes mostra contas fechadas que ainda aguardam pagamento.',
      'Histórico consulta pedidos por data, incluindo pagos, abertos, pendentes e cancelados.',
      'Pedidos abertos podem ser retomados pelo histórico ou pela Home.',
    ],
    actions: [
      {
        label: 'Abrir pendentes',
        variant: 'secondary',
        onPress: (navigation) =>
          navigation.navigate('HomeTabs', { screen: 'Pendentes', params: { returnToAjuda: true } }),
      },
      {
        label: 'Abrir histórico',
        variant: 'outline',
        onPress: (navigation) =>
          navigation.navigate('HomeTabs', { screen: 'Historico', params: { returnToAjuda: true } }),
      },
    ],
  },
  {
    title: 'Relatórios',
    items: [
      'Use o filtro de período para conferir vendido, pago, pendente e devedores.',
      'O consolidado agrupa devedores por nome e patente.',
      'O resumo de consumo mostra itens vendidos no período.',
      'O relatório de estoque compara vendido no período com saldo atual do cadastro.',
    ],
    actions: [
      {
        label: 'Abrir relatórios',
        variant: 'secondary',
        onPress: (navigation) =>
          navigation.navigate('HomeTabs', { screen: 'Relatorios', params: { returnToAjuda: true } }),
      },
      {
        label: 'Exportar CSV',
        variant: 'outline',
        onPress: (navigation) => navigation.navigate('ExportacaoCsv', { returnToAjuda: true }),
      },
    ],
  },
];

const csvOptions = [
  {
    title: 'Vendas por período',
    description: 'Auditoria dos pedidos, status, método de pagamento, itens, comprovante e total.',
  },
  {
    title: 'Devedores por período',
    description: 'Lista de contas fechadas que ainda estão aguardando pagamento.',
  },
  {
    title: 'Consolidado por período',
    description: 'Resumo geral para fechamento, prestação de contas e Google Planilhas.',
  },
  {
    title: 'Resumo de consumo',
    description: 'Saída de itens, valor total, valor unitário médio e estoque atual.',
  },
];

export function AjudaScreen() {
  const navigation = useNavigation<Navigation>();

  return (
    <ScreenContainer>
      <SectionCard title="Guia rápido do operador" subtitle="Use como roteiro de primeiro uso, treinamento e consulta durante a operação.">
        <View style={styles.quickActions}>
          <AppButton
            label="Novo pedido"
            onPress={() => navigation.navigate('SelecionarIntegrante', { returnToAjuda: true })}
          />
          <AppButton
            label="Configurações"
            variant="outline"
            onPress={() =>
              navigation.navigate('HomeTabs', { screen: 'Configuracoes', params: { returnToAjuda: true } })
            }
          />
        </View>
      </SectionCard>

      <SectionCard title="Primeiro uso">
        {firstUseSteps.map((step, index) => (
          <View style={styles.stepRow} key={step}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.bodyText}>{step}</Text>
          </View>
        ))}
      </SectionCard>

      {guideSections.map((section) => (
        <SectionCard title={section.title} key={section.title}>
          {section.items.map((item) => (
            <View style={styles.bulletRow} key={item}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bodyText}>{item}</Text>
            </View>
          ))}
          {section.actions ? (
            <View style={styles.sectionActions}>
              {section.actions.map((action) => (
                <AppButton
                  key={action.label}
                  label={action.label}
                  variant={action.variant}
                  onPress={() => action.onPress(navigation)}
                />
              ))}
            </View>
          ) : null}
        </SectionCard>
      ))}

      <SectionCard title="Qual CSV exportar?">
        {csvOptions.map((option) => (
          <View style={styles.csvRow} key={option.title}>
            <Text style={styles.csvTitle}>{option.title}</Text>
            <Text style={styles.bodyText}>{option.description}</Text>
          </View>
        ))}
        <AppButton
          label="Abrir exportação CSV"
          variant="outline"
          onPress={() => navigation.navigate('ExportacaoCsv', { returnToAjuda: true })}
        />
      </SectionCard>

      <SectionCard title="Cuidados importantes">
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bodyText}>Antes de limpar bases ou zerar dados, exporte o que precisar guardar.</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bodyText}>Os dados ficam no dispositivo; trocar de aparelho não transfere automaticamente o banco.</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bodyText}>PIX só deve ser baixado depois de anexar o comprovante correto.</Text>
        </View>
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    gap: 10,
  },
  sectionActions: {
    gap: 10,
    paddingTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  stepBadgeText: {
    color: '#080808',
    fontSize: 13,
    fontWeight: '900',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    color: theme.colors.primary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  bodyText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  csvRow: {
    gap: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  csvTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
});
