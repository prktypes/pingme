import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, type, useTheme } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './iconNames';


export type NoticeTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

type InlineNoticeProps = {
  title?: string;
  message: string;
  tone?: NoticeTone;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
};

export function InlineNotice({
  title,
  message,
  tone = 'info',
  icon,
  actionLabel,
  onAction,
  style,
}: InlineNoticeProps) {
  const { colors } = useTheme();
  const palette = {
    info: {
      background: colors.accentSoft,
      foreground: colors.accentText,
      icon: icon ?? ('info' as IconName),
    },
    success: {
      background: colors.successSoft,
      foreground: colors.success,
      icon: icon ?? ('success' as IconName),
    },
    warning: {
      background: colors.warningSoft,
      foreground: colors.warning,
      icon: icon ?? ('warning' as IconName),
    },
    danger: {
      background: colors.dangerSoft,
      foreground: colors.danger,
      icon: icon ?? ('error' as IconName),
    },
    neutral: {
      background: colors.fill,
      foreground: colors.secondaryText,
      icon: icon ?? ('info' as IconName),
    },
  }[tone];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }, style]}>
      <Icon name={palette.icon} size={19} color={palette.foreground} />
      <View style={styles.copy}>
        {title ? (
          <Text style={[type.captionMedium, { color: palette.foreground }]}>{title}</Text>
        ) : null}
        <Text style={[type.caption, { color: colors.text }]}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={10}
            onPress={onAction}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={[type.captionMedium, { color: palette.foreground }]}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  action: {
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
    marginTop: 2,
  },
  pressed: {
    opacity: 0.55,
  },
});
