import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View , ScrollView } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { LoadingState } from '@/components/LoadingState';
import { HeaderAction, PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ReminderRow } from '@/features/reminders/components/ReminderRow';
import { useReminders } from '@/features/reminders/RemindersProvider';
import { useHaptics } from '@/hooks/useAccessibility';
import { useTheme } from '@/theme';
import { isSnoozed } from '@/utils/date';
import { errorMessage } from '@/utils/errors';

type Filter = 'active' | 'completed';

export default function AllRemindersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { reminders, loading, loadError, refresh, completeReminder, reopenReminder } =
    useReminders();
  const haptic = useHaptics();
  const [filter, setFilter] = useState<Filter>('active');
  const [busyId, setBusyId] = useState<string | null>(null);

  const active = useMemo(
    () => reminders.filter((reminder) => reminder.status === 'active'),
    [reminders],
  );
  const completed = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.status === 'completed')
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [reminders],
  );

  const visible = filter === 'active' ? active : completed;

  const openNewReminder = () => router.push('/reminder/new');

  const runToggle = async (id: string, completedReminder: boolean) => {
    if (busyId) return;
    setBusyId(id);
    try {
      if (completedReminder) {
        await reopenReminder(id);
      } else {
        await completeReminder(id);
      }
      await haptic(completedReminder ? 'light' : 'success');
    } catch (error) {
      Alert.alert('Could not update reminder', errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <PageHeader
      title="All"
      subtitle={`${active.length} active · ${completed.length} completed`}
      right={
        <HeaderAction onPress={openNewReminder} label="New reminder">
          <Icon name="plus" size={22} color={colors.accentText} weight="semibold" />
        </HeaderAction>
      }
    />
  );

  if (loading) {
    return (
      <Screen safeTop>
        {header}
        <LoadingState label="Loading reminders" />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen safeTop>
        {header}
        <ErrorState
          message={loadError}
          actionLabel="Try Again"
          onAction={() => refresh().catch(() => undefined)}
        />
      </Screen>
    );
  }

  return (
    <Screen safeTop>
      {header}
      <View style={styles.filterWrap}>
        <SegmentedControl
          accessibilityLabel="Filter reminders"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: `Active${active.length ? ` (${active.length})` : ''}` },
            {
              value: 'completed',
              label: `Completed${completed.length ? ` (${completed.length})` : ''}`,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={filter === 'active' ? 'list' : 'success'}
            title={filter === 'active' ? 'No active reminders' : 'No completed reminders yet'}
            message={
              filter === 'active'
                ? 'Add a reminder for a place or a time. It will stay on this iPhone until you complete it.'
                : 'Finished reminders collect here so you can look back without cluttering your active list.'
            }
            actionLabel={filter === 'active' ? 'New Reminder' : undefined}
            onAction={filter === 'active' ? openNewReminder : undefined}
          />
        ) : (
          <Section
            footer={
              filter === 'active'
                ? 'Completed or deleted reminders stop sending alerts.'
                : 'Tap a completed reminder to reopen or delete it.'
            }
          >
            {visible.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                meta={
                  reminder.status === 'active'
                    ? reminder.dueAt
                      ? undefined
                      : isSnoozed(reminder.snoozedUntil)
                        ? 'Snoozed'
                        : undefined
                    : undefined
                }
                onPress={() => router.push(`/reminder/${reminder.id}`)}
                onToggle={() => void runToggle(reminder.id, reminder.status === 'completed')}
                busy={busyId === reminder.id}
              />
            ))}
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterWrap: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
});
