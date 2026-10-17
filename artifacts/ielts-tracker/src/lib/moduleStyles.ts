import { Book, Headphones, PenLine, Mic, Languages, Shuffle, type LucideIcon } from 'lucide-react';

/**
 * Single source of truth for the pastel design language used across the
 * Study pages (Study Log, Practice Tracker, etc). Each IELTS module gets a
 * consistent light background tint, a saturated accent color for bars/icons,
 * a dark text color for contrast on the tint, and a representative icon.
 */
export const MODULES = ['Reading', 'Listening', 'Writing', 'Speaking', 'Vocabulary', 'Mixed'] as const;

export const MODULE_STYLES: Record<string, { bg: string; bar: string; text: string; icon: LucideIcon }> = {
  Reading:    { bg: '#DDF4F7', bar: '#176B73', text: '#176B73', icon: Book },
  Listening:  { bg: '#F2F0FF', bar: '#7C6CFF', text: '#233B63', icon: Headphones },
  Writing:    { bg: '#FDF8EB', bar: '#B8860B', text: '#B8860B', icon: PenLine },
  Speaking:   { bg: '#FBEEEE', bar: '#D95757', text: '#D95757', icon: Mic },
  Vocabulary: { bg: '#F4ECFF', bar: '#C56CFF', text: '#233B63', icon: Languages },
  Mixed:      { bg: '#E3EAF0', bar: '#94A3B8', text: '#182238', icon: Shuffle },
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
  { bg: '#DDF4F7', accent: '#176B73', text: '#176B73' }, // mint
  { bg: '#F2F0FF', accent: '#7C6CFF', text: '#233B63' }, // lavender
  { bg: '#FDF8EB', accent: '#B8860B', text: '#B8860B' }, // amber
  { bg: '#F4ECFF', accent: '#C56CFF', text: '#233B63' }, // pink
  { bg: '#FBEEEE', accent: '#D95757', text: '#D95757' }, // rose
  { bg: '#E3EAF0', accent: '#94A3B8', text: '#182238' }, // gray
];
