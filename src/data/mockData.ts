export type AlertVariant = 'err' | 'warn' | 'tip' | 'ok';
export type DotColor = 'r' | 'a' | 'p' | 'g';

export interface AlertAction {
  label: string;
  colorClass: 'aa-r' | 'aa-a' | 'aa-p';
  navigateTo?: string;
}

export interface AlertItemData {
  variant: AlertVariant;
  dot?: DotColor;
  main: string;
  sub?: string;
  action?: AlertAction;
  navigateTo?: string;
  icon?: string;
}

export interface Metric {
  label: string;
  value: string;
  valueColor: string;
  trend: string;
  trendColor: string;
  icon?: string;
  iconBg?: string;
  barPct?: number;
  barColor?: string;
  navigateTo?: string;
}

export interface AgentCardData {
  icon: string;
  iconBg: string;
  name: string;
  status: string;
  summary: string;
  progressPct: number;
  progressColor: string;
  footer: string;
  navigateTo: string;
}

export interface RiskRow {
  label: string;
  score: number;
  color: string;
}

export interface FeedRowData {
  icon: string;
  iconBg: string;
  main: string;
  sub: string;
  time: string;
  timeColor?: string;
}

export interface GanttBar {
  label: string;
  dotColor: string;
  barLeft: number;
  barWidth: number;
  barColor: string;
  barText: string;
  baseLeft?: number;
  baseWidth?: number;
  baseColor?: string;
  todayLeft?: number;
}

export interface GanttPhase {
  phase: string;
  rows: GanttBar[];
}

export interface LookaheadRow {
  status: 'crit' | 'norm' | 'done';
  dotColor: string;
  name: string;
  meta: string;
  statusLabel: string;
  statusClass: 'ls-behind' | 'ls-on' | 'ls-up' | 'ls-done';
}

export interface LookaheadWeek {
  title: string;
  rows: LookaheadRow[];
}

export interface TrendItem {
  main: string;
  sub: string;
  actionLabel: string;
  navigateTo?: string;
}

export interface DocItem {
  icon: string;
  iconBg: string;
  main: string;
  sub: string;
}

export interface BriefingItem {
  bg: string;
  dotColor: string;
  text: string;
}

export interface BriefingSection {
  label: string;
  labelColor: string;
  items: BriefingItem[];
}

export const project = {
  name: 'Riverside Mixed-Use',
  weekLabel: 'Week 14 of 52 · GC · Juan M.',
  weekPct: 27,
  user: { initials: 'JM', name: 'Juan Medina', role: 'General Contractor' },
  dateLabel: 'Wednesday, June 3, 2026',
};

