import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';


import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { useReminders } from '@/features/reminders/RemindersProvider';

import { ReminderFormScreen } from './ReminderFormScreen';


type ReminderEditScreenProps = {
  reminderId: string | undefined;
};

export function ReminderEditScreen({ reminderId }: ReminderEditScreenProps) {
  const router = useRouter();
  const { reminders, loading, loadError, refresh } = useReminders();
  const reminder = reminderId
    ? reminders.find((candidate) => candidate.id === reminderId) ?? null
    : null;

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Edit Reminder' }} />
        <LoadingState label="Loading reminder" />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Edit Reminder' }} />
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
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Edit Reminder' }} />
        <View style={styles.center}>
          <EmptyState
            icon="error"
            title="Reminder not found"
            message="This reminder may have been deleted on this iPhone."
            actionLabel="Go Back"
            onAction={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)');
            }}
          />
        </View>
      </Screen>
    );
  }

  return <ReminderFormScreen mode="edit" reminder={reminder} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
  },
});
