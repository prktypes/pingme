import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/iconNames';
import { useReducedMotion } from '@/hooks/useAccessibility';
import { radii, spacing, type, useTheme } from '@/theme';

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  subtitle?: string;
  icon?: IconName;
  destructive?: boolean;
};

type ChoiceSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  message?: string;
  options: readonly ChoiceOption<T>[];
  selectedValue?: T | null;
  cancelLabel?: string;
  onSelect: (value: T) => void;
  onClose: () => void;
  children?: ReactNode;
};

export function ChoiceSheet<T extends string>({
  visible,
  title,
  message,
  options,
  selectedValue,
  cancelLabel = 'Cancel',
  onSelect,
  onClose,
  children,
}: ChoiceSheetProps<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityViewIsModal
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              maxHeight: height * 0.82,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[type.subheading, { color: colors.text }]}>
              {title}
            </Text>
            {message ? (
              <Text style={[type.caption, { color: colors.secondaryText }]}>{message}</Text>
            ) : null}
          </View>

          <ScrollView
            bounces={false}
            style={[styles.group, { backgroundColor: colors.surface }]}
            contentContainerStyle={styles.groupContent}
          >
            {options.map((option, index) => {
              const selected = option.value === selectedValue;
              return (
                <View key={option.value}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onSelect(option.value);
                      onClose();
                    }}
                    style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                  >
                    {option.icon ? (
                      <Icon
                        name={option.icon}
                        size={20}
                        color={option.destructive ? colors.danger : colors.secondaryText}
                      />
                    ) : null}
                    <View style={styles.optionCopy}>
                      <Text
                        style={[
                          type.body,
                          {
                            color: option.destructive ? colors.danger : colors.text,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.subtitle ? (
                        <Text style={[type.caption, { color: colors.secondaryText }]}>
                          {option.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <Icon name="check" size={18} color={colors.accent} weight="semibold" />
                    ) : null}
                  </Pressable>
                  {index < options.length - 1 ? (
                    <View
                      style={[styles.divider, { backgroundColor: colors.separator }]}
                    />
                  ) : null}
                </View>
              );
            })}
            {children}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancel,
              { backgroundColor: colors.surface },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[type.button, { color: colors.accentText }]}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.xxs,
    paddingBottom: spacing.xxs,
    gap: 3,
  },
  group: {
    borderRadius: radii.md,
  },
  groupContent: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  option: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  cancel: {
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxs,
  },
  pressed: {
    opacity: 0.6,
  },
});
