/**
 * LogoutConfirmModal — نافذة تأكيد تسجيل الخروج الاحترافية
 * مشتركة بين جميع لوحات التحكم (أدمن، مزود، شاشة القفل)
 *
 * عند التأكيد:
 *   1. تُمسح جميع بيانات الجلسة (localStorage + sessionStorage + admin token)
 *   2. يُستبدل إدخال التاريخ الحالي لمنع الرجوع بزر Back
 *   3. يُضاف مستمع popstate لإعادة التوجيه إذا حاول المستخدم الرجوع
 *   4. ينتقل التطبيق إلى صفحة تسجيل الدخول عبر onConfirm()
 */
import React, { useEffect, useRef } from 'react';
import { LogOut, ShieldAlert, X } from 'lucide-react';

interface Props {
  open: boolean;
  isAr: boolean;
  userName?: string;
  userRole?: 'admin' | 'provider' | 'staff';
  onConfirm: () => void;
  onCancel: () => void;
}

/** مسح كامل للجلسة من التخزين المحلي */
export function purgeAllSessionData(): void {
  const keysToRemove = [
    'confirmed_session',
    'confirmed_admin_token',
    'confirmed_subscription_packages',
    'confirmed_provider_requests',
  ];
  keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
  try { sessionStorage.clear(); } catch { /* ignore */ }
}

/** منع الرجوع بزر Back بعد تسجيل الخروج */
export function preventBackNavigation(): void {
  try {
    // استبدل الإدخال الحالي بحالة "logged-out"
    window.history.replaceState({ loggedOut: true }, '', window.location.href);
    // أضف إدخالاً جديداً فوقه — حتى لو ضغط Back يعود لنفس المكان
    window.history.pushState({ loggedOut: true }, '', window.location.href);

    const handlePopState = () => {
      // إذا حاول الرجوع، ادفعه للأمام مجدداً
      window.history.pushState({ loggedOut: true }, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    // نظّف المستمع بعد 30 ثانية (بعد انتهاء الحاجة)
    setTimeout(() => window.removeEventListener('popstate', handlePopState), 30_000);
  } catch { /* ignore — بيئات لا تدعم history API */ }
}

export default function LogoutConfirmModal({
  open,
  isAr,
  userName,
  userRole = 'provider',
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Trap focus + ESC to cancel
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const roleLabel = isAr
    ? userRole === 'admin' ? 'مالكة المنصة' : userRole === 'staff' ? 'موظفة' : 'مزودة خدمة'
    : userRole === 'admin' ? 'Platform Owner' : userRole === 'staff' ? 'Staff Member' : 'Service Provider';

  const handleConfirm = () => {
    purgeAllSessionData();
    preventBackNavigation();
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0A1118]/70 backdrop-blur-md"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)' }}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#FF5A5F] via-[#FF8C61] to-[#FFAE34]" />

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 end-3 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          aria-label={isAr ? 'إغلاق' : 'Close'}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="p-7 space-y-5">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-2 bg-red-100 rounded-full blur-md opacity-60" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-[#FF5A5F]" />
              </div>
            </div>
          </div>

          {/* Title + body */}
          <div className="text-center space-y-2">
            <h2 id="logout-title" className="text-lg font-bold text-slate-800">
              {isAr ? 'تسجيل الخروج' : 'Sign Out'}
            </h2>
            {userName && (
              <p className="text-xs text-slate-400 font-mono">
                {userName} · {roleLabel}
              </p>
            )}
            <p className="text-sm text-slate-600 leading-relaxed">
              {isAr
                ? 'ستنتهي جلستك الحالية وستنتقل إلى صفحة تسجيل الدخول. أي بيانات غير محفوظة ستُفقد.'
                : "Your current session will end and you'll be taken to the login page. Any unsaved data will be lost."}
            </p>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              {isAr
                ? 'سيتم مسح جميع بيانات الجلسة والرموز الأمنية. لن تتمكن من الوصول للصفحات المحمية.'
                : 'All session data and security tokens will be cleared. Protected pages will be inaccessible.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              ref={cancelRef}
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5A5F] to-[#E04B50] hover:from-[#E04B50] hover:to-[#C93B40] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              {isAr ? 'تسجيل الخروج' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}
