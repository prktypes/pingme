
import {
  isPlaceCategoryId,
  type PlaceCategoryId,
} from '@/places/categories';
import { parseDate } from '@/utils/date';
import { isCoordinates } from '@/utils/distance';

import type {
  Reminder,
  ReminderFormValues,
  ReminderInput,
  RepeatRule,
  TriggerType,
} from './types';


const MAX_TITLE_LENGTH = 120;
const MAX_NOTES_LENGTH = 1_000;
const REPEAT_RULES: RepeatRule[] = ['none', 'daily', 'weekly', 'monthly'];
const TRIGGER_TYPES: TriggerType[] = ['place', 'category', 'time'];
const VALID_RADII = [100, 250, 500];

export type ReminderField = 'title' | 'notes' | 'trigger' | 'place' | 'category' | 'dueAt';

export type ValidationResult =
  | {
      ok: true;
      values: ReminderFormValues;
      input: ReminderInput;
    }
  | {
      ok: false;
      errors: Partial<Record<ReminderField, string>>;
    };

function normalizedRepeatRule(value: unknown): RepeatRule {
  return typeof value === 'string' && REPEAT_RULES.includes(value as RepeatRule)
    ? (value as RepeatRule)
    : 'none';
}

export function normalizeTriggerType(value: unknown): TriggerType {
  return typeof value === 'string' && TRIGGER_TYPES.includes(value as TriggerType)
    ? (value as TriggerType)
    : 'place';
}

export function validateReminderForm(
  values: ReminderFormValues,
  now = new Date(),
): ValidationResult {
  const errors: Partial<Record<ReminderField, string>> = {};
  const title = values.title.trim();
  const notes = values.notes.trim();

  if (!title) errors.title = 'Add a title for this reminder.';
  if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Keep the title under ${MAX_TITLE_LENGTH} characters.`;
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `Keep notes under ${MAX_NOTES_LENGTH} characters.`;
  }

  if (!VALID_RADII.includes(values.radiusM)) {
    errors.trigger = 'Choose a radius of 100 m, 250 m or 500 m.';
  }

  if (values.triggerType === 'place') {
    if (!values.place) {
      errors.place = 'Choose a place for this reminder.';
    } else if (!isCoordinates(values.place)) {
      errors.place = 'This place has an invalid location.';
    }
  }

  if (values.triggerType === 'category') {
    if (!isPlaceCategoryId(values.category)) {
      errors.category = 'Choose a category to watch.';
    }
  }

  let dueAt: string | null = null;
  if (values.dueAt) {
    const parsed = parseDate(values.dueAt);
    if (!parsed) {
      errors.dueAt = 'Choose a valid date and time.';
    } else if (parsed.getTime() <= now.getTime()) {
      errors.dueAt = 'Choose a date and time in the future.';
    } else {
      dueAt = parsed.toISOString();
    }
  }

  if (values.triggerType === 'time' && !values.dueAt) {
    errors.dueAt = 'Timed reminders need a date and time.';
  }

  if (values.repeatRule !== 'none' && !values.dueAt) {
    errors.dueAt = 'Add a date and time before setting a repeat.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const normalized: ReminderFormValues = {
    title,
    notes,
    triggerType: values.triggerType,
    place: values.place,
    category: values.category,
    radiusM: values.radiusM,
    dueAt,
    repeatRule: values.repeatRule,
  };

  const category =
    values.triggerType === 'category' && isPlaceCategoryId(values.category)
      ? values.category
      : null;

  const input: ReminderInput = {
    title,
    notes: notes || null,
    triggerType: values.triggerType,
    category,
    latitude: values.triggerType === 'place' ? values.place?.latitude ?? null : null,
    longitude: values.triggerType === 'place' ? values.place?.longitude ?? null : null,
    placeName: values.triggerType === 'place' ? values.place?.name ?? null : null,
    placeAddress: values.triggerType === 'place' ? values.place?.address ?? null : null,
    radiusM: values.radiusM,
    dueAt,
    repeatRule: dueAt ? normalizedRepeatRule(values.repeatRule) : 'none',
  };

  return { ok: true, values: normalized, input };
}

export function reminderToFormValues(
  reminder: Reminder,
  category: PlaceCategoryId | null,
): ReminderFormValues {
  return {
    title: reminder.title,
    notes: reminder.notes ?? '',
    triggerType: reminder.triggerType,
    place:
      reminder.triggerType === 'place' &&
      typeof reminder.latitude === 'number' &&
      typeof reminder.longitude === 'number'
        ? {
            providerPlaceId: null,
            name: reminder.placeName ?? 'Saved place',
            address: reminder.placeAddress,
            latitude: reminder.latitude,
            longitude: reminder.longitude,
            source: 'map',
          }
        : null,
    category,
    radiusM: reminder.radiusM,
    dueAt: reminder.dueAt,
    repeatRule: reminder.repeatRule,
  };
}
