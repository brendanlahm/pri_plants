import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';

export type PillOption<T extends string> = {
  value: T;
  label: string;
};

type PillGroupProps<T extends string> = {
  options: readonly PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Background for the unselected pills; depends on what the group sits on. */
  unselectedType?: ThemeColor;
};

/** A row of mutually exclusive pills. */
export function PillGroup<T extends string>({
  options,
  value,
  onChange,
  unselectedType = 'backgroundElement',
}: PillGroupProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
              type={isSelected ? 'backgroundSelected' : unselectedType}
              style={styles.pill}>
              <ThemedText type="small" themeColor={isSelected ? 'text' : 'textSecondary'}>
                {option.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
});
