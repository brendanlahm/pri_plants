import { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  CARE_KINDS,
  CARE_LABELS,
  careEventsByDate,
  defaultAnchors,
  plantsWithoutSchedule,
  toDateKey,
  type CareEvent,
  type CareKind,
} from '@/lib/care-schedule';
import { emptyLibrary, type PlantLibrary } from '@/lib/plant-library';
import { loadLibrary, saveLibrary } from '@/lib/plant-storage';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDay(date: Date) {
  return `${WEEKDAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

type Row = { type: 'heading'; kind: CareKind; count: number } | { type: 'plant'; event: CareEvent };

export default function CalendarScreen() {
  const theme = useTheme();
  const [today] = useState(() => new Date());
  const [library, setLibrary] = useState<PlantLibrary>(emptyLibrary);
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    loadLibrary().then(async (stored) => {
      // A library imported before the calendar existed has no anchors yet.
      const withAnchors: PlantLibrary =
        stored.plants.length > 0 && !stored.careAnchors
          ? { ...stored, careAnchors: defaultAnchors() }
          : stored;
      if (withAnchors !== stored) await saveLibrary(withAnchors);
      if (!active) return;
      setLibrary(withAnchors);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const { plants, careAnchors } = library;

  const eventsByDate = useMemo(() => {
    if (!careAnchors) return new Map<string, CareEvent[]>();
    return careEventsByDate(plants, careAnchors, startOfMonth(month), endOfMonth(month));
  }, [plants, careAnchors, month]);

  const rows = useMemo<Row[]>(() => {
    const events = eventsByDate.get(toDateKey(selected)) ?? [];
    return CARE_KINDS.flatMap((kind) => {
      const forKind = events.filter((event) => event.kind === kind);
      if (forKind.length === 0) return [];
      return [
        { type: 'heading', kind, count: forKind.length } as Row,
        ...forKind.map((event) => ({ type: 'plant', event }) as Row),
      ];
    });
  }, [eventsByDate, selected]);

  const unscheduled = useMemo(() => plantsWithoutSchedule(plants, 'fertilize').length, [plants]);

  const header = (
    <View style={styles.header}>
      <ThemedText type="subtitle">Calendar</ThemedText>
      {careAnchors ? (
        <ThemedText type="small" themeColor="textSecondary">
          Watered {careAnchors.wateredAt}, fertilized {careAnchors.fertilizedAt}. Everything after
          that is worked out from each plant&apos;s own schedule.
        </ThemedText>
      ) : null}

      {plants.length > 0 ? (
        <>
          <MonthCalendar
            month={month}
            selected={selected}
            today={today}
            eventsByDate={eventsByDate}
            onSelect={setSelected}
            onChangeMonth={(delta) => {
              const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
              setMonth(next);
              // Keep the selected day inside the grid on screen, or the day
              // heading below would describe a date the calendar isn't showing.
              const holdsToday =
                next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();
              setSelected(holdsToday ? today : next);
            }}
          />
          <ThemedText style={styles.dayTitle}>{formatDay(selected)}</ThemedText>
          {rows.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing due.
            </ThemedText>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const footer =
    plants.length > 0 && unscheduled > 0 ? (
      <ThemedView type="backgroundElement" style={styles.note}>
        <ThemedText type="small" themeColor="textSecondary">
          {unscheduled} {unscheduled === 1 ? 'plant says' : 'plants say'} only
          &ldquo;occasionally&rdquo; for fertilizing, so {unscheduled === 1 ? 'it has' : 'they have'}{' '}
          no fertilizing dates here.
        </ThemedText>
      </ThemedView>
    ) : null;

  const empty =
    isLoading || plants.length > 0 ? null : (
      <ThemedView type="backgroundElement" style={styles.note}>
        <ThemedText type="small">
          Import a spreadsheet on the Plants tab and the calendar fills in from the watering and
          fertilizing columns.
        </ThemedText>
      </ThemedView>
    );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          data={rows}
          keyExtractor={(row, index) =>
            row.type === 'heading' ? `heading-${row.kind}` : `${row.event.plantId}-${row.event.kind}-${index}`
          }
          renderItem={({ item }) =>
            item.type === 'heading' ? (
              <View style={styles.rowHeading}>
                <View style={[styles.dot, { backgroundColor: theme[item.kind] }]} />
                <ThemedText type="smallBold">
                  {CARE_LABELS[item.kind]} · {item.count}
                </ThemedText>
              </View>
            ) : (
              <ThemedView type="backgroundElement" style={styles.plantRow}>
                <ThemedText type="small">{item.event.plantName}</ThemedText>
              </ThemedView>
            )
          }
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ListFooterComponent={footer}
          contentContainerStyle={styles.listContent}
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
    gap: Spacing.one,
  },
  header: {
    gap: Spacing.two,
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.three,
    paddingBottom: Spacing.two,
  },
  dayTitle: {
    fontWeight: 600,
    paddingTop: Spacing.two,
  },
  rowHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  plantRow: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  note: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
});
