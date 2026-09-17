import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_FILTER_LABELS, LIGHT_FILTERS, type LightFilter } from '@/lib/light';
import { SORT_LABELS, type SortMode } from '@/lib/plant-library';

const SORT_MODES = Object.keys(SORT_LABELS) as SortMode[];

/** Enough for about five rows; the rest scroll rather than pushing the list away. */
const MAX_MENU_HEIGHT = 220;

type ListOptionsProps = {
  sort: SortMode;
  light: LightFilter;
  /** What this list calls its light column, used as the section heading. */
  lightLabel: string;
  onSortChange: (mode: SortMode) => void;
  onLightChange: (filter: LightFilter) => void;
};

/** One collapsible field holding how the list is ordered and which light it shows. */
export function ListOptions({
  sort,
  light,
  lightLabel,
  onSortChange,
  onLightChange,
}: ListOptionsProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const summary = `${SORT_LABELS[sort]} · ${LIGHT_FILTER_LABELS[light]}`;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`Sort and filter: ${summary}`}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Sort
          </ThemedText>
          <ThemedText type="small" style={styles.value} numberOfLines={1}>
            {summary}
          </ThemedText>
          <SymbolView
            name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
            size={12}
            weight="bold"
            tintColor={theme.textSecondary}
            style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
          />
        </ThemedView>
      </Pressable>

      {isOpen ? (
        <ThemedView type="backgroundElement" style={styles.menu}>
          {/* The menu stays open on a choice: there are two groups to set here. */}
          <ScrollView style={styles.menuScroll} nestedScrollEnabled>
            <SectionHeading>Order</SectionHeading>
            {SORT_MODES.map((mode) => (
              <Option
                key={mode}
                label={SORT_LABELS[mode]}
                selected={mode === sort}
                onPress={() => onSortChange(mode)}
              />
            ))}

            <SectionHeading>{lightLabel}</SectionHeading>
            {LIGHT_FILTERS.map((filter) => (
              <Option
                key={filter}
                label={LIGHT_FILTER_LABELS[filter]}
                selected={filter === light}
                onPress={() => onLightChange(filter)}
              />
            ))}
          </ScrollView>
        </ThemedView>
      ) : null}
    </View>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.sectionHeading}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.option,
        selected && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
      {selected ? (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={12}
          weight="bold"
          tintColor={theme.accent}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  value: {
    flex: 1,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.7,
  },
  menu: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  menuScroll: {
    maxHeight: MAX_MENU_HEIGHT,
  },
  sectionHeading: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.half,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: 700,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
});
