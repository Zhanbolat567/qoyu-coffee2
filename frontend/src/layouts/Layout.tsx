import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

export default function Layout() {
  const { pathname } = useLocation();
  const hideSidebar = pathname.startsWith("/display"); // экран клиента без оболочки
  const [mobileOpen, setMobileOpen] = useState(false);

  // Закрывать меню при смене page/route
  useEffect(() => setMobileOpen(false), [pathname]);

  // Лочим/разлочим скролл body, когда открыт мобильный сайдбар
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Учитываем поворот планшета/телефона и расширение до md: закрываем дровер
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = () => setMobileOpen(false);
    mq.addEventListener?.("change", handler);
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler); // Safari iPad/iPhone
    return () => {
      mq.removeEventListener?.("change", handler);
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, []);

  return (
    <div className="min-h-[100svh] bg-slate-100 flex">
      {/* Сайдбар на планшетах/ПК */}
      {!hideSidebar && (
        <div className="hidden md:block sticky top-0 h-[100svh]">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Мобильный drawer */}
      {!hideSidebar && (
        <div
          aria-hidden={!mobileOpen}
          className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        >
          <div
            onClick={() => setMobileOpen(false)}
            className={`absolute inset-0 bg-black/40 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          />
          <div
            role="dialog"
            aria-label="Навигация"
            className={[
              "absolute left-0 top-0 h-[100svh] w-[260px] bg-[#111827] text-white transition-transform",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
              "overflow-y-auto",
            ].join(" ")}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Контент */}
      <div className="flex-1 min-w-0">
        {/* Верхняя панель на телефонах */}
        {!hideSidebar && (
          <div className="md:hidden sticky top-0 z-40 bg-slate-100/90 backdrop-blur border-b">
            <div className="h-14 flex items-center gap-3 px-3">
              <button
                aria-label="Открыть меню"
                className="p-2 rounded-md hover:bg-slate-200/70"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link to="/orders/active" className="font-semibold">
                QOYU Coffee
              </Link>
              <div className="ml-auto" />
            </div>
          </div>
        )}

        {/* Для /display убираем отступы */}
        <main className={hideSidebar ? "p-0" : "p-3 sm:p-6 lg:p-8"}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
