import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Sidebar from './Sidebar';
import Dashboard from '../dashboard/Dashboard';
import Ingresos from '../ingresos/Ingresos';
import Egresos from '../egresos/Egresos';
import Configuracion from '../config/Configuracion';
import LoginPage from './LoginPage';
import type { Session } from '@supabase/supabase-js';

type Page = 'dashboard' | 'ingresos' | 'egresos' | 'configuracion';

export default function AppShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text-muted)',
        fontSize: '14px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
            <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
            <path d="M8 24L14 8h4l6 16h-4l-1.2-3.2H13.2L12 24H8zm6.4-6.4h3.2L16 12l-1.6 5.6z" fill="white" />
          </svg>
          Cargando Arka Finance...
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  const userId = session.user.id;
  const userEmail = session.user.email || '';

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard userId={userId} />;
      case 'ingresos': return <Ingresos userId={userId} />;
      case 'egresos': return <Egresos userId={userId} />;
      case 'configuracion': return <Configuracion userId={userId} userEmail={userEmail} />;
      default: return <Dashboard userId={userId} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        userEmail={userEmail}
      />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
