import { Pressable, StyleSheet, View } from 'react-native';

import { CareFilterToggles, type CareVisibility } from '@/components/care-filter-toggles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { summarizeCare, toDateKey, type CareEvent, type CareKind } from '@/lib/care-schedule';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type DayViewProps = {
  date: Date;
  today: Date;
  events: CareEvent[];
  visibleKinds: CareVisibility;
  onChangeDay: (delta: number) => void;
  onGoToToday: () => void;
  onToggleKind: (kind: CareKind) => void;
};

export function DayView({
  date,
  today,
  events,
  visibleKinds,
  onChangeDay,
  onGoToToday,
  onToggleKind,
}: DayViewProps) {
  const theme = useTheme();
  const isToday = toDateKey(date) === toDateKey(today);

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={styles.header}>
        <DayButton label="‹" accessibilityLabel="Previous day" onPress={() => onChangeDay(-1)} />
        <View style={styles.headerText}>
          <ThemedText type="small" themeColor="textSecondary">
            {WEEKDAY_NAMES[date.getDay()]}
          </ThemedText>
          <ThemedText style={styles.dateLabel}>
            {date.getDate()} {MONTH_NAMES[date.getMonth()]} {date.getFullYear()}
          </ThemedText>
        </View>
        <DayButton label="›" accessibilityLabel="Next day" onPress={() => onChangeDay(1)} />
      </View>

      <View style={styles.summaryRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {summarizeCare(events)}
        </ThemedText>
        {isToday ? (
          <ThemedText type="small" themeColor="textSecondary">
            Today
          </ThemedText>
        ) : (
          <Pressable
            onPress={onGoToToday}
            accessibilityRole="button"
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="small" style={{ color: theme.accent }}>
              Back to today
            </ThemedText>
          </Pressable>
        )}
      </View>

      <CareFilterToggles visible={visibleKinds} onToggle={onToggleKind} />
    </ThemedView>
  );
}

function DayButton({
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
      style={({ pressed }) => [styles.dayButton, pressed && styles.pressed]}>
      <ThemedText style={styles.dayButtonLabel}>{label}</ThemedText>
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
  },
  headerText: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
  },
  dayButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonLabel: {
    fontSize: 24,
    lineHeight: 28,
  },
  pressed: {
    opacity: 0.6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
});
