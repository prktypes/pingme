import type { Reminder, ReminderTarget, TriggerType, RepeatRule, ReminderStatus } from '@/features/reminders/types';
import type { PlaceCategoryId } from '@/places/categories';

export type ReminderRow = {
  id: string;
  title: string;
  notes: string | null;
  status: ReminderStatus;
  trigger_type: TriggerType;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  place_name: string | null;
  place_address: string | null;
  radius_m: number;
  due_at: string | null;
  repeat_rule: RepeatRule;
  last_notified_at: string | null;
  snoozed_until: string | null;
  completed_at: string | null;
  notification_id: string | null;
  is_monitored: number;
  category_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderTargetRow = {
  id: string;
  reminder_id: string;
  provider_place_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  is_monitored: number;
  last_refreshed_at: string | null;
};

export function mapReminderRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    triggerType: row.trigger_type,
    category: (row.category as PlaceCategoryId | null) ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    placeName: row.place_name,
    placeAddress: row.place_address,
    radiusM: row.radius_m,
    dueAt: row.due_at,
    repeatRule: row.repeat_rule,
    lastNotifiedAt: row.last_notified_at,
    snoozedUntil: row.snoozed_until,
    completedAt: row.completed_at,
    notificationId: row.notification_id,
    isMonitored: row.is_monitored === 1,
    categoryRefreshedAt: row.category_refreshed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTargetRow(row: ReminderTargetRow): ReminderTarget {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    providerPlaceId: row.provider_place_id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    isMonitored: row.is_monitored === 1,
    lastRefreshedAt: row.last_refreshed_at,
  };
}
