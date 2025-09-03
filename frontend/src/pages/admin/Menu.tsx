// src/pages/Menu.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import { Link } from "react-router-dom";
import { Trash2, Pencil } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Product = { id: number; name: string; price: number; image_url?: string | null };
type ByCat = Record<string, Product[]>;

// ─── ConfirmDialog (встроенный) ────────────────────────────────────────────────
function ConfirmDialog({
  title,
  message,
  confirmText = "Удалить",
  cancelText = "Отмена",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Menu() {
  const [byCat, setByCat] = useState<ByCat>({});
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<{ id: number; name: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const categories = useMemo(() => Object.keys(byCat), [byCat]);
  const visibleCategories = useMemo(() => (filter ? [filter] : categories), [filter, categories]);

  // загрузка меню + live обновления
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const { data } = await api.get<ByCat>("/products");
        if (!alive) return;
        setByCat(data || {});
        setErr(null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.response?.data?.detail || "Не удалось загрузить меню");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();

    const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8007";
    const ws = new WebSocket(API_URL.replace(/^http/, "ws") + "/products/ws");
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.by_category) setByCat(msg.by_category);
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => (wsRef.current = null);

    return () => {
      alive = false;
      ws.close();
    };
  }, []);

  function askDelete(id: number, name: string) {
    setToDelete({ id, name });
  }

  async function doDelete() {
    if (!toDelete) return;
    try {
      await api.delete(`/products/${toDelete.id}`);
      // оптимистично обновим локально; WS всё равно синхронизирует
      setByCat((prev) => {
        const next: ByCat = {};
        for (const c of Object.keys(prev)) next[c] = prev[c].filter((p) => p.id !== toDelete.id);
        return next;
      });
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не удалось удалить товар");
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div className="mx-auto max-w-screen-2xl p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800">Меню</h1>
        <Link
          to="/admin/product/new"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          + Добавить товар
        </Link>
      </div>

      {/* category pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            !filter ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Все
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter((prev) => (prev === c ? "" : c))}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === c ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* states */}
      {loading && <div className="text-gray-500">Загрузка...</div>}
      {err && <div className="text-red-600 bg-red-100 p-3 rounded-lg">{err}</div>}

      {/* grid */}
      <div className="space-y-10">
        {visibleCategories.map((cat) => (
          <section key={cat}>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{cat}</h2>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

              {(byCat[cat] || []).map((p) => (
                <article
                  key={p.id}
                  className="bg-white rounded-2xl shadow-md ring-1 ring-black/5 transition-shadow hover:shadow-lg p-4"
                >
                  {/* квадратное превью с обрезкой */}
                  <div
                    className="relative w-full rounded-xl overflow-hidden mb-4 bg-gray-100"
                    style={{ aspectRatio: "1 / 1" }} // квадрат 1:1
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="absolute inset-0 w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-gray-400 text-lg">
                        Нет фото
                      </div>
                    )}
                  </div>

                  {/* title + price */}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <div className="text-blue-600 font-semibold">
                      {Number(p.price ?? 0).toLocaleString("ru-RU")} ₸
                    </div>
                  </div>

                  {/* footer как в макете: кнопка слева + круглое удаление справа */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      to={`/admin/product/${p.id}/edit`}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Pencil size={14} />
                      Редактировать
                    </Link>

                    <button
                      onClick={() => askDelete(p.id, p.name)}
                      title="Удалить"
                      className="w-9 h-9 grid place-items-center rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {!categories.length && !loading && !err && (
          <div className="text-gray-500">В меню пока нет товаров.</div>
        )}
      </div>

      {/* confirm */}
      {toDelete && (
        <ConfirmDialog
          title="Удалить товар"
          message={`Вы уверены, что хотите удалить «${toDelete.name}»? Это действие нельзя будет отменить.`}
          onConfirm={doDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
