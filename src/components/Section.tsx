import { Children, Fragment, type PropsWithChildren, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radii, spacing, type, useTheme } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './iconNames';


type SectionProps = PropsWithChildren<{
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  footer?: string | null;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}>;

export function Section({
  title,
  actionLabel,
  onAction,
  footer,
  style,
  accessibilityLabel,
  children,
}: SectionProps) {
  const { colors } = useTheme();
  const items = Children.toArray(children);

  return (
    <View style={[styles.section, style]}>
      {title || (actionLabel && onAction) ? (
        <View style={styles.header}>
          <Text style={[type.overline, { color: colors.secondaryText }]}>{title}</Text>
          {actionLabel && onAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              onPress={onAction}
              hitSlop={12}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={[type.captionMedium, { color: colors.accentText }]}>
                {actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View
        accessible={!accessibilityLabel ? false : undefined}
        accessibilityLabel={accessibilityLabel}
        style={[styles.group, { backgroundColor: colors.surface }]}
      >
        {items.map((child, index) => (
          <Fragment key={index}>
            {child}
            {index < items.length - 1 ? (
              <View
                style={[styles.divider, { backgroundColor: colors.separator }]}
                pointerEvents="none"
              />
            ) : null}
          </Fragment>
        ))}
      </View>

      {footer ? (
        <Text style={[type.caption, styles.footer, { color: colors.secondaryText }]}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  icon?: IconName;
  iconColor?: string;
  onPress?: () => void;
  accessory?: 'chevron' | 'check' | 'none';
  right?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  titleStyle?: StyleProp<import('react-native').TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  leading?: ReactNode;
};

export function ListRow({
  title,
  subtitle,
  meta,
  icon,
  iconColor,
  onPress,
  accessory = onPress ? 'chevron' : 'none',
  right,
  destructive = false,
  disabled = false,
  titleStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
  leading,
}: ListRowProps) {
  const { colors } = useTheme();
  const titleColor = destructive ? colors.danger : colors.text;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? styles.rowPressed : null,
        disabled && styles.rowDisabled,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      {icon ? (
        <View style={styles.icon}>
          <Icon name={icon} size={20} color={iconColor ?? colors.secondaryText} />
        </View>
      ) : null}

      <View style={styles.copy}>
        <Text style={[type.body, { color: titleColor }, titleStyle]}>{title}</Text>
        {subtitle ? (
          <Text
            style={[type.caption, styles.subtitle, { color: colors.secondaryText }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {meta ? (
        <Text style={[type.footnote, { color: colors.tertiaryText }]} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
      {right}
      {accessory === 'chevron' && !right ? (
        <Icon name="chevronRight" size={14} color={colors.tertiaryText} weight="semibold" />
      ) : null}
      {accessory === 'check' ? (
        <Icon name="check" size={18} color={colors.accent} weight="semibold" />
      ) : null}
    </Pressable>
  );
}

type SectionEmptyProps = {
  text: string;
};

export function SectionEmpty({ text }: SectionEmptyProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.surface }]}>
      <Text style={[type.footnote, { color: colors.secondaryText, textAlign: 'center' }]}>
        {text}
      </Text>
    </View>
  );
}

type SwitchRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: IconName;
  accessibilityHint?: string;
};

export function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  icon,
  accessibilityHint,
}: SwitchRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {icon ? (
        <View style={styles.icon}>
          <Icon name={icon} size={20} color={colors.secondaryText} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[type.body, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[type.caption, styles.subtitle, { color: colors.secondaryText }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View pointerEvents="none" accessible={false}>
        <Switch
          value={value}
          trackColor={{ false: colors.fill, true: colors.accent }}
          ios_backgroundColor={colors.fill}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxs,
    minHeight: 22,
  },
  group: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xxs,
    paddingTop: 2,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowPressed: {
    backgroundColor: 'rgba(127,127,127,0.10)',
  },
  rowDisabled: {
    opacity: 0.45,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    marginTop: 1,
  },
  icon: {
    width: 24,
    alignItems: 'center',
  },
  leading: {
    marginLeft: -4,
  },
  pressed: {
    opacity: 0.55,
  },
  empty: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
});
