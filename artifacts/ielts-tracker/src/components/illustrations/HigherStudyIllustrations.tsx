// New file — does not modify any existing component or logic.
// Reusable illustrated SVGs in the cream / mint-green style, matching
// the pattern already established by StudyIllustrations.tsx.

import type { SVGProps } from "react";

type IllustrationProps = { size?: number } & SVGProps<SVGSVGElement>;

const INK = "#1A1814";
const MINT = "#6FD9A0";
const MINT_DEEP = "#1B6B5B";
const MINT_PALE = "#DCF5E7";
const CORAL = "#F4A972";

export function DashboardHeroIllustration({ size = 200, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" {...props}>
      <ellipse cx="100" cy="178" rx="60" ry="8" fill={MINT_PALE} />
      <rect x="34" y="70" width="60" height="60" rx="14" fill={MINT} transform="rotate(-6 64 100)" />
      <circle cx="150" cy="55" r="26" fill={CORAL} opacity="0.9" />
      <path d="M92 150 C92 120 100 112 118 112 C136 112 144 128 144 150 L144 168 L92 168 Z" fill="#fff" stroke={INK} strokeWidth={3} />
      <circle cx="118" cy="92" r="20" fill="#fff" stroke={INK} strokeWidth={3} />
      <path d="M104 88 q14 -14 28 0" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx="110" cy="90" r="2.4" fill={INK} />
      <circle cx="126" cy="90" r="2.4" fill={INK} />
      <rect x="90" y="130" width="56" height="30" rx="4" fill={MINT_DEEP} stroke={INK} strokeWidth={3} />
      <path d="M98 145 l10 -8 l8 6 l14 -12" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OverviewHeroIllustration({ size = 200, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" {...props}>
      <ellipse cx="100" cy="180" rx="58" ry="8" fill={MINT_PALE} />
      <circle cx="60" cy="60" r="30" fill={MINT} opacity="0.9" />
      <rect x="70" y="90" width="60" height="70" rx="10" fill="#fff" stroke={INK} strokeWidth={3} />
      <path d="M78 105h44M78 118h44M78 131h30" stroke="#E4DECC" strokeWidth={3} strokeLinecap="round" />
      <circle cx="100" cy="70" r="20" fill="#fff" stroke={INK} strokeWidth={3} />
      <path d="M84 62 q16 -12 32 0" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx="93" cy="70" r="2.4" fill={INK} />
      <circle cx="109" cy="70" r="2.4" fill={INK} />
      <path d="M80 58 l20 -12 l20 12" stroke={INK} strokeWidth={3} fill="none" strokeLinejoin="round" />
      <rect x="96" y="46" width="10" height="10" fill={CORAL} stroke={INK} strokeWidth={2} />
    </svg>
  );
}

export function ScholarshipHeroIllustration({ size = 200, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" {...props}>
      <ellipse cx="100" cy="180" rx="58" ry="8" fill={MINT_PALE} />
      <circle cx="140" cy="60" r="24" fill={CORAL} opacity="0.85" />
      <circle cx="100" cy="110" r="34" fill={MINT} stroke={INK} strokeWidth={3} />
      <path d="M100 96v28M90 104h20M90 118h20" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <circle cx="70" cy="150" r="18" fill="#fff" stroke={INK} strokeWidth={3} />
      <path d="M58 144 q12 -10 24 0" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx="65" cy="150" r="2.2" fill={INK} />
      <circle cx="79" cy="150" r="2.2" fill={INK} />
      <path d="M78 138 l30 -18" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

export function JourneyHeroIllustration({ size = 200, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" {...props}>
      <path d="M20 170 Q 70 120 110 140 T 180 90" stroke="#E4DECC" strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray="2 14" />
      <circle cx="20" cy="170" r="7" fill={MINT_DEEP} />
      <circle cx="110" cy="140" r="7" fill={MINT_DEEP} />
      <circle cx="180" cy="90" r="9" fill={CORAL} />
      <circle cx="70" cy="100" r="20" fill="#fff" stroke={INK} strokeWidth={3} />
      <path d="M58 96 q12 -10 24 0" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx="64" cy="100" r="2.2" fill={INK} />
      <circle cx="78" cy="100" r="2.2" fill={INK} />
      <path d="M54 118 q16 26 32 0" stroke={INK} strokeWidth={3} fill={MINT} strokeLinecap="round" />
      <path d="M58 130 l-8 20 M84 130 l8 20" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

export function StudyLogHeroIllustration({ size = 200, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" {...props}>
      <ellipse cx="100" cy="180" rx="58" ry="8" fill={MINT_PALE} />
      <rect x="60" y="100" width="70" height="52" rx="6" fill="#fff" stroke={INK} strokeWidth={3} />
      <path d="M95 100v52" stroke="#E4DECC" strokeWidth={3} />
      <path d="M68 112h20M68 122h20M68 132h14M107 112h16M107 122h16M107 132h10" stroke="#E4DECC" strokeWidth={3} strokeLinecap="round" />
      <circle cx="140" cy="70" r="22" fill={MINT} opacity="0.9" />
      <circle cx="95" cy="75" r="20" fill="#fff" stroke={INK} strokeWidth={3} />
      <path d="M83 70 q12 -10 24 0" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx="89" cy="75" r="2.2" fill={INK} />
      <circle cx="103" cy="75" r="2.2" fill={INK} />
      <path d="M78 90 l-10 14" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <rect x="60" y="96" width="8" height="8" fill={CORAL} transform="rotate(20 64 100)" />
    </svg>
  );
}

// Dark-background variant for the existing hero (white lines, app's teal/coral).
export function DashboardHeroIllustrationDark({ size = 160, ...props }: IllustrationProps) {
  const LINE = "#FFFFFF";
  const TEAL = "#14b8a6";
  const CORAL = "#f97316";
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" {...props}>
      <circle cx="150" cy="55" r="26" fill={CORAL} opacity="0.35" />
      <rect x="34" y="70" width="60" height="60" rx="14" fill={TEAL} opacity="0.3" transform="rotate(-6 64 100)" />
      <path d="M92 150 C92 120 100 112 118 112 C136 112 144 128 144 150 L144 168 L92 168 Z" fill="none" stroke={LINE} strokeWidth={3} opacity="0.9" />
      <circle cx="118" cy="92" r="20" fill="none" stroke={LINE} strokeWidth={3} opacity="0.9" />
      <path d="M104 88 q14 -14 28 0" stroke={LINE} strokeWidth={3} fill="none" strokeLinecap="round" opacity="0.9" />
      <circle cx="110" cy="90" r="2.4" fill={LINE} />
      <circle cx="126" cy="90" r="2.4" fill={LINE} />
      <rect x="90" y="130" width="56" height="30" rx="4" fill="none" stroke={TEAL} strokeWidth={3} />
      <path d="M98 145 l10 -8 l8 6 l14 -12" stroke={TEAL} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
