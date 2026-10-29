import { StyleSheet, Text, View } from 'react-native';

import { radii, type, useTheme } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './iconNames';


export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
};

export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const { colors } = useTheme();
  const palette = {
    accent: { background: colors.accentSoft, foreground: colors.accentText },
    success: { background: colors.successSoft, foreground: colors.success },
    warning: { background: colors.warningSoft, foreground: colors.warning },
    danger: { background: colors.dangerSoft, foreground: colors.danger },
    neutral: { background: colors.fill, foreground: colors.secondaryText },
  }[tone];

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.background }]}
      accessible
      accessibilityLabel={label}
    >
      {icon ? <Icon name={icon} size={12} color={palette.foreground} /> : null}
      <Text style={[type.captionMedium, styles.text, { color: palette.foreground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 24,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
  },
});
