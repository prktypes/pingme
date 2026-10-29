import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { DEFAULT_RADIUS_M, type RadiusOption } from '@/constants';
import { getDefaultRadius, setDefaultRadius } from '@/db/settingsRepository';

type SettingsContextValue = {
  ready: boolean;
  defaultRadiusM: RadiusOption;
  updateDefaultRadius: (radius: RadiusOption) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [defaultRadiusM, setDefaultRadiusState] = useState<RadiusOption>(DEFAULT_RADIUS_M);

  useEffect(() => {
    let cancelled = false;
    getDefaultRadius()
      .then((radius) => {
        if (!cancelled) {
          setDefaultRadiusState(radius);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDefaultRadius = useCallback(async (radius: RadiusOption) => {
    await setDefaultRadius(radius);
    setDefaultRadiusState(radius);
  }, []);

  const value = useMemo(
    () => ({ ready, defaultRadiusM, updateDefaultRadius }),
    [ready, defaultRadiusM, updateDefaultRadius],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider.');
  return context;
}
