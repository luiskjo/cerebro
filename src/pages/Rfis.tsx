import Topbar from '../components/Topbar';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import AlertList from '../components/AlertList';
import { rfiItems } from '../data/mockData';

export default function Rfis() {
  return (
    <div>
      <Topbar
        title="RFI Tracker"
        subtitle="12 open · 4 urgent · Riverside Mixed-Use"
        actions={
          <>
            <BackButton />
            <button className="btn-primary">Ask Cerebro ↗</button>
          </>
        }
      />
      <Card title="Open RFIs">
        <AlertList items={rfiItems} />
      </Card>
    </div>
  );
}
