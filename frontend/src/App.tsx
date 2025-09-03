import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import RoutesConfig from "./routes";
import Layout from "./layouts/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import CustomerScreen from "./pages/customer/CustomerScreen"; // ВАЖНО: импорт экрана клиента

function LoadingScreen() {
  return <div className="min-h-screen grid place-items-center text-slate-500">Загрузка…</div>;
}

function Private({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/orders/active" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Всё приложение под Layout */}
        <Route element={<Private><Layout /></Private>}>
          {RoutesConfig.filter(r => r.protected).map((r, i) => (
            <Route key={r.path ?? i} path={r.path} element={r.element} />
          ))}
        </Route>

        {/* /display — БЕЗ Layout (но защищён авторизацией) */}
        <Route path="/display" element={<Private><CustomerScreen /></Private>} />

        {/* Публичные страницы (логин/регистрация и т.п.) */}
        {RoutesConfig.filter(r => (r as any).publicOnly).map((r, i) => (
          <Route key={r.path ?? i} path={r.path} element={<PublicOnly>{r.element}</PublicOnly>} />
        ))}

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
