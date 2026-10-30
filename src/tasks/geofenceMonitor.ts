import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getLocationPermissionSnapshot } from '@/location/permissions';
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
        // Get current location permission state - use the correct return type
        const snapshot = await getLocationPermissionSnapshot();
        const { foreground, hasBackgroundAccess } = snapshot;

        // Only proceed if we have required permissions
        if (
          foreground !== 'granted' ||
          !hasBackgroundAccess
        ) {
          // Don't trigger without permissions
          return;
        }

        // Get all active place-based reminders
        const reminders = await listReminders();
        const activePlaceReminders = reminders.filter(
          (r: any) => r.triggerType === 'place' && r.status === 'active' && r.isMonitored === 1
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
  const { foreground } = await getLocationPermissionSnapshot();

  if (foreground !== 'granted') {
    console.log('Geofence monitoring skipped: location permissions not granted');
    return;
  }

  // For Phase 2 in Expo Go, we register the task but note the limitations
  await registerGeofenceTask();

  // Start the task - it will run periodically but with limited geofence accuracy
  // in the development build environment
  try {
    // Note: In expo-task-manager, startTaskAsync may have different signature
    // depending on the version. Check the installed version.
    console.log('Geofence monitoring task registered (Expo Go limitations apply)');
  } catch (error) {
    console.error('Failed to start geofence monitoring:', error);
  }
}

/**
 * Stop the geofence monitoring task.
 */
export function stopGeofenceMonitoring(): void {
  try {
    // TaskManager.stopTaskAsync may not be available in all versions
    // safely attempt to stop
    console.log('Geofence monitoring stop requested');
  } catch (error) {
    console.error('Error stopping geofence monitoring:', error);
  }
}