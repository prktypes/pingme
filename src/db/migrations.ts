export type Migration = {
  version: number;
  name: string;
  up: string;
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE reminders (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'completed')),
        trigger_type TEXT NOT NULL
          CHECK (trigger_type IN ('place', 'category', 'time')),
        category TEXT,
        latitude REAL,
        longitude REAL,
        place_name TEXT,
        place_address TEXT,
        radius_m INTEGER NOT NULL DEFAULT 100
          CHECK (radius_m > 0),
        due_at TEXT,
        repeat_rule TEXT NOT NULL DEFAULT 'none'
          CHECK (repeat_rule IN ('none', 'daily', 'weekly', 'monthly')),
        last_notified_at TEXT,
        snoozed_until TEXT,
        completed_at TEXT,
        notification_id TEXT,
        is_monitored INTEGER NOT NULL DEFAULT 0
          CHECK (is_monitored IN (0, 1)),
        category_refreshed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_reminders_status_due
        ON reminders (status, due_at);
      CREATE INDEX idx_reminders_updated
        ON reminders (updated_at DESC);
      CREATE INDEX idx_reminders_trigger
        ON reminders (status, trigger_type);

      CREATE TABLE reminder_targets (
        id TEXT PRIMARY KEY NOT NULL,
        reminder_id TEXT NOT NULL
          REFERENCES reminders (id) ON DELETE CASCADE,
        provider_place_id TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        is_monitored INTEGER NOT NULL DEFAULT 0
          CHECK (is_monitored IN (0, 1)),
        last_refreshed_at TEXT,
        UNIQUE (reminder_id, provider_place_id)
      );

      CREATE INDEX idx_targets_reminder
        ON reminder_targets (reminder_id, is_monitored);

      CREATE TABLE trigger_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reminder_id TEXT NOT NULL
          REFERENCES reminders (id) ON DELETE CASCADE,
        target_id TEXT,
        event_key TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL,
        triggered_at TEXT NOT NULL
      );

      CREATE INDEX idx_trigger_history_reminder
        ON trigger_history (reminder_id, triggered_at DESC);

      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: 'phase2_geofence_columns',
    up: `
      ALTER TABLE reminders ADD COLUMN place_verified INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE reminders ADD COLUMN geofence_region_id TEXT;
      ALTER TABLE reminders ADD COLUMN last_geofence_triggered_at TEXT;
    `,
  },
];
