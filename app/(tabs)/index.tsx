import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View , ScrollView } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { InlineNotice } from '@/components/InlineNotice';
import { LoadingState } from '@/components/LoadingState';
import { HeaderAction, PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Section, SectionEmpty } from '@/components/Section';
import { ReminderRow } from '@/features/reminders/components/ReminderRow';
import { reminderSortKey } from '@/features/reminders/display';
import { useReminders } from '@/features/reminders/RemindersProvider';
import { useNearbyReminders } from '@/features/reminders/useNearbyReminders';
import { useHaptics } from '@/hooks/useAccessibility';
import {
  getLocationPermissionSnapshot,
  openSystemSettings,
} from '@/location/permissions';
import { useTheme } from '@/theme';
import { formatDueAt, isSnoozed } from '@/utils/date';
import { formatDistance } from '@/utils/distance';
import { errorMessage } from '@/utils/errors';

export default function TodayScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { reminders, loading, loadError, refresh, completeReminder } = useReminders();
  const { locationState, nearby, hasLocationReminders, requestAccess } = useNearbyReminders();
  const haptic = useHaptics();
  const [busyId, setBusyId] = useState<string | null>(null);

  const active = useMemo(
    () => reminders.filter((reminder) => reminder.status === 'active'),
    [reminders],
  );
  const completed = useMemo(
    () => reminders.filter((reminder) => reminder.status === 'completed'),
    [reminders],
  );

  const nearbyIds = useMemo(() => new Set(nearby.map((item) => item.reminder.id)), [nearby]);

  const comingUp = useMemo(
    () =>
      active
        .filter((reminder) => reminder.dueAt && !nearbyIds.has(reminder.id))
        .sort((a, b) => reminderSortKey(a) - reminderSortKey(b))
        .slice(0, 3),
    [active, nearbyIds],
  );

  const comingUpIds = useMemo(
    () => new Set(comingUp.map((reminder) => reminder.id)),
    [comingUp],
  );

  const otherActive = useMemo(
    () =>
      active
        .filter((reminder) => !nearbyIds.has(reminder.id) && !comingUpIds.has(reminder.id))
        .slice(0, 4),
    [active, comingUpIds, nearbyIds],
  );

  const monitoredCount = active.filter((reminder) => reminder.isMonitored).length;
  const subtitle =
    active.length === 0
      ? 'Quiet for now'
      : `${active.length} active${monitoredCount ? ` · ${monitoredCount} monitored` : ''}`;

  const onToggle = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await completeReminder(id);
      await haptic('success');
    } catch (error) {
      Alert.alert('Could not update reminder', errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const openNewReminder = () => router.push('/reminder/new');

  const handleLocationAction = async () => {
    if (locationState.status === 'permission_denied') {
      const permissions = await getLocationPermissionSnapshot();
      if (!permissions.canAskForeground) {
        Alert.alert(
          'Location access',
          'Enable location for Nearn in Settings to see reminders around you.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void openSystemSettings() },
          ],
        );
        return;
      }
      await requestAccess();
      return;
    }

    if (locationState.status === 'services_off') {
      Alert.alert(
        'Location Services are off',
        'Turn on Location Services in Settings to see reminders around you.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void openSystemSettings() },
        ],
      );
      return;
    }

    await requestAccess();
  };

  if (loading) {
    return (
      <Screen safeTop>
        <PageHeader title="Today" />
        <LoadingState label="Loading reminders" />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen safeTop>
        <PageHeader title="Today" />
        <ErrorState
          message={loadError}
          actionLabel="Try Again"
          onAction={() => refresh().catch(() => undefined)}
        />
      </Screen>
    );
  }

  const showFloatingAdd = active.length > 0;
  const hasSections =
    (hasLocationReminders && locationState.status !== 'permission_denied') ||
    comingUp.length > 0 ||
    otherActive.length > 0;

  return (
    <Screen safeTop>
      <PageHeader
        title="Today"
        subtitle={subtitle}
        right={
          <HeaderAction onPress={openNewReminder} label="New reminder">
            <Icon name="plus" size={22} color={colors.accentText} weight="semibold" />
          </HeaderAction>
        }
      />

      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            showFloatingAdd && styles.contentWithFloatingAction,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {active.length === 0 ? (
            <EmptyState
              icon="nearby"
              title={completed.length ? "You're all caught up" : 'Nothing to remember yet'}
              message={
                completed.length
                  ? 'Completed reminders are kept in All. Add another reminder whenever you need one.'
                  : 'Create a reminder for when you are near a place, or at a specific time.'
              }
              actionLabel="New Reminder"
              onAction={openNewReminder}
            />
          ) : null}

          {active.length > 0 && hasLocationReminders ? (
            <Section title="Nearby">
              {locationState.status === 'ready' && nearby.length > 0
                ? nearby.slice(0, 3).map((item) => (
                    <ReminderRow
                      key={item.reminder.id}
                      reminder={item.reminder}
                      distanceLabel={formatDistance(item.distanceM)}
                      placeLabel={item.placeLabel}
                      onPress={() => router.push(`/reminder/${item.reminder.id}`)}
                      onToggle={() => onToggle(item.reminder.id)}
                      busy={busyId === item.reminder.id}
                    />
                  ))
                : null}

              {locationState.status === 'ready' && nearby.length === 0 ? (
                <SectionEmpty text="No saved reminders are within 5 km right now." />
              ) : null}

              {locationState.status === 'loading' ? (
                <SectionEmpty text="Finding places around you…" />
              ) : null}

              {locationState.status === 'permission_denied' ? (
                <View style={styles.noticeWrap}>
                  <InlineNotice
                    title="See reminders around you"
                    message="Allow location access to show which saved places are nearby. Nearn does not keep a location history."
                    actionLabel="Continue"
                    onAction={() => void handleLocationAction()}
                  />
                </View>
              ) : null}

              {locationState.status === 'services_off' ? (
                <View style={styles.noticeWrap}>
                  <InlineNotice
                    title="Location Services are off"
                    message="Turn on Location Services to see reminders around you."
                    tone="warning"
                    actionLabel="Open Settings"
                    onAction={() => void handleLocationAction()}
                  />
                </View>
              ) : null}

              {locationState.status === 'unavailable' ? (
                <View style={styles.noticeWrap}>
                  <InlineNotice
                    title="Location unavailable"
                    message={locationState.message}
                    actionLabel="Try Again"
                    onAction={() => void handleLocationAction()}
                  />
                </View>
              ) : null}
            </Section>
          ) : null}

          {comingUp.length > 0 ? (
            <Section title="Coming up">
              {comingUp.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  meta={formatDueAt(reminder.dueAt)}
                  onPress={() => router.push(`/reminder/${reminder.id}`)}
                  onToggle={() => onToggle(reminder.id)}
                  busy={busyId === reminder.id}
                />
              ))}
            </Section>
          ) : null}

          {otherActive.length > 0 ? (
            <Section
              title="Active"
              actionLabel={active.length > otherActive.length ? 'View all' : undefined}
              onAction={
                active.length > otherActive.length
                  ? () => router.push('/(tabs)/reminders')
                  : undefined
              }
            >
              {otherActive.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  meta={
                    reminder.dueAt
                      ? formatDueAt(reminder.dueAt)
                      : isSnoozed(reminder.snoozedUntil)
                        ? 'Snoozed'
                        : undefined
                  }
                  onPress={() => router.push(`/reminder/${reminder.id}`)}
                  onToggle={() => onToggle(reminder.id)}
                  busy={busyId === reminder.id}
                />
              ))}
            </Section>
          ) : null}

          {active.length > 0 && !hasSections ? (
            <SectionEmpty text="Your reminders are saved. Add a time or place to make them easier to act on." />
          ) : null}

          {completed.length > 0 && active.length === 0 ? (
            <Section title="Recently completed">
              {completed.slice(0, 2).map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  onPress={() => router.push(`/reminder/${reminder.id}`)}
                />
              ))}
            </Section>
          ) : null}
        </ScrollView>

        {showFloatingAdd ? (
          <View pointerEvents="box-none" style={styles.floatingWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New reminder"
              onPress={openNewReminder}
              style={({ pressed }) => [
                styles.floatingButton,
                { backgroundColor: colors.accent, shadowColor: colors.shadow },
                pressed && styles.floatingPressed,
              ]}
            >
              <Icon name="plus" size={20} color={colors.accentOn} weight="semibold" />
              <Text style={[styles.floatingLabel, { color: colors.accentOn }]}>
                New Reminder
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 24,
  },
  contentWithFloatingAction: {
    paddingBottom: 104,
  },
  noticeWrap: {
    padding: 4,
  },
  floatingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  floatingButton: {
    minHeight: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  floatingPressed: {
    opacity: 0.8,
  },
  floatingLabel: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
});
