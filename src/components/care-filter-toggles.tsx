import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CARE_KINDS, CARE_LABELS, type CareKind } from '@/lib/care-schedule';

export type CareVisibility = Record<CareKind, boolean>;

export const ALL_CARE_VISIBLE: CareVisibility = { water: true, fertilize: true };

type CareFilterTogglesProps = {
  visible: CareVisibility;
  onToggle: (kind: CareKind) => void;
};

/**
 * Doubles as the legend. The dot is filled when the kind is shown and hollow when
 * hidden, so the row reads as a key either way.
 */
export function CareFilterToggles({ visible, onToggle }: CareFilterTogglesProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {CARE_KINDS.map((kind) => {
        const isVisible = visible[kind];
        return (
          <Pressable
            key={kind}
            onPress={() => onToggle(kind)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isVisible }}
            accessibilityLabel={`Show ${CARE_LABELS[kind].toLowerCase()} days`}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.item,
              !isVisible && styles.itemHidden,
              pressed && styles.pressed,
            ]}>
            <View
              style={[
                styles.dot,
                isVisible
                  ? { backgroundColor: theme[kind] }
                  : { borderWidth: 1.5, borderColor: theme[kind] },
              ]}
            />
            <ThemedText type="small" themeColor={isVisible ? 'text' : 'textSecondary'}>
              {CARE_LABELS[kind]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  itemHidden: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
