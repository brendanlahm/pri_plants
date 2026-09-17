import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportButton } from '@/components/import-button';
import { PlantCard } from '@/components/plant-card';
import { SortControl } from '@/components/sort-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { defaultAnchors } from '@/lib/care-schedule';
import { buildReminders } from '@/lib/reminder-plan';
import { getReminderPermission, syncScheduledReminders } from '@/lib/reminders';
import { importPlantsFromSpreadsheet } from '@/lib/import-plants';
import {
  emptyLibrary,
  filterPlants,
  sortPlants,
  type PlantLibrary,
  type SortMode,
} from '@/lib/plant-library';
import { loadLibrary, loadReminderSettings, saveLibrary } from '@/lib/plant-storage';

/** The columns the importer understands, shown on the empty state. */
const EXPECTED_COLUMNS = 'Name · Species · Location · Watering · Light · Acquired · Notes';

function confirmClear() {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm('Remove the imported plants?'));
  }
  // react-native-web's Alert is a no-op, hence the window.confirm branch above.
  return new Promise<boolean>((resolve) => {
    Alert.alert('Remove plants?', 'This clears the imported list. Your spreadsheet is untouched.', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function PlantsScreen() {
  const theme = useTheme();
  const [library, setLibrary] = useState<PlantLibrary>(emptyLibrary);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('sheet');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadLibrary().then((stored) => {
      if (active) {
        setLibrary(stored);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const visiblePlants = useMemo(
    () => sortPlants(filterPlants(library.plants, query), sortMode),
    [library.plants, query, sortMode]
  );

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
    setSortMode('sheet');
    await saveLibrary(imported);
    await rescheduleReminders(imported);
  }

  async function handleClear() {
    if (!(await confirmClear())) return;
    const cleared = emptyLibrary();
    setLibrary(cleared);
    setQuery('');
    setSortMode('sheet');
    setError(null);
    await saveLibrary(cleared);
    await rescheduleReminders(cleared);
  }

  const hasPlants = library.plants.length > 0;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <ThemedText type="subtitle">Plants</ThemedText>
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
      </View>

      {hasPlants ? (
        <ThemedText type="small" themeColor="textSecondary">
          {library.plants.length} {library.plants.length === 1 ? 'plant' : 'plants'}
          {library.fileName ? ` from ${library.fileName}` : ''}
        </ThemedText>
      ) : null}

      <ImportButton
        label={hasPlants ? 'Import a different spreadsheet' : 'Import a spreadsheet'}
        busy={isImporting}
        onPress={handleImport}
      />

      {error ? (
        <ThemedView type="backgroundElement" style={styles.errorBox}>
          <ThemedText type="small">{error}</ThemedText>
        </ThemedView>
      ) : null}

      {hasPlants ? (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search plants"
            placeholderTextColor={theme.textSecondary}
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={[
              styles.search,
              { backgroundColor: theme.backgroundElement, color: theme.text },
            ]}
          />
          <SortControl value={sortMode} onChange={setSortMode} />
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
            Any other column is kept and shown when you tap a plant.
          </ThemedText>
        </>
      )}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          data={visiblePlants}
          keyExtractor={(plant) => plant.id}
          renderItem={({ item }) => (
            <PlantCard plant={item} preferredDetail={sortMode === 'sheet' ? undefined : 'Watering'} />
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
    gap: Spacing.two,
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
