export default function ConfirmDialog({ title, message, confirmText="OK", cancelText="Отмена", onConfirm, onCancel }:{ title:string; message:string; confirmText?:string; cancelText?:string; onConfirm: ()=>void; onCancel: ()=>void; }){
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl">
        <div className="p-5 border-b text-lg font-semibold">{title}</div>
        <div className="p-5 text-slate-700">{message}</div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-50">{cancelText}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}