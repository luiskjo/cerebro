import { useState, type ReactNode } from 'react';

interface TabDef {
  key: string;
  label: string;
  content: ReactNode;
}

export default function Tabs({ tabs, defaultKey }: { tabs: TabDef[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);

  return (
    <>
      <div className="tabs">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            className={`tab${active === tab.key ? ' active' : ''}`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} className={`tab-content${active === tab.key ? ' active' : ''}`}>
          {tab.content}
        </div>
      ))}
    </>
  );
}
