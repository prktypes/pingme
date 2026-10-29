import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { ChoiceSheet, type ChoiceOption } from '@/components/ChoiceSheet';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/iconNames';
import { InlineNotice } from '@/components/InlineNotice';
import { LoadingState } from '@/components/LoadingState';
import { NavTextButton } from '@/components/NavTextButton';
import { Screen } from '@/components/Screen';
import { ListRow, Section, SectionEmpty } from '@/components/Section';
import {
  isLocationReminder,
  triggerSubtitle,
  triggerTitle,
} from '@/features/reminders/display';
import { useReminders } from '@/features/reminders/RemindersProvider';
import type { Reminder } from '@/features/reminders/types';
import { useHaptics } from '@/hooks/useAccessibility';
import {
  openSystemSettings,
} from '@/location/permissions';
import { usePermissionSnapshot } from '@/location/usePermissionSnapshot';
import { getCategory } from '@/places/categories';
import { spacing, type, useTheme } from '@/theme';
import {
  formatDueAt,
  formatTime,
  formatTimestamp,
  isSnoozed,
  repeatLabel,
  snoozeUntil,
  type SnoozeOption,
} from '@/utils/date';
import { errorMessage } from '@/utils/errors';

type ReminderDetailsScreenProps = {
  reminderId: string | undefined;
};

type ActionKey = 'complete' | 'reopen' | 'snooze' | 'wake' | 'delete';

