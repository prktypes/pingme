
import { getDatabase } from './database';
import {
  mapReminderRow,
  mapTargetRow,
  type ReminderRow,
  type ReminderTargetRow,
} from './rows';

import type {
  Reminder,
  ReminderInput,
  ReminderTarget,
} from '@/features/reminders/types';
import { createId } from '@/utils/id';

export type DiscoveredTarget = {
  providerPlaceId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  lastRefreshedAt: string;
};

const ACTIVE_ORDER = `
  ORDER BY
    CASE status WHEN 'active' THEN 0 ELSE 1 END,
    CASE WHEN status = 'active' AND due_at IS NOT NULL THEN 0 ELSE 1 END,
    due_at ASC,
    created_at DESC
`;

export async function listReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(`SELECT * FROM reminders ${ACTIVE_ORDER}`);
  return rows.map(mapReminderRow);
}

export async function getReminder(id: string): Promise<Reminder | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ReminderRow>('SELECT * FROM reminders WHERE id = ?', id);
  return row ? mapReminderRow(row) : null;
}

export async function listAllTargets(): Promise<ReminderTarget[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderTargetRow>(
    'SELECT * FROM reminder_targets ORDER BY reminder_id, name COLLATE NOCASE',
  );
  return rows.map(mapTargetRow);
}

export async function listTargets(reminderId: string): Promise<ReminderTarget[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderTargetRow>(
    'SELECT * FROM reminder_targets WHERE reminder_id = ? ORDER BY name COLLATE NOCASE',
    reminderId,
  );
  return rows.map(mapTargetRow);
}

export async function listActiveReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    `SELECT * FROM reminders WHERE status = 'active' ORDER BY due_at IS NULL, due_at ASC, created_at DESC`,
  );
  return rows.map(mapReminderRow);
}

export async function createReminder(input: ReminderInput): Promise<Reminder> {
  const db = await getDatabase();
  const id = createId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO reminders (
      id, title, notes, status, trigger_type, category, latitude, longitude,
      place_name, place_address, radius_m, due_at, repeat_rule, created_at, updated_at
    ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title,
    input.notes,
    input.triggerType,
    input.category,
    input.latitude,
    input.longitude,
    input.placeName,
    input.placeAddress,
    input.radiusM,
    input.dueAt,
    input.repeatRule,
    now,
    now,
  );

  const reminder = await getReminder(id);
  if (!reminder) throw new Error('The reminder could not be saved.');
  return reminder;
}

export async function updateReminder(id: string, input: ReminderInput): Promise<Reminder> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await getReminder(id);
  if (!existing) throw new Error('This reminder no longer exists.');

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE reminders SET
        title = ?,
        notes = ?,
        trigger_type = ?,
        category = ?,
        latitude = ?,
        longitude = ?,
        place_name = ?,
        place_address = ?,
        radius_m = ?,
        due_at = ?,
        repeat_rule = ?,
        snoozed_until = NULL,
        notification_id = NULL,
        is_monitored = 0,
        category_refreshed_at = CASE WHEN category = ? THEN category_refreshed_at ELSE NULL END,
        updated_at = ?
      WHERE id = ?`,
      input.title,
      input.notes,
      input.triggerType,
      input.category,
      input.latitude,
      input.longitude,
      input.placeName,
      input.placeAddress,
      input.radiusM,
      input.dueAt,
      input.repeatRule,
      input.category,
      now,
      id,
    );

    if (input.triggerType !== 'category' || existing.category !== input.category) {
      await db.runAsync('DELETE FROM reminder_targets WHERE reminder_id = ?', id);
    }

    if (input.triggerType !== 'category') {
      await db.runAsync(
        'UPDATE reminder_targets SET is_monitored = 0 WHERE reminder_id = ?',
        id,
      );
    }
  });

  const reminder = await getReminder(id);
  if (!reminder) throw new Error('The reminder could not be updated.');
  return reminder;
}

export async function completeReminder(id: string): Promise<Reminder | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE reminders SET
        status = 'completed',
        completed_at = ?,
        snoozed_until = NULL,
        notification_id = NULL,
        is_monitored = 0,
        updated_at = ?
      WHERE id = ?`,
      now,
      now,
      id,
    );
    await db.runAsync('UPDATE reminder_targets SET is_monitored = 0 WHERE reminder_id = ?', id);
  });

  return getReminder(id);
}

export async function reopenReminder(id: string): Promise<Reminder | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE reminders SET
      status = 'active',
      completed_at = NULL,
      notification_id = NULL,
      is_monitored = 0,
      updated_at = ?
    WHERE id = ?`,
    now,
    id,
  );

  return getReminder(id);
}

export async function snoozeReminder(id: string, untilIso: string): Promise<Reminder | null> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE reminders SET
      snoozed_until = ?,
      notification_id = NULL,
      updated_at = ?
    WHERE id = ? AND status = 'active'`,
    untilIso,
    new Date().toISOString(),
    id,
  );
  return getReminder(id);
}

