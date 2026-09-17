import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { careIntervalDays } from '@/lib/care-interval';
import { LIGHT_LABELS, lightLevelsFromText } from '@/lib/light';
import type { PlantDraft } from '@/lib/plant-library';

const EMPTY: PlantDraft = { name: '', watering: '', fertilizing: '', light: '' };

function formatInterval(days: number) {
  const rounded = Number.isInteger(days) ? days : Number(days.toFixed(1));
  return `every ${rounded} ${rounded === 1 ? 'day' : 'days'}`;
}

/** What the app will make of a schedule, shown as it is typed. */
function scheduleHint(text: string) {
  if (!text.trim()) return 'Leave blank if you would rather not schedule it.';
  const days = careIntervalDays(text);
  return days === undefined
    ? 'No schedule found — try wording like “Every 2 weeks” or “Weekly”.'
    : `Read as ${formatInterval(days)}.`;
}

function lightHint(text: string) {
  if (!text.trim()) return 'Leave blank to skip the light filter.';
  const levels = lightLevelsFromText(text);
  return levels.length === 0
    ? 'No light level found — try wording like “Bright indirect light”.'
    : `Read as ${levels.map((level) => LIGHT_LABELS[level]).join(', ')}.`;
}

type AddPlantModalProps = {
  visible: boolean;
  /** What this list calls its light column, so the form matches the cards. */
  lightLabel: string;
  onCancel: () => void;
  onSave: (draft: PlantDraft) => void;
};

export function AddPlantModal({ visible, lightLabel, onCancel, onSave }: AddPlantModalProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState<PlantDraft>(EMPTY);

  const canSave = draft.name.trim().length > 0;

  function close() {
    setDraft(EMPTY);
    onCancel();
  }

  function save() {
    if (!canSave) return;
    onSave(draft);
    setDraft(EMPTY);
  }

  function field(key: keyof PlantDraft) {
    return {
      value: draft[key],
      onChangeText: (value: string) => setDraft((current) => ({ ...current, [key]: value })),
      placeholderTextColor: theme.textSecondary,
      style: [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }],
    };
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ThemedView style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Add a plant</ThemedText>

            <View style={styles.field}>
              <ThemedText type="smallBold">Name</ThemedText>
              <TextInput {...field('name')} placeholder="Monstera" autoFocus />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Watering frequency</ThemedText>
              <TextInput {...field('watering')} placeholder="Every 2 weeks" />
              <ThemedText type="small" themeColor="textSecondary">
                {scheduleHint(draft.watering)}
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Fertilization frequency</ThemedText>
              <TextInput {...field('fertilizing')} placeholder="Monthly, spring-summer" />
              <ThemedText type="small" themeColor="textSecondary">
                {scheduleHint(draft.fertilizing)}
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">{lightLabel}</ThemedText>
              <TextInput {...field('light')} placeholder="Bright indirect light" />
              <ThemedText type="small" themeColor="textSecondary">
                {lightHint(draft.light)}
              </ThemedText>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={!canSave}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.accent },
                  (pressed || !canSave) && styles.pressed,
                ]}>
                <ThemedText themeColor="accentText" style={styles.saveLabel}>
                  Add plant
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '90%',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 44,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  saveLabel: {
    fontWeight: 600,
  },
});
