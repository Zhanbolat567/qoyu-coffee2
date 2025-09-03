// src/components/OrderCard.tsx
export default function OrderCard(props: {
  id: number;
  // ─ имя: поддерживаем и name, и customer_name
  name?: string;
  customer_name?: string;

  // ─ позиции: допускаем string[] ИЛИ [{name, quantity|qty}]
  items?: Array<string | { name: string; quantity?: number; qty?: number }>;

  // ─ сумма: поддерживаем sum и total
  sum?: number;
  total?: number;

  // ─ время: поддерживаем строку time и created_at
  time?: string;
  created_at?: string;

  onClose?: () => void;
}) {
  const title = props.name ?? props.customer_name ?? "—";

  const lines =
    props.items?.map((it) =>
      typeof it === "string"
        ? it
        : `${it.name}${(it.quantity ?? it.qty) ? ` × ${it.quantity ?? it.qty}` : ""}`
    ) ?? [];

  const money =
    typeof props.sum === "number"
      ? props.sum
      : typeof props.total === "number"
      ? props.total
      : undefined;

  const timeText =
    props.time ??
    (props.created_at
      ? new Date(props.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : undefined);

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <div className="badge-blue">{props.id}</div>
        {timeText && <div className="text-sm text-slate-500">{timeText}</div>}
      </div>

      <div className="font-semibold">{title}</div>

      {lines.length > 0 && (
        <ul className="text-sm list-disc ml-4">
          {lines.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}

      {typeof money === "number" && (
        <div className="font-bold">{Number(money ?? 0).toLocaleString("ru-RU")} ₸</div>
      )}

      {props.onClose && (
        <button className="btn-primary w-full" onClick={props.onClose}>
          Закрыть заказ
        </button>
      )}
    </div>
  );
}
