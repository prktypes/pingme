import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { isLocationReminder } from '@/features/reminders/display';
import { useReminders } from '@/features/reminders/RemindersProvider';
import type { Reminder } from '@/features/reminders/types';
import { requestForegroundLocation } from '@/location/permissions';
import { getCategory } from '@/places/categories';
import { distanceMeters, type Coordinates } from '@/utils/distance';

const NEARBY_RADIUS_M = 5_000;
const POSITION_TIMEOUT_MS = 7_000;

export type NearbyReminder = {
  reminder: Reminder;
  distanceM: number;
  placeLabel: string;
  monitored: boolean;
};

type LocationState =
  | { status: 'loading' }
  | { status: 'ready'; position: Coordinates; approximate: boolean }
  | { status: 'permission_denied' }
  | { status: 'services_off' }
  | { status: 'unavailable'; message: string };

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function useNearbyReminders() {
  const { reminders, targetsByReminder } = useReminders();
  const [locationState, setLocationState] = useState<LocationState>({ status: 'loading' });
  const requestId = useRef(0);

  const readPosition = useCallback(async () => {
    const id = ++requestId.current;
    let permission;
    try {
      permission = await Location.getForegroundPermissionsAsync();
    } catch {
      if (id === requestId.current) {
        setLocationState({
          status: 'unavailable',
          message: 'Location is not available in this build.',
        });
      }
      return;
    }

    if (permission.status !== 'granted') {
      if (id === requestId.current) setLocationState({ status: 'permission_denied' });
      return;
    }

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        if (id === requestId.current) setLocationState({ status: 'services_off' });
        return;
      }
    } catch {
      // Continue to the position request; it will report an error if needed.
    }

    const approximate = permission.ios?.accuracy === 'reduced';

    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1_000,
        requiredAccuracy: 500,
      });
      if (lastKnown && id === requestId.current) {
        setLocationState({
          status: 'ready',
          position: {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          },
          approximate,
        });
      }

      const current = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        POSITION_TIMEOUT_MS,
      );

      if (!current) {
        if (!lastKnown && id === requestId.current) {
          setLocationState({
            status: 'unavailable',
            message: 'Your location could not be determined right now.',
          });
        }
        return;
      }

      if (id === requestId.current) {
        setLocationState({
          status: 'ready',
          position: {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          },
          approximate,
        });
      }
    } catch {
      if (id === requestId.current) {
        setLocationState({
          status: 'unavailable',
          message: 'Your location could not be determined right now.',
        });
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      readPosition().catch(() => undefined);
    }, [readPosition]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') readPosition().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [readPosition]);

  const requestAccess = useCallback(async () => {
    setLocationState({ status: 'loading' });
    await requestForegroundLocation();
    await readPosition();
  }, [readPosition]);

  const nearby = useMemo<NearbyReminder[]>(() => {
    if (locationState.status !== 'ready') return [];

    const position = locationState.position;
    const items: NearbyReminder[] = [];

    for (const reminder of reminders) {
      if (reminder.status !== 'active' || !isLocationReminder(reminder)) continue;

      if (reminder.triggerType === 'place') {
        if (typeof reminder.latitude !== 'number' || typeof reminder.longitude !== 'number') {
          continue;
        }
        const distance = distanceMeters(position, {
          latitude: reminder.latitude,
          longitude: reminder.longitude,
        });
        if (distance <= NEARBY_RADIUS_M) {
          items.push({
            reminder,
            distanceM: distance,
            placeLabel: reminder.placeName ?? 'saved place',
            monitored: reminder.isMonitored,
          });
        }
        continue;
      }

      const targets = targetsByReminder[reminder.id] ?? [];
      let nearest: { distance: number; name: string; monitored: boolean } | null = null;
      for (const target of targets) {
        const distance = distanceMeters(position, {
          latitude: target.latitude,
          longitude: target.longitude,
        });
        if (!nearest || distance < nearest.distance) {
          nearest = {
            distance,
            name: target.name,
            monitored: target.isMonitored,
          };
        }
      }

      if (nearest && nearest.distance <= NEARBY_RADIUS_M) {
        items.push({
          reminder,
          distanceM: nearest.distance,
          placeLabel: nearest.name || getCategory(reminder.category)?.proximityLabel || 'a place',
          monitored: reminder.isMonitored,
        });
      }
    }

    return items.sort((a, b) => a.distanceM - b.distanceM);
  }, [locationState, reminders, targetsByReminder]);

  const hasLocationReminders = useMemo(
    () => reminders.some((reminder) => reminder.status === 'active' && isLocationReminder(reminder)),
    [reminders],
  );

  return {
    locationState,
    nearby,
    hasLocationReminders,
    requestAccess,
    refresh: readPosition,
  };
}
