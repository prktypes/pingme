import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type, useTheme } from '@/theme';

type SegmentOption<T extends string | number> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string | number> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors, isDark } = useTheme();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { backgroundColor: colors.fill }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && {
                backgroundColor: isDark ? colors.surfaceRaised : colors.surface,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0 : 0.08,
                shadowRadius: 2,
              },
              pressed && !selected && styles.pressed,
            ]}
          >
            <Text
              style={[
                type.captionMedium,
                { color: selected ? colors.text : colors.secondaryText },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    padding: 3,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  segment: {
    flex: 1,
    borderRadius: 8,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pressed: {
    opacity: 0.55,
  },
});
