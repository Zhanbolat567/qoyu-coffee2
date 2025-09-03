import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Phone as PhoneIcon, Lock } from 'lucide-react';

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!name || !phone || !password || !confirm) {
      setErr('Заполните все поля');
      return;
    }
    if (password.length < 6) {
      setErr('Пароль должен быть не короче 6 символов');
      return;
    }
    if (password !== confirm) {
      setErr('Пароли не совпадают');
      return;
    }

    try {
      setSaving(true);
      await register(name.trim(), phone.trim(), password);
      nav('/orders/active'); // уже залогинен cookie
    } catch (ex: any) {
      setErr(ex?.message || 'Ошибка регистрации');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100 p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="text-center mb-1">
          <div className="text-2xl font-extrabold tracking-wide">QOYU Coffee</div>
          <div className="text-slate-500 mt-1">Регистрация нового кассира</div>
        </div>

        <div>
          <div className="text-sm mb-1">Имя пользователя</div>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full border rounded-lg px-10 py-2 outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Например, Алишер"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="text-sm mb-1">Подтвердите пароль</div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              className="w-full border rounded-lg px-10 py-2 outline-none focus:ring-2 focus:ring-blue-200"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-lg py-2 font-medium"
        >
          {saving ? 'Сохраняем…' : 'Зарегистрироваться'}
        </button>

        <div className="text-center text-sm text-slate-600">
          Уже есть аккаунт? <Link className="text-blue-600" to="/login">Войти</Link>
        </div>
      </form>
    </div>
  );
}
