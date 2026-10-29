export const APP_NAME = 'Nearn';
export const DATABASE_NAME = 'nearn.db';
export const GEOFENCE_TASK_NAME = 'nearn-geofence-task';
export const NOTIFICATION_CHANNEL_ID = 'reminders';

/**
 * iOS documents a limit of 20 monitored regions per app. We deliberately stay
 * below it so a future region can be added without a gap in coverage.
 */
export const REGION_BUDGET = 18;
export const MAX_TARGETS_PER_CATEGORY = 2;
export const CATEGORY_DISCOVERY_RADIUS_M = 5_000;
export const CATEGORY_REFRESH_MIN_INTERVAL_MS = 5 * 60 * 1_000;
export const DUPLICATE_NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1_000;
export const RADIUS_OPTIONS = [100, 250, 500] as const;
export const DEFAULT_RADIUS_M = 100;

export type RadiusOption = (typeof RADIUS_OPTIONS)[number];
