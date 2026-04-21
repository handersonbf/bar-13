import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { DatabaseProvider, useDatabaseContext } from './src/context/DatabaseContext';
import { theme } from './src/constants/theme';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    border: theme.colors.border,
    text: theme.colors.text,
    primary: theme.colors.primary,
    notification: theme.colors.accent,
  },
};

function AppContent() {
  const { isReady, error } = useDatabaseContext();

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingBrand}>Bar13</Text>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loadingText}>Preparando banco local e módulos operacionais...</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <AppContent />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  loadingBrand: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1.2,
  },
  loadingText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
});
