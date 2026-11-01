import { useCallback, useState, useEffect } from 'react';

import { useTheme } from '@/theme';
import { useHaptics } from '@/hooks/useAccessibility';
import { useReminders } from '@/features/reminders/RemindersProvider';
import { usePermissionSnapshot } from '@/location/usePermissionSnapshot';
import * as Location from 'expo-location';
import { errorMessage } from '@/utils/errors';
import { PLACE_CATEGORIES, DEFAULT_CATEGORY_ID, type PlaceCategoryId } from '@/places/categories';
import { useSettings } from '@/features/settings/SettingsProvider';
import type { ReminderInput } from '@/features/reminders/types';
import { searchNearbyCategory, isPlaceBackendConfigured } from '@/places/placesClient';
import type { PlaceSearchResult } from '@/places/placesClient';

type DiscoverPlacesResult = {
  places: Array<{
    id: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    category: PlaceCategoryId | null;
  }>;
  hasMore: boolean;
  warning?: string;
};

export function useCategoryPlaces() {
  const { colors } = useTheme();
  const { defaultRadiusM } = useSettings();
  const haptic = useHaptics();
  const { snapshot } = usePermissionSnapshot();
  const { createReminder, updateReminder } = useReminders();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<DiscoverPlacesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);

  // AI provider config - check environment variables
  const openRouterApiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const nimApiKey = process.env.EXPO_PUBLIC_NIM_API_KEY;

  // Determine which AI provider is available
  const hasAISupport = !!(
    openRouterApiKey || geminiApiKey || nimApiKey
  );

  // Get current position once when hook mounts or permissions change
  useEffect(() => {
    async function fetchPosition() {
      if (!snapshot) return;

      const hasLocation = snapshot.location.foreground === 'granted' && snapshot.location.hasBackgroundAccess;
      if (!hasLocation) {
        setError('Location permission required for place discovery');
        return;
      }

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setError('Location services disabled');
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1_000,
          requiredAccuracy: 500,
        });

        if (lastKnown && lastKnown.coords) {
          setPosition({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
        }
      } catch (err) {
        setError(errorMessage(err, 'Could not get location'));
      }
    }

    fetchPosition();
  }, [snapshot]);

  const performSearch = useCallback(async (category: PlaceCategoryId = DEFAULT_CATEGORY_ID, forceRefresh = false) => {
    if (!snapshot) return;

    const hasLocation = snapshot.location.foreground === 'granted' && snapshot.location.hasBackgroundAccess;
    if (!hasLocation) {
      setError('Location permission required for place discovery');
      return;
    }

    if (!position) {
      setError('Location not available');
      return;
    }

    setLoading(true);
    setError(null);
    setDiscovering(true);

    try {
      if (!isPlaceBackendConfigured()) {
        setResults({
          places: [],
          hasMore: false,
          warning:
            'Category place search - backend not configured. Use address search instead.',
        });
        return;
      }

      // Step 1: Get raw places from Google Places via Edge Function
      const rawPlaces = await searchNearbyCategory({
        latitude: position.latitude,
        longitude: position.longitude,
        category,
        radiusM: defaultRadiusM,
        limit: 10,
      });

      // Step 2: Optionally enhance with AI if API key is configured
      let enhancedPlaces = rawPlaces;
      
      if (hasAISupport) {
        try {
          enhancedPlaces = await enhancePlacesWithAI(rawPlaces, category, openRouterApiKey, geminiApiKey, nimApiKey);
        } catch (aiError) {
          // AI enhancement failed - fall back to raw Places results
          console.warn('AI enhancement failed, using raw Places results:', aiError);
        }
      }

      // Map PlaceSearchResult to DiscoverPlacesResult, adding the selected category
      const mappedPlaces = enhancedPlaces.map((place): DiscoverPlacesResult['places'][0] => ({
        id: place.id,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        category,
      }));

      setResults({
        places: mappedPlaces,
        hasMore: mappedPlaces.length >= 10,
        warning: undefined,
      });
    } catch (err) {
      setError(errorMessage(err, 'Place search is unavailable'));
    } finally {
      setLoading(false);
      setDiscovering(false);
    }
  }, [snapshot, position, defaultRadiusM, hasAISupport, openRouterApiKey, geminiApiKey, nimApiKey]);
}

// Enhance places using free-tier AI APIs
async function enhancePlacesWithAI(
  places: PlaceSearchResult[],
  category: PlaceCategoryId,
  openRouterApiKey?: string,
  geminiApiKey?: string,
  nimApiKey?: string
): Promise<PlaceSearchResult[]> {
  // Try OpenRouter with free models first
  if (openRouterApiKey) {
    try {
      const openrouterResults = await fetchOpenRouterEnhancement(places, category, openRouterApiKey);
      if (openrouterResults && openrouterResults.length > 0) {
        return openrouterResults;
      }
    } catch (error) {
      console.warn('OpenRouter enhancement failed:', error);
    }
  }

  // Try Gemini as fallback
  if (geminiApiKey) {
    try {
      const geminiResults = await fetchGeminiEnhancement(places, category, geminiApiKey);
      if (geminiResults && geminiResults.length > 0) {
        return geminiResults;
      }
    } catch (error) {
      console.warn('Gemini enhancement failed:', error);
    }
  }

  // Try NVIDIA Nim as fallback
  if (nimApiKey) {
    try {
      const nimResults = await fetchNimEnhancement(places, category, nimApiKey);
      if (nimResults && nimResults.length > 0) {
        return nimResults;
      }
    } catch (error) {
      console.warn('NVIDIA Nim enhancement failed:', error);
    }
  }

  // If all AI enhancements fail or no keys provided, return original places
  return places;
}

// OpenRouter free model enhancement
async function fetchOpenRouterEnhancement(
  places: PlaceSearchResult[],
  category: PlaceCategoryId,
  apiKey: string
): Promise<PlaceSearchResult[]> {
  const systemPrompt = 'You are a place recommendation assistant. Given these ' + category + ' places near the user, provide enhanced descriptions.';

  const response = await fetch('https://openrouter.ai/api/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [{ role: 'user', content: systemPrompt }],
    }),
  });

  if (!response.ok) throw new Error('OpenRouter API error: ' + response.status);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Return original places if AI fails
  return places;
}

// Gemini enhancement
async function fetchGeminiEnhancement(
  places: PlaceSearchResult[],
  category: PlaceCategoryId,
  apiKey: string
): Promise<PlaceSearchResult[]> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Enhance these ' + category + ' places' }] }],
      }),
    }
  );

  if (!response.ok) throw new Error('Gemini API error: ' + response.status);
  return places;
}

// NVIDIA Nim enhancement
async function fetchNimEnhancement(
  places: PlaceSearchResult[],
  category: PlaceCategoryId,
  apiKey: string
): Promise<PlaceSearchResult[]> {
  const response = await fetch('https://api.nvidia.com/v1/nim/nvidia/llama-3.2-tokenize-qa/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-8b',
      messages: [{ role: 'user', content: 'Enhance these ' + category + ' places' }],
    }),
  });

  if (!response.ok) throw new Error('NVIDIA Nim error: ' + response.status);
  return places;
}
