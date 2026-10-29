import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/useAccessibility';
import { useTheme } from '@/theme';
import { formatDate, formatTime } from '@/utils/date';

type DateTimePickerModalProps = {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onChange: (date: Date) => void;
};

export function DateTimePickerModal({
  visible,
  value,
  onClose,
  onChange,
}: DateTimePickerModalProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState<Date>(() => (value ? new Date(value) : new Date()));
  const [stage, setStage] = useState<'date' | 'time'>('date');
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible && !prevVisible) {
    setPrevVisible(true);
    setDraft(value ? new Date(value) : new Date());
    setStage('date');
  } else if (!visible && prevVisible) {
    setPrevVisible(false);
  }

  if (!visible) return null;

  if (Platform.OS === 'android') {
    const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
      if (event.type === 'dismissed') {
        onClose();
        return;
      }
      if (!selected) return;

      if (stage === 'date') {
        const next = new Date(draft);
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        setDraft(next);
        setStage('time');
        return;
      }

      const next = new Date(draft);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(next);
      onClose();
    };

    return (
      <DateTimePicker
        value={draft}
        mode={stage}
        display="default"
        minimumDate={stage === 'date' ? new Date() : undefined}
        onChange={handleChange}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onClose}
              style={styles.headerButton}
            >
              <Text style={[styles.headerText, { color: colors.secondaryText }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>Date & Time</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={() => {
                onChange(draft);
                onClose();
              }}
              style={styles.headerButton}
            >
              <Text style={[styles.headerText, { color: colors.accentText }]}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.preview}>
            <Text style={[styles.previewDate, { color: colors.text }]}>
              {formatDate(draft.toISOString())}
            </Text>
            <Text style={[styles.previewTime, { color: colors.secondaryText }]}>
              {formatTime(draft)}
            </Text>
          </View>
          <DateTimePicker
            value={draft}
            mode="datetime"
            display="spinner"
            minimumDate={new Date()}
            minuteInterval={5}
            themeVariant={scheme}
            onChange={(_event, selected) => {
              if (selected) setDraft(selected);
            }}
            style={styles.spinner}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 17,
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  preview: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  previewDate: {
    fontSize: 22,
    fontWeight: '600',
  },
  previewTime: {
    fontSize: 16,
  },
  spinner: {
    width: '100%',
  },
});
