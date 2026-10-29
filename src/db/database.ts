import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME } from '@/constants';

import { MIGRATIONS } from './migrations';



export type Database = SQLite.SQLiteDatabase;

let databasePromise: Promise<Database> | null = null;

async function migrate(db: Database): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.up);
      await db.runAsync(
        'INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });

    currentVersion = migration.version;
  }
}

async function openAndMigrate(): Promise<Database> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA busy_timeout = 4000;');
  await migrate(db);
  return db;
}

/**
 * Opens the on-device database once per JavaScript runtime. The background
 * geofence task shares this instance when it wakes in the same runtime.
 */
export function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  await getDatabase();
}

export async function databaseVersion(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}
