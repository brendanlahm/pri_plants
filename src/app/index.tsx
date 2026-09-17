import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TodayCard } from '@/components/today-card';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCareLibrary } from '@/hooks/use-care-library';
import { careEventsByDate, toDateKey, type CareEvent } from '@/lib/care-schedule';

export default function WelcomeScreen() {
  const [today] = useState(() => new Date());
  const { library, isLoading } = useCareLibrary();

  const todaysEvents = useMemo<CareEvent[]>(() => {
    if (!library.careAnchors) return [];
    const byDate = careEventsByDate(library.plants, library.careAnchors, today, today);
    return byDate.get(toDateKey(today)) ?? [];
  }, [library, today]);

  // Nothing imported, or no schedule running: the photo speaks for itself.
  const showToday = !isLoading && library.plants.length > 0 && Boolean(library.careAnchors);

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/amazon-rainforest.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel="The canopy of the Amazon rainforest, seen from the forest floor"
      />
      {/* Keeps the greeting legible wherever the canopy happens to be bright. */}
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.greetingBlock}>
            <ThemedText style={styles.greeting}>{'Welcome\nJungle woman'}</ThemedText>
          </View>
          {showToday ? <TodayCard date={today} events={todaysEvents} /> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1A12',
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  greetingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 44,
    lineHeight: 52,
    fontWeight: 700,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
});
