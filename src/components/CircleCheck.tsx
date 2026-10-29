import { Pressable, StyleSheet } from 'react-native';

import { Icon } from './Icon';

import { useTheme } from '@/theme';

type CircleCheckProps = {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
};

export function CircleCheck({ checked, onToggle, label, disabled = false }: CircleCheckProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onToggle}
      style={({ pressed }) => [styles.target, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Icon
        name={checked ? 'checkCircle' : 'circle'}
        size={26}
        color={checked ? colors.accent : colors.tertiaryText}
        weight={checked ? 'semibold' : 'regular'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  pressed: {
    opacity: 0.55,
  },
  disabled: {
    opacity: 0.4,
  },
});
