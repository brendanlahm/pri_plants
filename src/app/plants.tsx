import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportButton } from '@/components/import-button';
import { AddPlantModal } from '@/components/add-plant-modal';
import { EditPlantModal } from '@/components/edit-plant-modal';
import { ListOptions } from '@/components/list-options';
import { PlantCard } from '@/components/plant-card';
import { LeafTitle } from '@/components/leaf-title';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCareLibrary } from '@/hooks/use-care-library';
import { useTheme } from '@/hooks/use-theme';
import { defaultAnchors } from '@/lib/care-schedule';
import { confirm } from '@/lib/confirm';
import { buildReminders } from '@/lib/reminder-plan';
import { getReminderPermission, syncScheduledReminders } from '@/lib/reminders';
import { importPlantsFromSpreadsheet } from '@/lib/import-plants';
import { filterByLight, lightHeaderIn, lightLevelsInUse, type LightFilter } from '@/lib/light';
import { applyEdits } from '@/lib/plant-fields';
import { filterByWatering, wateringGroups, type WateringFilter } from '@/lib/watering-filter';
import { pickPlantPhoto } from '@/lib/pick-photo';
import { deleteAllPhotos, deletePhoto, savePhoto } from '@/lib/photo-storage';
import {
  emptyLibrary,
  filterPlants,
  plantFromDraft,
  sortPlants,
  type PlantDraft,
  type PlantLibrary,
} from '@/lib/plant-library';
import type { Plant } from '@/lib/plants';
import { loadReminderSettings, saveLibrary } from '@/lib/plant-storage';

/** The columns the importer understands, shown on the empty state. */
const EXPECTED_COLUMNS = 'Name · Species · Location · Watering · Light · Acquired · Notes';

function confirmClear() {
  return confirm(
    'Remove plants?',
    'This clears the list. Your spreadsheet is untouched.',
    'Remove'
  );
}

function confirmReplace(handAdded: number) {
  return confirm(
    'Replace the list?',
    `Importing replaces everything, including ${handAdded} ${
      handAdded === 1 ? 'plant you added' : 'plants you added'
    } by hand.`,
    'Replace'
  );
}

