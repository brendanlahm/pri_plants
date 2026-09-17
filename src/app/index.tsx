import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function WelcomeScreen() {
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

      <SafeAreaView style={styles.content}>
        <ThemedText style={styles.greeting}>{'Welcome\nJungle woman'}</ThemedText>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
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
