import { useEffect, useState } from 'react';

import { defaultAnchors } from '@/lib/care-schedule';
import { emptyLibrary, type PlantLibrary } from '@/lib/plant-library';
import { loadLibrary, saveLibrary } from '@/lib/plant-storage';

/**
 * Loads the stored library, filling in care anchors when they are missing so
 * every screen reading the schedule starts from the same assumption. A library
 * imported before the calendar existed has none until something adds them.
 */
export function useCareLibrary() {
  const [library, setLibrary] = useState<PlantLibrary>(emptyLibrary);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadLibrary().then(async (stored) => {
      const withAnchors: PlantLibrary =
        stored.plants.length > 0 && !stored.careAnchors
          ? { ...stored, careAnchors: defaultAnchors() }
          : stored;
      if (withAnchors !== stored) await saveLibrary(withAnchors);
      if (!active) return;
      setLibrary(withAnchors);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { library, isLoading };
}
