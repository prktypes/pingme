import { Stack, useNavigation, usePreventRemove, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DateTimePickerModal } from './DateTimePickerModal';
import { PlacePickerModal } from './PlacePickerModal';

import { Button } from '@/components/Button';
import { ChoiceSheet } from '@/components/ChoiceSheet';
import { Icon } from '@/components/Icon';
import { InlineNotice } from '@/components/InlineNotice';
import { NavTextButton } from '@/components/NavTextButton';
import { Section, ListRow, SwitchRow } from '@/components/Section';
import { SegmentedControl } from '@/components/SegmentedControl';
import { RADIUS_OPTIONS, type RadiusOption } from '@/constants';
import { useReminders } from '@/features/reminders/RemindersProvider';
import type {
  Reminder,
  ReminderFormValues,
  RepeatRule,
  TriggerType,
} from '@/features/reminders/types';
import {
  reminderToFormValues,
  validateReminderForm,
  type ReminderField,
} from '@/features/reminders/validation';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useHaptics } from '@/hooks/useAccessibility';
import {
  DEFAULT_CATEGORY_ID,
  PLACE_CATEGORIES,
  getCategory,
  type PlaceCategoryId,
} from '@/places/categories';
import { useTheme } from '@/theme';
import {
  defaultDueDate,
  formatDate,
  formatTime,
  repeatLabel,
} from '@/utils/date';
import { errorMessage } from '@/utils/errors';

type ReminderFormScreenProps = {
  mode: 'create' | 'edit';
  reminder?: Reminder;
};

const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

function initialValues(radiusM: RadiusOption, reminder?: Reminder): ReminderFormValues {
  if (reminder) return reminderToFormValues(reminder, reminder.category);
  return {
    title: '',
    notes: '',
    triggerType: 'place',
    place: null,
    category: null,
    radiusM,
    dueAt: null,
    repeatRule: 'none',
  };
}

