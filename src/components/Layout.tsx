import { Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Sidebar from './Sidebar';

export default function Layout() {
  const { isDark } = useTheme();

  return (
    <div className={`app${isDark ? ' dark' : ''}`}>
      <div className="dark-orb orb1" />
      <div className="dark-orb orb2" />
      <Sidebar />
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
