import { useLocalSearchParams } from 'expo-router';

import { ReminderEditScreen } from '@/features/reminders/components/ReminderEditScreen';

export default function EditReminderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReminderEditScreen reminderId={id} />;
}
