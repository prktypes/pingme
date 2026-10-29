import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

type ProgressBarProps = {
  value: number;
  accessibilityLabel: string;
};

export function ProgressBar({ value, accessibilityLabel }: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { backgroundColor: colors.fill }]}
    >
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: colors.accent },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
