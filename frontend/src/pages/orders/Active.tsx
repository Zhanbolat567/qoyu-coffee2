import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { CheckCircle2, Bell, BellOff } from "lucide-react";

type Item = { name: string; qty?: number; quantity?: number };
type Order = {
  id: number | string;
  status?: string;
  customer_name: string;
  take_away?: boolean;
  total: number;
  created_at: string;
  items: Item[];
};

const SOUND_KEY = "orders_sound_enabled";

const mmssSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// ==== Аудио ====
let _ctx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (_ctx) return _ctx;
  const AC = (window.AudioContext || (window as any).webkitAudioContext);
  _ctx = AC ? new AC() : null;
  return _ctx;
}
async function enableSoundEngine() {
  const ctx = getAudioCtx();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.00001;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.01);
    localStorage.setItem(SOUND_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
async function playDing() {
  if (localStorage.getItem(SOUND_KEY) !== "1") return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") await ctx.resume();

  const base = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);

  const freqs = [1047, 1319, 1568]; // C6,E6,G6
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = i === 0 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(f, base + i * 0.05);
    g.gain.setValueAtTime(0.0001, base + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.5, base + i * 0.05 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, base + i * 0.05 + 0.5);
    osc.connect(g).connect(master);
    osc.start(base + i * 0.05);
    osc.stop(base + i * 0.05 + 0.55);
  });
}

// ==== Компонент ====
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
        const prev = new Set(prevIdsRef.current);
        const newIds = ids.filter((id) => !prev.has(id));
        if (newIds.length > 0) playDing();
      } else {
        firstLoadRef.current = false;
      }

      prevIdsRef.current = ids;
      setOrders(list);
    } catch {}
  }

  useEffect(() => {
    fetchActive();
    const id = setInterval(fetchActive, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleSound = async () => {
    if (!soundEnabled) {
      const ok = await enableSoundEngine();
      if (ok) setSoundEnabled(true);
    } else {
      localStorage.removeItem(SOUND_KEY);
      setSoundEnabled(false);
    }
  };

  async function finish(id: number | string) {
    try {
      await api.patch(`/orders/${id}/close`);
      setOrders((prev) => prev.filter((o) => String(o.id) !== String(id)));
      prevIdsRef.current = prevIdsRef.current.filter((x) => String(x) !== String(id));
    } catch {}
  }

  return (
    <div className="mx-auto max-w-screen-2xl">
      {/* Заголовок + кнопка прямо тут */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Заказы</h1>
        <button
          onClick={toggleSound}
          type="button"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm border 
            ${soundEnabled
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
        >
          {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          {soundEnabled ? "Звук включён" : "Включить звук"}
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <div key={String(o.id)} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 grid place-items-center rounded-md bg-slate-100 font-semibold">
                  {o.id}
                </div>
                <div className="font-semibold">{o.customer_name || "Гость"}</div>
                {o.take_away && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                    с собой
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-slate-500 text-sm">{mmssSince(o.created_at)}</div>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border">
                  активен
                </span>
              </div>
            </div>

            <div className="px-4 py-2 space-y-1">
              {o.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="truncate">{it.name}</div>
                  <div className="text-slate-500">x{it.qty ?? it.quantity ?? 1}</div>
                </div>
              ))}
            </div>

            <div className="border-t px-4 py-3 flex items-center justify-between">
              <div className="font-semibold">Итого:</div>
              <div className="font-semibold">{Number(o.total).toLocaleString("ru-RU")} ₸</div>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => finish(o.id)}
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
