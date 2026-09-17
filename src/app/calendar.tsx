import { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ALL_CARE_VISIBLE, type CareVisibility } from '@/components/care-filter-toggles';
import { DayView } from '@/components/day-view';
import { MonthCalendar } from '@/components/month-calendar';
import { PillGroup, type PillOption } from '@/components/pill-group';
import { ReminderSettingsCard } from '@/components/reminder-settings-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCareLibrary } from '@/hooks/use-care-library';
import { useTheme } from '@/hooks/use-theme';
import {
  CARE_KINDS,
  CARE_LABELS,
  careEventsByDate,
  defaultAnchors,
  fromDayNumber,
  plantsWithoutSchedule,
  toDateKey,
  toDayNumber,
  type CareEvent,
  type CareKind,
} from '@/lib/care-schedule';
import { confirm } from '@/lib/confirm';
import type { PlantLibrary } from '@/lib/plant-library';
import { saveLibrary, loadReminderSettings, saveReminderSettings } from '@/lib/plant-storage';
import { buildReminders, DEFAULT_REMINDER_SETTINGS, type ReminderSettings } from '@/lib/reminder-plan';
import {
  getReminderPermission,
  remindersSupported,
  requestReminderPermission,
  syncScheduledReminders,
  type PermissionState,
} from '@/lib/reminders';

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

type ViewMode = 'month' | 'day';

const VIEW_OPTIONS: PillOption<ViewMode>[] = [
  { value: 'month', label: 'Month' },
  { value: 'day', label: 'Day' },
];

