import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  careInterval,
  fromDayNumber,
  lastCareDay,
  nextCareDay,
  toDayNumber,
  type CareAnchors,
  type CareKind,
} from '@/lib/care-schedule';
import { photoUri } from '@/lib/photo-storage';
import { headerMatchesField, type Plant } from '@/lib/plants';
import { wateringPhrase } from '@/lib/watering-filter';

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Counting in days is what someone actually wants to know from a due date. */
function formatDaysUntil(days: number) {
  if (days <= 0) return 'Next watering today';
  if (days === 1) return 'Next watering tomorrow';
  return `Next watering in ${days} days`;
}

/** An em dash rather than a date: this plant has not come round yet. */
function formatCareDay(day: number | null) {
  if (day === null) return '\u2014';
  const date = fromDayNumber(day);
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Long values are care notes, not summaries; they belong in the expanded card. */
const MAX_CHIP_LENGTH = 24;

/** Chips borrow the calendar's colours: blue is water, amber is feeding. */
type Chip = { text: string; tone?: CareKind };

/**
 * What the collapsed card shows: how often to water, then any other value short
 * enough to read at a glance.
 *
 * The watering chip is the interval read out of the column rather than the
 * column itself, so "Every 3 weeks, let soil dry out completely" shows as
 * "Water every 3 weeks" without the note trailing behind it.
 */
function summaryChips(plant: Plant, details: [string, string][]): Chip[] {
  const days = careInterval(plant, 'water');
  const watering: Chip[] = days === undefined ? [] : [{ text: wateringPhrase(days), tone: 'water' }];

  const rest: Chip[] = details
    .filter(([label, value]) => label !== 'Watering' && value.length <= MAX_CHIP_LENGTH)
    .map(([label, value]) => ({
      text: value,
      // A sheet may call this column anything, so match on the heading.
      tone: label === 'Fertilizing' || headerMatchesField(label, 'fertilizing')
        ? ('fertilize' as const)
        : undefined,
    }));

  return [...watering, ...rest].slice(0, 3);
}

/** Everything else worth showing once the card is expanded. */
function detailRows(plant: Plant) {
  return [
    ['Location', plant.location],
    ['Watering', plant.watering],
    ['Fertilizing', plant.fertilizing],
    ['Light', plant.light],
    ['Acquired', plant.acquired],
    ['Notes', plant.notes],
    ...Object.entries(plant.extra),
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}

type PlantCardProps = {
  plant: Plant;
  /** Null while the schedule is off, when there is nothing to count from. */
  anchors: CareAnchors | null;
  onPickPhoto: (plant: Plant) => void;
  onRemovePhoto: (plant: Plant) => void;
  onEdit: (plant: Plant) => void;
};

export function PlantCard({
  plant,
  anchors,
  onPickPhoto,
  onRemovePhoto,
  onEdit,
}: PlantCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  const details = detailRows(plant);
  const chips = summaryChips(plant, details);

  // Turn the chevron rather than flipping it.
  const turn = useDerivedValue(() => withTiming(isOpen ? 1 : 0, { duration: 180 }), [isOpen]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${90 - turn.value * 180}deg` }],
  }));

  const today = toDayNumber(new Date());
  const lastWatered = anchors ? lastCareDay(plant, 'water', anchors, today) : null;
  const lastFertilized = anchors ? lastCareDay(plant, 'fertilize', anchors, today) : null;
  const nextWatering = anchors ? nextCareDay(plant, 'water', anchors, today) : null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.body}>
        <Pressable
          onPress={() => onPickPhoto(plant)}
          accessibilityRole="button"
          accessibilityLabel={plant.photo ? `Change the photo of ${plant.name}` : `Add a photo of ${plant.name}`}
          style={({ pressed }) => pressed && styles.pressed}>
          {plant.photo ? (
            <Image
              source={{ uri: photoUri(plant.photo) }}
              style={styles.photo}
              contentFit="cover"
              accessibilityLabel={plant.name}
            />
          ) : (
            <ThemedView type="backgroundSelected" style={[styles.photo, styles.photoPlaceholder]}>
              <SymbolView
                name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
                size={28}
                tintColor={theme.textSecondary}
              />
            </ThemedView>
          )}
        </Pressable>

        <View style={styles.main}>
          <ThemedText style={[styles.name, { color: theme.plantName }]}>{plant.name}</ThemedText>
          {/* The header is the only place the species appears, so it waits for
              the card to open rather than being dropped altogether. */}
          {isOpen && plant.species ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.species}>
              {plant.species}
            </ThemedText>
          ) : null}

          {!isOpen && chips.length > 0 ? (
            <View style={styles.chipRow}>
              {chips.map((chip) => (
                <ThemedView key={chip.text} type="backgroundSelected" style={styles.chip}>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    numberOfLines={1}
                    style={[styles.compact, chip.tone ? { color: theme[chip.tone] } : null]}>
                    {chip.text}
                  </ThemedText>
                </ThemedView>
              ))}
            </View>
          ) : null}

          {anchors ? (
            <View style={styles.lastCare}>
              {nextWatering === null ? null : (
                <View style={styles.lastCareRow}>
                  <View style={[styles.careDot, { backgroundColor: theme.text }]} />
                  <ThemedText type="small" style={[styles.compact, styles.due, { color: theme.text }]}>
                    {formatDaysUntil(nextWatering - today)}
                  </ThemedText>
                </View>
              )}
              <View style={styles.lastCareRow}>
                <View style={[styles.careDot, { backgroundColor: theme.water }]} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.compact}>
                  Last watered on: {formatCareDay(lastWatered)}
                </ThemedText>
              </View>
              <View style={styles.lastCareRow}>
                <View style={[styles.careDot, { backgroundColor: theme.fertilize }]} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.compact}>
                  Last fertilized on: {formatCareDay(lastFertilized)}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => setIsOpen((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          accessibilityLabel={plant.name}
          hitSlop={Spacing.two}
          style={({ pressed }) => pressed && styles.pressed}>
          <Animated.View style={chevronStyle}>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={14}
              weight="bold"
              tintColor={theme.textSecondary}
            />
          </Animated.View>
        </Pressable>
      </View>

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

          <View style={styles.photoActions}>
            <Pressable
              onPress={() => onEdit(plant)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${plant.name}`}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                Edit
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => onPickPhoto(plant)}
              accessibilityRole="button"
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="small" themeColor="textSecondary">
                {plant.photo ? 'Change photo' : 'Add photo'}
              </ThemedText>
            </Pressable>
            {plant.photo ? (
              <Pressable
                onPress={() => onRemovePhoto(plant)}
                accessibilityRole="button"
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="small" themeColor="textSecondary">
                  Remove photo
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
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
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  main: {
    flex: 1,
    gap: Spacing.one,
  },
  photo: {
    width: 90,
    height: 90,
    // Square, with the corners softened to match the cards and chips around it.
    borderRadius: Spacing.two,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.two,
  },
  name: {
    fontWeight: 700,
  },
  due: {
    fontWeight: 600,
  },
  /* Beside a 120px photo the column is narrow; a size down, at regular weight,
     keeps the dates on one line instead of breaking mid-date. */
  compact: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 400,
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
  lastCare: {
    gap: 3,
  },
  lastCareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  careDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
