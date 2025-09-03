import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import { Link } from "react-router-dom";

type Order = { id:number; customer_name:string; created_at:string };
const READY_WINDOW_MIN = 5;

function useOrdersFeed() {
  const [active, setActive] = useState<Order[]>([]);
  const [closed, setClosed] = useState<Order[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  async function bootstrap() {
    const [a, c] = await Promise.all([
      api.get("/orders?status=active"),
      api.get("/orders?status=closed"),
    ]);
    setActive(a.data);
    setClosed(c.data);
  }

  useEffect(() => {
    bootstrap();
    connect();
    return () => wsRef.current?.close();
  }, []);

  function connect() {
    const base = import.meta.env.VITE_API_URL as string;
    const wsUrl = base.replace(/^http/, "ws") + "/orders/ws";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "orders") {
          if (Array.isArray(msg.active)) setActive(msg.active);
          if (Array.isArray(msg.closed)) setClosed(msg.closed);
        }
        if (msg.type === "clear_closed") setClosed([]);
      } catch {}
    };
    ws.onclose = () => setTimeout(connect, 1500);
    ws.onerror = () => ws.close();
  }

  return { active, closed };
}

export default function CustomerScreen() {
  const { active, closed } = useOrdersFeed();

  // показываем закрытые (ГОТОВ) за последние READY_WINDOW_MIN минут
  const readyFiltered = useMemo(() => {
    const cutoff = Date.now() - READY_WINDOW_MIN * 60_000;
    return closed.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  }, [closed]);

  const nothing = active.length === 0 && readyFiltered.length === 0;

  return (
    // ВНЕШНЯЯ ОБЁРТКА: занимаем весь экран и держим «полотно»
    <div className="fixed inset-0 bg-[#0E1621] overflow-hidden">
      {/* ВНУТРЕННЯЯ ОБЛАСТЬ: поворачиваем на 90°, меняем местами ширину/высоту */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 overflow-auto"
        style={{ width: "100vh", height: "100vw" }}
      >
        {/* Дальше — ваш прежний контент экрана */}
        <div className="min-h-full w-full text-white">
          <div className="max-w-[1400px] mx-auto px-6 py-4">
            <Link
              to="/orders/active"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-white text-sm"
            >
              ← Назад к POS
            </Link>
          </div>

          {nothing ? (
            <div className="h-[calc(100vh-80px)] w-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-7xl font-extrabold tracking-wide">ЖДЁМ ЗАКАЗЫ</div>
                <div className="text-2xl mt-4 text-slate-300">QOYU Coffee ☕</div>
              </div>
            </div>
          ) : (
            <div className="max-w-[1400px] mx-auto flex flex-col gap-12 px-6 pb-10">
              {/* ГОТОВ */}
              <section>
                <div className="text-6xl font-extrabold text-center">ГОТОВ</div>
                <div className="h-1 bg-slate-500 rounded mt-3 mb-6 mx-16" />
                <div className="space-y-5">
                  {readyFiltered.map((o) => (
                    <Row key={o.id} name={o.customer_name || "Без имени"} badge={`${o.id}`} variant="ready" />
                  ))}
                </div>
              </section>

              {/* ГОТОВИТСЯ */}
              <section>
                <div className="text-6xl font-extrabold">ГОТОВИТСЯ</div>
                <div className="h-1 bg-emerald-500 rounded mt-3 mb-6" />
                <div className="space-y-5">
                  {active.map((o) => (
                    <Row key={o.id} name={o.customer_name || "Без имени"} badge={`${o.id}`} variant="cooking" />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  name,
  badge,
  variant,
}: {
  name: string;
  badge: number | string;
  variant: "cooking" | "ready";
}) {
  const pillClasses =
    variant === "cooking"
      ? "bg-emerald-500 text-black"
      : "bg-slate-600 text-white";
  return (
    <div className="rounded-2xl bg-[#1A2430] px-6 py-5 flex items-center justify-between shadow-lg">
      <div className="text-5xl font-extrabold">{name}</div>
      <div className={`min-w-[110px] h-[64px] px-6 grid place-items-center rounded-2xl text-4xl font-extrabold ${pillClasses}`}>
        {badge}
      </div>
    </div>
  );
}
