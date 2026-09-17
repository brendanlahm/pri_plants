import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A page heading with a leaf beside it, in the app's accent green. */
export function LeafTitle({ children }: { children: string }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <SymbolView
        name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' }}
        size={22}
        tintColor={theme.accent}
      />
      <ThemedText type="subtitle">{children}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
