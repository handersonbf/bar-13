import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  HomeTabs: NavigatorScreenParams<HomeTabParamList> | undefined;
  SelecionarIntegrante: undefined;
  NovoPedido: {
    pedidoId: number;
  };
  FechamentoConta: {
    pedidoId: number;
  };
  ImportacaoCsv: {
    mode: 'integrantes' | 'itens';
  };
  ExportacaoCsv: undefined;
};

export type HomeTabParamList = {
  Home: undefined;
  Historico: undefined;
  Relatorios: undefined;
  Pendentes: undefined;
  Configuracoes: undefined;
};
