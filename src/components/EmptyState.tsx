import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, type, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './iconNames';


type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.fill }]}>
        <Icon name={icon} size={compact ? 22 : 26} color={colors.secondaryText} />
      </View>
      <View style={styles.copy}>
        <Text style={[type.heading, styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[type.footnote, styles.message, { color: colors.secondaryText }]}>
          {message}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="compact"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  compact: {
    paddingVertical: spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 320,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 290,
  },
  action: {
    minHeight: 44,
    marginTop: 2,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
  },
});
