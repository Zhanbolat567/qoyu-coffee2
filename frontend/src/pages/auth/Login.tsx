import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Phone as PhoneIcon, Lock } from 'lucide-react';

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!phone || !password) {
      setErr('Заполните номер телефона и пароль');
      return;
    }
    try {
      setLoading(true);
      await login(phone.trim(), password);   // кука ставится на бэке
      // куда вести после входа — выбери нужный маршрут
      nav('/orders/active', { replace: true });
    } catch (ex: any) {
      setErr(ex?.message || 'Неверный номер или пароль');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100 p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="text-center">
          <div className="text-2xl font-extrabold tracking-wide">QOYU Coffee</div>
          <div className="text-slate-500 mt-1">Вход для персонала</div>
        </div>

        <div>
          <div className="text-sm mb-1">Номер телефона</div>
          <div className="relative">
            <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full border rounded-lg px-10 py-2 outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="+7 (7XX) XXX-XX-XX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="text-sm mb-1">Пароль</div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              className="w-full border rounded-lg px-10 py-2 outline-none focus:ring-2 focus:ring-blue-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-lg py-2 font-medium"
        >
          {loading ? 'Входим…' : 'Войти'}
        </button>

      </form>
    </div>
  );
}
