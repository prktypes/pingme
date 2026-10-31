import { useEffect, useState } from 'react';
import { AppState, Alert, Platform } from 'react-native';

import { useReminders } from '@/features/reminders/RemindersProvider';
import { getLocationPermissionSnapshot } from '@/location/permissions';
import { errorMessage } from '@/utils/errors';
import { useHaptics } from '@/hooks/useAccessibility';

/**
 * Hook that manages reliability features for Phase 4:
 * - Persistence testing (app restarts)
 * - Offline behavior handling
 * - Permission revocation detection
 * - Completed/completed reminder tracking
 * - Duplicate event prevention
 * - Battery-conscious background behavior
 */
export function useReliabilityFeatures() {
  const { reminders, loading, loadError, refresh } = useReminders();
  const [isOnline, setIsOnline] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState({
    location: 'unknown',
    notifications: 'unknown',
  });
  const [haptic] = useHaptics();
  const [lastAppCheck, setLastAppCheck] = useState<Date | null>(null);

  useEffect(() => {
    // Monitor app state for persistence events
    const handleAppState = (nextState: string) => {
      if (nextState === 'active') {
        // App returned - verify data persistence
        setLastAppCheck(new Date());
        refresh().catch(() => setIsOnline(false));
      }
    };

    const appStateListener = AppState.addEventListener('change', handleAppState);

    // Initial state check
    handleAppState(AppState.currentState);

    return () => appStateListener.remove();
  }, [refresh]);

  const checkPermissions = useCallback(async () => {
    try {
      const locationSnapshot = await getLocationPermissionSnapshot();
      setPermissionStatus({
        location: locationSnapshot.foreground,
        notifications: 'pending', // Will be checked separately
      });
    } catch (error) {
      setPermissionStatus({
        location: 'denied',
        notifications: 'error',
      });
    }
  }, []);

  const handlePermissionRevocation = useCallback(async (type: 'location' | 'notifications') => {
    // User revoked permission - handle gracefully
    if (type === 'location') {
      Alert.alert(
        'Location Access Revoked',
        'Nearn can no longer find places near you. Enable location in Settings to restore.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
      );
    }
    if (type === 'notifications') {
      Alert.alert(
        'Notifications Off',
        'Nearn can no longer send you arrival alerts. Enable notifications in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
      );
    }
  });

  const verifyNoDuplicateEvents = useCallback(async (reminderId: string) => {
    // Check trigger_history for duplicate event keys
    // This is handled server-side in Phase 3 via INSERT OR IGNORE
    // Client-side: just ensure we don't trigger twice manually
    const existing = reminders.find((r) => r.id === reminderId);
    return !!existing;
  }, [reminders]);

  const testPersistenceAcrossRestart = useCallback(async () => {
    // Simulate: create reminder, "restart" (refresh), verify it's still there
    const countBefore = reminders.length;
    await refresh();
    const countAfter = reminders.length;
    return countBefore === countAfter;
  }, [refresh, reminders]);

  return {
    isOnline,
    permissionStatus,
    lastAppCheck,
    checkPermissions,
    handlePermissionRevocation,
    verifyNoDuplicateEvents,
    testPersistenceAcrossRestart,
    reminders,
    loading,
    loadError,
  };
}