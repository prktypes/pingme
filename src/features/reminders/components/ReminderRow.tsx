import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CircleCheck } from '@/components/CircleCheck';
import { Icon } from '@/components/Icon';
import { triggerSubtitle } from '@/features/reminders/display';
import type { Reminder } from '@/features/reminders/types';
import { categoryProximityLabel } from '@/places/categories';
import { type, useTheme } from '@/theme';
import { formatTimestamp } from '@/utils/date';

type ReminderRowProps = {
  reminder: Reminder;
  onPress: () => void;
  onToggle?: () => void;
  meta?: string;
  distanceLabel?: string;
  placeLabel?: string;
  busy?: boolean;
};

export function ReminderRow({
  reminder,
  onPress,
  onToggle,
  meta,
  distanceLabel,
  placeLabel,
  busy = false,
}: ReminderRowProps) {
  const { colors } = useTheme();
  const completed = reminder.status === 'completed';
  const isLocation = reminder.triggerType !== 'time';

  const secondary = completed
    ? `Completed ${formatTimestamp(reminder.completedAt)}`
    : isLocation
      ? `Near ${
          reminder.triggerType === 'place'
            ? placeLabel ?? reminder.placeName ?? 'saved place'
            : placeLabel ?? categoryProximityLabel(reminder.category)
        }`
      : triggerSubtitle(reminder);

  const trailing = completed ? undefined : distanceLabel ?? meta;

  return (
    <View style={[styles.row, busy && styles.busy]}>
      {onToggle ? (
        <CircleCheck
          checked={completed}
          onToggle={onToggle}
          label={
            completed ? `Reopen ${reminder.title}` : `Mark ${reminder.title} complete`
          }
          disabled={busy}
        />
      ) : (
        <View style={styles.checkSpacer}>
          <Icon
            name={completed ? 'checkCircle' : 'circle'}
            size={26}
            color={completed ? colors.accent : colors.tertiaryText}
          />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[reminder.title, secondary, trailing].filter(Boolean).join(', ')}
        accessibilityHint="Opens reminder details"
        onPress={onPress}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
      >
        <View style={styles.copy}>
          <Text
            style={[
              type.bodyMedium,
              { color: completed ? colors.secondaryText : colors.text },
            ]}
            numberOfLines={2}
          >
            {reminder.title}
          </Text>
          <View style={styles.secondaryRow}>
            {!completed ? (
              <Icon
                name={
                  reminder.triggerType === 'time'
                    ? 'clock'
                    : reminder.triggerType === 'category'
                      ? 'store'
                      : 'location'
                }
                size={13}
                color={colors.tertiaryText}
              />
            ) : null}
            <Text
              style={[type.caption, styles.secondary, { color: colors.secondaryText }]}
              numberOfLines={1}
            >
              {secondary}
            </Text>
          </View>
        </View>

        {trailing ? (
          <Text
            style={[type.caption, styles.meta, { color: colors.tertiaryText }]}
            numberOfLines={1}
          >
            {trailing}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 8,
    gap: 8,
  },
  busy: {
    opacity: 0.55,
  },
  checkSpacer: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.55,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secondary: {
    flexShrink: 1,
  },
  meta: {
    maxWidth: 92,
    textAlign: 'right',
  },
});
