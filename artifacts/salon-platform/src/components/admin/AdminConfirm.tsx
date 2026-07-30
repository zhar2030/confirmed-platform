import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AdminConfirm({ open, title, message, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', danger = false, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-scaleIn">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
              <AlertTriangle className={`w-4 h-4 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-slate-300 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">{cancelLabel}</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer transition-all ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#FF5A5F] hover:bg-[#E04B50]'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