export default function PlantsScreen() {
  const { library, setLibrary, isLoading } = useCareLibrary();
  const [isImporting, setIsImporting] = useState(false);
  const [query, setQuery] = useState('');
  const [lightFilter, setLightFilter] = useState<LightFilter>('all');
  const [wateringFilter, setWateringFilter] = useState<WateringFilter>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Plant | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visiblePlants = useMemo(() => {
    const byLight = filterByLight(library.plants, lightFilter === 'all' ? null : lightFilter);
    const byWatering = filterByWatering(byLight, wateringFilter);
    return sortPlants(filterPlants(byWatering, query));
  }, [library.plants, query, lightFilter, wateringFilter]);

  // Only offer what this list actually uses, so no option ever returns nothing.
  const waterOptions = useMemo(() => wateringGroups(library.plants), [library.plants]);
  const lightOptions = useMemo(() => lightLevelsInUse(library.plants), [library.plants]);

  /**
   * Reminders are derived from the list, so replacing or clearing it has to
   * rebuild them. Otherwise notifications keep firing for plants that are gone.
   */
  async function rescheduleReminders(next: PlantLibrary) {
    const settings = await loadReminderSettings();
    if (!settings.enabled) return;
    if ((await getReminderPermission()) !== 'granted') return;

    const planned = next.careAnchors ? buildReminders(next.plants, next.careAnchors, settings) : [];
    await syncScheduledReminders(planned);
  }

  async function handleImport() {
    // Importing replaces the list, so hand-typed plants would vanish without warning.
    const handAdded = library.plants.filter((plant) => plant.addedByHand).length;
    if (handAdded > 0 && !(await confirmReplace(handAdded))) return;

    setIsImporting(true);
    setError(null);
    const result = await importPlantsFromSpreadsheet();
    setIsImporting(false);

    if (result.status === 'canceled') return;
    if (result.status === 'failed') {
      setError(result.message);
      return;
    }

    const imported: PlantLibrary = {
      plants: result.plants,
      fileName: result.fileName,
      importedAt: new Date().toISOString(),
      // A fresh sheet restarts the calendar from today.
      careAnchors: defaultAnchors(),
    };
    setLibrary(imported);
    setQuery('');
    setLightFilter('all');
    await deleteAllPhotos();
    await saveLibrary(imported);
    await rescheduleReminders(imported);
  }

  /** Writes one changed plant back into the library and persists it. */
  async function updatePlant(id: string, change: (plant: Plant) => Plant) {
    const next: PlantLibrary = {
      ...library,
      plants: library.plants.map((plant) => (plant.id === id ? change(plant) : plant)),
    };
    setLibrary(next);
    await saveLibrary(next);
  }

  async function handlePickPhoto(plant: Plant) {
    const result = await pickPlantPhoto();
    if (result.status === 'canceled') return;
    if (result.status !== 'picked') {
      setError(
        result.status === 'denied'
          ? 'Photo access is switched off for this app. Turn it on in your device settings.'
          : "The photo library couldn't be opened."
      );
      return;
    }

    setError(null);
    const stored = await savePhoto(result.asset, plant.id);
    await updatePlant(plant.id, (current) => ({ ...current, photo: stored }));
  }

  async function handleEdit(plant: Plant, values: Record<string, string>) {
    setEditing(null);
    await updatePlant(plant.id, (current) => applyEdits(current, values));
  }

  async function handleRemovePhoto(plant: Plant) {
    if (plant.photo) await deletePhoto(plant.photo);
    await updatePlant(plant.id, ({ photo: _removed, ...rest }) => rest);
  }

  async function handleAdd(draft: PlantDraft) {
    setIsAdding(false);
    const next: PlantLibrary = {
      ...library,
      plants: [...library.plants, plantFromDraft(library.plants, draft)],
      // The first plant on an otherwise empty list starts the calendar off.
      careAnchors: library.careAnchors ?? defaultAnchors(),
    };
    setLibrary(next);
    setError(null);
    await saveLibrary(next);
    await rescheduleReminders(next);
  }

  async function handleClear() {
    if (!(await confirmClear())) return;
    const cleared = emptyLibrary();
    setLibrary(cleared);
    setQuery('');
    setLightFilter('all');
    setWateringFilter('all');
    setError(null);
    await deleteAllPhotos();
    await saveLibrary(cleared);
    await rescheduleReminders(cleared);
  }

  const hasPlants = library.plants.length > 0;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <LeafTitle>Plants</LeafTitle>
        <View style={styles.titleActions}>
          {hasPlants ? (
            <Pressable
              onPress={handleClear}
              accessibilityRole="button"
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="small" themeColor="textSecondary">
                Clear
              </ThemedText>
            </Pressable>
          ) : null}
          <AddButton onPress={() => setIsAdding(true)} />
        </View>
      </View>

      {hasPlants ? (
        <ThemedText type="small" themeColor="textSecondary">
          {library.plants.length} {library.plants.length === 1 ? 'plant' : 'plants'}
        </ThemedText>
      ) : null}

      {error ? (
        <ThemedView type="backgroundElement" style={styles.errorBox}>
          <ThemedText type="small">{error}</ThemedText>
        </ThemedView>
      ) : null}

      {hasPlants ? (
        <>
          <SearchField value={query} onChangeText={setQuery} />
          <ListOptions
            watering={wateringFilter}
            light={lightFilter}
            lightLabel={lightHeaderIn(library.plants) ?? 'Light'}
            wateringGroups={waterOptions}
            lightLevels={lightOptions}
            onWateringChange={setWateringFilter}
            onLightChange={setLightFilter}
          />
        </>
      ) : null}
    </View>
  );

  const empty = isLoading ? null : (
    <ThemedView type="backgroundElement" style={styles.emptyBox}>
      {hasPlants ? (
        <ThemedText type="small" themeColor="textSecondary">
          No plants match “{query}”.
        </ThemedText>
      ) : (
        <>
          <ThemedText type="small">
            Pick an .xlsx, .xls or .csv file and every row becomes a plant.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            The first row of the sheet should be the column headers. A {'"'}Name{'"'} column is
            required; these are recognised too:
          </ThemedText>
          <ThemedText type="code">{EXPECTED_COLUMNS}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Any other column is kept and shown when you tap a plant. Or use + to add one by hand.
          </ThemedText>
          <ImportButton label="Import a spreadsheet" busy={isImporting} onPress={handleImport} />
        </>
      )}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <EditPlantModal plant={editing} onCancel={() => setEditing(null)} onSave={handleEdit} />
      <AddPlantModal
        visible={isAdding}
        lightLabel={lightHeaderIn(library.plants) ?? 'Light'}
        onCancel={() => setIsAdding(false)}
        onSave={handleAdd}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          data={visiblePlants}
          keyExtractor={(plant) => plant.id}
          renderItem={({ item }) => (
            <PlantCard
              plant={item}
              anchors={library.careAnchors}
              onPickPhoto={handlePickPhoto}
              onRemovePhoto={handleRemovePhoto}
              onEdit={setEditing}
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="on-drag"
        />
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * These two carry inline theme colours, so they have to be components rather
 * than inline JSX: the screen's header is memoized and its styles are not
 * recomputed when the colour scheme changes, whereas a component holding its
 * own useTheme re-renders on the change regardless.
 */
function SearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Search plants"
      placeholderTextColor={theme.textSecondary}
      autoCorrect={false}
      clearButtonMode="while-editing"
      style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
    />
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add a plant"
      style={({ pressed }) => [
        styles.addButton,
        { backgroundColor: theme.accent },
        pressed && styles.pressed,
      ]}>
      <ThemedText themeColor="accentText" style={styles.addLabel}>
        +
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.two,
    // On web the tab bar floats over the top of the screen.
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.three,
    paddingBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.7,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: 600,
  },
  search: {
    minHeight: 44,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  errorBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  emptyBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
