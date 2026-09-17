import { PillGroup, type PillOption } from '@/components/pill-group';
import { SORT_LABELS, type SortMode } from '@/lib/plant-library';

const OPTIONS: PillOption<SortMode>[] = (Object.keys(SORT_LABELS) as SortMode[]).map((mode) => ({
  value: mode,
  label: SORT_LABELS[mode],
}));

type SortControlProps = {
  value: SortMode;
  onChange: (mode: SortMode) => void;
};

export function SortControl({ value, onChange }: SortControlProps) {
  return <PillGroup options={OPTIONS} value={value} onChange={onChange} />;
}
