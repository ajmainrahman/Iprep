/**
 * Pastel status tokens for the Fly section (scholarships/applications),
 * matching the same {bg, text, accent} shape and visual weight as
 * @/lib/moduleStyles used across the IELTS Study pages — so both halves
 * of the app share one consistent design language, just with a Fly-specific
 * (purple-anchored) status palette instead of an IELTS-module palette.
 *
 * 'purple' and 'lavender' are deliberately identical to the existing
 * --apps-accent / --apps-accent-light CSS variables (#233B63 / #F2F0FF),
 * so "Interview" — the most exciting status — uses the actual Fly brand color.
 */
export const FLY_PASTELS = {
  slate:    { bg: '#E3EAF0', text: '#182238', accent: '#64748B' },
  mint:     { bg: '#DDF4F7', text: '#176B73', accent: '#176B73' },
  lavender: { bg: '#F2F0FF', text: '#233B63', accent: '#7C6CFF' },
  amber:    { bg: '#FDF8EB', text: '#B8860B', accent: '#B8860B' },
  pink:     { bg: '#F4ECFF', text: '#233B63', accent: '#C56CFF' },
  rose:     { bg: '#FBEEEE', text: '#D95757', accent: '#D95757' },
  blue:     { bg: '#DDF4F7', text: '#233B63', accent: '#233B63' },
  sky:      { bg: '#DDF4F7', text: '#233B63', accent: '#233B63' },
  purple:   { bg: '#F2F0FF', text: '#233B63', accent: '#233B63' }, // = --apps-accent
  green:    { bg: '#DDF4F7', text: '#176B73', accent: '#176B73' },
  red:      { bg: '#FBEEEE', text: '#D95757', accent: '#D95757' },
  gray:     { bg: '#E3EAF0', text: '#182238', accent: '#94A3B8' },
} as const;

export type ScholarshipStatusKey =
  | 'researching' | 'eligible' | 'shortlisted' | 'preparing' | 'applying'
  | 'applied' | 'under_review' | 'interview' | 'awarded' | 'rejected'
  | 'expired' | 'not_eligible' | 'waitlisted';

export const SCH_STATUS_STYLES: Record<ScholarshipStatusKey, { label: string; bg: string; text: string; accent: string }> = {
  researching:  { label: 'Researching',  ...FLY_PASTELS.slate },
  eligible:     { label: 'Eligible',     ...FLY_PASTELS.mint },
  shortlisted:  { label: 'Shortlisted',  ...FLY_PASTELS.lavender },
  preparing:    { label: 'Ready to Apply', ...FLY_PASTELS.amber },
  applying:     { label: 'Applying',     ...FLY_PASTELS.pink },
  applied:      { label: 'Applied',      ...FLY_PASTELS.blue },
  under_review: { label: 'Under Review', ...FLY_PASTELS.sky },
  interview:    { label: 'Interview',    ...FLY_PASTELS.purple },
  awarded:      { label: 'Offer Letter', ...FLY_PASTELS.green },
  rejected:     { label: 'Rejected',     ...FLY_PASTELS.red },
  expired:      { label: 'Expired',      ...FLY_PASTELS.gray },
  not_eligible: { label: 'Not Applied', ...FLY_PASTELS.slate },
  waitlisted:   { label: 'Waitlist',     ...FLY_PASTELS.amber },
};
