import React from 'react';

/**
 * Illustrated icon badges for the IELTS Study pages.
 * All share the same teal palette (Study = teal, per brand identity) so the
 * seven Study pages read as one visual family instead of each having its
 * own unrelated Lucide icon color, as they did before.
 */

type BadgeProps = { size?: number; className?: string };

const BADGE_BG = '#E1F5EE';
const BADGE_STROKE = '#1D9E75';
const GLYPH = '#085041';
const GLYPH_SOFT = '#0F6E56';

function Badge({ size = 48, className, children }: BadgeProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} role="img" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill={BADGE_BG} stroke={BADGE_STROKE} strokeWidth="1.5" />
      {children}
    </svg>
  );
}

/** Study Log — a simple clock, for time tracking */
export function StudyLogBadge(props: BadgeProps) {
  return (
    <Badge {...props}>
      <circle cx="24" cy="24" r="11" fill="none" stroke={GLYPH} strokeWidth="2.5" />
      <line x1="24" y1="24" x2="24" y2="16" stroke={GLYPH} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="24" x2="29" y2="27" stroke={GLYPH} strokeWidth="2.5" strokeLinecap="round" />
    </Badge>
  );
}

/** Practice Tracker — a target, for practice accuracy */
export function PracticeBadge(props: BadgeProps) {
  return (
    <Badge {...props}>
      <circle cx="24" cy="24" r="12" fill="none" stroke={GLYPH} strokeWidth="2" />
      <circle cx="24" cy="24" r="7" fill="none" stroke={GLYPH} strokeWidth="2" />
      <circle cx="24" cy="24" r="2.5" fill={GLYPH} />
    </Badge>
  );
}

/** Question Practice — stacked cards, for question sets */
export function QuestionCardsBadge(props: BadgeProps) {
  return (
    <Badge {...props}>
      <rect x="16" y="18" width="18" height="13" rx="2" fill={BADGE_STROKE} transform="rotate(-6 25 24)" />
      <rect x="15" y="16" width="18" height="13" rx="2" fill={GLYPH_SOFT} />
      <line x1="19" y1="20" x2="29" y2="20" stroke={BADGE_BG} strokeWidth="1.5" />
      <line x1="19" y1="24" x2="26" y2="24" stroke={BADGE_BG} strokeWidth="1.5" />
    </Badge>
  );
}

/** Vocabulary Bank — an open book */
export function VocabularyBadge(props: BadgeProps) {
  return (
    <Badge {...props}>
      <path d="M15,17 h18 v14 q-9,4 -18,0 z" fill={GLYPH_SOFT} />
      <line x1="24" y1="17" x2="24" y2="30" stroke={BADGE_BG} strokeWidth="1" />
    </Badge>
  );
}

/** Score Tracker — a trophy */
export function TrophyBadge(props: BadgeProps) {
  return (
    <Badge {...props}>
      <path d="M17,15 h14 v8 a7,7 0 0 1 -14,0 z" fill={GLYPH} />
      <rect x="22.5" y="26" width="3" height="5" fill={GLYPH} />
      <rect x="18" y="31" width="12" height="3" rx="1" fill={GLYPH} />
    </Badge>
  );
}

/** Exam Timer — an hourglass */
export function HourglassBadge(props: BadgeProps) {
  return (
    <Badge {...props}>
      <path d="M17,15 h14 l-6,9 6,9 h-14 l6,-9 z" fill="none" stroke={GLYPH} strokeWidth="2" strokeLinejoin="round" />
      <path d="M19.5,17 h9 l-4.5,6.5 z" fill={BADGE_STROKE} />
    </Badge>
  );
}

/** IELTS Journey Planner — a winding path with a milestone */
export function JourneyBadge(props: BadgeProps) {
  return (
    <Badge {...props}>
      <path d="M16,32 Q22,32 22,26 Q22,20 28,20 Q32,20 32,16" fill="none" stroke={GLYPH} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 5" />
      <circle cx="16" cy="32" r="2.5" fill={BADGE_STROKE} />
      <circle cx="32" cy="16" r="3" fill={GLYPH} />
    </Badge>
  );
}
