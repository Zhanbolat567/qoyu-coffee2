// src/pages/admin/OptionsSettings.tsx
import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Pencil, Trash2, Plus, Image as ImageIcon, X } from "lucide-react";

type OptionItem = { id: number; name: string; price: number; image_url?: string | null };
type Group = {
  id: number;
  name: string;
  select_type: "single" | "multi";
  is_required: boolean;
  items: OptionItem[];
};

export default function OptionsSettings() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);

  const [addItemFor, setAddItemFor] = useState<Group | null>(null);
  const [editItem, setEditItem] = useState<{ groupId: number; item: OptionItem } | null>(null);

  const [confirm, setConfirm] = useState<{ type: "group" | "item"; id: number; name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  async function fetchOnce() {
    try {
      const { data } = await api.get<Group[]>("/options/groups");
      setGroups(data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Не удалось загрузить группы опций");
    }
  }

  useEffect(() => {
    fetchOnce();
    connectWS();
    return () => wsRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function connectWS() {
    const base = import.meta.env.VITE_API_URL as string;
    const wsUrl = base.replace(/^http/, "ws") + "/options/ws";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.type === "options" && m.groups) setGroups(m.groups);
      } catch {}
    };
    ws.onclose = () => setTimeout(connectWS, 1500);
  }

  async function removeGroup(id: number) {
    try {
      await api.delete(`/options/groups/${id}`);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Не удалось удалить группу");
    } finally {
      setConfirm(null);
    }
  }
  async function removeItem(id: number) {
    try {
      await api.delete(`/options/items/${id}`);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Не удалось удалить опцию");
    } finally {
      setConfirm(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Управление опциями</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm"
          onClick={() => setAddGroupOpen(true)}
        >
          <Plus className="w-4 h-4" /> Добавить группу
        </button>
      </div>

      {err && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded-lg">{err}</div>}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <div key={g.id} className="bg-white rounded-2xl shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">{g.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {g.select_type === "single" ? "Одиночный выбор" : "Множественный выбор"}
                  </span>
                  {g.is_required && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                      Обязательно
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  title="Редактировать группу"
                  onClick={() => setEditGroup(g)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <Pencil size={16} />
                </button>
                <button
                  title="Удалить группу"
                  onClick={() => setConfirm({ type: "group", id: g.id, name: g.name })}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-2">
              {g.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.name} className="w-8 h-8 rounded-md object-cover border" />
                    ) : (
                      <div className="w-8 h-8 rounded-md border bg-gray-50 grid place-items-center text-gray-400">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div className="text-sm font-medium text-gray-800">{it.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-600">
                      {it.price > 0 ? `+${it.price.toLocaleString("ru-RU")} ₸` : "0 ₸"}
                    </div>
                    <button
                      onClick={() => setEditItem({ groupId: g.id, item: it })}
                      className="p-1.5 rounded-md border bg-white hover:bg-gray-50 text-gray-600"
                      title="Редактировать опцию"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirm({ type: "item", id: it.id, name: it.name })}
                      className="p-1.5 rounded-md border bg-white hover:bg-red-50 text-red-600"
                      title="Удалить опцию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setAddItemFor(g)}
                className="w-full text-blue-600 text-sm font-semibold px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 mt-2 transition-colors"
              >
                + Добавить опцию
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Модалки ===== */}
      {addGroupOpen && (
        <GroupModal
          onClose={() => setAddGroupOpen(false)}
          onSave={async ({ name, select_type, is_required }) => {
            try {
              const fd = new FormData();
              fd.set("name", name);
              fd.set("select_type", select_type);
              fd.set("is_required", String(is_required));
              await api.post("/options/groups", fd); // form-data
              setAddGroupOpen(false);
            } catch (e: any) {
              setErr(e?.response?.data?.detail || "Не удалось создать группу");
            }
          }}
        />
      )}

      {editGroup && (
        <GroupModal
          group={editGroup}
          onClose={() => setEditGroup(null)}
          onSave={async ({ name, select_type, is_required }) => {
            try {
              const fd = new FormData();
              fd.set("name", name);
              fd.set("select_type", select_type);
              fd.set("is_required", String(is_required));
              await api.put(`/options/groups/${editGroup.id}`, fd); // form-data
              setEditGroup(null);
            } catch (e: any) {
              setErr(e?.response?.data?.detail || "Не удалось сохранить группу");
            }
          }}
        />
      )}

      {addItemFor && (
        <ItemModal
          groupName={addItemFor.name}
          onClose={() => setAddItemFor(null)}
          onSave={async ({ name, price, image }) => {
            try {
              const fd = new FormData();
              fd.set("name", name);
              fd.set("price", String(Number(price || 0)));
              if (image) fd.set("image", image);
              await api.post(`/options/groups/${addItemFor.id}/items`, fd); // form-data
              setAddItemFor(null);
            } catch (e: any) {
              setErr(e?.response?.data?.detail || "Не удалось добавить опцию");
            }
          }}
        />
      )}

      {editItem && (
        <ItemModal
          groupName={groups.find((g) => g.id === editItem.groupId)?.name || ""}
          initial={editItem.item}
          onClose={() => setEditItem(null)}
          onSave={async ({ name, price, image, imageClear }) => {
            try {
              const fd = new FormData();
              fd.set("name", name);
              fd.set("price", String(Number(price || 0)));
              if (image) fd.set("image", image);
              if (imageClear) fd.set("image_clear", "true");
              await api.put(`/options/items/${editItem.item.id}`, fd); // form-data
              setEditItem(null);
            } catch (e: any) {
              setErr(e?.response?.data?.detail || "Не удалось изменить опцию");
            }
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === "group" ? "Удалить группу?" : "Удалить опцию?"}
          message={`Удалить ${confirm.type === "group" ? "группу" : "опцию"} "${confirm.name}"?`}
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={() => (confirm.type === "group" ? removeGroup(confirm.id) : removeItem(confirm.id))}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/* ===================== Модалки ===================== */

function GroupModal({
  group,
  onClose,
  onSave,
}: {
  group?: Group;
  onClose: () => void;
  onSave: (payload: { name: string; select_type: "single" | "multi"; is_required: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(group?.name || "");
  const [type, setType] = useState<"single" | "multi">(group?.select_type || "single");
  const [req, setReq] = useState<boolean>(!!group?.is_required);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onSave({ name: name.trim(), select_type: type, is_required: req });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl">
        <div className="p-5 border-b text-lg font-semibold">{group ? "Редактировать группу" : "Добавить группу опций"}</div>
        <div className="p-5 space-y-4">
          <div>
            <div className="text-sm font-medium mb-1">Название группы</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="например, Сиропы"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Тип выбора</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType("single")}
                className={`py-2 rounded-lg border ${type === "single" ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
              >
                Одиночный
              </button>
              <button
                onClick={() => setType("multi")}
                className={`py-2 rounded-lg border ${type === "multi" ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
              >
                Множественный
              </button>
            </div>
          </div>

          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={req} onChange={(e) => setReq(e.target.checked)} /> Обязательная группа
          </label>
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">
            Отмена
          </button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemModal({
  groupName,
  initial,
  onClose,
  onSave,
}: {
  groupName: string;
  initial?: OptionItem;
  onClose: () => void;
  onSave: (payload: { name: string; price: number; image?: File | null; imageClear?: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [price, setPrice] = useState<number | "">(initial ? initial.price : 0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url || null);
  const [removeExisting, setRemoveExisting] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  function pickFile() {
    document.getElementById("op-image-input")?.click();
  }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setRemoveExisting(false);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(String(reader.result));
      reader.readAsDataURL(file);
    }
  }
  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (initial?.image_url) setRemoveExisting(true);
  }

  async function submit() {
    setSaving(true);
    await onSave({
      name: name.trim(),
      price: Number(price || 0),
      image: imageFile || undefined,
      imageClear: removeExisting,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl">
        <div className="p-5 border-b text-lg font-semibold">
          {initial ? `Редактировать опцию в "${groupName}"` : `Добавить опцию в "${groupName}"`}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-sm font-medium mb-1">Название опции</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="например, Ваниль"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Доплата (₸)</div>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={price}
              onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          {/* === Изображение (опционально) === */}
          <div>
            <div className="text-sm font-medium mb-1">Изображение (опционально)</div>
            <input id="op-image-input" type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <div className="flex items-center gap-3">
              <button type="button" onClick={pickFile} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
                <ImageIcon className="w-4 h-4" /> Выбрать
              </button>

              {imagePreview && (
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="w-16 h-16 rounded-lg object-cover border" />
                  <button
                    type="button"
                    title="Убрать изображение"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 rounded-full p-1 bg-white border shadow"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!imagePreview && initial?.image_url && !removeExisting && (
                <div className="text-xs text-gray-500">Текущее изображение будет сохранено</div>
              )}
              {removeExisting && <div className="text-xs text-red-600">Изображение будет удалено</div>}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">
            Отмена
          </button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
