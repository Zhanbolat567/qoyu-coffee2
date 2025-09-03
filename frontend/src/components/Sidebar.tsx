import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { LayoutDashboard, Coffee, Receipt, ChevronDown, Settings, Monitor, LogOut, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function ButtonLink({
  to, children, icon, exact = false, target
}: { to: string; children: React.ReactNode; icon?: React.ReactNode; exact?: boolean; target?: "_blank"; }) {
  return (
    <NavLink
      to={to}
      target={target}
      className={({ isActive }) =>
        [
          "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-100/90 hover:bg-slate-700/40",
          isActive && exact ? "bg-slate-700/60 text-white" : "",
        ].join(" ")
      }
    >
      {icon}<span className="font-medium">{children}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [ordersOpen, setOrdersOpen] = useState(pathname.startsWith("/orders"));
  const createOrderLink = useMemo(() => "/pos/create", []);

  async function handleLogout() {
    try { await logout(); } finally { nav("/login", { replace: true }); }
  }

  return (
    <aside className="h-screen w-[240px] bg-[#111827] text-white flex flex-col sticky top-0">
      <div className="px-5 pt-5 pb-3">
        <div className="text-2xl font-extrabold tracking-wide">QOYU Coffee</div>
        <div className="text-xs text-slate-400">{user?.role === "admin" ? "Администратор" : "Кассир"}</div>
      </div>

      <div className="px-4 mb-4">
        <NavLink to={createOrderLink} className="w-full inline-flex items-center gap-2 justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-3">
          <Plus className="w-4 h-4" /> Создать заказ
        </NavLink>
      </div>

      <nav className="px-3 flex-1 space-y-2 overflow-y-auto">
        {user?.role === "admin" && <ButtonLink to="/dashboard" exact icon={<LayoutDashboard className="w-4 h-4" />}>Dashboard</ButtonLink>}
        {user?.role === "admin" && <ButtonLink to="/admin/menu" exact icon={<Coffee className="w-4 h-4" />}>Меню</ButtonLink>}

        <div className="select-none">
          <button
            onClick={() => setOrdersOpen(v => !v)}
            className={[
              "w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-700/40",
              pathname.startsWith("/orders") ? "bg-slate-700/60" : "",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4" /><span className="font-medium">Заказы</span>
            </div>
            <ChevronDown className={["w-4 h-4 transition-transform", ordersOpen ? "rotate-180" : ""].join(" ")} />
          </button>

          {ordersOpen && (
            <div className="mt-1 ml-9 space-y-1">
              <ButtonLink to="/orders/active" exact>Активные</ButtonLink>
              <ButtonLink to="/orders/closed" exact>Закрытые</ButtonLink>
            </div>
          )}
        </div>

        {user?.role === "admin" && <ButtonLink to="/admin/settings/options" exact icon={<Settings className="w-4 h-4" />}>Настройки</ButtonLink>}
        <ButtonLink to="/display" exact target="_blank" icon={<Monitor className="w-4 h-4" />}>Экран клиента</ButtonLink>
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <button onClick={handleLogout} className="w-full inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-700/40">
          <LogOut className="w-4 h-4" /> Выйти
        </button>
      </div>
    </aside>
  );
}