export const navSections = [
  {
    label: 'Core',
    items: [
      { key: 'brain', label: 'Project Brain', icon: 'ti ti-brain', path: '/' },
      { key: 'dashboard', label: 'Dashboard', icon: 'ti ti-layout-dashboard', path: '/dashboard' },
    ],
  },
  {
    label: 'Agents',
    items: [
      { key: 'schedule', label: 'Schedule', icon: 'ti ti-calendar-event', path: '/schedule', badge: { text: 'At risk', className: 'nb-amber' } },
      { key: 'safety', label: 'Safety', icon: 'ti ti-shield', path: '/safety', badge: { text: '94', className: 'nb-blue' } },
      { key: 'rfis', label: 'RFIs', icon: 'ti ti-message-question', path: '/rfis', badge: { text: '12', className: 'nb-red' } },
      { key: 'plans', label: 'Plan Review', icon: 'ti ti-blueprint', path: '/plans' },
      { key: 'materials', label: 'Materials', icon: 'ti ti-package', path: '/materials' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { key: 'docs', label: 'Doc Index', icon: 'ti ti-library', path: '/docs' },
      { key: 'decisions', label: 'Decision Log', icon: 'ti ti-gavel', path: '/decisions' },
      { key: 'briefing', label: 'Briefing', icon: 'ti ti-report', path: '/briefing' },
    ],
  },
];

export const brainMetrics: Metric[] = [
  { label: 'Schedule health', value: '74', valueColor: 'var(--amber)', trend: '▼ At risk', trendColor: 'var(--amber)', icon: '📅', iconBg: 'var(--amber-light)', barPct: 74, barColor: 'var(--amber)', navigateTo: '/schedule' },
  { label: 'Progress', value: '38%', valueColor: 'var(--blue)', trend: '▼ Planned 42%', trendColor: 'var(--red)', icon: '📊', iconBg: 'var(--blue-light)', barPct: 38, barColor: 'var(--blue)', navigateTo: '/schedule' },
  { label: 'Critical path', value: '6d', valueColor: 'var(--red)', trend: 'Behind baseline', trendColor: 'var(--red)', icon: '⚠️', iconBg: 'var(--red-light)', barPct: 88, barColor: 'var(--red)', navigateTo: '/schedule' },
  { label: 'Safety score', value: '94', valueColor: 'var(--green)', trend: '▲ Good', trendColor: 'var(--green)', icon: '🛡️', iconBg: 'var(--green-light)', barPct: 94, barColor: 'var(--green)', navigateTo: '/safety' },
  { label: 'Open RFIs', value: '12', valueColor: 'var(--amber)', trend: '4 urgent', trendColor: 'var(--red)', icon: '📋', iconBg: 'var(--amber-light)', barPct: 60, barColor: 'var(--amber)', navigateTo: '/rfis' },
];

export const brainAlerts: AlertItemData[] = [
  { variant: 'err', dot: 'r', main: 'Electrical rough-in Zone C — 6 days behind critical path', sub: 'Float exhaustion in 8 days · MEP inspection Jun 10 at risk', action: { label: 'Act now', colorClass: 'aa-r' }, navigateTo: '/schedule' },
  { variant: 'warn', dot: 'a', main: 'MEP fixtures — 8-week lead time, order not placed', sub: 'Will delay drywall phase if not ordered this week', action: { label: 'Order now', colorClass: 'aa-a' }, navigateTo: '/materials' },
  { variant: 'warn', dot: 'a', main: 'Owner acceleration request — no formal response', sub: 'Jun 1 OAC meeting · 2 days unaddressed', action: { label: 'Draft reply', colorClass: 'aa-a' } },
  { variant: 'tip', dot: 'p', main: 'TAKT scheduling opportunity — fit-out phases Wk 18–34', sub: 'Trade stacking risk · Could reduce conflicts ~30%', action: { label: 'Learn more', colorClass: 'aa-p' }, navigateTo: '/schedule' },
];

export const activeAgents: AgentCardData[] = [
  { icon: '📅', iconBg: 'var(--blue-light)', name: 'Schedule', status: 'Updated 2hr ago', summary: 'Critical path delay Zone C. MEP inspection at risk Jun 10.', progressPct: 87, progressColor: 'linear-gradient(90deg,var(--blue),var(--purple))', footer: '87% tasks logged · Health 74/100', navigateTo: '/schedule' },
  { icon: '🛡️', iconBg: 'var(--green-light)', name: 'Safety', status: 'Updated 1hr ago', summary: 'Score 94/100. Open observation Level 3 stairwell.', progressPct: 94, progressColor: 'var(--green)', footer: 'PPE 100% · Toolbox talk complete', navigateTo: '/safety' },
  { icon: '📋', iconBg: 'var(--purple-light)', name: 'RFIs', status: '12 open · 4 urgent', summary: 'RFI-047 Grid C4 open 18 days. Window submittal blocking dry-in.', progressPct: 58, progressColor: 'var(--purple)', footer: 'Avg response 6 days', navigateTo: '/rfis' },
  { icon: '📦', iconBg: 'var(--amber-light)', name: 'Materials', status: 'Updated 30min ago', summary: 'MEP fixtures not ordered. Steel awaiting submittal approval.', progressPct: 75, progressColor: 'var(--amber)', footer: '47 line items · 2 critical', navigateTo: '/materials' },
];

export const riskRows: RiskRow[] = [
  { label: 'Schedule', score: 74, color: 'var(--amber)' },
  { label: 'Submittals', score: 58, color: 'var(--red)' },
  { label: 'Safety', score: 94, color: 'var(--green)' },
  { label: 'Procurement', score: 62, color: 'var(--red)' },
  { label: 'Cost', score: 81, color: 'var(--blue)' },
];

export const weekFeed: FeedRowData[] = [
  { icon: '🔴', iconBg: 'var(--red-light)', main: 'MEP inspection', sub: 'Jun 10 · At risk', time: 'Jun 10', timeColor: 'var(--red)' },
  { icon: '🔵', iconBg: 'var(--blue-light)', main: 'Steel delivery', sub: 'Confirmed', time: 'Jun 9' },
  { icon: '🌧️', iconBg: 'var(--amber-light)', main: 'Rain forecast', sub: 'Roofing impact', time: 'Jun 11–12', timeColor: 'var(--amber)' },
];

export const scheduleMetrics: Metric[] = [
  { label: 'Health score', value: '74', valueColor: 'var(--amber)', trend: 'At risk', trendColor: 'var(--amber)' },
  { label: 'Progress vs plan', value: '38%', valueColor: 'var(--blue)', trend: 'Planned 42%', trendColor: 'var(--red)' },
  { label: 'Critical path', value: '6d', valueColor: 'var(--red)', trend: 'Behind baseline', trendColor: 'var(--red)' },
  { label: 'Next milestone', value: 'Jun 10', valueColor: 'var(--red)', trend: 'MEP inspection', trendColor: 'var(--red)' },
];

export const scheduleAlerts: AlertItemData[] = [
  { variant: 'err', dot: 'r', main: 'Critical path delay — Electrical Zone C', sub: '6 days behind · Float 8 days · MEP Jun 10 at risk', action: { label: 'Recovery plan', colorClass: 'aa-r' } },
  { variant: 'err', dot: 'r', main: 'Predecessor error — Drywall start (Activity 24)', sub: 'Missing link to MEP approval — rework risk', action: { label: 'Fix logic', colorClass: 'aa-r' } },
  { variant: 'warn', dot: 'a', main: 'Duration error — Concrete Level 4 (3 days assigned)', sub: 'Pour + cure requires 7–9 days', action: { label: 'Review', colorClass: 'aa-a' } },
  { variant: 'tip', dot: 'p', main: 'TAKT opportunity — fit-out Wk 18–34', sub: 'Trade stacking risk · Est. 30% conflict reduction', action: { label: 'Learn more', colorClass: 'aa-p' } },
];

export const ganttWeeks = ['Wk13', 'Wk14', 'Wk15', 'Wk16', 'Wk17', 'Wk18', 'Wk19', 'Wk20'];

export const ganttPhases: GanttPhase[] = [
  {
    phase: 'Structure',
    rows: [
      { label: 'Framing — Zone A', dotColor: 'var(--green)', barLeft: 0, barWidth: 18, barColor: 'var(--green)', barText: 'Done', baseLeft: 2, baseWidth: 15, baseColor: 'var(--blue)' },
      { label: 'Framing — Zone B', dotColor: 'var(--green)', barLeft: 14, barWidth: 19, barColor: 'var(--green)', barText: 'Done', baseLeft: 14, baseWidth: 19, baseColor: 'var(--blue)' },
      { label: 'Concrete Level 4 ⚠', dotColor: 'var(--amber)', barLeft: 20, barWidth: 10, barColor: 'var(--amber)', barText: 'In prog', baseLeft: 20, baseWidth: 18, baseColor: 'var(--blue)' },
    ],
  },
  {
    phase: 'MEP Rough-in',
    rows: [
      { label: 'Electrical — Zone C ⚠', dotColor: 'var(--red)', barLeft: 16, barWidth: 34, barColor: 'var(--red)', barText: '6d behind', baseLeft: 16, baseWidth: 24, baseColor: 'var(--blue)', todayLeft: 26 },
      { label: 'Plumbing rough-in', dotColor: 'var(--blue)', barLeft: 22, barWidth: 18, barColor: 'var(--blue)', barText: 'On track' },
      { label: 'HVAC rough-in', dotColor: 'var(--blue)', barLeft: 26, barWidth: 20, barColor: 'var(--blue)', barText: 'On track' },
    ],
  },
  {
    phase: 'Inspections',
    rows: [
      { label: 'MEP inspection ⚠', dotColor: 'var(--red)', barLeft: 48, barWidth: 8, barColor: 'var(--red)', barText: 'At risk', baseLeft: 43, baseWidth: 8, baseColor: 'var(--blue)' },
      { label: 'Drywall — all zones', dotColor: '#9CA3AF', barLeft: 55, barWidth: 22, barColor: '#9CA3AF', barText: 'Pending' },
    ],
  },
];

export const lookaheadWeeks: LookaheadWeek[] = [
  {
    title: 'Week 1 · Jun 1–7',
    rows: [
      { status: 'crit', dotColor: 'var(--red)', name: 'Electrical rough-in — Zone C', meta: '4 electricians · Levels 2–3 · Critical path', statusLabel: '6d behind', statusClass: 'ls-behind' },
      { status: 'norm', dotColor: 'var(--blue)', name: 'Plumbing rough-in — Zones A & B', meta: '3 plumbers · All floors · Due Jun 6', statusLabel: 'On track', statusClass: 'ls-on' },
      { status: 'norm', dotColor: 'var(--blue)', name: 'Concrete Level 4 — pour & cure', meta: 'Pour Jun 3 · Cure 7 days · Crew 6', statusLabel: 'On track', statusClass: 'ls-on' },
    ],
  },
  {
    title: 'Week 2 · Jun 8–14',
    rows: [
      { status: 'crit', dotColor: 'var(--red)', name: 'MEP inspection — all zones', meta: 'Jun 10 · At risk if electrical incomplete', statusLabel: 'At risk', statusClass: 'ls-behind' },
      { status: 'norm', dotColor: 'var(--blue)', name: 'Structural steel Level 5 — begin', meta: 'Delivery confirmed Jun 9 · 5 ironworkers', statusLabel: 'Upcoming', statusClass: 'ls-up' },
      { status: 'done', dotColor: 'var(--green)', name: 'Framing Zone B — closeout', meta: 'Final walk Jun 11', statusLabel: 'Closing out', statusClass: 'ls-done' },
    ],
  },
];

export const taktTrends: TrendItem[] = [
  { main: 'Last Planner System (LPS)', sub: 'Weekly pull planning with foremen to surface constraints early', actionLabel: 'Learn more' },
  { main: 'Location-Based Scheduling (LBS)', sub: 'Organize work by physical zone/level — ideal for repetitive floor work', actionLabel: 'Learn more' },
  { main: 'Monte Carlo risk analysis', sub: 'Probabilistic simulation — real likelihood of hitting completion date', actionLabel: 'Run analysis' },
];

export const safetyMetrics: Metric[] = [
  { label: 'Safety score', value: '94', valueColor: 'var(--green)', trend: '▲ Good', trendColor: 'var(--green)' },
  { label: 'PPE compliance', value: '100%', valueColor: 'var(--green)', trend: 'This week', trendColor: 'var(--green)' },
  { label: 'Open observations', value: '1', valueColor: 'var(--amber)', trend: 'Level 3 stairwell', trendColor: 'var(--amber)' },
  { label: 'Days since incident', value: '34', valueColor: 'var(--green)', trend: 'No incidents', trendColor: 'var(--green)' },
];

export const safetyItems: AlertItemData[] = [
  { variant: 'warn', dot: 'a', main: 'Housekeeping observation — Level 3 stairwell', sub: "Noted during yesterday's walk · Assigned to foreman", action: { label: 'Close out', colorClass: 'aa-a' } },
  { variant: 'ok', dot: 'g', main: 'Toolbox talk completed — all 3 crews', sub: 'Jun 3 · Attendance confirmed' },
  { variant: 'ok', dot: 'g', main: 'Weekly safety walk — complete', sub: 'Superintendent sign-off Jun 2' },
];

export const rfiItems: AlertItemData[] = [
  { variant: 'err', dot: 'r', main: 'RFI-047 — Structural beam conflict Grid C4', sub: 'Open 18 days · No response · Urgent', action: { label: 'Follow up', colorClass: 'aa-r' } },
  { variant: 'err', dot: 'r', main: 'RFI-051 — Window submittal blocking dry-in', sub: 'Open 12 days · Impacts milestone', action: { label: 'Escalate', colorClass: 'aa-r' } },
  { variant: 'warn', dot: 'a', main: 'RFI-049 — MEP coordination Zone B', sub: 'Open 7 days · Architect reviewing', action: { label: 'Check status', colorClass: 'aa-a' } },
  { variant: 'warn', dot: 'a', main: 'RFI-050 — Concrete mix design Level 4', sub: 'Open 5 days · Engineer response pending', action: { label: 'Follow up', colorClass: 'aa-a' } },
];

export const planConflicts: AlertItemData[] = [
  { variant: 'err', dot: 'r', main: 'Beam depth vs. ceiling height conflict — Grid C4', sub: 'Structural vs. architectural — RFI-047 generated', action: { label: 'View RFI', colorClass: 'aa-r' } },
  { variant: 'warn', dot: 'a', main: 'ASI-07 reviewed — 3 RFIs generated', sub: 'Pending responses from design team', action: { label: 'Review', colorClass: 'aa-a' } },
  { variant: 'ok', dot: 'g', main: 'Sheets A-101 to A-210 — cleared', sub: 'No conflicts detected' },
];

export const materialItems: AlertItemData[] = [
  { variant: 'err', dot: 'r', main: 'MEP fixtures — order not placed', sub: '8-week lead time · Drywall phase at risk', action: { label: 'Order now', colorClass: 'aa-r' } },
  { variant: 'warn', dot: 'a', main: 'Structural steel — awaiting submittal approval', sub: 'Order cannot release until approval', action: { label: 'Check status', colorClass: 'aa-a' } },
  { variant: 'ok', dot: 'g', main: 'Concrete — on schedule', sub: 'Batch #4 delivered Jun 3' },
  { variant: 'ok', dot: 'g', main: 'Drywall — delivery confirmed Week 20', sub: 'Supplier confirmed' },
];

export const docItems: DocItem[] = [
  { icon: '📐', iconBg: 'var(--blue-light)', main: 'Architectural drawings — Rev 3', sub: '142 sheets · Grid C4 revised · May 12' },
  { icon: '📄', iconBg: 'var(--green-light)', main: 'Prime contract — Owner Agreement', sub: '$4.2M GMP · Sep 15 completion · Jan 15' },
  { icon: '📅', iconBg: 'var(--amber-light)', main: 'Baseline schedule — P6 export', sub: '187 activities · SPI 0.87 · Feb 1' },
  { icon: '🛡️', iconBg: 'var(--red-light)', main: 'Site safety plan — Rev 1', sub: 'OSHA 1926 compliant · Jan 20' },
];

export const decisionItems: AlertItemData[] = [
  { variant: 'warn', dot: 'a', main: 'Crane relocation — reason not logged', sub: 'Last week · Decision log incomplete · Action needed', action: { label: 'Log reason', colorClass: 'aa-a' } },
  { variant: 'warn', dot: 'a', main: "Owner acceleration request — no response logged", sub: 'Jun 1 OAC · Verbal discussion only', action: { label: 'Log response', colorClass: 'aa-a' } },
  { variant: 'ok', dot: 'g', main: 'Framing subcontractor — Precision Framing selected', sub: 'Mar 15 · Approved by owner · $380,000' },
];

export const briefingSections: BriefingSection[] = [
  {
    label: '🔴 Urgent — act today',
    labelColor: 'var(--red)',
    items: [
      { bg: 'var(--red-light)', dotColor: 'var(--red)', text: '<strong>Electrical Zone C crew decision:</strong> 6 days behind, 8 days of float left before MEP inspection Jun 10. Redeploy 2 crew from Zone A (complete, float available) to Zone C this morning.' },
      { bg: 'var(--amber-light)', dotColor: 'var(--amber)', text: '<strong>Owner acceleration response:</strong> Jun 1 OAC request is 2 days unaddressed. Do not accelerate without written scope and compensation agreement. Draft formal response today.' },
      { bg: 'var(--amber-light)', dotColor: 'var(--amber)', text: '<strong>MEP fixture order:</strong> 8-week lead time — not yet placed. If not ordered today, fixtures arrive after drywall phase starts. This becomes a guaranteed delay.' },
    ],
  },
  {
    label: '🟡 Watching',
    labelColor: 'var(--amber)',
    items: [
      { bg: 'var(--surface2)', dotColor: 'var(--amber)', text: '<strong>RFI-047 (Grid C4):</strong> Open 18 days with no response. Structural/architectural conflict. Escalate to architect today if no response by noon.' },
      { bg: 'var(--surface2)', dotColor: 'var(--amber)', text: '<strong>Rain forecast Jun 11–12:</strong> Will impact roofing activities. Confirm crew schedule and material protection plan before end of day.' },
    ],
  },
  {
    label: '🟢 Win',
    labelColor: 'var(--green)',
    items: [
      { bg: 'var(--green-light)', dotColor: 'var(--green)', text: '<strong>Safety score up 2 points this week — 94/100.</strong> All crews completed toolbox talk. PPE compliance 100%. Keep the momentum.' },
    ],
  },
];

export const dashboardMetrics: Metric[] = [
  { label: 'Schedule', value: '74', valueColor: 'var(--amber)', trend: 'At risk', trendColor: 'var(--amber)' },
  { label: 'Progress', value: '38%', valueColor: 'var(--blue)', trend: '-4% planned', trendColor: 'var(--red)' },
  { label: 'Safety', value: '94', valueColor: 'var(--green)', trend: 'Good', trendColor: 'var(--green)' },
  { label: 'RFIs open', value: '12', valueColor: 'var(--amber)', trend: '4 urgent', trendColor: 'var(--red)' },
  { label: 'Submittals', value: '31/40', valueColor: 'var(--blue)', trend: '6 pending', trendColor: 'var(--text2)' },
];

export const dashboardAgents: AgentCardData[] = [
  { icon: '📅', iconBg: 'var(--blue-light)', name: 'Schedule', status: 'At risk', summary: 'Zone C 6 days behind. MEP inspection Jun 10 at risk.', progressPct: 0, progressColor: '', footer: '', navigateTo: '/schedule' },
  { icon: '🛡️', iconBg: 'var(--green-light)', name: 'Safety', status: 'Good · 94/100', summary: 'One observation open. PPE 100%.', progressPct: 0, progressColor: '', footer: '', navigateTo: '/safety' },
  { icon: '📋', iconBg: 'var(--purple-light)', name: 'RFIs', status: '12 open · 4 urgent', summary: 'RFI-047 open 18 days. Window submittal blocking dry-in.', progressPct: 0, progressColor: '', footer: '', navigateTo: '/rfis' },
  { icon: '📦', iconBg: 'var(--amber-light)', name: 'Materials', status: '2 critical items', summary: 'MEP fixtures not ordered. Steel awaiting approval.', progressPct: 0, progressColor: '', footer: '', navigateTo: '/materials' },
];
