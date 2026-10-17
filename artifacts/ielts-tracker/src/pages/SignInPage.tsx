import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function SignInPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '1rem', maxWidth: '420px', width: '100%', overflow: 'hidden', border: '1px solid #E3EAF0', boxShadow: '0 8px 30px rgba(23,36,61,0.08)' }}>
        <div style={{ background: 'linear-gradient(120deg, #17243D, #233B63, #176B73)', padding: '2rem 2rem 1.75rem', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 90% at 85% 0%, rgba(25,199,183,0.28), transparent 70%), radial-gradient(50% 80% at 10% 100%, rgba(124,108,255,0.22), transparent 70%)', pointerEvents: 'none' }} />
          <h1 style={{ position: 'relative', color: '#FFFFFF', fontFamily: "'Manrope', sans-serif", fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Within a Few Weeks</h1>
          <p style={{ position: 'relative', color: '#A9DCE8', fontSize: '0.875rem', marginTop: '0.25rem' }}>Master IELTS. Track your future.</p>
        </div>
        <div style={{ padding: '2rem' }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#182238', marginBottom: '0.375rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #E3EAF0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor = '#176B73')}
              onBlur={e => (e.target.style.borderColor = '#E3EAF0')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#182238', marginBottom: '0.375rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.75rem 2.75rem 0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #E3EAF0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => (e.target.style.borderColor = '#176B73')}
                onBlur={e => (e.target.style.borderColor = '#E3EAF0')}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
                {showPass ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && <p style={{ color: '#D95757', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ background: 'linear-gradient(90deg, #19C7B7, #7C6CFF)', opacity: loading ? 0.7 : 1, color: '#17243D', border: 'none', borderRadius: '9999px', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', width: '100%', transition: 'background 0.2s', marginTop: '0.5rem' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.875rem', marginTop: '1.5rem' }}>
          First time?{' '}
          <a href="/sign-up" style={{ color: '#176B73', fontWeight: 600, textDecoration: 'none' }}>Create your account</a>
        </p>
        </div>
      </div>
    </div>
  );
}
