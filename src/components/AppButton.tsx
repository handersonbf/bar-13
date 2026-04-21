import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function AppButton({ label, onPress, variant = 'primary', disabled = false, style }: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'primary' ? styles.textPrimary : null,
          variant === 'secondary' ? styles.textSecondary : null,
          variant === 'danger' ? styles.textDanger : null,
          variant === 'outline' ? styles.textOutline : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: '#2A1908',
    borderColor: theme.colors.primaryMuted,
  },
  danger: {
    backgroundColor: theme.colors.accent,
    borderColor: '#9B2A3A',
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.primaryMuted,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  textPrimary: {
    color: '#080808',
  },
  textSecondary: {
    color: theme.colors.primary,
  },
  textDanger: {
    color: theme.colors.text,
  },
  textOutline: {
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
