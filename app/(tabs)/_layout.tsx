import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.tertiaryText,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarAccessibilityLabel: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="today"
              size={22}
              color={color as string}
              weight={focused ? 'semibold' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'All',
          tabBarAccessibilityLabel: 'All reminders',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="list"
              size={22}
              color={color as string}
              weight={focused ? 'semibold' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="settings"
              size={22}
              color={color as string}
              weight={focused ? 'semibold' : 'regular'}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
