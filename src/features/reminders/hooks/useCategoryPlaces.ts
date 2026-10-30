import { useCallback, useState } from 'react';

import { useTheme } from '@/theme';
import { useHaptics } from '@/hooks/useAccessibility';
import { useReminders } from '@/features/reminders/RemindersProvider';
import { usePermissionSnapshot } from '@/location/usePermissionSnapshot';
import { errorMessage } from '@/utils/errors';
import { PLACE_CATEGORIES, DEFAULT_CATEGORY_ID, type PlaceCategoryId } from '@/places/categories';
import { useSettings } from '@/features/settings/SettingsProvider';
import type { ReminderInput } from '@/features/reminders/types';

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

  const performSearch = useCallback(async (category?: string, forceRefresh = false) => {
    if (!snapshot) return;

    const hasLocation = snapshot.location.foreground === 'granted' && snapshot.location.hasBackgroundAccess;
    if (!hasLocation) {
      setError('Location permission required for place discovery');
      return;
    }

    setLoading(true);
    setError(null);
    setDiscovering(true);

    try {
      // In Phase 3, this will call the Supabase Edge Function
      // For now, set up the structure and warn about setup status
      setResults({
        places: [],
        hasMore: false,
        warning: 'Category place search - Edge Function endpoint ready. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable Google Places API.',
      });
    } catch (err) {
      setError(errorMessage(err, 'Place search is unavailable'));
    } finally {
      setLoading(false);
      setDiscovering(false);
    }
  }, [snapshot, defaultRadiusM]);

  const handlePlaceSelect = useCallback((place: DiscoverPlacesResult['places'][0]) => {
    haptic('light');

    // Create a category-based reminder with the selected place
    const reminderInput: ReminderInput = {
      title: place.name || 'New Place Reminder',
      triggerType: 'category' as const,
      category: place.category ?? DEFAULT_CATEGORY_ID,
      latitude: place.latitude,
      longitude: place.longitude,
      placeName: place.name,
      placeAddress: place.address ?? null,
      radiusM: defaultRadiusM,
      repeatRule: 'none',
      notes: '',
      dueAt: null,
    };

    // Create the reminder directly (navigation handled by parent screen)
    if (createReminder) {
      createReminder(reminderInput);
    }
  }, [haptic, createReminder, defaultRadiusM]);

  const onCategorySelect = useCallback((categoryId: string) => {
    performSearch(categoryId);
  }, [performSearch]);

  return {
    loading,
    searchQuery,
    setSearchQuery,
    results,
    error,
    discovering,
    performSearch,
    handlePlaceSelect,
    onCategorySelect,
    PLACE_CATEGORIES,
    defaultRadiusM,
  };
}