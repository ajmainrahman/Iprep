// New file — purely presentational. Renders on top of your existing
// page content; it has no data-fetching or state of its own, so it
// cannot change any existing feature or logic.

import type { ReactNode } from "react";

type IllustratedPageHeroProps = {
  eyebrow: string;
  heading: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  illustration: ReactNode;
};

export function IllustratedPageHero({
  eyebrow,
  heading,
  subtitle,
  ctaLabel,
  onCtaClick,
  illustration,
}: IllustratedPageHeroProps) {
  return (
    <div
      className="flex items-center gap-8 rounded-[20px] border p-8 mb-6"
      style={{ background: "#FFFFFF", borderColor: "#E4DECC" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] mb-2" style={{ color: "#1B6B5B" }}>
          {eyebrow}
        </p>
        <h2
          className="text-2xl font-semibold mb-2.5 leading-snug"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {heading}
        </h2>
        {subtitle && (
          <p className="text-[15px] mb-4 max-w-[46ch] leading-relaxed" style={{ color: "#524E45" }}>
            {subtitle}
          </p>
        )}
        {ctaLabel && (
          <button
            onClick={onCtaClick}
            className="inline-flex items-center gap-2 rounded-[10px] px-4.5 py-2.5 text-sm font-medium"
            style={{ background: "#1A1814", color: "#F5F1E6" }}
          >
            {ctaLabel}
          </button>
        )}
      </div>
      <div className="w-[180px] h-[180px] flex-shrink-0">{illustration}</div>
    </div>
  );
}
