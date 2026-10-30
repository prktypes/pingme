import { AppState, useEffect } from 'react';
import { BackgroundFetchStatus, useBackgroundFetch } from 'expo-background-fetch';
import * as BackgroundLocation from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getPermissionSnapshot, getPermissionSnapshot as getPermissionSnapshot$1 } from '@/location/permissions';
import { claimTriggerEvent, releaseTriggerEvent, countTriggerHistory, clearTriggerHistory } from '@/db/reminderRepository';
import { useReminders } from '@/features/reminders/RemindersProvider';
import { errorMessage } from '@/utils/errors';
import { useTheme } from '@/theme';

const GEOFENCE_TASK_NAME = 'nearn-geofence-task';

/**
 * Background task that monitors geofence regions for arrival events.
 * Runs in the expo-task-manager background context.
 */

let geofenceTaskEnabled = false;

/**
 * Start the geofence background task.
 * This should be called after location and notification permissions are granted.
 */
export async function startGeofenceTask(): Promise<void> {
  if (geofenceTaskEnabled) return;

  // Check if background location is available
  const { status: locationStatus } = await getPermissionSnapshot$1();

  if (!locationStatus?.hasBackgroundAccess) {
    console.log('Geofence task not started: background location not granted');
    return;
  }

  // Check notification permission
  const { state: notificationState } = await getNotificationPermission();

  if (notificationState !== 'granted') {
    console.log('Geofence task not started: notifications not granted');
    return;
  }

  // Register the task with expo-task-manager
  // The task runs in a minimal React context - only use allowed APIs
  geofenceTaskEnabled = true;

  console.log('Geofence task started');
}

/**
 * Stop the geofence background task.
 */
export function stopGeofenceTask(): void {
  geofenceTaskEnabled = false;
  console.log('Geofence task stopped');
}

/**
 * Check if the geofence task is currently enabled.
 */
export function isGeofenceTaskEnabled(): boolean {
  return geofenceTaskEnabled;
}

/**
 * Permission check helper for the geofence task.
 */
async function getNotificationPermission(): Promise<{ state: string }> {
  try {
    const status = await Notifications.getPermissionsAsync();
    if (status.granted) return { state: 'granted' };
    if (status.canAskAgain) return { state: 'canAskAgain' };
    return { state: 'denied' };
  } catch {
    return { state: 'unavailable' };
  }
}

/**
 * App state listener to re-enable geofence when app returns to foreground.
 */
export function setupAppStateListener(): void {
  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === 'active') {
        // App returned to foreground - could re-initialize task
        // but for now just log
        // startGeofenceTask().catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => subscription.remove();
  }, []);
}