import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { NOTIFICATION_CHANNEL_ID } from '@/constants';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type LocationPermissionSnapshot = {
  servicesEnabled: boolean;
  foreground: PermissionState;
  background: PermissionState;
  canAskForeground: boolean;
  canAskBackground: boolean;
  precise: boolean;
  hasBackgroundAccess: boolean;
};

export type NotificationPermissionSnapshot = {
  state: PermissionState;
  canAskAgain: boolean;
  granted: boolean;
};

export type PermissionSnapshot = {
  location: LocationPermissionSnapshot;
  notifications: NotificationPermissionSnapshot;
  canMonitorGeofences: boolean;
  canShowAlerts: boolean;
};

function mapState(status: string): PermissionState {
  if (status === 'granted' || status === 'denied' || status === 'undetermined') return status;
  return 'unavailable';
}

export async function getLocationPermissionSnapshot(): Promise<LocationPermissionSnapshot> {
  let servicesEnabled = true;
  try {
    servicesEnabled = await Location.hasServicesEnabledAsync();
  } catch {
    servicesEnabled = false;
  }

  try {
    const [foreground, background] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
    ]);

    const foregroundState = mapState(foreground.status);
    const backgroundState = mapState(background.status);
    const precise =
      Platform.OS === 'ios'
        ? foreground.ios?.accuracy !== 'reduced'
        : foreground.android?.accuracy !== 'coarse';

    return {
      servicesEnabled,
      foreground: foregroundState,
      background: backgroundState,
      canAskForeground: foreground.canAskAgain,
      canAskBackground: background.canAskAgain,
      precise,
      hasBackgroundAccess:
        servicesEnabled && foregroundState === 'granted' && backgroundState === 'granted',
    };
  } catch {
    return {
      servicesEnabled,
      foreground: 'unavailable',
      background: 'unavailable',
      canAskForeground: false,
      canAskBackground: false,
      precise: false,
      hasBackgroundAccess: false,
    };
  }
}

export async function configureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Reminders',
      description: 'Arrival and time reminders',
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
      vibrationPattern: [0, 250, 180, 250],
      enableVibrate: true,
    });
  } catch {
    // The channel can only be configured in a native runtime. Permission state
    // remains the source of truth if it is unavailable.
  }
}

function notificationIsGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  if (status.granted) return true;
  const iosStatus = status.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function getNotificationPermissionSnapshot(): Promise<NotificationPermissionSnapshot> {
  try {
    const status = await Notifications.getPermissionsAsync();
    return {
      state: notificationIsGranted(status)
        ? 'granted'
        : mapState(status.status),
      canAskAgain: status.canAskAgain,
      granted: notificationIsGranted(status),
    };
  } catch {
    return { state: 'unavailable', canAskAgain: false, granted: false };
  }
}

export async function getPermissionSnapshot(): Promise<PermissionSnapshot> {
  const [location, notifications] = await Promise.all([
    getLocationPermissionSnapshot(),
    getNotificationPermissionSnapshot(),
  ]);

  return {
    location,
    notifications,
    canMonitorGeofences: location.hasBackgroundAccess && notifications.granted,
    canShowAlerts: notifications.granted,
  };
}

export async function requestForegroundLocation(): Promise<LocationPermissionSnapshot> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status !== 'granted' && current.canAskAgain) {
      await Location.requestForegroundPermissionsAsync();
    }
  } catch {
    // Reported by the refreshed snapshot.
  }
  return getLocationPermissionSnapshot();
}

export async function requestBackgroundLocation(): Promise<LocationPermissionSnapshot> {
  try {
    const foreground = await Location.getForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      if (!foreground.canAskAgain) return getLocationPermissionSnapshot();
      const next = await Location.requestForegroundPermissionsAsync();
      if (next.status !== 'granted') return getLocationPermissionSnapshot();
    }

    const background = await Location.getBackgroundPermissionsAsync();
    if (background.status !== 'granted' && background.canAskAgain) {
      await Location.requestBackgroundPermissionsAsync();
    }
  } catch {
    // Reported by the refreshed snapshot.
  }
  return getLocationPermissionSnapshot();
}

export async function requestNotificationPermission(): Promise<NotificationPermissionSnapshot> {
  try {
    await configureNotificationChannel();
    const current = await Notifications.getPermissionsAsync();
    if (!notificationIsGranted(current) && current.canAskAgain) {
      await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: false,
          allowSound: true,
        },
      });
    }
  } catch {
    // Reported by the refreshed snapshot.
  }
  return getNotificationPermissionSnapshot();
}

export async function openSystemSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Nothing else the app can do.
  }
}

export function locationPermissionLabel(snapshot: LocationPermissionSnapshot): string {
  if (!snapshot.servicesEnabled) return 'Location Services off';
  switch (snapshot.foreground) {
    case 'granted':
      if (snapshot.hasBackgroundAccess) {
        return snapshot.precise ? 'Always, precise' : 'Always, approximate';
      }
      return snapshot.precise ? 'While Using the App' : 'While Using, approximate';
    case 'denied':
      return 'Not allowed';
    case 'undetermined':
      return 'Not set up';
    default:
      return 'Unavailable';
  }
}

export function notificationPermissionLabel(
  snapshot: NotificationPermissionSnapshot,
): string {
  if (snapshot.granted) return 'Allowed';
  if (snapshot.state === 'denied') return 'Off';
  if (snapshot.state === 'undetermined') return 'Not set up';
  return 'Unavailable';
}
