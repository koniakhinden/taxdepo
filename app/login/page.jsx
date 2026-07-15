'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useI18n } from '../i18n-provider';
import LanguageSwitcher from '../language-switcher';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();

  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo(t('signupInfo'));
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(translate(err.message, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <LanguageSwitcher />
      </div>
      <h1>{t('appTitle')}</h1>
      <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>
        {t('tagline')}
      </p>

      <div className="card">
        <div className="tab-row">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>
            {t('signIn')}
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            {t('signUp')}
          </button>
        </div>

        <form onSubmit={submit}>
          <label>{t('emailLabel')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <label>{t('passwordLabel')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          <button className="btn block" style={{ marginTop: 16 }} disabled={loading}>
            {loading ? <span className="spinner" /> : mode === 'signin' ? t('signInBtn') : t('signUpBtn')}
          </button>
        </form>

        {error && <div className="error">{error}</div>}
        {info && <div className="success">{info}</div>}
      </div>
    </div>
  );
}

function translate(msg = '', t) {
  if (msg.includes('Invalid login')) return t('errInvalidLogin');
  if (msg.includes('already registered')) return t('errAlreadyReg');
  if (msg.includes('at least 6')) return t('errShortPass');
  return msg;
}
