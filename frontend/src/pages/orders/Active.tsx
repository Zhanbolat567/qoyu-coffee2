import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { CheckCircle2, Volume2, VolumeX } from "lucide-react";

type Item = { name: string; qty?: number; quantity?: number };
type Order = {
  id: number | string;
  customer_name: string;
  take_away?: boolean;
  total: number;
  created_at: string;
  items: Item[];
};

const SOUND_KEY = "orders_sound_enabled";

// ===== ВСПОМОГАТЕЛЬНОЕ: формат времени с момента создания
const mmssSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// ===== ГЛОБАЛЬНЫЙ АУДИОКОНТЕКСТ + «айфоноподобный» динь
let _dingCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_dingCtx) return _dingCtx;
  const AC = (window.AudioContext || (window as any).webkitAudioContext);
  _dingCtx = AC ? new AC() : null;
  return _dingCtx;
}

/** Разрешить звук (нужно единожды после клика пользователя) */
async function enableSoundEngine() {
  const ctx = getCtx();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    // «разблокировка» через краткий почти-тихий тик
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.01);
    localStorage.setItem(SOUND_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/** Айфон-подобный «ди-линь» (не оригинал), арпеджио 3 нот */
async function playIOSLikeDing() {
  const ctx = getCtx();
  if (!ctx) return;

  // если движок «не включён», молчим
  const allowed = localStorage.getItem(SOUND_KEY) === "1";
  if (!allowed) return;

  try {
    if (ctx.state === "suspended") await ctx.resume();

    const freqs = [1047, 1319, 1568]; // C6, E6, G6
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);

    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const detune = (i - 1) * 4; // лёгкий детюн
      o.type = i === 0 ? "triangle" : "sine";
      o.frequency.setValueAtTime(f, now);
      o.detune.setValueAtTime(detune, now);

      const t0 = now + i * 0.05;
      const a = 0.01;
      const d = 0.45;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);

      o.connect(g).connect(master);
      o.start(t0);
      o.stop(t0 + d + 0.05);
    });

    master.gain.setValueAtTime(0.6, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  } catch {}
}

// ===== ОСНОВНОЙ КОМПОНЕНТ
export default function OrdersActive() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(
    typeof window !== "undefined" ? localStorage.getItem(SOUND_KEY) === "1" : false
  );

  const prevIdsRef = useRef<Array<number | string>>([]);
  const prevCountRef = useRef<number>(0);
  const firstLoadRef = useRef(true);

  // Единоразовая привязка «разрешить звук» по первому взаимодействию
  useEffect(() => {
    const handler = async () => {
      if (!soundEnabled) {
        const ok = await enableSoundEngine();
        if (ok) setSoundEnabled(true);
      }
      // больше не нужен — снимем
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler as any);
    };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler as any, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler as any);
    };
  }, [soundEnabled]);

  async function fetchActive() {
    const { data } = await api.get<Order[]>("/orders", { params: { status: "active" } });
    const list = Array.isArray(data) ? data : [];
    // нормализуем ID в строки, чтобы Set сравнивал корректно
    const ids = list.map((o) => String(o.id));

    if (!firstLoadRef.current) {
      const prevSet = new Set(prevIdsRef.current.map(String));
      const hasNewId = ids.some((id) => !prevSet.has(id));
      const countIncreased = list.length > prevCountRef.current;

      if (hasNewId || countIncreased) {
        // Вызов звука — только если включён
        playIOSLikeDing();
      }
    } else {
      firstLoadRef.current = false; // первую загрузку — без звука
    }

    prevIdsRef.current = ids;
    prevCountRef.current = list.length;
    setOrders(list);
  }

  useEffect(() => {
    fetchActive();
    const id = setInterval(fetchActive, 1000);
    return () => clearInterval(id);
  }, []);

  async function finish(id: number | string) {
    try {
      await api.patch(`/orders/${id}/close`);
      setOrders((prev) => prev.filter((o) => String(o.id) !== String(id)));
      prevIdsRef.current = prevIdsRef.current.filter((x) => String(x) !== String(id));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
    } catch {}
  }

  // Включатель/выключатель звука вручную (на всякий случай)
  const toggleSound = async () => {
    if (!soundEnabled) {
      const ok = await enableSoundEngine();
      if (ok) {
        setSoundEnabled(true);
      }
    } else {
      localStorage.removeItem(SOUND_KEY);
      setSoundEnabled(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Заказы</h1>

        <button
          onClick={toggleSound}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm border ${
            soundEnabled
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white text-slate-700 border-slate-300"
          }`}
          title={soundEnabled ? "Выключить звук" : "Включить звук"}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {soundEnabled ? "Звук включён" : "Звук выключен"}
        </button>
      </div>

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
