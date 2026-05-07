import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types/navigation';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionCard } from '../components/SectionCard';
import { AppButton } from '../components/AppButton';
import { ReturnToGuideButton } from '../components/ReturnToGuideButton';
import { Configuracao } from '../types/domain';
import { getConfiguracao, updateConfiguracao } from '../repositories/configuracaoRepository';
import { clearAppDirectory, copyFileToAppDirectory } from '../utils/file';
import { resetDatabase } from '../database/connection';
import { theme } from '../constants/theme';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function ConfiguracoesScreen() {
  const navigation = useNavigation<Navigation>();
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ target: 'bar' | 'qr'; message: string } | null>(null);

  const load = useCallback(async () => {
    const current = await getConfiguracao();
    setConfiguracao(current);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (!saveNotice) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setSaveNotice(null);
    }, 2400);

    return () => clearTimeout(timeoutId);
  }, [saveNotice]);

  async function handlePickQr() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão negada', 'Precisamos da galeria para escolher a imagem fixa do QR Code.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled || !configuracao) {
      return;
    }

    const asset = result.assets[0];
    const destination = await copyFileToAppDirectory(asset.uri, `qr_code_bar13_${Date.now()}.jpg`);
    const nextConfig = configuracao ? { ...configuracao, caminhoImagemQrCode: destination } : null;
    setConfiguracao(nextConfig);

    if (nextConfig) {
      await persistConfiguracao(nextConfig, 'QR Code salvo.', 'qr');
    }
  }

  async function persistConfiguracao(
    config: Configuracao,
    successMessage = 'Configurações salvas localmente.',
    target: 'bar' | 'qr' = 'bar'
  ) {
    setSaving(true);
    setSaveNotice(null);
    try {
      const savedConfig = await updateConfiguracao({
        nomeAparelho: config.nomeAparelho.trim() || 'Caixa',
        nomeBar: config.nomeBar.trim() || 'Bar13',
        chavePix: config.chavePix.trim(),
        caminhoImagemQrCode: config.caminhoImagemQrCode,
        textoPadraoCobranca: config.textoPadraoCobranca.trim(),
        centralWebAppUrl: config.centralWebAppUrl.trim(),
        centralToken: config.centralToken.trim(),
      });
      setConfiguracao(savedConfig);
      setSaveNotice({ target, message: successMessage });
    } catch (error) {
      Alert.alert('Erro ao salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!configuracao) {
      return;
    }

    await persistConfiguracao(configuracao, 'Dados do bar salvos.', 'bar');
  }

  function updateField(field: keyof Omit<Configuracao, 'id'>, value: string) {
    setConfiguracao((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSaveOnBlur() {
    if (!configuracao || saving) {
      return;
    }

    await persistConfiguracao(configuracao, 'Salvo automaticamente.', 'bar');
  }

  function handleResetEverything() {
    Alert.alert('Zerar configurações e dados', 'Tudo será deletado: configurações, comprovantes, imagens do QR, exportações e toda a base local. Deseja zerar tudo agora?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Zerar tudo',
        style: 'destructive',
        onPress: () => {
          void Promise.all([resetDatabase(), clearAppDirectory()])
            .then(() => load())
            .then(() => {
              setSaveNotice(null);
              Alert.alert('Tudo zerado', 'Configurações, comprovantes, imagens e toda a base local foram apagados.');
            })
            .catch((error) => Alert.alert('Erro ao zerar', error instanceof Error ? error.message : 'Tente novamente.'));
        },
      },
    ]);
  }

  if (!configuracao) {
    return (
      <ScreenContainer>
        <SectionCard title="Carregando configurações" subtitle="Abrindo dados fixos do bar, PIX e QR Code local.">
          <Text style={styles.placeholder}>Buscando configuração salva...</Text>
        </SectionCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ReturnToGuideButton />
      <SectionCard title="Dados do bar">
        <Text style={styles.label}>Nome deste aparelho</Text>
        <TextInput
          style={styles.input}
          value={configuracao.nomeAparelho}
          onChangeText={(value) => updateField('nomeAparelho', value)}
          onBlur={() => void handleSaveOnBlur()}
          placeholder="Ex.: Caixa, AT2"
          placeholderTextColor={theme.colors.textDim}
        />

        <Text style={styles.label}>Nome do bar</Text>
        <TextInput
          style={styles.input}
          value={configuracao.nomeBar}
          onChangeText={(value) => updateField('nomeBar', value)}
          onBlur={() => void handleSaveOnBlur()}
        />

        <Text style={styles.label}>Chave PIX</Text>
        <TextInput
          style={styles.input}
          value={configuracao.chavePix}
          onChangeText={(value) => updateField('chavePix', value)}
          onBlur={() => void handleSaveOnBlur()}
        />

        <Text style={styles.label}>Texto padrão de cobrança</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          value={configuracao.textoPadraoCobranca}
          onChangeText={(value) => updateField('textoPadraoCobranca', value)}
          onBlur={() => void handleSaveOnBlur()}
        />
        <AppButton label={saving ? 'Salvando...' : 'Salvar agora'} onPress={() => void handleSave()} disabled={saving} />
        {saveNotice?.target === 'bar' ? <Text style={styles.notice}>{saveNotice.message}</Text> : null}
      </SectionCard>

      <SectionCard title="QR Code fixo">
        {configuracao.caminhoImagemQrCode ? (
          <Image source={{ uri: configuracao.caminhoImagemQrCode }} style={styles.preview} resizeMode="contain" />
        ) : (
          <Text style={styles.placeholder}>Nenhuma imagem escolhida ainda.</Text>
        )}
        <AppButton label="Escolher imagem do QR" onPress={() => void handlePickQr()} variant="secondary" />
        <AppButton
          label="Testar visualização do QR"
          variant="outline"
          onPress={() =>
            Alert.alert(
              'Pré-visualização do QR',
              configuracao.caminhoImagemQrCode
                ? 'A imagem fixa do QR Code está carregada acima e pronta para o fechamento da conta.'
                : 'Nenhum QR Code foi configurado ainda.'
            )
          }
        />
        {saveNotice?.target === 'qr' ? <Text style={styles.notice}>{saveNotice.message}</Text> : null}
      </SectionCard>

      <SectionCard title="Operações">
        <AppButton label="Guia rápido do operador" variant="secondary" onPress={() => navigation.navigate('Ajuda')} />
        <AppButton label="Abrir sincronização" variant="secondary" onPress={() => navigation.navigate('Sincronizacao')} />
        <AppButton label="Gerenciar operadores" variant="secondary" onPress={() => navigation.navigate('GerenciarOperadores')} />
        <AppButton label="Gerenciar integrantes" variant="outline" onPress={() => navigation.navigate('GerenciarIntegrantes')} />
        <AppButton label="Gerenciar itens" variant="outline" onPress={() => navigation.navigate('GerenciarItens')} />
        <AppButton label="Importar integrantes via CSV" variant="secondary" onPress={() => navigation.navigate('ImportacaoCsv', { mode: 'integrantes' })} />
        <AppButton label="Importar itens via CSV" variant="secondary" onPress={() => navigation.navigate('ImportacaoCsv', { mode: 'itens' })} />
        <AppButton label="Abrir exportação CSV" variant="outline" onPress={() => navigation.navigate('ExportacaoCsv')} />
        <AppButton label="Zerar configurações e dados" variant="danger" onPress={handleResetEverything} />
      </SectionCard>

      <SectionCard title="Central gerencial" subtitle="Configure o Web App do Google para habilitar o botão Enviar para a central.">
        <Text style={styles.label}>URL do Web App</Text>
        <TextInput
          style={styles.input}
          value={configuracao.centralWebAppUrl}
          onChangeText={(value) => updateField('centralWebAppUrl', value)}
          onBlur={() => void handleSaveOnBlur()}
          placeholder="https://script.google.com/macros/s/..."
          placeholderTextColor={theme.colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Token da central</Text>
        <TextInput
          style={styles.input}
          value={configuracao.centralToken}
          onChangeText={(value) => updateField('centralToken', value)}
          onBlur={() => void handleSaveOnBlur()}
          placeholder="Token compartilhado com o Apps Script"
          placeholderTextColor={theme.colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.notice}>
          Operador atual neste aparelho: {configuracao.operadorAtualNome || 'Nenhum selecionado'}
        </Text>
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
  multiline: {
    minHeight: 170,
    textAlignVertical: 'top',
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  notice: {
    color: theme.colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
});
