import { PillGroup, type PillOption } from '@/components/pill-group';
import { LIGHT_LABELS, LIGHT_LEVELS, type LightLevel } from '@/lib/light';

/** `all` is the unfiltered state; the rest are the light levels. */
export type LightFilter = 'all' | LightLevel;

const OPTIONS: PillOption<LightFilter>[] = [
  { value: 'all', label: 'Any light' },
  ...LIGHT_LEVELS.map((level) => ({ value: level, label: LIGHT_LABELS[level] })),
];

type LightFilterControlProps = {
  value: LightFilter;
  onChange: (value: LightFilter) => void;
};

export function LightFilterControl({ value, onChange }: LightFilterControlProps) {
  return <PillGroup options={OPTIONS} value={value} onChange={onChange} />;
}
