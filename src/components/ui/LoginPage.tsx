import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('Revisa tu email para confirmar la cuenta.');
        setLoading(false);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
              <path d="M8 24L14 8h4l6 16h-4l-1.2-3.2H13.2L12 24H8zm6.4-6.4h3.2L16 12l-1.6 5.6z" fill="white" />
            </svg>
            <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text)' }}>
              Arka Finance
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            {isSignup ? 'Crea tu cuenta' : 'Gestiona tus finanzas freelance'}
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: '28px' }}>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
              />
            </div>
            <div className="field" style={{ marginBottom: '20px' }}>
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {error && (
              <div style={{
                background: error.includes('Revisa') ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                border: `1px solid ${error.includes('Revisa') ? 'var(--color-green)' : 'var(--color-red)'}`,
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '13px',
                color: error.includes('Revisa') ? 'var(--color-green)' : 'var(--color-red)',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              {loading ? 'Cargando...' : isSignup ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '13px' }}
            >
              {isSignup ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '24px' }}>
          Solo tú puedes ver tus datos · Cifrado con Supabase
        </p>
      </div>
    </div>
  );
}
