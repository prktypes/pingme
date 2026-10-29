import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon } from './Icon';
import type { IconName } from './iconNames';

import { radii, type, useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'destructive';
export type ButtonSize = 'regular' | 'compact';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  disabled = false,
  loading = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      textColor: colors.accentOn,
      iconColor: colors.accentOn,
    },
    secondary: {
      backgroundColor: colors.accentSoft,
      borderColor: 'transparent',
      textColor: colors.accentText,
      iconColor: colors.accentText,
    },
    plain: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: colors.accentText,
      iconColor: colors.accentText,
    },
    destructive: {
      backgroundColor: colors.dangerSoft,
      borderColor: 'transparent',
      textColor: colors.danger,
      iconColor: colors.danger,
    },
  }[variant];

  const role: AccessibilityRole = 'button';

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'compact' && styles.compact,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.textColor} />
      ) : icon ? (
        <Icon name={icon} size={18} color={palette.iconColor} weight="semibold" />
      ) : null}
      <Text
        style={[
          type.button,
          size === 'compact' && styles.compactLabel,
          { color: palette.textColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compact: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  compactLabel: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.42,
  },
});
