import Topbar from '../components/Topbar';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import { docItems } from '../data/mockData';

export default function DocIndex() {
  return (
    <div>
      <Topbar
        title="Document Index"
        subtitle="7 documents · Cerebro memory"
        actions={
          <>
            <BackButton />
            <button className="btn-primary">+ Add document</button>
          </>
        }
      />
      <Card title="Stored documents">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {docItems.map((doc) => (
            <div className="alert-item alert-ok" style={{ cursor: 'pointer' }} key={doc.main}>
              <div className="feed-ico" style={{ background: doc.iconBg }}>{doc.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="alert-main">{doc.main}</div>
                <div className="alert-sub">{doc.sub}</div>
              </div>
              <span className="la-status ls-on">Indexed</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
