import React from 'react';

/**
 * Illustrated page header — drop-in replacement for the old
 * `<Icon className="w-8 h-8 ..." /><h1>Title</h1>` pattern used across
 * the Study pages. Keeps the same text sizing/classes as before so page
 * layout doesn't shift, just swaps the plain Lucide icon for an
 * illustrated badge and adds an optional subtitle.
 */
export function StudyPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {icon}
      <div>
        <h1 className="text-3xl font-heading font-bold text-navy dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/**
 * Illustrated empty state — drop-in replacement for plain
 * "No X yet." text blocks, used wherever a list/table has nothing to show.
 */
export function StudyEmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      {icon}
      <p className="mt-3 font-medium text-foreground">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}
