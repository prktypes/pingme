
import { categoryProximityLabel } from '@/places/categories';
import { formatDueAt } from '@/utils/date';

import type { Reminder, ReminderTarget } from './types';


export function isLocationReminder(reminder: Reminder): boolean {
  return reminder.triggerType === 'place' || reminder.triggerType === 'category';
}

export function hasTimedAlert(reminder: Reminder): boolean {
  return Boolean(reminder.dueAt);
}

export function triggerTitle(reminder: Reminder): string {
  switch (reminder.triggerType) {
    case 'place':
      return reminder.placeName ? `Near ${reminder.placeName}` : 'Near a saved place';
    case 'category':
      return `Near ${categoryProximityLabel(reminder.category)}`;
    case 'time':
      return reminder.dueAt ? `At ${formatDueAt(reminder.dueAt)}` : 'Timed reminder';
  }
}

export function triggerSubtitle(reminder: Reminder): string {
  if (reminder.triggerType === 'place' && reminder.placeAddress) {
    return reminder.placeAddress;
  }
  if (reminder.triggerType === 'category') {
    return 'Category reminder';
  }
  if (reminder.triggerType === 'time') {
    return reminder.repeatRule === 'none' ? 'One-time reminder' : 'Repeating reminder';
  }
  return `Within ${reminder.radiusM} m`;
}

export function monitoredTargetCount(targets: ReminderTarget[]): number {
  return targets.filter((target) => target.isMonitored).length;
}

export function activeTargetCount(targets: ReminderTarget[]): number {
  return targets.length;
}

export function reminderSortKey(reminder: Reminder): number {
  if (reminder.dueAt) {
    const time = new Date(reminder.dueAt).getTime();
    if (Number.isFinite(time)) return time;
  }
  return Number.POSITIVE_INFINITY;
}
