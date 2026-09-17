import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CARE_KINDS, toDateKey, type CareEvent, type CareKind } from '@/lib/care-schedule';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Weeks start on Monday. */
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function daysInMonth(month: Date) {
  return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
}

type MonthCalendarProps = {
  month: Date;
  selected: Date;
  today: Date;
  eventsByDate: Map<string, CareEvent[]>;
  onSelect: (date: Date) => void;
  onChangeMonth: (delta: number) => void;
};

export function MonthCalendar({
  month,
  selected,
  today,
  eventsByDate,
  onSelect,
  onChangeMonth,
}: MonthCalendarProps) {
  const theme = useTheme();
  const leadingBlanks = mondayIndex(new Date(month.getFullYear(), month.getMonth(), 1));
  const dayCount = daysInMonth(month);
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={styles.header}>
        <MonthButton label="‹" accessibilityLabel="Previous month" onPress={() => onChangeMonth(-1)} />
        <ThemedText style={styles.monthName}>
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </ThemedText>
        <MonthButton label="›" accessibilityLabel="Next month" onPress={() => onChangeMonth(1)} />
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((weekday) => (
          <View key={weekday} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.weekday}>
              {weekday}
            </ThemedText>
          </View>
        ))}

        {cells.map((day, index) => {
          if (day === null) return <View key={`blank-${index}`} style={styles.cell} />;

          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const key = toDateKey(date);
          const events = eventsByDate.get(key);
          const isSelected = key === toDateKey(selected);
          const isToday = key === toDateKey(today);

          return (
            <View key={key} style={styles.cell}>
              <Pressable
                onPress={() => onSelect(date)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${day} ${MONTH_NAMES[month.getMonth()]}${describe(events)}`}
                style={({ pressed }) => [
                  styles.day,
                  isSelected && { backgroundColor: theme.accent },
                  !isSelected && isToday && { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="small"
                  style={[
                    isToday && styles.todayLabel,
                    isSelected && { color: theme.accentText },
                  ]}>
                  {day}
                </ThemedText>
                <View style={styles.dots}>
                  {CARE_KINDS.map((kind) =>
                    events?.some((event) => event.kind === kind) ? (
                      <View key={kind} style={[styles.dot, { backgroundColor: theme[kind] }]} />
                    ) : null
                  )}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        {CARE_KINDS.map((kind) => (
          <View key={kind} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: theme[kind] }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {kind === 'water' ? 'Water' : 'Fertilize'}
            </ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

function describe(events: CareEvent[] | undefined) {
  if (!events?.length) return ', nothing due';
  const counts = CARE_KINDS.map((kind: CareKind) => {
    const total = events.filter((event) => event.kind === kind).length;
    return total ? `${total} to ${kind === 'water' ? 'water' : 'fertilize'}` : null;
  }).filter(Boolean);
  return `, ${counts.join(' and ')}`;
}

function MonthButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={Spacing.two}
      style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
      <ThemedText style={styles.monthButtonLabel}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  monthName: {
    fontWeight: 600,
  },
  monthButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonLabel: {
    fontSize: 24,
    lineHeight: 28,
  },
  pressed: {
    opacity: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    padding: 2,
  },
  weekday: {
    textAlign: 'center',
  },
  day: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    alignItems: 'center',
    gap: 3,
  },
  todayLabel: {
    fontWeight: 700,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
