import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './StoreProvider';
import OverviewView from './views/OverviewView';
import ImportView from './views/ImportView';
import MaterialsView from './views/MaterialsView';
import MatchingView from './views/MatchingView';
import CoverageView from './views/CoverageView';
import DropsView from './views/DropsView';
import TrackingView from './views/TrackingView';
import DeliveriesView from './views/DeliveriesView';
import ProgressView from './views/ProgressView';
import PredictionView from './views/PredictionView';
import CostView from './views/CostView';
import SettingsView from './views/SettingsView';

interface ViewDef {
  key: string;
  label: string;
  group: string;
  title: string;
  blurb: string;
}

const VIEWS: ViewDef[] = [
  { key: 'overview', label: 'Overview', group: 'Project', title: 'Overview', blurb: 'Everything that needs a decision today, drawn from coverage, correlation, drops, usage and cost.' },
  { key: 'import', label: 'Import', group: 'Project', title: 'Import files', blurb: 'Load the takeoff, purchase orders and change orders from Excel or CSV.' },

  { key: 'materials', label: 'Materials', group: 'Catalog', title: 'Material catalog', blurb: 'Groups, subgroups, aliases, merges and cleanup of material that no longer exists.' },
  { key: 'matching', label: 'Correlation', group: 'Catalog', title: 'Takeoff to purchase-order correlation', blurb: 'Confirm which takeoff wording refers to which purchase-order wording.' },
  { key: 'coverage', label: 'Coverage', group: 'Catalog', title: 'Takeoff versus purchased', blurb: 'Whether what was bought actually covers what the drawings call for.' },

  { key: 'drops', label: 'Drops', group: 'Logistics', title: 'Section delivery drops', blurb: 'Stage material to site by section and level instead of all at once.' },
  { key: 'tracking', label: 'Drop tracking', group: 'Logistics', title: 'Delivery tracking', blurb: 'Percentage delivered per material, in total and per section, and what is still owed.' },
  { key: 'deliveries', label: 'Deliveries', group: 'Logistics', title: 'Delivery tickets', blurb: 'Vendor, BOL, date and quantities for every ticket, searchable and editable.' },

  { key: 'progress', label: 'Progress & inventory', group: 'Field', title: 'Progress and inventory', blurb: 'Update section progress and count what is on the ground, together.' },
  { key: 'prediction', label: 'Prediction', group: 'Field', title: 'Usage prediction', blurb: 'Forecast usage from takeoff, deliveries, counts and progress — and flag over or short.' },

  { key: 'cost', label: 'Cost & vendors', group: 'Commercial', title: 'Cost and vendor balances', blurb: 'Committed, received and paid per vendor and per order.' },
  { key: 'settings', label: 'Settings', group: 'Commercial', title: 'Settings and data', blurb: 'Project settings, sections, vendors, export and restore.' },
];

const GROUPS = ['Project', 'Catalog', 'Logistics', 'Field', 'Commercial'];

function Shell() {
  const { summary, state, alerts, proposals, dropRollups } = useStore();
  const [view, setView] = useState('overview');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
  }, [dark]);

  const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0];

  // Badge counts that tell the user where the work is without opening each tab.
  const badges: Record<string, { text: string; tone: string } | undefined> = {
    overview: summary.criticalFlags > 0 ? { text: String(summary.criticalFlags), tone: 'nb-red' } : undefined,
    matching: proposals.length > 0 ? { text: String(proposals.length), tone: 'nb-amber' } : undefined,
    coverage: summary.shortMaterials > 0 ? { text: String(summary.shortMaterials), tone: 'nb-red' } : undefined,
    tracking: dropRollups.filter((d) => d.isLate).length > 0
      ? { text: String(dropRollups.filter((d) => d.isLate).length), tone: 'nb-amber' }
      : undefined,
    deliveries: state.deliveries.length > 0 ? { text: String(state.deliveries.length), tone: 'nb-blue' } : undefined,
  };

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="brand-row">
            <div className="brand-mark">📐</div>
            <div>
              <div className="brand-name">Material Control</div>
              <div className="brand-sub">Takeoff · Buy · Deliver · Build</div>
            </div>
          </div>
          <div className="proj">
            <div className="proj-name">{state.project.name}</div>
            <div className="proj-meta">
              {state.areas.length} sections · {summary.materialCount} materials · {state.project.today}
            </div>
          </div>
        </div>

        <nav className="nav">
          {GROUPS.map((group) => (
            <div key={group}>
              <div className="nav-label">{group}</div>
              {VIEWS.filter((v) => v.group === group).map((v) => {
                const badge = badges[v.key];
                return (
                  <button
                    key={v.key}
                    className={`nav-item${view === v.key ? ' active' : ''}`}
                    onClick={() => setView(v.key)}
                  >
                    {v.label}
                    {badge && <span className={`nav-badge ${badge.tone}`}>{badge.text}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="side-foot">
          <button className="toggle" onClick={() => setDark(!dark)}>
            <span>{dark ? '🌙 Dark' : '☀️ Light'}</span>
            <span style={{ color: 'var(--text3)' }}>switch</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="head">
          <div>
            <h1>{active.title}</h1>
            <p>{active.blurb}</p>
          </div>
          <div className="head-actions">
            {alerts.filter((a) => a.severity === 'critical').length > 0 && (
              <span className="pill p-red">
                {alerts.filter((a) => a.severity === 'critical').length} critical
              </span>
            )}
            {proposals.length > 0 && <span className="pill p-amber">{proposals.length} to correlate</span>}
          </div>
        </header>

        {view === 'overview' && <OverviewView onNavigate={setView} />}
        {view === 'import' && <ImportView />}
        {view === 'materials' && <MaterialsView />}
        {view === 'matching' && <MatchingView />}
        {view === 'coverage' && <CoverageView />}
        {view === 'drops' && <DropsView />}
        {view === 'tracking' && <TrackingView />}
        {view === 'deliveries' && <DeliveriesView />}
        {view === 'progress' && <ProgressView />}
        {view === 'prediction' && <PredictionView />}
        {view === 'cost' && <CostView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
