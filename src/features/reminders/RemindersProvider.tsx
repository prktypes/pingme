import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import {
  completeReminder as completeReminderRecord,
  createReminder as createReminderRecord,
  deleteReminder as deleteReminderRecord,
  listAllTargets,
  listReminders,
  reopenReminder as reopenReminderRecord,
  snoozeReminder as snoozeReminderRecord,
  unsnoozeReminder as unsnoozeReminderRecord,
  updateReminder as updateReminderRecord,
} from '@/db/reminderRepository';
import type {
  Reminder,
  ReminderInput,
  ReminderTarget,
} from '@/features/reminders/types';
import { errorMessage } from '@/utils/errors';

type RemindersContextValue = {
  reminders: Reminder[];
  targetsByReminder: Record<string, ReminderTarget[]>;
  loading: boolean;
  loadError: string | null;
  revision: number;
  refresh: () => Promise<void>;
  createReminder: (input: ReminderInput) => Promise<Reminder>;
  updateReminder: (id: string, input: ReminderInput) => Promise<Reminder>;
  completeReminder: (id: string) => Promise<void>;
  reopenReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, untilIso: string) => Promise<void>;
  unsnoozeReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
};

const RemindersContext = createContext<RemindersContextValue | null>(null);

export function RemindersProvider({ children }: PropsWithChildren) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [targets, setTargets] = useState<ReminderTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const mounted = useRef(true);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const task = (async () => {
      try {
        const [nextReminders, nextTargets] = await Promise.all([
          listReminders(),
          listAllTargets(),
        ]);
        if (!mounted.current) return;
        setReminders(nextReminders);
        setTargets(nextTargets);
        setLoadError(null);
      } catch (error) {
        if (!mounted.current) return;
        setLoadError(errorMessage(error, 'Your reminders could not be loaded.'));
        throw error;
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();

    refreshInFlight.current = task;
    try {
      await task;
    } finally {
      refreshInFlight.current = null;
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  const targetsByReminder = useMemo(() => {
    const grouped: Record<string, ReminderTarget[]> = {};
    for (const target of targets) {
      (grouped[target.reminderId] ??= []).push(target);
    }
    return grouped;
  }, [targets]);

  const markChanged = useCallback(() => setRevision((value) => value + 1), []);

  const createReminder = useCallback(
    async (input: ReminderInput) => {
      const reminder = await createReminderRecord(input);
      await refresh();
      markChanged();
      return reminder;
    },
    [markChanged, refresh],
  );

  const updateReminder = useCallback(
    async (id: string, input: ReminderInput) => {
      const reminder = await updateReminderRecord(id, input);
      await refresh();
      markChanged();
      return reminder;
    },
    [markChanged, refresh],
  );

  const completeReminder = useCallback(
    async (id: string) => {
      await completeReminderRecord(id);
      await refresh();
      markChanged();
    },
    [markChanged, refresh],
  );

  const reopenReminder = useCallback(
    async (id: string) => {
      await reopenReminderRecord(id);
      await refresh();
      markChanged();
    },
    [markChanged, refresh],
  );

  const snoozeReminder = useCallback(
    async (id: string, untilIso: string) => {
      await snoozeReminderRecord(id, untilIso);
      await refresh();
      markChanged();
    },
    [markChanged, refresh],
  );

  const unsnoozeReminder = useCallback(
    async (id: string) => {
      await unsnoozeReminderRecord(id);
      await refresh();
      markChanged();
    },
    [markChanged, refresh],
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      await deleteReminderRecord(id);
      await refresh();
      markChanged();
    },
    [markChanged, refresh],
  );

  const value = useMemo<RemindersContextValue>(
    () => ({
      reminders,
      targetsByReminder,
      loading,
      loadError,
      revision,
      refresh,
      createReminder,
      updateReminder,
      completeReminder,
      reopenReminder,
      snoozeReminder,
      unsnoozeReminder,
      deleteReminder,
    }),
    [
      reminders,
      targetsByReminder,
      loading,
      loadError,
      revision,
      refresh,
      createReminder,
      updateReminder,
      completeReminder,
      reopenReminder,
      snoozeReminder,
      unsnoozeReminder,
      deleteReminder,
    ],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const context = useContext(RemindersContext);
  if (!context) throw new Error('useReminders must be used inside RemindersProvider.');
  return context;
}

export function useReminder(id: string | undefined): Reminder | null {
  const { reminders } = useReminders();
  if (!id) return null;
  return reminders.find((reminder) => reminder.id === id) ?? null;
}