export default function CalendarScreen() {
  const theme = useTheme();
  const [today] = useState(() => new Date());
  const { library, setLibrary, isLoading } = useCareLibrary();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [visibleKinds, setVisibleKinds] = useState<CareVisibility>(ALL_CARE_VISIBLE);
  const [reminders, setReminders] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [scheduled, setScheduled] = useState<{ count: number; next: Date | null }>({
    count: 0,
    next: null,
  });

  useEffect(() => {
    if (isLoading) return;
    let active = true;

    (async () => {
      const [storedSettings, storedPermission] = await Promise.all([
        loadReminderSettings(),
        remindersSupported ? getReminderPermission() : Promise.resolve<PermissionState>('denied'),
      ]);
      if (!active) return;
      setReminders(storedSettings);
      setPermission(storedPermission);

      // Only a limited window is scheduled at a time, so refresh it on every visit.
      if (storedSettings.enabled && storedPermission === 'granted' && library.careAnchors) {
        const planned = buildReminders(library.plants, library.careAnchors, storedSettings);
        const count = await syncScheduledReminders(planned);
        if (active) setScheduled({ count, next: planned[0]?.date ?? null });
      }
    })();

    return () => {
      active = false;
    };
  }, [isLoading, library]);

  const { plants, careAnchors } = library;

  /**
   * The anchors are the schedule: without them there is nothing to count from,
   * so clearing them empties the calendar. Reminders are switched off with it,
   * since they are generated from the same dates.
   */
  async function setSchedule(anchors: PlantLibrary['careAnchors']) {
    const next: PlantLibrary = { ...library, careAnchors: anchors };
    setLibrary(next);
    await saveLibrary(next);

    if (anchors) return;
    await syncScheduledReminders([]);
    const off = { ...reminders, enabled: false };
    setReminders(off);
    setScheduled({ count: 0, next: null });
    await saveReminderSettings(off);
  }

  async function clearSchedule() {
    const ok = await confirm(
      'Empty the calendar?',
      'The calendar stops showing dates and reminders are switched off. Your plants are untouched, and you can start it again any time.',
      'Empty'
    );
    if (ok) await setSchedule(null);
  }

  /**
   * Events are only computed for the month on screen, so moving the selected day
   * has to carry the month with it — otherwise stepping from 30 September into
   * October would show an empty day.
   */
  function selectDate(date: Date) {
    setSelected(date);
    if (date.getFullYear() !== month.getFullYear() || date.getMonth() !== month.getMonth()) {
      setMonth(startOfMonth(date));
    }
  }

  const eventsByDate = useMemo(() => {
    if (!careAnchors) return new Map<string, CareEvent[]>();
    const all = careEventsByDate(plants, careAnchors, startOfMonth(month), endOfMonth(month));
    if (CARE_KINDS.every((kind) => visibleKinds[kind])) return all;

    // Filter once here so the grid dots, the day summary and the list below can
    // never disagree about what is being shown.
    const filtered = new Map<string, CareEvent[]>();
    for (const [key, events] of all) {
      const kept = events.filter((event) => visibleKinds[event.kind]);
      if (kept.length > 0) filtered.set(key, kept);
    }
    return filtered;
  }, [plants, careAnchors, month, visibleKinds]);

  function toggleKind(kind: CareKind) {
    setVisibleKinds((current) => ({ ...current, [kind]: !current[kind] }));
  }

  const allKindsHidden = CARE_KINDS.every((kind) => !visibleKinds[kind]);

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

  async function applyReminderSettings(next: ReminderSettings) {
    let granted = permission;
    if (next.enabled && granted !== 'granted') {
      granted = await requestReminderPermission();
      setPermission(granted);
    }

    // Remember the choice even when permission was refused, so the switch reflects
    // what was asked for and the user can fix it in device settings and come back.
    setReminders(next);
    await saveReminderSettings(next);

    const planned =
      next.enabled && granted === 'granted' && careAnchors
        ? buildReminders(plants, careAnchors, next)
        : [];
    const count = await syncScheduledReminders(planned);
    setScheduled({ count, next: planned[0]?.date ?? null });
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <ThemedText type="subtitle">Calendar</ThemedText>
        {careAnchors && plants.length > 0 ? (
          <Pressable
            onPress={clearSchedule}
            accessibilityRole="button"
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="small" themeColor="textSecondary">
              Empty
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {careAnchors ? (
        <ThemedText type="small" themeColor="textSecondary">
          Watering counted from {careAnchors.wateredAt}, fertilizing from{' '}
          {careAnchors.fertilizedAt}. Every date after that comes from each plant&apos;s own
          frequency.
        </ThemedText>
      ) : null}

      {!careAnchors && plants.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.note}>
          <ThemedText type="small">
            The calendar is empty. Start it again and every plant counts as watered today, with
            fertilizing counted from tomorrow, and dates worked out from each plant&apos;s own
            frequency.
          </ThemedText>
          <Pressable
            onPress={() => setSchedule(defaultAnchors())}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <ThemedText themeColor="accentText" style={styles.startLabel}>
              Start the schedule
            </ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}

      {plants.length > 0 && careAnchors ? (
        <>
          <PillGroup options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />

          {viewMode === 'month' ? (
            <>
              <MonthCalendar
                month={month}
                selected={selected}
                today={today}
                eventsByDate={eventsByDate}
                visibleKinds={visibleKinds}
                onSelect={setSelected}
                onToggleKind={toggleKind}
                onChangeMonth={(delta) => {
                  const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
                  setMonth(next);
                  // Keep the selected day inside the grid on screen, or the day
                  // heading below would describe a date the calendar isn't showing.
                  const holdsToday =
                    next.getFullYear() === today.getFullYear() &&
                    next.getMonth() === today.getMonth();
                  setSelected(holdsToday ? today : next);
                }}
              />
              <ThemedText style={styles.dayTitle}>{formatDay(selected)}</ThemedText>
            </>
          ) : (
            <DayView
              date={selected}
              today={today}
              events={eventsByDate.get(toDateKey(selected)) ?? []}
              visibleKinds={visibleKinds}
              onChangeDay={(delta) => selectDate(fromDayNumber(toDayNumber(selected) + delta))}
              onGoToToday={() => selectDate(today)}
              onToggleKind={toggleKind}
            />
          )}

          {/* Say which of the two it is, so an empty day never looks like a bug. */}
          {allKindsHidden ? (
            <ThemedText type="small" themeColor="textSecondary">
              Water and fertilizing are both hidden.
            </ThemedText>
          ) : rows.length === 0 && viewMode === 'month' ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing due.
            </ThemedText>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const reminderCard = (
    <ReminderSettingsCard
      supported={remindersSupported}
      settings={reminders}
      permission={permission}
      scheduledCount={scheduled.count}
      nextReminder={scheduled.next}
      hasPlants={plants.length > 0}
      onToggle={(enabled) => applyReminderSettings({ ...reminders, enabled })}
      onChangeHour={(hour) => applyReminderSettings({ ...reminders, hour })}
    />
  );

  const note =
    plants.length > 0 && unscheduled > 0 ? (
      <ThemedView type="backgroundElement" style={styles.note}>
        <ThemedText type="small" themeColor="textSecondary">
          {unscheduled} {unscheduled === 1 ? 'plant says' : 'plants say'} only
          &ldquo;occasionally&rdquo; for fertilizing, so {unscheduled === 1 ? 'it has' : 'they have'}{' '}
          no fertilizing dates here.
        </ThemedText>
      </ThemedView>
    ) : null;

  const footer = (
    <>
      {note}
      {reminderCard}
    </>
  );

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.7,
  },
  startButton: {
    minHeight: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  startLabel: {
    fontWeight: 600,
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
