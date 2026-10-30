import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getPermissionSnapshot } from '@/location/permissions';

/**
 * Setup app state listener for geofence task lifecycle.
 * Should be called in the root App component.
 *
 * Listens for AppState changes (active, background, inactive) and can
 * re-enable geofence monitoring when the app returns to foreground.
 */
export function setupAppStateListener(): void {
  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === 'active') {
        // App returned to foreground - geofence task can be re-initialized
        // This is a no-op in Phase 2; full re-enable would happen in Phase 3
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => subscription.remove();
  }, []);
}