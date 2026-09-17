import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { editableFields, hintText } from '@/lib/plant-fields';
import type { Plant } from '@/lib/plants';

type EditPlantModalProps = {
  /** The plant being edited, or null when the sheet is closed. */
  plant: Plant | null;
  onCancel: () => void;
  onSave: (plant: Plant, values: Record<string, string>) => void;
};

export function EditPlantModal({ plant, onCancel, onSave }: EditPlantModalProps) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});

  // Reload the form whenever a different plant is opened.
  useEffect(() => {
    if (!plant) return;
    setValues(Object.fromEntries(editableFields(plant).map((field) => [field.key, field.value])));
  }, [plant]);

  if (!plant) return null;

  const fields = editableFields(plant);
  const canSave = (values['field:name'] ?? '').trim().length > 0;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ThemedView style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Edit plant</ThemedText>

            {fields.map((field) => {
              const value = values[field.key] ?? '';
              return (
                <FormField
                  key={field.key}
                  label={field.label}
                  value={value}
                  multiline={field.label === 'Notes'}
                  hint={hintText(field.hint, value)}
                  onChangeText={(next) =>
                    setValues((current) => ({ ...current, [field.key]: next }))
                  }
                />
              );
            })}

            <ThemedText type="small" themeColor="textSecondary">
              Clearing a field removes it from this plant.
            </ThemedText>

            <View style={styles.actions}>
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => canSave && onSave(plant, values)}
                disabled={!canSave}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.accent },
                  (pressed || !canSave) && styles.pressed,
                ]}>
                <ThemedText themeColor="accentText" style={styles.saveLabel}>
                  Save
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
