import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { careEventNames, summarizeCare, type CareEvent } from '@/lib/care-schedule';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type TodayCardProps = {
  date: Date;
  events: CareEvent[];
};

/**
 * Today's care, sized to sit over the welcome photo. Its own translucent panel
 * rather than the themed surfaces used elsewhere, because it has to stay legible
 * against whatever is behind it.
 */
export function TodayCard({ date, events }: TodayCardProps) {
  const router = useRouter();
  const names = events.length > 0 ? careEventNames(events) : null;

  return (
    <Pressable
      onPress={() => router.navigate('/calendar')}
      accessibilityRole="button"
      accessibilityLabel={`Today, ${summarizeCare(events)}. Open the calendar.`}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <View style={styles.card}>
        <ThemedText style={styles.label}>
          TODAY · {WEEKDAY_NAMES[date.getDay()].toUpperCase()} {date.getDate()}{' '}
          {MONTH_NAMES[date.getMonth()].toUpperCase()}
        </ThemedText>
        <ThemedText style={styles.summary}>{summarizeCare(events)}</ThemedText>
        {names ? (
          <ThemedText style={styles.names} numberOfLines={2}>
            {names}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.8,
  },
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: 700,
    letterSpacing: 1.2,
  },
  summary: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
  },
  names: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    lineHeight: 18,
  },
});
