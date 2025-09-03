import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useNavigate, useParams, Link } from "react-router-dom";

type Category = { id: number; name: string };
type Group = { id: number; name: string };

export default function ProductEdit() {
  const { id } = useParams();
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [categoryInput, setCategoryInput] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [desc, setDesc] = useState("");

  const [groups, setGroups] = useState<Group[]>([]);
  const [chosenGroups, setChosenGroups] = useState<number[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cats, gs, p] = await Promise.all([
          api.get("/categories"),
          api.get("/options/groups"),
          api.get(`/products/${id}`),
        ]);
        setCategories(cats.data || []);
        setGroups(gs.data?.map((g: any) => ({ id: g.id, name: g.name })) ?? []);
        const d = p.data;
        setName(d.name);
        setPrice(d.base_price);
        setCategoryInput(d.category_name);
        setDesc(d.description || "");
        setChosenGroups(d.option_group_ids || []);
        setPreview(d.image_url || null);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [id]);

  const sizeGroup = useMemo(() => groups.find((g) => g.name.toLowerCase() === "размер") || null, [groups]);
  const useSize = chosenGroups.includes(sizeGroup?.id || -1);

  const toggleGroup = (id: number) => {
    setChosenGroups((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  async function save() {
    setErr(null);
    if (!name.trim()) return setErr("Укажите название");
    if (price === "" || Number(price) < 0) return setErr("Укажите цену");
    if (!categoryInput.trim()) return setErr("Укажите категорию");

    try {
      setSaving(true);
      const selected = [...chosenGroups];
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("base_price", String(price));
      fd.append("category_name", categoryInput.trim());
      if (desc.trim()) fd.append("description", desc.trim());
      fd.append("option_group_ids", selected.join(","));
      if (file) fd.append("image", file);
      const res = await api.put(`/products/${id}`, fd);
      nav("/admin/menu");
      return res;
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4">Редактировать товар</h1>

      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-[160px,1fr] gap-6">
          <div>
            <div className="aspect-square rounded-lg border bg-gray-50 overflow-hidden flex items-center justify-center">
              {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <div className="text-gray-400">Нет изображения</div>}
            </div>
            <label className="mt-2 block">
              <span className="inline-block px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer">Заменить изображение</span>
              <input className="hidden" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">Название</div>
              <input className="w-full border rounded-lg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium mb-1">Цена (₸)</div>
                <input
                  type="number"
                  min={0}
                  className="w-full border rounded-lg px-3 py-2"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Категория</div>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  list="categories"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                />
                <datalist id="categories">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Описание (необязательно)</div>
              <textarea className="w-full border rounded-lg px-3 py-2 min-h-[90px]" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>

            <div className="pt-1">
              <div className="text-sm font-semibold mb-2">Группы опций</div>

              {sizeGroup && (
                <label className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-gray-50 border">
                  <input
                    type="checkbox"
                    checked={useSize}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setChosenGroups((prev) => {
                        const without = prev.filter((x) => x !== sizeGroup.id);
                        return on ? [...without, sizeGroup.id] : without;
                      });
                    }}
                  />
                  <span>Размер</span>
                  <span className="text-xs text-gray-500">(переключение 250/350/450 в заказе)</span>
                </label>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {groups
                  .filter((g) => g.id !== (sizeGroup?.id || -1))
                  .map((g) => (
                    <label key={g.id} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-gray-50">
                      <input type="checkbox" checked={chosenGroups.includes(g.id)} onChange={() => toggleGroup(g.id)} />
                      <span>{g.name}</span>
                    </label>
                  ))}
              </div>

              {!groups.length && <div className="text-slate-500 text-sm">Нет групп — можно добавить в «Настройках опций»</div>}
            </div>
          </div>
        </div>

        {err && <div className="text-red-600 mt-4">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <Link to="/admin/menu" className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-50">
            Отмена
          </Link>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
