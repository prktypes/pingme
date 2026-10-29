import type { PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { type, useTheme } from '@/theme';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PageHeader({ title, subtitle, right, style }: PageHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.copy}>
        <Text
          accessibilityRole="header"
          style={[type.largeTitle, { color: colors.text }]}
          maxFontSizeMultiplier={1.4}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.footnote, styles.subtitle, { color: colors.secondaryText }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

type HeaderActionProps = {
  onPress: () => void;
  label: string;
  children: ReactNode;
};

export function HeaderAction({ onPress, label, children }: HeaderActionProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerAction,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function PageBody({ children }: PropsWithChildren) {
  return <View style={styles.body}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
  },
  right: {
    paddingBottom: 4,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
  },
});
