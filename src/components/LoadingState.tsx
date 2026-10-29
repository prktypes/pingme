import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { spacing, type, useTheme } from '@/theme';

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container} accessible accessibilityLabel={label}>
      <ActivityIndicator color={colors.accent} />
      <Text style={[type.footnote, { color: colors.secondaryText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
});
