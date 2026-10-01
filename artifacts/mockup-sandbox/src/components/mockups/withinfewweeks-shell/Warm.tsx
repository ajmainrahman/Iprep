import React, { useState } from 'react';
import './_group.css';
import './Warm.css';
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Flame,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  SpellCheck,
  Target,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

type StudyTab =
  | 'dashboard'
  | 'scores'
  | 'study'
  | 'practice'
  | 'vocab'
  | 'spelling'
  | 'planning'
  | 'journey';

type NavItem<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

const STUDY_TABS: NavItem<StudyTab>[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'scores', label: 'Mock Test', icon: TrendingUp },
  { id: 'study', label: 'Study Log', icon: BookOpen },
  { id: 'practice', label: 'Practice Tracker', icon: Target },
  { id: 'vocab', label: 'Vocab Bank', icon: BookMarked },
  { id: 'spelling', label: 'Spelling Practice', icon: SpellCheck },
  { id: 'journey', label: 'My Journey', icon: Compass },
  { id: 'planning', label: 'Planning', icon: CalendarClock },
];

const SIDEBAR_COLLAPSE_KEY = 'wfw-sidebar-collapsed';

function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  function toggle() {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // Storage can be unavailable in an embedded preview.
      }
      return next;
    });
  }

  return [collapsed, toggle];
}

interface SidebarProps<T extends string> {
  tabs: NavItem<T>[];
  activeTab: T;
  onTab: (tab: T) => void;
  onBack: () => void;
  productName: string;
  productSubtitle: string;
  productIcon: LucideIcon;
  bottomWidget?: React.ReactNode;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function AppSidebar<T extends string>({
  tabs,
  activeTab,
  onTab,
  onBack,
  productName,
  productSubtitle,
  productIcon: ProductIcon,
  bottomWidget,
  collapsed,
  onToggleCollapsed,
}: SidebarProps<T>) {
  return (
    <aside
      className={`hidden md:flex flex-col ${collapsed ? 'w-[72px]' : 'w-64'} bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen shrink-0 transition-[width] duration-200 ease-out`}
    >
      <div className={`flex items-center gap-2 p-4 ${collapsed ? 'justify-center' : ''}`}>
        <button
          onClick={onBack}
          aria-label="Back to home"
          title="Back to home"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'hsl(var(--sidebar-primary) / 0.18)' }}
            >
              <ProductIcon
                className="w-4 h-4"
                style={{ color: 'hsl(var(--sidebar-primary))' }}
              />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-semibold text-[14px] leading-tight truncate">
                {productName}
              </p>
              <p className="text-[10.5px] text-sidebar-foreground/50 truncate">
                {productSubtitle}
              </p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2.5 space-y-0.5 mt-1 overflow-y-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const button = (
            <button
              key={tab.id}
              onClick={() => onTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 rounded-lg text-[13px] transition-colors ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'} ${
                isActive
                  ? 'bg-sidebar-primary text-white font-medium'
                  : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="flex-1 text-left truncate">{tab.label}</span>
              )}
              {!collapsed && (tab.badge ?? 0) > 0 && (
                tab.badge === 1 ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                ) : (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white bg-red-500 shrink-0">
                    {tab.badge}
                  </span>
                )
              )}
            </button>
          );

          if (!collapsed) return button;
          return (
            <Tooltip key={tab.id} delayDuration={200}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right">
                {tab.label}
                {(tab.badge ?? 0) > 0 ? ` · ${tab.badge}` : ''}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {bottomWidget && !collapsed && (
        <div className="px-3 pb-2">
          <div className="h-px bg-sidebar-border mb-3" />
          {bottomWidget}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="flex items-center justify-center gap-2 mx-2.5 mb-3 h-8 rounded-lg text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-[11px] font-medium shrink-0"
      >
        {collapsed ? (
          <PanelLeftOpen className="w-4 h-4" />
        ) : (
          <>
            <PanelLeftClose className="w-4 h-4" /> Collapse
          </>
        )}
      </button>
    </aside>
  );
}

interface MobileNavDrawerProps<T extends string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: NavItem<T>[];
  activeTab: T;
  onTab: (tab: T) => void;
  onBack: () => void;
  productName: string;
  productSubtitle: string;
  productIcon: LucideIcon;
  bottomWidget?: React.ReactNode;
}

