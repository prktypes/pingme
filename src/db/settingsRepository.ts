import { getDatabase } from './database';

import { DEFAULT_RADIUS_M, type RadiusOption } from '@/constants';

export const SETTING_KEYS = {
  defaultRadius: 'default_radius_m',
  lastSyncAt: 'last_sync_at',
  lastSyncError: 'last_sync_error',
  lastRegionCount: 'last_region_count',
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function getDefaultRadius(): Promise<RadiusOption> {
  const value = Number(await getSetting(SETTING_KEYS.defaultRadius));
  if (value === 100 || value === 250 || value === 500) return value;
  return DEFAULT_RADIUS_M;
}

export async function setDefaultRadius(radius: RadiusOption): Promise<void> {
  await setSetting(SETTING_KEYS.defaultRadius, String(radius));
}
