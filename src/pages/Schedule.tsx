import Topbar from '../components/Topbar';
import BackButton from '../components/BackButton';
import MetricGrid from '../components/MetricGrid';
import InsightBanner from '../components/InsightBanner';
import Card from '../components/Card';
import AlertList from '../components/AlertList';
import Gantt from '../components/Gantt';
import Lookahead from '../components/Lookahead';
import Tabs from '../components/Tabs';
import {
  scheduleMetrics,
  scheduleAlerts,
  ganttWeeks,
  ganttPhases,
  lookaheadWeeks,
  taktTrends,
  project,
} from '../data/mockData';

function Summary() {
  return (
    <>
      <InsightBanner
        label="Cerebro schedule analysis"
        time="Senior controller mode"
        body={
          <>
            Electrical rough-in Zone C is the critical path driver — 6 days behind with 8 days of float before MEP
            inspection Jun 10. <strong>Predecessor error detected:</strong> Drywall start linked to framing but not
            MEP approval — rework risk. <strong>Duration error:</strong> Concrete Level 4 assigned 3 days, should be
            7–9 including cure.
          </>
        }
        tags={[{ label: 'Recovery plan' }, { label: 'Fix predecessors' }, { label: 'TAKT recommendation' }]}
      />
      <Card title="Alerts & flags">
        <AlertList items={scheduleAlerts} />
      </Card>
    </>
  );
}

function Takt() {
  return (
    <>
      <Card style={{ background: 'var(--green-light)', borderColor: 'rgba(5,150,105,.2)', marginBottom: 16 }}>
        <div className="insight-top" style={{ marginBottom: 10 }}>
          <div className="insight-icon" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>📈</div>
          <div>
            <div className="insight-label" style={{ color: 'var(--green)' }}>Cerebro recommends — TAKT planning</div>
          </div>
        </div>
        <div className="insight-body">
          Your interior fit-out schedule (Wk 18–34) has high trade variability and stacking risk. TAKT planning
          sequences trades to flow continuously through zones like an assembly line — eliminating waiting and
          reducing rework. Estimated 25–35% reduction in trade conflicts.
        </div>
        <div className="insight-tags" style={{ marginTop: 12 }}>
          <button className="itag">Design TAKT schedule with Cerebro →</button>
        </div>
      </Card>
      <Card title="Other scheduling trends">
        {taktTrends.map((t) => (
          <div className="alert-item alert-tip" key={t.main}>
            <div className="alert-dot dot-p" />
            <div style={{ flex: 1 }}>
              <div className="alert-main">{t.main}</div>
              <div className="alert-sub">{t.sub}</div>
            </div>
            <button className="alert-act aa-p">{t.actionLabel}</button>
          </div>
        ))}
      </Card>
    </>
  );
}

export default function Schedule() {
  return (
    <div>
      <Topbar
        title="Schedule Agent"
        subtitle={`${project.name} · Week 14 · Acting as senior schedule controller`}
        actions={
          <>
            <BackButton />
            <button className="btn-primary">Ask Cerebro ↗</button>
          </>
        }
      />
      <MetricGrid metrics={scheduleMetrics} columns={4} />
      <Tabs
        tabs={[
          { key: 'summary', label: 'Summary', content: <Summary /> },
          { key: 'gantt', label: 'Gantt chart', content: <Gantt weeks={ganttWeeks} phases={ganttPhases} /> },
          { key: 'lookahead', label: '2-Week lookahead', content: <Lookahead weeks={lookaheadWeeks} /> },
          { key: 'takt', label: 'TAKT & trends', content: <Takt /> },
        ]}
      />
    </div>
  );
}