export function ReminderFormScreen({ mode, reminder }: ReminderFormScreenProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { defaultRadiusM } = useSettings();
  const { createReminder, updateReminder } = useReminders();
  const haptic = useHaptics();

  const baseValues = useRef(initialValues(defaultRadiusM, reminder));
  const [values, setValues] = useState<ReminderFormValues>(baseValues.current);
  const [errors, setErrors] = useState<Partial<Record<ReminderField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [allowLeave, setAllowLeave] = useState(false);
  const [shouldLeave, setShouldLeave] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [repeatSheetOpen, setRepeatSheetOpen] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const isDirty = JSON.stringify(values) !== JSON.stringify(baseValues.current);
  const dueDate = values.dueAt ? new Date(values.dueAt) : null;
  const category = getCategory(values.category);

  usePreventRemove(isDirty && !allowLeave && !saving, ({ data }) => {
    Alert.alert('Discard changes?', 'Your changes to this reminder will not be saved.', [
      { text: 'Keep Editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  useEffect(() => {
    if (!shouldLeave) return;
    router.back();
  }, [router, shouldLeave]);

  const update = useCallback(<K extends keyof ReminderFormValues>(
    key: K,
    value: ReminderFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFormError(null);
  }, []);

  const clearError = useCallback((field: ReminderField) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const setTriggerType = (triggerType: TriggerType) => {
    update('triggerType', triggerType);
    setErrors({});
    if (triggerType === 'time' && !values.dueAt) {
      update('dueAt', defaultDueDate().toISOString());
    }
    if (triggerType === 'category' && !values.category) {
      update('category', DEFAULT_CATEGORY_ID);
    }
  };

  const setDateEnabled = (enabled: boolean) => {
    if (enabled) {
      update('dueAt', defaultDueDate().toISOString());
    } else {
      setValues((current) => ({
        ...current,
        dueAt: null,
        repeatRule: 'none',
      }));
    }
    clearError('dueAt');
  };

  const setDueDate = (date: Date) => {
    update('dueAt', date.toISOString());
    clearError('dueAt');
  };

  const save = async () => {
    if (saving) return;
    Keyboard.dismiss();

    const validation = validateReminderForm(values);
    if (!validation.ok) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      setFormError(firstError ?? 'Check the reminder details.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      if (mode === 'edit' && reminder) {
        await updateReminder(reminder.id, validation.input);
      } else {
        await createReminder(validation.input);
      }
      await haptic('success');
      setAllowLeave(true);
      setShouldLeave(true);
    } catch (error) {
      Alert.alert('Could not save reminder', errorMessage(error));
      setSaving(false);
    }
  };

  const headerLeft = useCallback(
    () => <NavTextButton label="Cancel" onPress={() => router.back()} tone="secondary" />,
    [router],
  );

  const headerRight = useCallback(
    () => (
      <NavTextButton
        label={saving ? 'Saving…' : 'Save'}
        onPress={() => void save()}
        disabled={saving}
        bold
      />
    ),
    // save closes over current values; recreate when they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saving, values],
  );

  const hasTime = values.triggerType === 'time' || Boolean(values.dueAt);
  const timeOnly = values.triggerType === 'time';

  return (
    <>
      <Stack.Screen
        options={{
          title: mode === 'create' ? 'New Reminder' : 'Edit Reminder',
          headerLeft,
          headerRight,
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {formError ? (
          <InlineNotice
            title="Check this reminder"
            message={formError}
            tone="danger"
            icon="warning"
          />
        ) : null}

        <Section>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel="Reminder title"
              placeholder="What do you want to remember?"
              placeholderTextColor={colors.tertiaryText}
              value={values.title}
              onChangeText={(text) => {
                update('title', text);
                clearError('title');
              }}
              maxLength={120}
              autoFocus={mode === 'create'}
              returnKeyType="next"
              submitBehavior="submit"
              style={[styles.titleInput, { color: colors.text }]}
            />
          </View>
          <View style={[styles.inputRow, styles.notesRow]}>
            <TextInput
              accessibilityLabel="Notes"
              placeholder="Notes (optional)"
              placeholderTextColor={colors.tertiaryText}
              value={values.notes}
              onChangeText={(text) => {
                update('notes', text);
                clearError('notes');
              }}
              multiline
              maxLength={1_000}
              textAlignVertical="top"
              style={[styles.notesInput, { color: colors.text }]}
            />
          </View>
        </Section>
        {errors.title ? <FieldError message={errors.title} /> : null}
        {errors.notes ? <FieldError message={errors.notes} /> : null}

        <Section
          title="Where"
          footer={
            values.triggerType === 'category'
              ? `Nearn watches up to two nearby ${category?.pluralLabel ?? 'places'} and refreshes them when you open the app.`
              : values.triggerType === 'place'
                ? 'Choose a business, address, map point or your current location.'
                : 'This reminder is triggered by time only.'
          }
        >
          <View style={styles.segmentedBody}>
            <SegmentedControl
              accessibilityLabel="Reminder trigger"
              value={values.triggerType}
              onChange={(value) => setTriggerType(value)}
              options={[
                { value: 'place', label: 'Place' },
                { value: 'category', label: 'Category' },
                { value: 'time', label: 'Time' },
              ]}
            />
          </View>

          {values.triggerType === 'place' ? (
            <ListRow
              icon="location"
              title={values.place?.name ?? 'Choose a place'}
              subtitle={
                values.place?.address ??
                'Search for a business, address or tap the map'
              }
              onPress={() => setPlacePickerOpen(true)}
              accessibilityLabel={
                values.place ? `Selected place ${values.place.name}` : 'Choose a place'
              }
            />
          ) : null}

          {values.triggerType === 'category' ? (
            <ListRow
              icon={category?.icon ?? 'store'}
              title={category?.label ?? 'Choose a category'}
              subtitle={
                category
                  ? `Up to two nearby ${category.pluralLabel}`
                  : 'Supermarket, pharmacy, bank and more'
              }
              onPress={() => setCategorySheetOpen(true)}
            />
          ) : null}

          {values.triggerType === 'time' ? (
            <ListRow
              icon="clock"
              title="Time-only reminder"
              subtitle="No location is monitored"
              accessory="none"
            />
          ) : null}

          {values.triggerType !== 'time' ? (
            <View style={styles.controlBody}>
              <View style={styles.controlHeader}>
                <View style={styles.controlTitleRow}>
                  <Icon name="target" size={19} color={colors.secondaryText} />
                  <Text style={[styles.controlTitle, { color: colors.text }]}>
                    Trigger radius
                  </Text>
                </View>
                <Text style={[styles.controlMeta, { color: colors.secondaryText }]}>
                  {values.radiusM} m
                </Text>
              </View>
              <SegmentedControl
                accessibilityLabel="Trigger radius"
                value={values.radiusM}
                onChange={(value) => update('radiusM', value as RadiusOption)}
                options={RADIUS_OPTIONS.map((radius) => ({
                  value: radius,
                  label: `${radius} m`,
                }))}
              />
            </View>
          ) : null}
        </Section>
        {errors.place ? <FieldError message={errors.place} /> : null}
        {errors.category ? <FieldError message={errors.category} /> : null}
        {errors.trigger ? <FieldError message={errors.trigger} /> : null}

        <Section
          title="When"
          footer={
            !timeOnly
              ? 'A date is optional. Without one, the reminder alerts whenever you arrive.'
              : 'iOS may deliver notifications a little later depending on Focus and system settings.'
          }
        >
          {!timeOnly ? (
            <SwitchRow
              icon="calendar"
              title="Add a date & time"
              subtitle="Also alert at a specific time"
              value={Boolean(values.dueAt)}
              onValueChange={setDateEnabled}
            />
          ) : null}

          {hasTime ? (
            <ListRow
              icon="calendar"
              title={dueDate ? `${formatDate(values.dueAt)}, ${formatTime(dueDate)}` : 'Choose date & time'}
              subtitle="Tap to change"
              meta={dueDate ? undefined : 'Required'}
              onPress={() => setDatePickerOpen(true)}
            />
          ) : null}

          {hasTime ? (
            <ListRow
              icon="repeat"
              title="Repeat"
              meta={repeatLabel(values.repeatRule)}
              onPress={() => setRepeatSheetOpen(true)}
            />
          ) : null}
        </Section>
        {errors.dueAt ? <FieldError message={errors.dueAt} /> : null}

        <Button
          label={mode === 'create' ? 'Save Reminder' : 'Save Changes'}
          onPress={() => void save()}
          loading={saving}
          icon="check"
          style={styles.saveButton}
        />

        <Text style={[styles.footer, { color: colors.tertiaryText }]}>
          Saved on this iPhone. Nearn never records a location history.
        </Text>
      </ScrollView>

      <PlacePickerModal
        visible={placePickerOpen}
        initialPlace={values.place}
        onClose={() => setPlacePickerOpen(false)}
        onSelect={(place) => {
          update('place', place);
          clearError('place');
        }}
      />

      <DateTimePickerModal
        visible={datePickerOpen}
        value={values.dueAt}
        onClose={() => setDatePickerOpen(false)}
        onChange={setDueDate}
      />

      <ChoiceSheet<PlaceCategoryId>
        visible={categorySheetOpen}
        title="Choose a category"
        message="We watch nearby places of this type. Coverage is limited by the region budget."
        options={PLACE_CATEGORIES.map((option) => ({
          value: option.id,
          label: option.label,
          icon: option.icon,
        }))}
        selectedValue={values.category}
        onSelect={(value) => {
          update('category', value);
          clearError('category');
        }}
        onClose={() => setCategorySheetOpen(false)}
      />

      <ChoiceSheet<RepeatRule>
        visible={repeatSheetOpen}
        title="Repeat"
        message="Repeating reminders keep their next scheduled time on this iPhone."
        options={REPEAT_OPTIONS}
        selectedValue={values.repeatRule}
        onSelect={(value) => update('repeatRule', value)}
        onClose={() => setRepeatSheetOpen(false)}
      />
    </>
  );
}

function FieldError({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.fieldError, { color: colors.danger }]}
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 44,
    gap: 20,
  },
  inputRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  notesRow: {
    paddingTop: 6,
  },
  titleInput: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    minHeight: 44,
    paddingVertical: 4,
  },
  notesInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 68,
    paddingVertical: 4,
  },
  segmentedBody: {
    padding: 12,
  },
  controlBody: {
    padding: 14,
    gap: 10,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 26,
  },
  controlTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  controlMeta: {
    fontSize: 15,
  },
  saveButton: {
    marginTop: 4,
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  fieldError: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -14,
    paddingHorizontal: 4,
  },
});
