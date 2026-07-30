import React, { useState } from 'react';
import { Eye, EyeOff, Lock, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Props {
  token: string;
  email: string;
  onSuccess: () => void;
}

export default function ResetPasswordPage({ token, email, onSuccess }: Props) {
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [done, setDone]                       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword }),
      });

      let data: any = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }

      if (!res.ok || !data?.success) {
        if (data?.error === 'expired' || data?.error === 'not_found') {
          setError('انتهت صلاحية الرابط (١٠ دقائق). اطلب رابطاً جديداً من صفحة "نسيت كلمة المرور".');
        } else if (data?.error === 'wrong_otp') {
          setError('الرابط غير صالح. يُرجى طلب رابط جديد.');
        } else if (data?.error === 'password_too_short') {
          setError('كلمة المرور قصيرة جداً. استخدمي 8 أحرف على الأقل.');
        } else if (data?.error === 'user_not_found') {
          setError('لم يتم العثور على الحساب. تحققي من البريد الإلكتروني.');
        } else {
          setError(data?.messageAr || 'حدث خطأ غير متوقع. حاولي مجدداً.');
        }
        return;
      }

      // ✅ نجاح — احفظ الإيميل في sessionStorage لفتح نموذج الدخول تلقائياً
      try {
        sessionStorage.setItem('post_reset_email', email);
        sessionStorage.setItem('open_login_after_reset', '1');
      } catch { /* ignore */ }

      setDone(true);
      setTimeout(() => {
        // Clear the hash fragment and reload to show login page
        window.history.replaceState({}, '', (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') + '/');
        onSuccess();
      }, 1800);

    } catch {
      setError('تعذّر الاتصال بالخادم. تحققي من الإنترنت وأعيدي المحاولة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5', padding: '16px', fontFamily: "'Segoe UI', Arial, sans-serif" }}
    >
      <div style={{ width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.12)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: '#0F1923', padding: '32px 40px', textAlign: 'center' }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E84E4E', display: 'inline-block' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4CAF7D', display: 'inline-block' }} />
          </div>
          <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '6px' }}>CONFIRMED</p>
          <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#C9A84C', letterSpacing: '2px' }}>تعيين كلمة مرور جديدة</p>
        </div>

        {/* Body */}
        <div style={{ padding: '36px 40px' }}>
          {done ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 style={{ width: '32px', height: '32px', color: '#16A34A' }} />
              </div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '18px', color: '#0F1923' }}>تم تغيير كلمة المرور!</p>
              <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', lineHeight: 1.6 }}>
                جارٍ تحويلك لصفحة تسجيل الدخول...
                <br/>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>سجّلي الدخول بكلمة المرور الجديدة</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', lineHeight: 1.7 }}>
                أدخلي كلمة المرور الجديدة لحساب:
                <br/>
                <strong style={{ color: '#0F1923', fontSize: '14px' }}>{email}</strong>
              </p>

              {/* New password */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  كلمة المرور الجديدة
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', right: '14px', top: '13px', width: '16px', height: '16px', color: '#9CA3AF' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="8 أحرف كحد أدنى"
                    autoFocus
                    style={{ width: '100%', boxSizing: 'border-box', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: '12px', padding: '12px 44px 12px 44px', fontSize: '14px', color: '#111827', outline: 'none', transition: 'border 0.2s' }}
                    onFocus={e => (e.target.style.borderColor = '#C9A84C')}
                    onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{ position: 'absolute', left: '14px', top: '13px', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}
                  >
                    {showPassword ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  تأكيد كلمة المرور
                </label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck style={{ position: 'absolute', right: '14px', top: '13px', width: '16px', height: '16px', color: confirmPassword && confirmPassword === newPassword ? '#10B981' : '#9CA3AF' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="أعيدي كتابة كلمة المرور"
                    style={{ width: '100%', boxSizing: 'border-box', background: '#F9FAFB', border: `1.5px solid ${confirmPassword && confirmPassword === newPassword ? '#10B981' : '#E5E7EB'}`, borderRadius: '12px', padding: '12px 44px 12px 16px', fontSize: '14px', color: '#111827', outline: 'none', transition: 'border 0.2s' }}
                    onFocus={e => (e.target.style.borderColor = '#C9A84C')}
                    onBlur={e => (e.target.style.borderColor = confirmPassword === newPassword && confirmPassword ? '#10B981' : '#E5E7EB')}
                  />
                </div>
              </div>

              {/* Password strength */}
              {newPassword.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ height: '4px', flex: 1, borderRadius: '4px', background: newPassword.length < 8 ? (i === 1 ? '#EF4444' : '#E5E7EB') : newPassword.length < 12 ? (i <= 2 ? '#F59E0B' : '#E5E7EB') : (i <= 3 ? '#10B981' : (newPassword.length >= 16 ? '#10B981' : '#E5E7EB')), transition: 'background 0.3s' }} />
                  ))}
                  <span style={{ fontSize: '11px', color: '#9CA3AF', minWidth: '36px' }}>
                    {newPassword.length < 8 ? 'ضعيفة' : newPassword.length < 12 ? 'متوسطة' : 'قوية'}
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#DC2626', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                style={{ width: '100%', background: loading || !newPassword || !confirmPassword ? '#6B7280' : '#0F1923', color: '#fff', border: 'none', borderRadius: '14px', padding: '14px', fontSize: '14px', fontWeight: 800, cursor: loading || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s', letterSpacing: '0.3px' }}
              >
                {loading ? (
                  <><RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /><span>جارٍ الحفظ...</span></>
                ) : (
                  <><ShieldCheck style={{ width: '16px', height: '16px', color: '#C9A84C' }} /><span>حفظ كلمة المرور</span></>
                )}
              </button>

              <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF', textAlign: 'center' }}>
                ⏱ هذا الرابط صالح لمدة ١٠ دقائق فقط ويُستخدم مرة واحدة
              </p>
            </form>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
