'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

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
        setInfo('Аккаунт создан. Если включено подтверждение по email — проверь почту, иначе входи.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(translate(err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <h1>Учёт чеков</h1>
      <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>
        Фото чека → сумма, дата, категория → выгрузка для бухгалтера
      </p>

      <div className="card">
        <div className="tab-row">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>
            Вход
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Регистрация
          </button>
        </div>

        <form onSubmit={submit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <label>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          <button className="btn block" style={{ marginTop: 16 }} disabled={loading}>
            {loading ? <span className="spinner" /> : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}
        {info && <div className="success">{info}</div>}
      </div>
    </div>
  );
}

function translate(msg = '') {
  if (msg.includes('Invalid login')) return 'Неверный email или пароль.';
  if (msg.includes('already registered')) return 'Такой email уже зарегистрирован.';
  if (msg.includes('at least 6')) return 'Пароль должен быть не короче 6 символов.';
  return msg;
}
