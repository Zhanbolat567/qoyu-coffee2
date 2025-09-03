import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { CheckCircle2, Bell, BellOff } from "lucide-react";

type Item = { name: string; qty?: number; quantity?: number };
type Order = {
  id: number | string;
  customer_name: string;
  take_away?: boolean;
  total: number;
  created_at: string;
  items: Item[];
};

const SOUND_KEY = "orders_sound_enabled_v2";

// ===== утилиты =====
const mmssSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// Глобальный AudioContext
let _ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const AC = (window.AudioContext || (window as any).webkitAudioContext);
  _ctx = AC ? new AC() : null;
  return _ctx;
}

/** Обязательное включение аудио пользователем */
async function enableSoundEngine() {
  const ctx = getCtx();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();

    // маленький «тик» для разблокировки
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.02);

    localStorage.setItem(SOUND_KEY, "1");
    return true;
  } catch (e) {
    console.warn("enableSoundEngine failed:", e);
    return false;
  }
}

/** Айфон-подобный «динь» (не оригинал) — арпеджио 3 нот */
export async function playIOSLikeDing() {
  const ctx = getCtx();
  if (!ctx) return;

  if (localStorage.getItem(SOUND_KEY) !== "1") {
    // звук не включён пользователем
    return;
  }

  try {
    if (ctx.state === "suspended") await ctx.resume();

    const base = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);

    const steps = [
      { f: 1047, dt: 0.00 }, // C6
      { f: 1319, dt: 0.05 }, // E6
      { f: 1568, dt: 0.10 }, // G6
    ];

    steps.forEach((s, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(s.f, base + s.dt);
      osc.detune.setValueAtTime((i - 1) * 4, base + s.dt); // лёгкий детюн

      gain.gain.setValueAtTime(0.0001, base + s.dt);
      gain.gain.exponentialRampToValueAtTime(0.5, base + s.dt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, base + s.dt + 0.5);

      osc.connect(gain).connect(master);
      osc.start(base + s.dt);
      osc.stop(base + s.dt + 0.55);
    });

    master.gain.setValueAtTime(0.6, base);
    master.gain.exponentialRampToValueAtTime(0.0001, base + 0.7);
  } catch (e) {
    console.warn("playIOSLikeDing failed:", e);
  }
}

// ===== компонент =====
export default function OrdersActive() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(
    typeof window !== "undefined" ? localStorage.getItem(SOUND_KEY) === "1" : false
  );

  const prevIdsRef = useRef<string[]>([]);
  const firstLoadRef = useRef(true);

  async function fetchActive() {
    try {
      const { data } = await api.get<Order[]>("/orders", { params: { status: "active" } });
      const list = Array.isArray(data) ? data : [];
      const ids = list.map((o) => String(o.id));

      if (!firstLoadRef.current) {
        // есть ли новые ID?
        const prev = new Set(prevIdsRef.current);
        const hasNew = ids.some((id) => !prev.has(id));
        if (hasNew) {
          // звук только если включён
          playIOSLikeDing();
        }
      } else {
        firstLoadRef.current = false; // первую загрузку — без звука
      }

      prevIdsRef.current = ids;
      setOrders(list);
    } catch (e) {
      console.warn("fetchActive error:", e);
    }
  }

  useEffect(() => {
    fetchActive();
    const id = setInterval(fetchActive, 1000);
    return () => clearInterval(id);
  }, []);

  // Кнопка включения/выключения звука
  const toggleSound = async () => {
    if (!soundEnabled) {
      const ok = await enableSoundEngine();
      if (ok) {
        setSoundEnabled(true);
        // тестовый «динь», чтобы понять что всё ок
        playIOSLikeDing();
      }
    } else {
      localStorage.removeItem(SOUND_KEY);
      setSoundEnabled(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-2xl">
      {/* Верхняя панель: заголовок + кнопка звука */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Заказы</h1>
        <button
          onClick={toggleSound}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm border transition
            ${soundEnabled
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
          title={soundEnabled ? "Выключить звук" : "Включить звук"}
        >
          {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          {soundEnabled ? "Звук включён" : "Звук выключен"}
        </button>
      </div>

      {/* Если звук выключен — заметное уведомление */}
      {!soundEnabled && (
        <div className="mb-4 text-sm p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-800">
          Нажмите «Включить звук», чтобы слышать сигнал при новых заказах (требование браузера).
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <div key={String(o.id)} className="bg-white rounded-lg shadow overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 grid place-items-center rounded-md bg-slate-100 font-semibold">
                  {o.id}
                </div>
                <div className="font-semibold">{o.customer_name || "Гость"}</div>
                {o.take_away ? (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                    с собой
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-slate-500 text-sm">{mmssSince(o.created_at)}</div>
                <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  активен
                </span>
              </div>
            </div>

            {/* items */}
            <div className="px-4 py-2 space-y-1">
              {o.items.map((it, i) => {
                const q = (it.qty ?? it.quantity ?? 1) as number;
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="truncate">{it.name}</div>
                    <div className="text-slate-500">x{q}</div>
                  </div>
                );
              })}
            </div>

            {/* total */}
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <div className="font-semibold">Итого:</div>
              <div className="font-semibold">{Number(o.total).toLocaleString("ru-RU")} ₸</div>
            </div>

            {/* finish */}
            <div className="px-4 pb-4">
              <button
                onClick={() => {
                  const id = o.id;
                  api.patch(`/orders/${id}/close`).then(() => {
                    setOrders((prev) => prev.filter((x) => String(x.id) !== String(id)));
                    prevIdsRef.current = prevIdsRef.current.filter((x) => String(x) !== String(id));
                  });
                }}
                className="w-full rounded-md py-2 font-medium bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Завершить заказ
              </button>
            </div>
          </div>
        ))}

        {!orders.length && <div className="text-slate-500">Нет активных заказов</div>}
      </div>
    </div>
  );
}
