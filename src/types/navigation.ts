import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  HomeTabs: NavigatorScreenParams<HomeTabParamList> | undefined;
  SelecionarIntegrante: { returnToAjuda?: boolean } | undefined;
  GerenciarIntegrantes: { returnToAjuda?: boolean } | undefined;
  GerenciarItens: { returnToAjuda?: boolean } | undefined;
  NovoPedido: {
    pedidoId: number;
  };
  FechamentoConta: {
    pedidoId: number;
  };
  ImportacaoCsv: {
    mode: 'integrantes' | 'itens';
    returnToAjuda?: boolean;
  };
  ExportacaoCsv: { returnToAjuda?: boolean } | undefined;
  Ajuda: undefined;
};

export type HomeTabParamList = {
  Home: { returnToAjuda?: boolean } | undefined;
  Historico: { returnToAjuda?: boolean } | undefined;
  Relatorios: { returnToAjuda?: boolean } | undefined;
  Pendentes: { returnToAjuda?: boolean } | undefined;
  Configuracoes: { returnToAjuda?: boolean } | undefined;
};
