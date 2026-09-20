/**
 * Pastel status tokens for the Fly section (scholarships/applications),
 * matching the same {bg, text, accent} shape and visual weight as
 * @/lib/moduleStyles used across the IELTS Study pages — so both halves
 * of the app share one consistent design language, just with a Fly-specific
 * (purple-anchored) status palette instead of an IELTS-module palette.
 *
 * 'purple' and 'lavender' are deliberately identical to the existing
 * --apps-accent / --apps-accent-light CSS variables (#684888 / #EAD4FB),
 * so "Interview" — the most exciting status — uses the actual Fly brand color.
 */
export const FLY_PASTELS = {
  slate:    { bg: '#ECEDEF', text: '#3D4148', accent: '#6B7280' },
  mint:     { bg: '#DEEFE3', text: '#2C4A36', accent: '#1D9E75' },
  lavender: { bg: '#E6E3F6', text: '#3C3489', accent: '#7F77DD' },
  amber:    { bg: '#FBEDD2', text: '#5C441F', accent: '#BA7517' },
  pink:     { bg: '#FBE4EC', text: '#72243E', accent: '#D4537E' },
  rose:     { bg: '#FBE4E4', text: '#791F1F', accent: '#C94F4E' },
  blue:     { bg: '#E1EBFB', text: '#1E3A6B', accent: '#4A78C9' },
  sky:      { bg: '#DDF1F6', text: '#1C4F5C', accent: '#3BA0B8' },
  purple:   { bg: '#EAD4FB', text: '#402C56', accent: '#684888' }, // = --apps-accent
  green:    { bg: '#DCF3E4', text: '#1D5C36', accent: '#2FA968' },
  red:      { bg: '#FBE0E0', text: '#7A2020', accent: '#D64545' },
  gray:     { bg: '#EFEEE9', text: '#444441', accent: '#888780' },
} as const;

export type ScholarshipStatusKey =
  | 'researching' | 'eligible' | 'shortlisted' | 'preparing' | 'applying'
  | 'applied' | 'under_review' | 'interview' | 'awarded' | 'rejected'
  | 'expired' | 'not_eligible';

export const SCH_STATUS_STYLES: Record<ScholarshipStatusKey, { label: string; bg: string; text: string; accent: string }> = {
  researching:  { label: 'Researching',  ...FLY_PASTELS.slate },
  eligible:     { label: 'Eligible',     ...FLY_PASTELS.mint },
  shortlisted:  { label: 'Shortlisted',  ...FLY_PASTELS.lavender },
  preparing:    { label: 'Preparing',    ...FLY_PASTELS.amber },
  applying:     { label: 'Applying',     ...FLY_PASTELS.pink },
  applied:      { label: 'Applied',      ...FLY_PASTELS.blue },
  under_review: { label: 'Under Review', ...FLY_PASTELS.sky },
  interview:    { label: 'Interview',    ...FLY_PASTELS.purple },
  awarded:      { label: 'Awarded',      ...FLY_PASTELS.green },
  rejected:     { label: 'Rejected',     ...FLY_PASTELS.red },
  expired:      { label: 'Expired',      ...FLY_PASTELS.gray },
  not_eligible: { label: 'Not Eligible', ...FLY_PASTELS.rose },
};
