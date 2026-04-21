import React from 'react';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { RootStackParamList, HomeTabParamList } from '../types/navigation';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoricoScreen } from '../screens/HistoricoScreen';
import { RelatoriosScreen } from '../screens/RelatoriosScreen';
import { PendentesScreen } from '../screens/PendentesScreen';
import { ConfiguracoesScreen } from '../screens/ConfiguracoesScreen';
import { SelecionarIntegranteScreen } from '../screens/SelecionarIntegranteScreen';
import { NovoPedidoScreen } from '../screens/NovoPedidoScreen';
import { FechamentoContaScreen } from '../screens/FechamentoContaScreen';
import { ImportacaoCsvScreen } from '../screens/ImportacaoCsvScreen';
import { ExportacaoCsvScreen } from '../screens/ExportacaoCsvScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();

const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: {
    backgroundColor: theme.colors.surface,
  },
  headerTintColor: theme.colors.text,
  headerTitleStyle: {
    fontWeight: '800',
  },
  contentStyle: {
    backgroundColor: theme.colors.background,
  },
};

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 72,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textDim,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          paddingBottom: 6,
        },
        tabBarIcon: ({ color, size }) => {
          const iconByRoute: Record<keyof HomeTabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            Historico: 'calendar',
            Relatorios: 'stats-chart',
            Pendentes: 'alert-circle',
            Configuracoes: 'settings',
          };

          return <Ionicons name={iconByRoute[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Bar13' }} />
      <Tab.Screen name="Historico" component={HistoricoScreen} options={{ title: 'Histórico' }} />
      <Tab.Screen name="Relatorios" component={RelatoriosScreen} options={{ title: 'Relatórios' }} />
      <Tab.Screen name="Pendentes" component={PendentesScreen} options={{ title: 'Pendentes' }} />
      <Tab.Screen name="Configuracoes" component={ConfiguracoesScreen} options={{ title: 'Configurações' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={stackScreenOptions}>
      <RootStack.Screen name="HomeTabs" component={HomeTabs} options={{ headerShown: false }} />
      <RootStack.Screen name="SelecionarIntegrante" component={SelecionarIntegranteScreen} options={{ title: 'Selecionar integrante' }} />
      <RootStack.Screen name="NovoPedido" component={NovoPedidoScreen} options={{ title: 'Novo pedido' }} />
      <RootStack.Screen name="FechamentoConta" component={FechamentoContaScreen} options={{ title: 'Fechamento da conta' }} />
      <RootStack.Screen name="ImportacaoCsv" component={ImportacaoCsvScreen} options={{ title: 'Importação CSV' }} />
      <RootStack.Screen name="ExportacaoCsv" component={ExportacaoCsvScreen} options={{ title: 'Exportação CSV' }} />
    </RootStack.Navigator>
  );
}
