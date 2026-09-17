import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { photoUri } from '@/lib/photo-storage';
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
    ['Fertilizing', plant.fertilizing],
    ['Light', plant.light],
    ['Acquired', plant.acquired],
    ['Notes', plant.notes],
    ...Object.entries(plant.extra),
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}

type PlantCardProps = {
  plant: Plant;
  /** Label of a row to always show on the collapsed card, e.g. the column being sorted on. */
  preferredDetail?: string;
  onPickPhoto: (plant: Plant) => void;
  onRemovePhoto: (plant: Plant) => void;
  onEdit: (plant: Plant) => void;
};

export function PlantCard({
  plant,
  preferredDetail,
  onPickPhoto,
  onRemovePhoto,
  onEdit,
}: PlantCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  const details = detailRows(plant);
  const pinned = preferredDetail
    ? details.find(([label]) => label === preferredDetail)
    : undefined;
  const chips = pinned ? [] : summaryChips(details);
  const preview = pinned ?? (chips.length === 0 ? details[0] : undefined);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
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
                size={16}
                tintColor={theme.textSecondary}
              />
            </ThemedView>
          )}
        </Pressable>

        <View style={styles.headerText}>
          <ThemedText style={styles.name}>{plant.name}</ThemedText>
          {plant.species ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.species}>
              {plant.species}
            </ThemedText>
          ) : null}
        </View>
        <Pressable
          onPress={() => setIsOpen((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          accessibilityLabel={plant.name}
          hitSlop={Spacing.two}
          style={({ pressed }) => pressed && styles.pressed}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            weight="bold"
            tintColor={theme.textSecondary}
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
          />
        </Pressable>
      </View>

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
  photo: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
