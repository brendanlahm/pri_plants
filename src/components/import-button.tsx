import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ImportButtonProps = {
  label: string;
  busy?: boolean;
  onPress: () => void;
};

export function ImportButton({ label, busy = false, onPress }: ImportButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.accent },
        (pressed || busy) && styles.pressed,
      ]}>
      {busy ? (
        <ActivityIndicator color={theme.accentText} />
      ) : (
        <ThemedText themeColor="accentText" style={styles.label}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontWeight: 600,
  },
});
