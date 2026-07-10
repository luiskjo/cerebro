import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { navSections, project } from '../data/mockData';

export default function Sidebar() {
  const { isDark, toggleDark } = useTheme();

  return (
    <div className="sidebar">
      <div className="logo-area">
        <div className="logo-row">
          <div className="logo-icon">🧠</div>
          <div>
            <div className="logo-name">Cerebro</div>
            <div className="logo-sub">Construction OS</div>
          </div>
        </div>
        <div className="project-chip">
          <div className="project-chip-name">{project.name}</div>
          <div className="project-chip-meta">{project.weekLabel}</div>
          <div className="week-bar">
            <div className="week-fill" style={{ width: `${project.weekPct}%` }} />
          </div>
        </div>
      </div>

      {navSections.map((section) => (
        <div className="nav-group" key={section.label}>
          <div className="nav-group-label">{section.label}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <i className={item.icon} />
              {item.label}
              {item.badge && <span className={`nav-badge ${item.badge.className}`}>{item.badge.text}</span>}
            </NavLink>
          ))}
        </div>
      ))}

      <div style={{ padding: '12px 12px 0' }}>
        <div className="mode-toggle" onClick={toggleDark}>
          <span className="mode-label">{isDark ? '🌙 Night mode' : '☀️ Day mode'}</span>
          <div className={`toggle-pill${isDark ? ' on' : ''}`}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-row">
          <div className="avatar">{project.user.initials}</div>
          <div>
            <div className="user-name">{project.user.name}</div>
            <div className="user-role">{project.user.role}</div>
          </div>
          <i className="ti ti-settings" style={{ marginLeft: 'auto', fontSize: 15, color: 'var(--text3)' }} />
        </div>
      </div>
    </div>
  );
}