function MobileNavDrawer<T extends string>({
  open,
  onOpenChange,
  tabs,
  activeTab,
  onTab,
  onBack,
  productName,
  productSubtitle,
  productIcon: ProductIcon,
  bottomWidget,
}: MobileNavDrawerProps<T>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="warm-mobile-drawer w-72 p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border [&_svg.absolute]:text-sidebar-foreground/60"
      >
        <SheetTitle className="sr-only">{productName} navigation</SheetTitle>
        <div className="flex items-center gap-2.5 p-4 border-b border-sidebar-border">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'hsl(var(--sidebar-primary) / 0.18)' }}
          >
            <ProductIcon
              className="w-4 h-4"
              style={{ color: 'hsl(var(--sidebar-primary))' }}
            />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-semibold text-[14px] leading-tight">
              {productName}
            </p>
            <p className="text-[10.5px] text-sidebar-foreground/50">
              {productSubtitle}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTab(tab.id);
                  onOpenChange(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-white font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
                {(tab.badge ?? 0) > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white bg-red-500">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onBack();
          }}
          className="flex items-center gap-2 mx-2.5 mb-2 px-3 py-2.5 rounded-lg text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>

        {bottomWidget && (
          <div className="px-3 pb-4">
            <div className="h-px bg-sidebar-border mb-3" />
            {bottomWidget}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AppHeader({
  title,
  subtitle,
  onOpenMobileNav,
  actions,
}: {
  title: string;
  subtitle: string;
  onOpenMobileNav: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenMobileNav}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors hover:bg-accent text-muted-foreground"
            aria-label="Open navigation menu"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <div className="min-w-0">
            <h1 className="font-heading font-semibold text-[15px] leading-tight truncate">
              {title}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </header>
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="section-label">Tuesday, May 20</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-heading font-semibold tracking-tight">
            Good morning, Maya
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A little practice today keeps your bigger goal moving.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Log a session
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overall band</p>
              <p className="mt-2 text-3xl font-heading font-semibold">6.5</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3DEFA] text-[#7668A8]">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Target band 7.0</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[78%] rounded-full bg-[#6FD9A0]" />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Study streak</p>
              <p className="mt-2 text-3xl font-heading font-semibold">8 days</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCE7B8] text-[#8A5A0A]">
              <Flame className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Your best streak is 12 days.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">This week</p>
              <p className="mt-2 text-3xl font-heading font-semibold">4.5 hrs</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBDCE6] text-[#9C2B55]">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">You’re building a steady rhythm.</p>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-base font-semibold">This week’s rhythm</h3>
              <p className="mt-1 text-xs text-muted-foreground">Study time by day</p>
            </div>
            <button
              type="button"
              aria-label="Previous week"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 grid grid-cols-7 items-end gap-3 h-32">
            {[
              { day: 'M', height: '44%' },
              { day: 'T', height: '69%' },
              { day: 'W', height: '53%' },
              { day: 'T', height: '82%' },
              { day: 'F', height: '61%' },
              { day: 'S', height: '38%' },
              { day: 'S', height: '18%' },
            ].map((item, index) => (
              <div key={`${item.day}-${index}`} className="flex h-full flex-col items-center justify-end gap-2">
                <div className="flex h-full w-full items-end">
                  <div
                    className={`w-full rounded-t-lg ${index === 3 ? 'bg-[#1B6B5B]' : 'bg-[#6FD9A0]/70'}`}
                    style={{ height: item.height }}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{item.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-base font-semibold">Next up</h3>
              <p className="mt-1 text-xs text-muted-foreground">A gentle plan for today</p>
            </div>
            <button
              type="button"
              aria-label="Show more study tasks"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {[
              { icon: BookOpen, title: 'Reading practice', detail: 'Passage 2 · 25 min', done: true },
              { icon: Target, title: 'Speaking cue card', detail: 'Describe a place you love', done: false },
              { icon: Trophy, title: 'Review new vocabulary', detail: '5 words · 10 min', done: false },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3 rounded-xl bg-background px-3 py-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.done ? 'bg-[#E7F3EB] text-[#1B6B5B]' : 'bg-[#E3DEFA] text-[#7668A8]'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  {item.done && <Check className="h-4 w-4 text-[#1B6B5B]" />}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function StudyPagePreview({ tab }: { tab: StudyTab }) {
  const currentTab = STUDY_TABS.find((item) => item.id === tab) ?? STUDY_TABS[0];
  const Icon = currentTab.icon;

  if (tab === 'dashboard') return <DashboardPreview />;

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">Study journey</p>
        <h2 className="mt-1 text-2xl sm:text-3xl font-heading font-semibold tracking-tight">
          {currentTab.label}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The selected section stays connected to the same study workspace.
        </p>
      </div>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E7F3EB] text-[#1B6B5B]">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-4 font-heading text-lg font-semibold">{currentTab.label}</h3>
        <p className="mt-1 max-w-lg text-sm text-muted-foreground">
          This static preview keeps the current page selection interactive without
          connecting to the app’s router or data services.
        </p>
      </section>
    </div>
  );
}

export function Current() {
  const [activeTab, setActiveTab] = useState<StudyTab>('dashboard');
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pageTitle = STUDY_TABS.find((item) => item.id === activeTab)?.label ?? 'Dashboard';

  const bottomWidget = (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'hsl(var(--sidebar-primary) / 0.12)' }}>
        <p className="text-[9.5px] uppercase tracking-widest text-sidebar-foreground/45 mb-0.5">
          IELTS Target
        </p>
        <p className="text-lg font-heading font-bold" style={{ color: 'hsl(var(--sidebar-primary))' }}>
          7.0
        </p>
      </div>
      <div className="px-1 flex items-center justify-between gap-2 min-w-0">
        <p className="text-[12px] text-sidebar-foreground/60 truncate">Maya Bennett</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" aria-label="Settings" title="Settings" className="text-sidebar-foreground/45 hover:text-sidebar-foreground transition-colors">
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" aria-label="Sign out" title="Sign out" className="text-sidebar-foreground/45 hover:text-sidebar-foreground transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="study-mode warm-study-mode min-h-screen h-screen overflow-hidden bg-background text-foreground font-sans flex">
        <AppSidebar
          tabs={STUDY_TABS}
          activeTab={activeTab}
          onTab={(tab: StudyTab) => setActiveTab(tab)}
          onBack={() => setActiveTab('dashboard')}
          productName="Study"
          productSubtitle="IELTS Journey"
          productIcon={BookOpenCheck}
          bottomWidget={bottomWidget}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
        <MobileNavDrawer
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          tabs={STUDY_TABS}
          activeTab={activeTab}
          onTab={(tab: StudyTab) => setActiveTab(tab)}
          onBack={() => setActiveTab('dashboard')}
          productName="Study"
          productSubtitle="IELTS Journey"
          productIcon={BookOpenCheck}
          bottomWidget={bottomWidget}
        />

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <AppHeader
            title={pageTitle}
            subtitle="IELTS Journey · Within a Few Weeks"
            onOpenMobileNav={() => setMobileNavOpen(true)}
            actions={
              <button
                type="button"
                aria-label="Settings"
                title="Settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            }
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
              <StudyPagePreview tab={activeTab} />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}