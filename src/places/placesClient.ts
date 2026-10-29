import * as Location from 'expo-location';

import { AppError } from '@/utils/errors';

export type PlaceSearchResult = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  source: 'business' | 'address';
};

export type PlaceSearchResponse = {
  places: PlaceSearchResult[];
  source: 'google' | 'device';
  warning?: string;
};

export function isPlaceBackendConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('YOUR_PROJECT'));
}

function formatGeocodedAddress(address: Location.LocationGeocodedAddress): string {
  const street = [address.streetNumber, address.street].filter(Boolean).join(' ');
  const parts = [street, address.district, address.city, address.region, address.postalCode]
    .filter((part): part is string => Boolean(part && part.trim()))
    .filter((part, index, list) => list.indexOf(part) === index);
  return parts.join(', ');
}

export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = results[0];
    if (!first) return null;
    const formatted = formatGeocodedAddress(first);
    return formatted || first.name || null;
  } catch {
    return null;
  }
}

async function searchDeviceAddresses(query: string): Promise<PlaceSearchResponse> {
  let matches: Location.LocationGeocodedLocation[];
  try {
    matches = await Location.geocodeAsync(query);
  } catch (error) {
    throw new AppError(
      'network',
      'Address search is unavailable right now. Check your connection or tap a point on the map.',
      error,
    );
  }

  const limited = matches.slice(0, 5);
  const places = await Promise.all(
    limited.map(async (match, index) => {
      const address = await reverseGeocodeAddress(match.latitude, match.longitude);
      return {
        id: `address-${match.latitude.toFixed(5)}-${match.longitude.toFixed(5)}-${index}`,
        name: query,
        address,
        latitude: match.latitude,
        longitude: match.longitude,
        source: 'address' as const,
      };
    }),
  );

  return {
    places,
    source: 'device',
    warning: isPlaceBackendConfigured()
      ? undefined
      : 'Business search is not configured. Address results come from your device.',
  };
}

/**
 * Business search uses the Supabase Edge Function once configured. Without it,
 * the app still offers real device geocoding for addresses and map-point
 * selection. It never fabricates businesses.
 */
export async function searchPlacesByText(
  query: string,
  center: { latitude: number; longitude: number } | null,
): Promise<PlaceSearchResponse> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { places: [], source: 'device' };

  if (!isPlaceBackendConfigured()) {
    return searchDeviceAddresses(trimmed);
  }

  try {
    const response = await callPlaceFunction({
      mode: 'text',
      query: trimmed,
      latitude: center?.latitude,
      longitude: center?.longitude,
      limit: 8,
    });
    if (response.places.length > 0) {
      return { places: response.places, source: 'google' };
    }
  } catch {
    // Fall through to address geocoding. The warning is honest about the
    // degraded source and the result rows include their actual source.
  }

  const fallback = await searchDeviceAddresses(trimmed);
  return {
    ...fallback,
    warning:
      'Business search is unavailable right now. Showing address matches from your device.',
  };
}

export async function searchNearbyCategory(params: {
  latitude: number;
  longitude: number;
  category: string;
  radiusM?: number;
  limit?: number;
}): Promise<PlaceSearchResult[]> {
  if (!isPlaceBackendConfigured()) {
    throw new AppError(
      'not_configured',
      'Category discovery needs the place search service. Add the Supabase settings to enable it.',
    );
  }

  const response = await callPlaceFunction({
    mode: 'nearby',
    latitude: params.latitude,
    longitude: params.longitude,
    category: params.category,
    radiusM: params.radiusM,
    limit: params.limit,
  });
  return response.places;
}

type PlaceFunctionResponse = {
  places: PlaceSearchResult[];
};

async function callPlaceFunction(body: Record<string, unknown>): Promise<PlaceFunctionResponse> {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new AppError('not_configured', 'Place search is not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/functions/v1/nearby-places`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new AppError('rate_limited', 'Place search is busy. Try again in a moment.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new AppError('not_configured', 'Place search credentials are not valid.');
    }
    if (!response.ok) {
      throw new AppError('provider', 'Place search is unavailable right now.');
    }

    const json = (await response.json()) as PlaceFunctionResponse;
    if (!Array.isArray(json.places)) {
      throw new AppError('provider', 'Place search returned an unexpected response.');
    }

    return {
      places: json.places
        .filter(
          (place) =>
            typeof place?.latitude === 'number' &&
            typeof place?.longitude === 'number' &&
            typeof place?.name === 'string',
        )
        .map((place) => ({
          id: String(place.id),
          name: place.name,
          address: place.address ?? null,
          latitude: place.latitude,
          longitude: place.longitude,
          source: 'business' as const,
        })),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError('network', 'Place search took too long. Try again.');
    }
    throw new AppError(
      'network',
      'Place search needs a connection. You can still choose a point on the map.',
      error,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCurrentCoordinates(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}
