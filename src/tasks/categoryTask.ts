import * as TaskManager from 'expo-task-manager';
import { getLocationPermissionSnapshot } from '@/location/permissions';
import { listReminders, listAllTargets, upsertDiscoveredTargets } from '@/db/reminderRepository';

// The task name must be registered with expo-task-manager before use
// This runs in a minimal native background context

const CATEGORY_TASK = 'nearn-category-task';

/**
 * Register the category discovery task with expo-task-manager.
 * Should be called once during app setup.
 */
export async function registerCategoryTask(): Promise<void> {
  // Task registration for future category monitoring
  // In Phase 3, we focus on the Edge Function integration and UI
  // Full background category monitoring will come in later phases
  TaskManager.defineTask(CATEGORY_TASK, async () => {
    // Background task for category refresh cycles
    console.log('Category task running in background');
  });
}

/**
 * Start category-based reminder monitoring.
 * Call after permissions are granted.
 */
export async function startCategoryMonitoring(): Promise<void> {
  const { foreground } = await getLocationPermissionSnapshot();

  if (foreground !== 'granted') {
    console.log('Category monitoring skipped: location permissions not granted');
    return;
  }

  // Register the task for future use
  await registerCategoryTask();

  // In Phase 3, we setup the Edge Function integration and UI
  // The actual Google Places discovery happens via Supabase Edge Functions
  // when the user triggers "Discover Places" in the UI
  console.log('Category monitoring initialized - Edge Function integration ready');
}

/**
 * Stop category monitoring task.
 */
export function stopCategoryMonitoring(): void {
  console.log('Category monitoring stopped');
}