import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_LABELS, type LightFilter, type LightLevel } from '@/lib/light';
import type { WateringFilter, WateringGroup } from '@/lib/watering-filter';

/** Shown in the field when neither filter is set; not offered as a row. */
const NOTHING_FILTERED = 'All plants';

/** Enough for about five rows; the rest scroll rather than pushing the list away. */
const MAX_MENU_HEIGHT = 220;

type ListOptionsProps = {
  watering: WateringFilter;
  light: LightFilter;
  /** What this list calls its light column, used as the section heading. */
  lightLabel: string;
  /** Only the frequencies and levels the list actually uses are offered. */
  wateringGroups: WateringGroup[];
  lightLevels: LightLevel[];
  onWateringChange: (filter: WateringFilter) => void;
  onLightChange: (filter: LightFilter) => void;
};

/** One collapsible field holding what the list shows. */
export function ListOptions({
  watering,
  light,
  lightLabel,
  wateringGroups,
  lightLevels,
  onWateringChange,
  onLightChange,
}: ListOptionsProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const summary =
    [
      watering === 'all' ? null : wateringGroups.find((group) => group.key === watering)?.label,
      light === 'all' ? null : LIGHT_LABELS[light],
    ]
      .filter(Boolean)
      .join(' · ') || NOTHING_FILTERED;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`Filter: ${summary}`}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Filter
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
            {wateringGroups.length > 1 ? (
              <>
                <SectionHeading>Watering</SectionHeading>
                {wateringGroups.map((group) => (
                  <Option
                    key={group.key}
                    label={group.label}
                    count={group.count}
                    selected={group.key === watering}
                    // Unfiltered is the default rather than a row, so the chosen
                    // option is what lets go of itself.
                    onPress={() => onWateringChange(group.key === watering ? 'all' : group.key)}
                  />
                ))}
              </>
            ) : null}

            {lightLevels.length > 1 ? (
              <>
                <SectionHeading>{lightLabel}</SectionHeading>
                {lightLevels.map((level) => (
                  <Option
                    key={level}
                    label={LIGHT_LABELS[level]}
                    selected={level === light}
                    onPress={() => onLightChange(level === light ? 'all' : level)}
                  />
                ))}
              </>
            ) : null}
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
  count,
  selected,
  onPress,
}: {
  label: string;
  count?: number;
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
      <View style={styles.optionEnd}>
        {count === undefined ? null : (
          <ThemedText type="small" themeColor="textSecondary">
            {count}
          </ThemedText>
        )}
        {selected ? (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={12}
            weight="bold"
            tintColor={theme.accent}
          />
        ) : null}
      </View>
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
  optionEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
