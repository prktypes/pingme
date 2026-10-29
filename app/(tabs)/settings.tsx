import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView , Alert, StyleSheet, View } from 'react-native';

import { ChoiceSheet } from '@/components/ChoiceSheet';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { ListRow, Section } from '@/components/Section';
import { APP_NAME, RADIUS_OPTIONS, type RadiusOption } from '@/constants';
import { countTriggerHistory, clearTriggerHistory } from '@/db/reminderRepository';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useHaptics } from '@/hooks/useAccessibility';
import {
  locationPermissionLabel,
  notificationPermissionLabel,
  openSystemSettings,
  requestBackgroundLocation,
  requestForegroundLocation,
  requestNotificationPermission,
} from '@/location/permissions';
import { usePermissionSnapshot } from '@/location/usePermissionSnapshot';
import { useTheme } from '@/theme';
import { errorMessage } from '@/utils/errors';

const RADIUS_LABELS: Record<RadiusOption, string> = {
  100: '100 metres',
  250: '250 metres',
  500: '500 metres',
};

function settingsPrompt(title: string, message: string) {
  Alert.alert(title, message, [
    { text: 'Not Now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => void openSystemSettings() },
  ]);
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { defaultRadiusM, updateDefaultRadius } = useSettings();
  const { snapshot, loading: permissionsLoading, refresh } = usePermissionSnapshot();
  const haptic = useHaptics();
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  const refreshHistoryCount = useCallback(() => {
    countTriggerHistory()
      .then(setHistoryCount)
      .catch(() => setHistoryCount(null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshHistoryCount();
    }, [refreshHistoryCount]),
  );

  const onLocationPress = async () => {
    if (!snapshot) return;
    if (snapshot.location.foreground === 'granted') {
      if (!snapshot.location.hasBackgroundAccess) {
        Alert.alert(
          'Background location',
          'To alert you when you arrive, Nearn needs background location. Your location history is never stored or uploaded.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Continue',
              onPress: async () => {
                await requestBackgroundLocation();
                await refresh();
              },
            },
          ],
        );
      }
      return;
    }

    if (snapshot.location.canAskForeground) {
      await requestForegroundLocation();
      await refresh();
      return;
    }

    if (snapshot.location.servicesEnabled === false) {
      settingsPrompt(
        'Location Services are off',
        'Turn on Location Services in the iOS Settings app, then return to Nearn.',
      );
      return;
    }

    settingsPrompt(
      'Location access is off',
      'Enable location for Nearn in Settings to find places and monitor arrival reminders.',
    );
  };

  const onBackgroundPress = async () => {
    if (!snapshot) return;
    if (snapshot.location.hasBackgroundAccess) return;

    if (snapshot.location.foreground !== 'granted') {
      Alert.alert(
        'Allow location first',
        'Nearn needs While Using location access before it can ask for background access.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              await requestForegroundLocation();
              await refresh();
            },
          },
        ],
      );
      return;
    }

    if (!snapshot.location.canAskBackground) {
      settingsPrompt(
        'Background location is off',
        'Enable "Always" location access for Nearn in Settings so arrival reminders can work while the app is closed.',
      );
      return;
    }

    Alert.alert(
      'Background location',
      'Nearn watches only the places you saved. It does not record a location history. iOS may ask you to confirm "Always" access.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            await requestBackgroundLocation();
            await refresh();
          },
        },
      ],
    );
  };

  const onNotificationsPress = async () => {
    if (!snapshot) return;
    if (snapshot.notifications.granted) return;

    if (snapshot.notifications.canAskAgain) {
      await requestNotificationPermission();
      await refresh();
      return;
    }

    settingsPrompt(
      'Notifications are off',
      'Enable notifications for Nearn in Settings to receive arrival and time reminders.',
    );
  };

  const onSelectRadius = async (radius: RadiusOption) => {
    await updateDefaultRadius(radius);
    await haptic('light');
  };

  const onClearHistory = () => {
    Alert.alert(
      'Clear trigger history?',
      'This removes the local record of reminders that have already alerted you. Your reminders are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearTriggerHistory()
              .then(() => {
                setHistoryCount(0);
                return haptic('light');
              })
              .catch((error) => Alert.alert('Could not clear history', errorMessage(error)));
          },
        },
      ],
    );
  };

  const version = Constants.expoConfig?.version ?? '0.1.0';
  const locationStatus = snapshot
    ? locationPermissionLabel(snapshot.location)
    : permissionsLoading
      ? 'Checking…'
      : 'Unavailable';
  const backgroundStatus = snapshot
    ? snapshot.location.hasBackgroundAccess
      ? 'Allowed'
      : snapshot.location.background === 'denied'
        ? 'Not allowed'
        : snapshot.location.background === 'undetermined'
          ? 'Not set up'
          : 'Unavailable'
    : permissionsLoading
      ? 'Checking…'
      : 'Unavailable';
  const notificationStatus = snapshot
    ? notificationPermissionLabel(snapshot.notifications)
    : permissionsLoading
      ? 'Checking…'
      : 'Unavailable';

  return (
    <Screen safeTop>
      <PageHeader title="Settings" subtitle="Private by default · On this iPhone" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section
          title="Permissions"
          footer="Nearn asks for access only when it is useful. iOS controls background delivery, so arrival alerts may be delayed by the system."
        >
          <ListRow
            icon="location"
            title="Location"
            subtitle="Used to find places and monitor arrivals"
            meta={locationStatus}
            onPress={() => void onLocationPress()}
            accessibilityHint="Shows or requests location permission"
          />
          <ListRow
            icon="nearby"
            title="Background access"
            subtitle="Needed for arrival alerts while closed"
            meta={backgroundStatus}
            onPress={() => void onBackgroundPress()}
            accessibilityHint="Shows or requests background location permission"
          />
          <ListRow
            icon="bell"
            title="Notifications"
            subtitle="Arrival and timed reminders"
            meta={notificationStatus}
            onPress={() => void onNotificationsPress()}
            accessibilityHint="Shows or requests notification permission"
          />
        </Section>

        <Section title="Reminder defaults">
          <ListRow
            icon="target"
            title="Default radius"
            subtitle="Used for new place reminders"
            meta={RADIUS_LABELS[defaultRadiusM]}
            onPress={() => setRadiusOpen(true)}
          />
        </Section>

        <Section
          title="Privacy"
          footer="No account is required. Place search sends only the coordinates and category you are searching for."
        >
          <ListRow
            icon="shield"
            title="Stored on this iPhone"
            subtitle="Reminders stay in a local database. No location history is recorded or uploaded."
            onPress={undefined}
            accessory="none"
          />
          <ListRow
            icon="trash"
            title="Clear trigger history"
            subtitle="Remove the local record of past alert triggers"
            meta={historyCount === null ? undefined : String(historyCount)}
            destructive
            onPress={onClearHistory}
            accessibilityHint="Clears local alert history after confirmation"
          />
        </Section>

        <Section title="About" footer="Built for iPhone first. Android uses the same reminder engine.">
          <ListRow
            icon="info"
            title={APP_NAME}
            subtitle="Quiet reminders for the right place"
            meta={version}
            accessory="none"
          />
        </Section>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <ChoiceSheet
        visible={radiusOpen}
        title="Default radius"
        message="Arrival reminders trigger when you enter this distance around a place."
        selectedValue={String(defaultRadiusM)}
        options={RADIUS_OPTIONS.map((radius) => ({
          value: String(radius),
          label: RADIUS_LABELS[radius],
        }))}
        onSelect={(value) => {
          void onSelectRadius(Number(value) as RadiusOption);
        }}
        onClose={() => setRadiusOpen(false)}
      />

      <View style={[styles.accentRule, { backgroundColor: colors.separator }]} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 24,
  },
  bottomSpace: {
    height: 12,
  },
  accentRule: {
    height: StyleSheet.hairlineWidth,
  },
});
