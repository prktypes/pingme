import { useLocalSearchParams } from 'expo-router';

import { ReminderDetailsScreen } from '@/features/reminders/components/ReminderDetailsScreen';

export default function ReminderDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReminderDetailsScreen reminderId={id} />;
}
