import { StyleSheet, Switch, View } from 'react-native';

import { PillGroup, type PillOption } from '@/components/pill-group';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { REMINDER_HOURS, type ReminderSettings } from '@/lib/reminder-plan';
import type { PermissionState } from '@/lib/reminders';

function formatHour(hour: number) {
  return `${`${hour}`.padStart(2, '0')}:00`;
}

const HOUR_OPTIONS: PillOption<string>[] = REMINDER_HOURS.map((hour) => ({
  value: `${hour}`,
  label: formatHour(hour),
}));

type ReminderSettingsCardProps = {
  supported: boolean;
  settings: ReminderSettings;
  permission: PermissionState;
  scheduledCount: number;
  nextReminder: Date | null;
  hasPlants: boolean;
  onToggle: (enabled: boolean) => void;
  onChangeHour: (hour: number) => void;
};

export function ReminderSettingsCard({
  supported,
  settings,
  permission,
  scheduledCount,
  nextReminder,
  hasPlants,
  onToggle,
  onChangeHour,
}: ReminderSettingsCardProps) {
  const theme = useTheme();

  if (!supported) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={styles.title}>Reminders</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Notifications only work in the phone app, not in a browser. Open this on your phone to
          turn reminders on.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.title}>Reminders</ThemedText>
        <Switch
          value={settings.enabled}
          onValueChange={onToggle}
          disabled={!hasPlants}
          trackColor={{ true: theme.accent }}
          accessibilityLabel="Daily care reminders"
        />
      </View>

      {!hasPlants ? (
        <ThemedText type="small" themeColor="textSecondary">
          Import a spreadsheet first and reminders can follow its schedule.
        </ThemedText>
      ) : null}

      {hasPlants && settings.enabled ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            One notification on each day something is due, listing what needs water and what needs
            feeding.
          </ThemedText>

          <PillGroup
            options={HOUR_OPTIONS}
            value={`${settings.hour}`}
            onChange={(hour) => onChangeHour(Number(hour))}
            unselectedType="background"
          />

          {permission === 'denied' ? (
            <ThemedText type="small">
              Notifications are switched off for this app. Turn them back on in your device
              settings, then switch this off and on again.
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {scheduledCount > 0
                ? `${scheduledCount} reminders scheduled${nextReminder ? `, next on ${nextReminder.toDateString()}` : ''}.`
                : 'Nothing due in the next few months.'}
            </ThemedText>
          )}
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: 600,
  },
});
