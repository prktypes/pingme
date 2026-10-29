import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  getPermissionSnapshot,
  type PermissionSnapshot,
} from '@/location/permissions';

export function usePermissionSnapshot() {
  const [snapshot, setSnapshot] = useState<PermissionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await getPermissionSnapshot();
      setSnapshot(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => setLoading(false));
    }, [refresh]),
  );

  return { snapshot, loading, refresh };
}
