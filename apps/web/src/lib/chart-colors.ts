// Mirrors Radix scales at step 9 used by <Theme accentColor="cyan" grayColor="slate">.
// If accentColor or grayColor changes, update these constants together.
export const CHART_COLORS = {
  accent: '#00A2C7',
  success: '#30A46C',
  warning: '#FFB224',
  danger: '#E5484D',
  neutral: '#687076',
  ink: '#1F2937',
  grid: '#CBD5E1',
  tick: '#475569',
} as const;

export const CHART_BUCKET = [
  '#00A2C7',
  '#30A46C',
  '#FFB224',
  '#F97316',
  '#E5484D',
  '#7F1D1D',
] as const;