export function ReminderDetailsScreen({ reminderId }: ReminderDetailsScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const haptic = useHaptics();
  const {
    reminders,
    targetsByReminder,
    loading,
    loadError,
    refresh,
    completeReminder,
    reopenReminder,
    snoozeReminder,
    unsnoozeReminder,
    deleteReminder,
  } = useReminders();
  const {
    snapshot,
    loading: permissionsLoading,
  } = usePermissionSnapshot();

  const [busyAction, setBusyAction] = useState<ActionKey | null>(null);
  const [snoozeSheetOpen, setSnoozeSheetOpen] = useState(false);

  const reminder = reminderId
    ? reminders.find((candidate) => candidate.id === reminderId) ?? null
    : null;

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const openEdit = useCallback(() => {
    if (!reminder) return;
    router.push(`/reminder/${reminder.id}/edit`);
  }, [reminder, router]);

  const headerRight = useCallback(
    () => <NavTextButton label="Edit" onPress={openEdit} />,
    [openEdit],
  );

  const perform = useCallback(
    async (
      key: ActionKey,
      action: () => Promise<void>,
      errorTitle: string,
      feedback: 'light' | 'success' = 'light',
    ) => {
      if (busyAction) return;
      setBusyAction(key);
      try {
        await action();
        await haptic(feedback);
      } catch (error) {
        Alert.alert(errorTitle, errorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction, haptic],
  );

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading reminder" />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen>
        <View style={styles.center}>
          <ErrorState
            message={loadError}
            actionLabel="Try Again"
            onAction={() => refresh().catch(() => undefined)}
          />
        </View>
      </Screen>
    );
  }

  if (!reminder) {
    if (busyAction === 'delete') {
      return (
        <Screen>
          <LoadingState label="Deleting reminder" />
        </Screen>
      );
    }

    return (
      <Screen>
        <View style={styles.center}>
          <EmptyState
            icon="error"
            title="Reminder not found"
            message="This reminder may have been deleted on this iPhone."
            actionLabel="Go Back"
            onAction={leave}
          />
        </View>
      </Screen>
    );
  }

  const completed = reminder.status === 'completed';
  const snoozed = !completed && isSnoozed(reminder.snoozedUntil);
  const category = getCategory(reminder.category);
  const targets = targetsByReminder[reminder.id] ?? [];
  const locationReminder = isLocationReminder(reminder);
  const permissionsAllowMonitoring = snapshot?.canMonitorGeofences ?? false;
  const monitoredTargets = targets.filter((target) => target.isMonitored);
  const monitoringActive =
    !completed &&
    !snoozed &&
    permissionsAllowMonitoring &&
    (reminder.triggerType === 'category'
      ? monitoredTargets.length > 0
      : reminder.isMonitored);

  const triggerIcon: IconName =
    reminder.triggerType === 'place'
      ? 'location'
      : reminder.triggerType === 'category'
        ? category?.icon ?? 'store'
        : 'clock';

  const monitoringMeta = completed
    ? 'Off'
    : snoozed
      ? 'Paused'
      : monitoringActive
        ? 'On'
        : permissionsLoading && reminder.isMonitored
          ? 'Checking…'
          : reminder.isMonitored && !permissionsAllowMonitoring
            ? 'Access off'
            : 'Off';

  const monitoringSubtitle = completed
    ? 'Completed reminders are not monitored.'
    : snoozed
      ? 'Alerts resume when the snooze ends.'
      : monitoringActive
        ? reminder.triggerType === 'category'
          ? 'Nearn is watching nearby places in the background.'
          : 'Nearn is watching this place in the background.'
        : reminder.isMonitored && !permissionsAllowMonitoring
          ? 'Background location or notifications are turned off.'
          : 'Nearn has not scheduled this place for arrival alerts.';

  const snoozeOptions: ChoiceOption<SnoozeOption>[] = [
    {
      value: 'hour',
      label: 'For 1 hour',
      subtitle: `Until ${formatTime(snoozeUntil('hour'))}`,
      icon: 'clock',
    },
    {
      value: 'threeHours',
      label: 'For 3 hours',
      subtitle: `Until ${formatTime(snoozeUntil('threeHours'))}`,
      icon: 'clock',
    },
    {
      value: 'tomorrow',
      label: 'Until tomorrow morning',
      subtitle: `Until ${formatTime(snoozeUntil('tomorrow'))}`,
      icon: 'snooze',
    },
  ];

  const onComplete = () => {
    void perform(
      'complete',
      async () => {
        await completeReminder(reminder.id);
      },
      'Could not complete reminder',
      'success',
    );
  };

  const onReopen = () => {
    void perform(
      'reopen',
      async () => {
        await reopenReminder(reminder.id);
      },
      'Could not reopen reminder',
    );
  };

  const onSnooze = (option: SnoozeOption) => {
    void perform(
      'snooze',
      async () => {
        await snoozeReminder(reminder.id, snoozeUntil(option).toISOString());
      },
      'Could not snooze reminder',
    );
  };

  const onWake = () => {
    void perform(
      'wake',
      async () => {
        await unsnoozeReminder(reminder.id);
      },
      'Could not resume reminder',
    );
  };

  const onDelete = () => {
    Alert.alert(
      'Delete reminder?',
      `“${reminder.title}” and its saved places will be removed from this iPhone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void perform(
              'delete',
              async () => {
                await deleteReminder(reminder.id);
                leave();
              },
              'Could not delete reminder',
            );
          },
        },
      ],
    );
  };

  const renderNotice = (current: Reminder) => {
    if (current.status === 'completed') {
      return (
        <InlineNotice
          title="Completed"
          message={`This reminder was completed ${
            current.completedAt ? formatTimestamp(current.completedAt) : 'recently'
          }. It no longer sends alerts.`}
          tone="neutral"
          icon="checkCircle"
        />
      );
    }

    if (snoozed) {
      return (
        <InlineNotice
          title="Snoozed"
          message={`Alerts are paused until ${formatDueAt(current.snoozedUntil)}. You can resume them at any time.`}
          tone="warning"
          icon="snooze"
        />
      );
    }

    if (!locationReminder) return null;

    if (monitoringActive) {
      return (
        <InlineNotice
          title="Watching for arrival"
          message={`Nearn will alert you when you enter the ${current.radiusM} m radius around this place.`}
          tone="success"
          icon="nearby"
        />
      );
    }

    if (permissionsLoading) return null;

    if (!snapshot?.canMonitorGeofences) {
      return (
        <InlineNotice
          title="Arrival monitoring is off"
          message="Nearn needs background location and notification access to watch this place. You can review both in Settings."
          tone="warning"
          icon="bellOff"
          actionLabel="Open Settings"
          onAction={() => void openSystemSettings()}
        />
      );
    }

    return (
      <InlineNotice
        title="Not monitoring yet"
        message="Nearn has not scheduled this place for background alerts. Monitoring refreshes when you open the app."
        tone="info"
        icon="info"
      />
    );
  };

  const hasDueAt = Boolean(reminder.dueAt);
  const timeAlertMeta = completed
    ? 'Off'
    : reminder.notificationId
      ? 'Scheduled'
      : 'Pending';

  return (
    <>
      <Stack.Screen options={{ headerRight }} />
      <Screen>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustsScrollIndicatorInsets
        >
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: colors.accentSoft }]}>
              <Icon name={triggerIcon} size={26} color={colors.accentText} />
            </View>
            <Text accessibilityRole="header" style={[type.title, { color: colors.text }]}>
              {reminder.title}
            </Text>
            {reminder.notes ? (
              <Text style={[type.body, styles.notes, { color: colors.secondaryText }]}>
                {reminder.notes}
              </Text>
            ) : null}
            <View style={styles.badgeRow}>
              <Badge
                label={completed ? 'Completed' : 'Active'}
                tone={completed ? 'neutral' : 'accent'}
              />
              {snoozed ? <Badge label="Snoozed" tone="warning" icon="snooze" /> : null}
              {monitoringActive ? (
                <Badge label="Monitoring" tone="success" icon="nearby" />
              ) : null}
            </View>
          </View>

          {renderNotice(reminder)}

          <Section title="Trigger">
            <ListRow
              icon={triggerIcon}
              title={triggerTitle(reminder)}
              subtitle={
                reminder.triggerType === 'place' && reminder.placeAddress
                  ? reminder.placeAddress
                  : reminder.triggerType === 'category'
                    ? category
                      ? `Up to two nearby ${category.pluralLabel}`
                      : 'Category reminder'
                    : triggerSubtitle(reminder)
              }
              accessory="none"
            />

            {locationReminder ? (
              <ListRow
                icon="target"
                title="Trigger radius"
                subtitle={`Alert on arrival within ${reminder.radiusM} m`}
                meta={`${reminder.radiusM} m`}
                accessory="none"
              />
            ) : null}

            {hasDueAt || reminder.triggerType === 'time' ? (
              <ListRow
                icon="calendar"
                title={hasDueAt ? formatDueAt(reminder.dueAt) : 'No date set'}
                subtitle={
                  reminder.triggerType === 'time'
                    ? 'Time-only reminder'
                    : 'Also alerts at this time'
                }
                accessory="none"
              />
            ) : null}

            {hasDueAt && reminder.repeatRule !== 'none' ? (
              <ListRow
                icon="repeat"
                title="Repeats"
                meta={repeatLabel(reminder.repeatRule)}
                accessory="none"
              />
            ) : null}
          </Section>

          {reminder.triggerType === 'category' ? (
            <Section
              title="Nearby places"
              footer={
                reminder.categoryRefreshedAt
                  ? `Last checked ${formatTimestamp(reminder.categoryRefreshedAt)}.`
                  : 'Nearn checks for nearby places when you open the app.'
              }
            >
              {targets.length > 0 ? (
                targets.map((target) => (
                  <ListRow
                    key={target.id}
                    icon="location"
                    title={target.name}
                    subtitle={target.address}
                    meta={target.isMonitored && monitoringActive ? 'Watching' : 'Saved'}
                    accessory="none"
                  />
                ))
              ) : (
                <SectionEmpty
                  text={`No nearby ${category?.pluralLabel ?? 'places'} are saved yet. Open Nearn near this area to look for places.`}
                />
              )}
            </Section>
          ) : null}

          <Section title="Status">
            {locationReminder ? (
              <ListRow
                icon={monitoringActive ? 'nearby' : 'bellOff'}
                title="Arrival monitoring"
                subtitle={monitoringSubtitle}
                meta={monitoringMeta}
                accessory="none"
              />
            ) : (
              <ListRow
                icon="bell"
                title="Timed alert"
                subtitle={
                  completed
                    ? 'This reminder is complete.'
                    : 'Local alerts are refreshed when Nearn opens.'
                }
                meta={timeAlertMeta}
                accessory="none"
              />
            )}

            {snoozed ? (
              <ListRow
                icon="snooze"
                title="Snoozed until"
                meta={formatDueAt(reminder.snoozedUntil)}
                accessory="none"
              />
            ) : null}

            {reminder.completedAt ? (
              <ListRow
                icon="checkCircle"
                title="Completed"
                meta={formatTimestamp(reminder.completedAt)}
                accessory="none"
              />
            ) : null}

            {reminder.lastNotifiedAt ? (
              <ListRow
                icon="bell"
                title="Last alert"
                meta={formatTimestamp(reminder.lastNotifiedAt)}
                accessory="none"
              />
            ) : null}
          </Section>

          <Section
            title="Actions"
            footer="Completed or deleted reminders stop sending alerts. Deleting also removes saved nearby places and alert history for this reminder."
          >
            {!completed ? (
              <ListRow
                icon="snooze"
                title="Snooze"
                subtitle={snoozed ? 'Change or extend the snooze' : 'Pause alerts for a while'}
                onPress={() => setSnoozeSheetOpen(true)}
                disabled={busyAction !== null}
              />
            ) : null}

            {snoozed ? (
              <ListRow
                icon="bell"
                title="Resume alerts"
                subtitle="Stop snoozing now"
                onPress={onWake}
                disabled={busyAction !== null}
              />
            ) : null}

            {!completed ? (
              <ListRow
                icon="checkCircle"
                title="Mark Complete"
                subtitle="Stop alerts and move this to Completed"
                iconColor={colors.success}
                onPress={onComplete}
                disabled={busyAction !== null}
              />
            ) : (
              <ListRow
                icon="refresh"
                title="Reopen Reminder"
                subtitle="Return this reminder to your active list"
                onPress={onReopen}
                disabled={busyAction !== null}
              />
            )}

            <ListRow
              icon="trash"
              title="Delete Reminder"
              destructive
              onPress={onDelete}
              disabled={busyAction !== null}
              accessibilityHint="Deletes this reminder after confirmation"
            />
          </Section>

          <Text style={[type.caption, styles.footer, { color: colors.tertiaryText }]}>
            Created {formatTimestamp(reminder.createdAt)}. Saved only on this iPhone.
          </Text>
        </ScrollView>
      </Screen>

      <ChoiceSheet<SnoozeOption>
        visible={snoozeSheetOpen}
        title="Snooze reminder"
        message="Arrival and timed alerts are paused until the snooze ends."
        options={snoozeOptions}
        onSelect={onSnooze}
        onClose={() => setSnoozeSheetOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  notes: {
    maxWidth: 560,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  footer: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
