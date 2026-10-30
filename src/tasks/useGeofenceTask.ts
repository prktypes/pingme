import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Setup app state listener for geofence task lifecycle.
 * Should be called in the root App component.
 *
 * Listens for AppState changes (active, background, inactive) and can
 * re-enable geofence monitoring when the app returns to foreground.
 */
export function useGeofenceTask(): void {
  useEffect(() => {
    // Listen for app state changes - when app returns to foreground,
    // geofence monitoring can be re-initialized
    const handleAppState = (nextState: string) => {
      if (nextState === 'active') {
        // App returned to foreground - could re-enable task
        // For Phase 2, this is a no-op; full re-enable in Phase 3
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => subscription.remove();
  }, []);
}