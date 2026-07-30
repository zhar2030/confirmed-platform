import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast } from './adminTypes';

interface Props { toasts: Toast[]; onDismiss: (id: string) => void; }

export default function AdminToast({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed top-4 end-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const cfg = {
    success: { bg: 'bg-emerald-600', icon: CheckCircle },
    error:   { bg: 'bg-red-600',     icon: XCircle },
    warning: { bg: 'bg-amber-500',   icon: AlertTriangle },
    info:    { bg: 'bg-blue-600',    icon: Info },
  }[toast.type];

  const Icon = cfg.icon;

  return (
    <div className={`pointer-events-auto flex items-center gap-3 ${cfg.bg} text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold min-w-[260px] max-w-sm animate-slideIn`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="text-white/70 hover:text-white cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
