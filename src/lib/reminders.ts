import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Reminder } from '@/lib/reminder-plan';

export const remindersSupported = true;

/** Show the banner even when the app happens to be open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_ID = 'plant-care';

/** Android 8+ drops notifications that have no channel, and the channel must exist first. */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Plant care',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

function toState(status: Notifications.NotificationPermissionsStatus): PermissionState {
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function getReminderPermission(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

export async function requestReminderPermission(): Promise<PermissionState> {
  await ensureChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return 'granted';
  if (!existing.canAskAgain) return 'denied';

  return toState(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    })
  );
}

/**
 * Replaces every scheduled reminder with the given list.
 *
 * Rescheduling wholesale rather than diffing keeps this honest: the schedule is
 * derived from the spreadsheet, and the spreadsheet is the only source of truth.
 * This app schedules nothing else, so cancelling everything is safe.
 */
export async function syncScheduledReminders(reminders: Reminder[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureChannel();

  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.date,
        channelId: CHANNEL_ID,
      },
    });
  }
  return reminders.length;
}
