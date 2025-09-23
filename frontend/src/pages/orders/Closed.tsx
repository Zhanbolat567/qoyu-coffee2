import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../../api/client";

/* ===== Types ===== */
type Item = {
  name: string;
  qty?: number;
  quantity?: number;

  // возможные варианты от бэка (на случай, если начнёшь их отдавать явно)
  options?: string[];
  option_names?: string[];
  option_details?: string[];
  modifiers?: { name: string }[];
};
type Order = { id: number; customer_name: string; total: number; created_at: string; items: Item[] };

/* ===== Time utils (как было) ===== */
const mmssSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/* ===== Опции: порт правил и утилит из Active.tsx ===== */
const GROUP_ORDER = [
  "Размер",
  "Молоко",
  "Сироп",
  "Доп. шот",
  "Сахар",
  "Температура",
  "Прочее",
] as const;
type GroupName = typeof GROUP_ORDER[number];

const RULES: Record<GroupName, RegExp[]> = {
  Размер: [/\bразмер\b/i, /\b\d{2,3}\s*мл\b/i, /\b0[.,]?\d+\s*л\b/i, /\b(200|250|300|350|400|450|500)\b/i],
  Молоко: [/молок/i, /сливк/i, /овсян/i, /соев/i, /кокосов/i, /миндал/i, /безлакт/i, /лактоз/i],
  Сироп: [
    /сироп/i, /ванил/i, /карамел/i, /солен/i, /фунд/i, /орех/i, /шоколад/i, /ирис/i, /клубник/i, /мят/i,
    /кокос(?!ов)/i, /банан/i, /апельсин/i, /вишн/i, /какао/i, /попкорн/i,
  ],
  "Доп. шот": [/шот/i, /\bэспрессо\b/i, /double/i, /доп\.\s*шот/i],
  Сахар: [/сахар/i, /без\s*сахара/i, /стеви/i, /подсласт/i],
  Температура: [/горяч/i, /холод/i, /со?\s*льдом/i, /лед/i, /прохлад/i, /температур/i, /\bice\b/i],
  Прочее: [],
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function detectGroup(label: string): GroupName {
  const txt = label.toLowerCase();
  for (const g of GROUP_ORDER) {
    if (g === "Прочее") continue;
    if (RULES[g].some(rx => rx.test(txt))) return g;
  }
  return "Прочее";
}

/** Вырезаем из name последние скобки "(…)" как inline-опции */
function splitNameAndInlineOptions(raw: string): { base: string; inline: string[] } {
  const s = (raw || "").trim();
  const open = s.lastIndexOf("(");
  const close = s.lastIndexOf(")");
  if (open !== -1 && close !== -1 && close > open) {
    const base = s.slice(0, open).trim().replace(/[·\-–—,:;]+$/g, "");
    const inside = s.slice(open + 1, close).trim();
    const parts = inside.split(/[;,]/g).map(x => x.trim()).filter(Boolean);
    return { base: base || s, inline: parts };
  }
  return { base: s, inline: [] };
}

/** Собираем список опций из разных полей, если их нет — берём из name(...) */
function normOptions(it: Item, fromNameInline: string[]): string[] {
  if (it.options?.length) return it.options;
  if (it.option_names?.length) return it.option_names;
  if (it.option_details?.length) return it.option_details;
  if (it.modifiers?.length) return it.modifiers.map(m => m.name);
  return fromNameInline;
}

/** Сортировка и плоская выдача опций по порядку групп */
function orderOptionsFlat(opts: string[]): string[] {
  const buckets: Record<GroupName, string[]> = {
    Размер: [], Молоко: [], Сироп: [], "Доп. шот": [], Сахар: [], Температура: [], Прочее: [],
  };
  const seen = new Set<string>();
  for (const raw of opts) {
    const label = clean(raw);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    buckets[detectGroup(label)].push(label);
  }
  // сортировка внутри групп
  buckets["Размер"].sort((a, b) => {
    const na = Number((a.match(/(\d{2,3})\s*мл/i)?.[1]) || 999);
    const nb = Number((b.match(/(\d{2,3})\s*мл/i)?.[1]) || 999);
    return na - nb || a.localeCompare(b, "ru");
  });
  for (const g of GROUP_ORDER) if (g !== "Размер") buckets[g].sort((a, b) => a.localeCompare(b, "ru"));
  // плоский список по заданному порядку групп
  return GROUP_ORDER.flatMap(g => buckets[g]);
}

/* ===== Component ===== */
export default function OrdersClosed() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function fetchClosed() {
    const { data } = await api.get<Order[]>("/orders", { params: { status: "closed", limit: 100 } });
    setOrders(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchClosed(); // не автообновляется
  }, []);

  async function clearHistory() {
    try {
      await api.post("/orders/closed/clear");
    } catch {}
    setOrders([]);
  }

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="text-3xl font-bold mb-4">Заказы</h1>

      <div className="mb-4 flex items-center justify-between">
        <div />
        <button
          onClick={clearHistory}
          className="px-3 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-sm"
          title="Очистить список (и скрыть на табло «ГОТОВ»)"
        >
          Очистить историю
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-lg shadow overflow-hidden">
            {/* header с квадратными бейджами */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 grid place-items-center rounded-md bg-slate-100 font-semibold">
                  {o.id}
                </div>
                <div className="font-semibold">{o.customer_name || "Новый клиент"}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-slate-500 text-sm">{mmssSince(o.created_at)}</div>
                <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  закрыт
                </span>
              </div>
            </div>

            {/* ITEMS — как в Active.tsx: base + чипсы опций */}
            <div className="px-4 py-3 space-y-3">
              {o.items.map((it, i) => {
                const q = (it.qty ?? it.quantity ?? 1) as number;
                const { base, inline } = splitNameAndInlineOptions(it.name || "");
                const orderedChips = orderOptionsFlat(normOptions(it, inline));

                return (
                  <div key={i} className="text-sm">
                    <div className="flex items-start justify-between">
                      <span className="font-medium">{base}</span>
                      <span className="text-slate-500">x{q}</span>
                    </div>

                    {orderedChips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
                        {orderedChips.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center px-2 py-1 text-[12px] leading-5
                                       rounded-full bg-slate-100 text-slate-700 border border-slate-200
                                       whitespace-nowrap"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t px-4 py-3 flex items-center justify-between">
              <div className="font-semibold">Итого:</div>
              <div className="font-semibold">{Number(o.total).toLocaleString("ru-RU")} ₸</div>
            </div>
          </div>
        ))}

        {!orders.length && <div className="text-slate-500">Нет закрытых заказов</div>}
      </div>
    </div>
  );
}
