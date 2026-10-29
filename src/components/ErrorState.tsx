import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, type, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';


type ErrorStateProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function ErrorState({
  title = 'Something went wrong',
  message,
  actionLabel,
  onAction,
  compact = false,
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.dangerSoft }]}>
        <Icon name="warning" size={24} color={colors.danger} />
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
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  compact: {
    paddingVertical: spacing.lg,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  action: {
    borderRadius: radii.pill,
    paddingHorizontal: 18,
  },
});
