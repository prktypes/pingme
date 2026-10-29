import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme';

type NavTextButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  bold?: boolean;
  tone?: 'accent' | 'secondary';
};

export function NavTextButton({
  label,
  onPress,
  disabled = false,
  bold = false,
  tone = 'accent',
}: NavTextButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: tone === 'accent' ? colors.accentText : colors.secondaryText,
            fontWeight: bold ? '600' : '400',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 17,
  },
  pressed: {
    opacity: 0.5,
  },
  disabled: {
    opacity: 0.35,
  },
});
