import type { PlaceCategoryId } from '@/places/categories';

export type ReminderStatus = 'active' | 'completed';
export type TriggerType = 'place' | 'category' | 'time';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  status: ReminderStatus;
  triggerType: TriggerType;
  category: PlaceCategoryId | null;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  placeAddress: string | null;
  radiusM: number;
  dueAt: string | null;
  repeatRule: RepeatRule;
  lastNotifiedAt: string | null;
  snoozedUntil: string | null;
  completedAt: string | null;
  notificationId: string | null;
  isMonitored: boolean;
  categoryRefreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderTarget {
  id: string;
  reminderId: string;
  providerPlaceId: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  isMonitored: boolean;
  lastRefreshedAt: string | null;
}

export interface ReminderInput {
  title: string;
  notes: string | null;
  triggerType: TriggerType;
  category: PlaceCategoryId | null;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  placeAddress: string | null;
  radiusM: number;
  dueAt: string | null;
  repeatRule: RepeatRule;
}

export interface SelectedPlace {
  providerPlaceId: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  source: 'business' | 'address' | 'map' | 'current';
}

export interface ReminderFormValues {
  title: string;
  notes: string;
  triggerType: TriggerType;
  place: SelectedPlace | null;
  category: PlaceCategoryId | null;
  radiusM: number;
  dueAt: string | null;
  repeatRule: RepeatRule;
}

export interface ReminderWithTargets extends Reminder {
  targets: ReminderTarget[];
}

export interface CreateReminderResult {
  reminder: Reminder;
  created: boolean;
}
