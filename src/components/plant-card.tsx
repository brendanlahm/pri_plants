import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Plant } from '@/lib/plants';

/** Chips only fit short values; sheets full of sentences get a preview line instead. */
const MAX_CHIP_LENGTH = 24;

function summaryChips(details: [string, string][]) {
  return details.filter(([, value]) => value.length <= MAX_CHIP_LENGTH).slice(0, 3);
}

/** Everything else worth showing once the card is expanded. */
function detailRows(plant: Plant) {
  return [
    ['Location', plant.location],
    ['Watering', plant.watering],
    ['Light', plant.light],
    ['Acquired', plant.acquired],
    ['Notes', plant.notes],
    ...Object.entries(plant.extra),
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}

export function PlantCard({ plant }: { plant: Plant }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  const details = detailRows(plant);
  const chips = summaryChips(details);
  const preview = chips.length === 0 ? details[0] : undefined;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        onPress={() => setIsOpen((value) => !value)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={plant.name}>
        <View style={styles.headerText}>
          <ThemedText style={styles.name}>{plant.name}</ThemedText>
          {plant.species ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.species}>
              {plant.species}
            </ThemedText>
          ) : null}
        </View>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          weight="bold"
          tintColor={theme.textSecondary}
          style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
        />
      </Pressable>

      {!isOpen && chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map(([label, value]) => (
            <ThemedView key={label} type="backgroundSelected" style={styles.chip}>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {value}
              </ThemedText>
            </ThemedView>
          ))}
        </View>
      ) : null}

      {!isOpen && preview ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {preview[0]}: {preview[1]}
        </ThemedText>
      ) : null}

      {isOpen ? (
        <Animated.View entering={FadeIn.duration(150)} style={styles.details}>
          {details.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No other details in the spreadsheet.
            </ThemedText>
          ) : (
            details.map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
                  {label}
                </ThemedText>
                <ThemedText type="small" style={styles.detailValue}>
                  {value}
                </ThemedText>
              </View>
            ))
          )}
        </Animated.View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontWeight: 600,
  },
  species: {
    fontStyle: 'italic',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    maxWidth: '100%',
  },
  details: {
    gap: Spacing.one,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  detailLabel: {
    width: 90,
  },
  detailValue: {
    flex: 1,
  },
});