export async function unsnoozeReminder(id: string): Promise<Reminder | null> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE reminders SET
      snoozed_until = NULL,
      notification_id = NULL,
      updated_at = ?
    WHERE id = ? AND status = 'active'`,
    new Date().toISOString(),
    id,
  );
  return getReminder(id);
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
}

export async function setReminderNotificationId(
  id: string,
  notificationId: string | null,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE reminders SET notification_id = ? WHERE id = ?',
    notificationId,
    id,
  );
}

export async function updateLastNotified(id: string, iso = new Date().toISOString()): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE reminders SET last_notified_at = ?, updated_at = updated_at WHERE id = ?',
    iso,
    id,
  );
}

export async function setMonitoringState(
  monitoredReminderIds: readonly string[],
  monitoredTargetIds: readonly string[],
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE reminders SET is_monitored = 0');
    for (const id of monitoredReminderIds) {
      await db.runAsync(
        `UPDATE reminders SET is_monitored = 1 WHERE id = ? AND status = 'active'`,
        id,
      );
    }

    await db.runAsync('UPDATE reminder_targets SET is_monitored = 0');
    for (const id of monitoredTargetIds) {
      await db.runAsync('UPDATE reminder_targets SET is_monitored = 1 WHERE id = ?', id);
    }
  });
}

export async function upsertDiscoveredTargets(
  reminderId: string,
  targets: DiscoveredTarget[],
): Promise<void> {
  const db = await getDatabase();
  const refreshedAt = new Date().toISOString();
  const existing = await listTargets(reminderId);
  const existingByProviderId = new Map(
    existing.map((target) => [target.providerPlaceId, target]),
  );
  const keep = new Set<string | null>(targets.map((target) => target.providerPlaceId));

  await db.withTransactionAsync(async () => {
    for (const target of targets) {
      const match = existingByProviderId.get(target.providerPlaceId);
      if (match) {
        await db.runAsync(
          `UPDATE reminder_targets SET
            name = ?, address = ?, latitude = ?, longitude = ?, last_refreshed_at = ?
          WHERE id = ?`,
          target.name,
          target.address,
          target.latitude,
          target.longitude,
          target.lastRefreshedAt,
          match.id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO reminder_targets (
            id, reminder_id, provider_place_id, name, address, latitude, longitude,
            is_monitored, last_refreshed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          createId(),
          reminderId,
          target.providerPlaceId,
          target.name,
          target.address,
          target.latitude,
          target.longitude,
          target.lastRefreshedAt,
        );
      }
    }

    for (const target of existing) {
      if (!keep.has(target.providerPlaceId)) {
        await db.runAsync('DELETE FROM reminder_targets WHERE id = ?', target.id);
      }
    }

    await db.runAsync(
      'UPDATE reminders SET category_refreshed_at = ?, updated_at = ? WHERE id = ?',
      refreshedAt,
      refreshedAt,
      reminderId,
    );
  });
}

export async function markCategoryRefreshAttempt(reminderId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE reminders SET category_refreshed_at = ? WHERE id = ?',
    new Date().toISOString(),
    reminderId,
  );
}

/**
 * Claims a geofence/time event for notification. INSERT OR IGNORE gives us
 * atomic duplicate protection even if the same region event is delivered twice.
 */
export async function claimTriggerEvent(
  reminderId: string,
  targetId: string | null,
  eventKey: string,
  kind: string,
): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO trigger_history (
      reminder_id, target_id, event_key, kind, triggered_at
    ) VALUES (?, ?, ?, ?, ?)`,
    reminderId,
    targetId,
    eventKey,
    kind,
    new Date().toISOString(),
  );
  return result.changes > 0;
}

export async function releaseTriggerEvent(eventKey: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trigger_history WHERE event_key = ?', eventKey);
}

export async function clearTriggerHistory(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trigger_history');
}

export async function countTriggerHistory(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM trigger_history');
  return row?.count ?? 0;
}

export type RegionLookup =
  | { reminder: Reminder; target: ReminderTarget | null }
  | null;

type TargetRegionRow = ReminderRow & {
  target_id: string;
  reminder_id: string;
  provider_place_id: string | null;
  target_name: string;
  target_address: string | null;
  target_latitude: number;
  target_longitude: number;
  target_monitored: number;
  refreshed_at: string | null;
};

export async function findReminderForRegion(identifier: string): Promise<RegionLookup> {
  if (identifier.startsWith('r_')) {
    const reminder = await getReminder(identifier.slice(2));
    return reminder ? { reminder, target: null } : null;
  }

  if (identifier.startsWith('t_')) {
    const db = await getDatabase();
    const row = await db.getFirstAsync<TargetRegionRow>(
      `SELECT
        t.id AS target_id, t.reminder_id, t.provider_place_id, t.name AS target_name,
        t.address AS target_address, t.latitude AS target_latitude,
        t.longitude AS target_longitude, t.is_monitored AS target_monitored,
        t.last_refreshed_at AS refreshed_at,
        r.*
      FROM reminder_targets t
      JOIN reminders r ON r.id = t.reminder_id
      WHERE t.id = ?`,
      identifier.slice(2),
    );
    if (!row) return null;

    const reminder = mapReminderRow(row);
    const target: ReminderTarget = {
      id: row.target_id,
      reminderId: row.reminder_id,
      providerPlaceId: row.provider_place_id,
      name: row.target_name,
      address: row.target_address,
      latitude: row.target_latitude,
      longitude: row.target_longitude,
      isMonitored: row.target_monitored === 1,
      lastRefreshedAt: row.refreshed_at,
    };
    return { reminder, target };
  }

  return null;
}

export async function deleteStaleTriggerHistory(olderThan: Date): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trigger_history WHERE triggered_at < ?', olderThan.toISOString());
}
