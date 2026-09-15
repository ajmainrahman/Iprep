import { Book, Headphones, PenLine, Mic, Languages, Shuffle, type LucideIcon } from 'lucide-react';

/**
 * Single source of truth for the pastel design language used across the
 * Study pages (Study Log, Practice Tracker, etc). Each IELTS module gets a
 * consistent light background tint, a saturated accent color for bars/icons,
 * a dark text color for contrast on the tint, and a representative icon.
 */
export const MODULES = ['Reading', 'Listening', 'Writing', 'Speaking', 'Vocabulary', 'Mixed'] as const;

export const MODULE_STYLES: Record<string, { bg: string; bar: string; text: string; icon: LucideIcon }> = {
  Reading:    { bg: '#DEEFE3', bar: '#1D9E75', text: '#2C4A36', icon: Book },
  Listening:  { bg: '#E6E3F6', bar: '#7F77DD', text: '#3C3489', icon: Headphones },
  Writing:    { bg: '#FBEDD2', bar: '#BA7517', text: '#5C441F', icon: PenLine },
  Speaking:   { bg: '#FBE4E4', bar: '#C94F4E', text: '#791F1F', icon: Mic },
  Vocabulary: { bg: '#FBE4EC', bar: '#D4537E', text: '#72243E', icon: Languages },
  Mixed:      { bg: '#EFEEE9', bar: '#888780', text: '#444441', icon: Shuffle },
};

/* Back-compat flat map for recharts <Bar fill>/<Line stroke>, which only accept a single color string */
export const MODULE_COLORS: Record<string, string> = Object.fromEntries(
  MODULES.map(m => [m, MODULE_STYLES[m].bar])
);

/**
 * Rotating pastel palette for sub-items *within* a module that don't have
 * their own dedicated module color — e.g. Reading question types, Listening
 * parts, Speaking parts. Cycle through by index (`PASTELS[i % PASTELS.length]`)
 * so a page with many cards still reads as the same overall palette.
 */
export const PASTELS = [
  { bg: '#DEEFE3', accent: '#1D9E75', text: '#2C4A36' }, // mint
  { bg: '#E6E3F6', accent: '#7F77DD', text: '#3C3489' }, // lavender
  { bg: '#FBEDD2', accent: '#BA7517', text: '#5C441F' }, // amber
  { bg: '#FBE4EC', accent: '#D4537E', text: '#72243E' }, // pink
  { bg: '#FBE4E4', accent: '#C94F4E', text: '#791F1F' }, // rose
  { bg: '#EFEEE9', accent: '#888780', text: '#444441' }, // gray
];
