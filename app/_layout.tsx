import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RemindersProvider } from '@/features/reminders/RemindersProvider';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { configureNotificationChannel } from '@/location/permissions';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    configureNotificationChannel().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <RemindersProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.accentText,
              headerTitleStyle: { color: colors.text, fontSize: 17, fontWeight: '600' },
              headerShadowVisible: false,
              headerBackTitle: 'Back',
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="reminder/new"
              options={{
                presentation: 'modal',
                title: 'New Reminder',
              }}
            />
            <Stack.Screen
              name="reminder/[id]/index"
              options={{
                title: 'Reminder',
              }}
            />
            <Stack.Screen
              name="reminder/[id]/edit"
              options={{
                presentation: 'modal',
                title: 'Edit Reminder',
              }}
            />
          </Stack>
        </RemindersProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
