import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

export function ScreenContainer({ children, scroll = true, style }: ScreenContainerProps) {
  if (!scroll) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, style]}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
});
