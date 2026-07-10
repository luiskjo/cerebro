import Topbar from '../components/Topbar';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import AlertList from '../components/AlertList';
import { materialItems } from '../data/mockData';

export default function Materials() {
  return (
    <div>
      <Topbar
        title="Materials Agent"
        subtitle="47 line items · 2 critical"
        actions={
          <>
            <BackButton />
            <button className="btn-primary">Ask Cerebro ↗</button>
          </>
        }
      />
      <Card title="Material status">
        <AlertList items={materialItems} />
      </Card>
    </div>
  );
}
