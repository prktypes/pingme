import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alert } from 'react-native';

import { getPermissionSnapshot } from '@/location/permissions';
import { getDatabase } from '@/db/database';
import {
  listReminders,
  listAllTargets,
  claimTriggerEvent,
  releaseTriggerEvent,
} from '@/db/reminderRepository';

// The task name must be registered with expo-task-manager before use
// This runs in a minimal native background context

const GEOFENCE_TASK = 'nearn-geofence-monitor';

/**
 * Background task that monitors geofence regions for arrival/departure events.
 *
 * This task runs periodically in the background and checks if any active
 * place-based reminders have entered their geofence region.
 *
 * Note: On iOS, background location execution time is limited. For production,
 * consider using Significant Location Change service or EAS Build for full
 * geofencing support.
 */

let taskRegistered = false;

/**
 * Register the geofence monitoring task with expo-task-manager.
 * Should be called once during app setup.
 */
export async function registerGeofenceTask(): Promise<void> {
  if (taskRegistered) return;

  try {
    // Register the task - it will run in background but with limited capabilities
    // In a full implementation, this would use significant location change
    // and/or iOS background location with geofencing APIs
    TaskManager.defineTask(GEOFENCE_TASK, async () => {
      // This runs in background - minimal API access
      // For Phase 2, we'll check permissions and log state
      // Full geofencing requires native code or EAS Build

      try {
        const { status: locationStatus } = await getPermissionSnapshot();

        // Only proceed if we have required permissions
        if (
          locationStatus?.foreground !== 'granted' ||
          !locationStatus?.hasBackgroundAccess
        ) {
          // Don't trigger without permissions
          return;
        }

        // Get all active place-based reminders
        const reminders = await listReminders();
        const activePlaceReminders = reminders.filter(
          (r) => r.triggerType === 'place' && r.status === 'active' && r.isMonitored === 1
        );

        // In Phase 2 with Expo Go/dev client, we cannot reliably determine
        // the device's current location in the background task.
        // This is logged for reference; full geofencing requires:
        // - Xcode native geocode/region monitoring
        // - EAS Build with proper ios background entitlements
        // - Significant Location Change service

        if (activePlaceReminders.length > 0) {
          console.log(
            `Geofence task: ${activePlaceReminders.length} active place reminders found, ` +
            'but location determination limited in Expo Go'
          );
          // TODO: In native build, would check regions and fire notifications
        }
      } catch (error) {
        console.error('Geofence task error:', error);
      }
    });

    taskRegistered = true;
    console.log('Geofence task registered with expo-task-manager');
  } catch (error) {
    console.error('Failed to register geofence task:', error);
  }
}

/**
 * Start the geofence monitoring task.
 * Should be called after permissions are granted.
 */
export async function startGeofenceMonitoring(): Promise<void> {
  // In Expo Go, we cannot reliably run background geofencing.
  // This is documented for when using native builds or EAS.
  const { status: locationStatus } = await getPermissionSnapshot();

  if (
    !locationStatus?.hasBackgroundAccess ||
    locationStatus.foreground !== 'granted'
  ) {
    console.log('Geofence monitoring skipped: location permissions not granted');
    return;
  }

  // For Phase 2 in Expo Go, we register the task but note the limitations
  await registerGeofenceTask();

  // Start the task - it will run periodically but with limited geofence accuracy
  // in the development build environment
  try {
    const status = await TaskManager.startTaskAsync(GEOFENCE_TASK, {
      // Run task every 15 minutes, but iOS may throttle this
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: false,
      // Allow iOS to decide when to run based on power/battery
      // backgroundTime: 30, // iOS only, minutes of background time
    });

    console.log('Geofence monitoring started, status:', status);
  } catch (error) {
    console.error('Failed to start geofence monitoring:', error);
  }
}

/**
 * Stop the geofence monitoring task.
 */
export function stopGeofenceMonitoring(): void {
  try {
    TaskManager.stopTaskAsync(GEOFENCE_TASK);
    console.log('Geofence monitoring stopped');
  } catch (error) {
    console.error('Failed to stop geofence monitoring:', error);
  }
}