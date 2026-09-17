import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SORT_LABELS, type SortMode } from '@/lib/plant-library';

const MODES = Object.keys(SORT_LABELS) as SortMode[];

type SortControlProps = {
  value: SortMode;
  onChange: (mode: SortMode) => void;
};

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <View style={styles.row}>
      {MODES.map((mode) => {
        const isSelected = mode === value;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
              type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.pill}>
              <ThemedText type="small" themeColor={isSelected ? 'text' : 'textSecondary'}>
                {SORT_LABELS[mode]}
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
