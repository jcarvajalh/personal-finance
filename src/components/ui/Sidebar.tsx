import { LayoutDashboard, TrendingUp, TrendingDown, Settings, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Page = 'dashboard' | 'ingresos' | 'egresos' | 'configuracion';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  userEmail?: string;
}

const NAV_ITEMS = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'ingresos' as Page, label: 'Ingresos', icon: TrendingUp },
  { id: 'egresos' as Page, label: 'Egresos', icon: TrendingDown },
  { id: 'configuracion' as Page, label: 'Configuración', icon: Settings },
];

export default function Sidebar({ currentPage, onNavigate, userEmail }: SidebarProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
            <path d="M8 24L14 8h4l6 16h-4l-1.2-3.2H13.2L12 24H8zm6.4-6.4h3.2L16 12l-1.6 5.6z" fill="white" />
          </svg>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', lineHeight: '1.2' }}>Arka Finance</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Freelancer CO</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {userEmail && (
          <div style={{ padding: '4px 12px 8px', fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </div>
        )}
        <button className="nav-item" onClick={handleSignOut}>
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
