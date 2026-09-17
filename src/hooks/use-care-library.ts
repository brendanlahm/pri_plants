import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { emptyLibrary, type PlantLibrary } from '@/lib/plant-library';
import { loadLibrary } from '@/lib/plant-storage';

/**
 * The stored library, reloaded every time the screen comes into focus.
 *
 * Tabs stay mounted once visited, so loading only on mount left the other tabs
 * showing whatever was stored when they first appeared — import a new sheet on
 * one tab and the rest kept the old plants until the app restarted.
 *
 * Missing care anchors are left alone: no anchors means the schedule is off, and
 * quietly restoring them here would undo clearing the calendar on the next focus.
 */
export function useCareLibrary() {
  const [library, setLibrary] = useState<PlantLibrary>(emptyLibrary);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadLibrary().then((stored) => {
        if (!active) return;
        setLibrary(stored);
        setIsLoading(false);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  return { library, setLibrary, isLoading };
}
