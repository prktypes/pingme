import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { InlineNotice } from '@/components/InlineNotice';
import { ListRow, Section } from '@/components/Section';
import type { SelectedPlace } from '@/features/reminders/types';
import { useReducedMotion } from '@/hooks/useAccessibility';
import {
  getLocationPermissionSnapshot,
  openSystemSettings,
  requestForegroundLocation,
} from '@/location/permissions';
import {
  getCurrentCoordinates,
  reverseGeocodeAddress,
  searchPlacesByText,
  type PlaceSearchResult,
} from '@/places/placesClient';
import { useTheme } from '@/theme';
import { errorMessage } from '@/utils/errors';

type PlacePickerModalProps = {
  visible: boolean;
  initialPlace: SelectedPlace | null;
  onSelect: (place: SelectedPlace) => void;
  onClose: () => void;
};

const FALLBACK_REGION: Region = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 70,
  longitudeDelta: 70,
};

function regionFor(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
}

function placeFromResult(result: PlaceSearchResult): SelectedPlace {
  return {
    providerPlaceId: result.source === 'business' ? result.id : null,
    name: result.name,
    address: result.address,
    latitude: result.latitude,
    longitude: result.longitude,
    source: result.source,
  };
}

export function PlacePickerModal({
  visible,
  initialPlace,
  onSelect,
  onClose,
}: PlacePickerModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const mapRef = useRef<MapView>(null);
  const reverseRequest = useRef(0);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [pending, setPending] = useState<SelectedPlace | null>(null);
  const [locating, setLocating] = useState(false);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(FALLBACK_REGION);

  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery('');
     
    setResults(null);
     
    setSearchError(null);
     
    setSearchWarning(null);

    const next = initialPlace
      ? {
          ...initialPlace,
          source: initialPlace.source,
        }
      : null;
     
    setPending(next);

    if (next) {
      const region = regionFor(next.latitude, next.longitude);
       
      setMapRegion(region);
    }
  }, [visible, initialPlace]);

  useEffect(() => {
    if (!visible) return;
    let active = true;

    getLocationPermissionSnapshot()
      .then((permissions) => {
        if (!active) return;
        setShowUserLocation(permissions.foreground === 'granted');
        if (!initialPlace && permissions.foreground === 'granted') {
          getCurrentCoordinates().then((coordinates) => {
            if (!active || !coordinates) return;
            const region = regionFor(coordinates.latitude, coordinates.longitude);
            setMapRegion(region);
            mapRef.current?.animateToRegion(region, reducedMotion ? 0 : 300);
          });
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [initialPlace, reducedMotion, visible]);

  useEffect(() => {
    if (!visible) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearching(true);
     
    setSearchError(null);

    const timer = setTimeout(() => {
      searchPlacesByText(trimmed, pending)
        .then((response) => {
          if (cancelled) return;
          setResults(response.places);
          setSearchWarning(response.warning ?? null);
        })
        .catch((error) => {
          if (cancelled) return;
          setResults([]);
          setSearchWarning(null);
          setSearchError(errorMessage(error, 'Search is unavailable. Tap the map instead.'));
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pending, query, visible]);

  const focusMap = (latitude: number, longitude: number) => {
    const region = regionFor(latitude, longitude);
    setMapRegion(region);
    mapRef.current?.animateToRegion(region, reducedMotion ? 0 : 320);
  };

  const chooseMapPoint = (event: MapPressEvent) => {
    const coordinate = event.nativeEvent.coordinate;
    const request = ++reverseRequest.current;
    const next: SelectedPlace = {
      providerPlaceId: null,
      name: 'Map point',
      address: null,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      source: 'map',
    };
    setPending(next);

    reverseGeocodeAddress(coordinate.latitude, coordinate.longitude).then((address) => {
      if (request !== reverseRequest.current) return;
      setPending((current) => {
        if (!current || current.latitude !== coordinate.latitude) return current;
        return { ...current, address, name: address ?? 'Map point' };
      });
    });
  };

  const chooseResult = (result: PlaceSearchResult) => {
    Keyboard.dismiss();
    setPending(placeFromResult(result));
    focusMap(result.latitude, result.longitude);
  };

  const selectCurrentLocation = async () => {
    setLocating(true);
    try {
      const permissions = await getLocationPermissionSnapshot();
      if (permissions.foreground !== 'granted') {
        if (!permissions.canAskForeground) {
          Alert.alert(
            'Location access',
            'Enable location for Nearn in Settings to use your current location.',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => void openSystemSettings() },
            ],
          );
          return;
        }
        const next = await requestForegroundLocation();
        if (next.foreground !== 'granted') return;
        setShowUserLocation(true);
      }

      const coordinates = await getCurrentCoordinates();
      if (!coordinates) {
        Alert.alert(
          'Location unavailable',
          'Your current position could not be determined. You can tap a point on the map instead.',
        );
        return;
      }

      const request = ++reverseRequest.current;
      const next: SelectedPlace = {
        providerPlaceId: null,
        name: 'Current location',
        address: null,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        source: 'current',
      };
      setPending(next);
      focusMap(coordinates.latitude, coordinates.longitude);

      const address = await reverseGeocodeAddress(
        coordinates.latitude,
        coordinates.longitude,
      );
      if (request === reverseRequest.current) {
        setPending((current) =>
          current
            ? {
                ...current,
                address,
                name: address ?? 'Current location',
              }
            : current,
        );
      }
    } finally {
      setLocating(false);
    }
  };

  const confirm = () => {
    if (!pending) return;
    onSelect({
      ...pending,
      name: pending.name || pending.address || 'Map point',
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel place selection"
            onPress={onClose}
            style={styles.headerButton}
          >
            <Text style={[styles.headerAction, { color: colors.secondaryText }]}>Cancel</Text>
          </Pressable>
          <Text accessibilityRole="header" style={[styles.headerTitle, { color: colors.text }]}>
            Choose Place
          </Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchField, { backgroundColor: colors.fill }]}>
            <Icon name="search" size={18} color={colors.secondaryText} />
            <TextInput
              accessibilityLabel="Search for a business or address"
              placeholder="Business or address"
              placeholderTextColor={colors.tertiaryText}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="never"
              style={[styles.searchInput, { color: colors.text }]}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setQuery('')}
                hitSlop={10}
                style={styles.clearButton}
              >
                <Icon name="close" size={16} color={colors.secondaryText} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.mapWrap, { backgroundColor: colors.fill }]}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={mapRegion}
              onPress={chooseMapPoint}
              showsUserLocation={showUserLocation}
              showsMyLocationButton={false}
              toolbarEnabled={false}
              accessibilityLabel="Map. Tap a point to use it for this reminder."
            >
              {pending ? (
                <Marker
                  coordinate={{
                    latitude: pending.latitude,
                    longitude: pending.longitude,
                  }}
                  pinColor={colors.mapPin}
                />
              ) : null}
            </MapView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Center map on my location"
              onPress={() => void selectCurrentLocation()}
              disabled={locating}
              style={({ pressed }) => [
                styles.locateButton,
                { backgroundColor: colors.surface, shadowColor: colors.shadow },
                pressed && styles.pressed,
              ]}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Icon name="currentLocation" size={20} color={colors.accentText} />
              )}
            </Pressable>
          </View>

          {pending ? (
            <View style={[styles.selectionCard, { backgroundColor: colors.surface }]}>
              <View style={styles.selectionRow}>
                <View style={[styles.selectionIcon, { backgroundColor: colors.accentSoft }]}>
                  <Icon name="location" size={20} color={colors.accentText} />
                </View>
                <View style={styles.selectionCopy}>
                  <Text style={[styles.selectionTitle, { color: colors.text }]} numberOfLines={2}>
                    {pending.name}
                  </Text>
                  <Text
                    style={[styles.selectionSubtitle, { color: colors.secondaryText }]}
                    numberOfLines={2}
                  >
                    {pending.address ??
                      `${pending.latitude.toFixed(5)}, ${pending.longitude.toFixed(5)}`}
                  </Text>
                </View>
              </View>
              <Button
                label={pending.source === 'map' ? 'Use This Point' : 'Use This Place'}
                onPress={confirm}
                size="compact"
                icon="check"
              />
            </View>
          ) : (
            <Text style={[styles.hint, { color: colors.secondaryText }]}>
              Search for a business or address, tap the map, or use your current location.
            </Text>
          )}

          <Button
            label="Use Current Location"
            onPress={() => void selectCurrentLocation()}
            variant="secondary"
            icon="currentLocation"
            loading={locating}
            size="compact"
          />

          {searchWarning ? (
            <InlineNotice message={searchWarning} tone="neutral" icon="info" />
          ) : null}
          {searchError ? (
            <InlineNotice
              title="Search unavailable"
              message={searchError}
              tone="warning"
              actionLabel="Tap the map instead"
              onAction={() => setSearchError(null)}
            />
          ) : null}

          {query.trim().length >= 2 ? (
            <Section title="Search results">
              {searching ? (
                <ListRow
                  title="Searching…"
                  subtitle="Looking for real places and addresses"
                  icon="search"
                  right={<ActivityIndicator size="small" color={colors.accent} />}
                />
              ) : results && results.length > 0 ? (
                results.map((result) => (
                  <ListRow
                    key={result.id}
                    icon={result.source === 'business' ? 'store' : 'location'}
                    title={result.name}
                    subtitle={
                      result.address ??
                      `${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)}`
                    }
                    accessory={
                      pending?.providerPlaceId === result.id ||
                      (pending?.source !== 'business' &&
                        pending?.latitude === result.latitude &&
                        pending?.longitude === result.longitude)
                        ? 'check'
                        : 'chevron'
                    }
                    onPress={() => chooseResult(result)}
                    accessibilityLabel={`Use ${result.name}${
                      result.address ? `, ${result.address}` : ''
                    }`}
                  />
                ))
              ) : (
                <ListRow
                  title="No matches found"
                  subtitle="Try a different search or tap the map."
                  icon="search"
                  accessory="none"
                />
              )}
            </Section>
          ) : (
            <Text style={[styles.footnote, { color: colors.tertiaryText }]}>
              Search results are real addresses or businesses. Nearn never displays invented
              places.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 52,
  },
  headerButton: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerAction: {
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchField: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 10,
  },
  clearButton: {
    width: 28,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  mapWrap: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  locateButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  pressed: {
    opacity: 0.7,
  },
  selectionCard: {
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCopy: {
    flex: 1,
    gap: 2,
  },
  selectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  selectionSubtitle: {
    fontSize: 13,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
