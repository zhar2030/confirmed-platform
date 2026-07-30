/**
 * StaffInvitationAcceptPage — shown at /staff/accept?token=...
 * Staff sets their password and gets logged in immediately.
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { saveUnifiedSession } from '../lib/unifiedAuth';
import { saveProviderToken } from '../lib/providerAuth';

interface Props {
  token: string;
  onSuccess: (providerData: any) => void;
}

interface InvitationInfo {
  staffName:  string;
  staffRole:  string;
  staffEmail: string;
  salonName:  string;
}

const API_BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

function roleLabel(role: string, isAr: boolean): string {
  const map: Record<string, [string, string]> = {
    owner:      ['مالك الصالون', 'Salon Owner'],
    manager:    ['مدير', 'Manager'],
    cashier:    ['كاشير', 'Cashier'],
    specialist: ['متخصصة', 'Specialist'],
  };
  return map[role]?.[isAr ? 0 : 1] ?? role;
}

export default function StaffInvitationAcceptPage({ token, onSuccess }: Props) {
  const { isAr } = useLanguage();
  const [info, setInfo]         = useState<InvitationInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);

  // Fetch invitation info
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/staff/invitation-info?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          if (data.error === 'invitation_expired') setError(isAr ? 'انتهت صلاحية الدعوة (72 ساعة)' : 'Invitation link has expired (72h)');
          else if (data.error === 'invitation_already_used') setError(isAr ? 'تم استخدام هذه الدعوة مسبقاً' : 'This invitation has already been accepted');
          else setError(isAr ? 'رابط الدعوة غير صالح' : 'Invalid invitation link');
        } else {
          setInfo(data);
        }
      })
      .catch(() => setError(isAr ? 'تعذّر الاتصال بالخادم' : 'Could not reach server'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError(isAr ? 'كلمة المرور وتأكيدها غير متطابقتَين' : 'Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res  = await fetch(`${API_BASE}/api/auth/staff/accept-invitation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error === 'invitation_expired') setError(isAr ? 'انتهت صلاحية الدعوة' : 'Invitation expired');
        else if (data.error === 'invitation_already_used') setError(isAr ? 'تم قبول الدعوة مسبقاً' : 'Invitation already accepted');
        else if (data.error === 'password_too_short') setError(isAr ? 'كلمة المرور قصيرة جداً (الحد الأدنى 8 أحرف)' : 'Password too short (min 8 chars)');
        else setError(isAr ? 'فشل قبول الدعوة. يرجى المحاولة مجدداً.' : 'Failed to accept invitation. Please try again.');
        return;
      }

      // Save unified session
      const s = data.session;
      saveUnifiedSession({
        token:       s.token,
        tenantId:    s.tenantId,
        actorId:     s.actorId,
        actorType:   s.actorType,
        role:        s.role,
        permissions: s.permissions ?? [],
        staffName:   data.staffName,
        salonName:   data.salonName,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess({
          id:          String(s.tenantId),
          username:    data.staffName,
          storeName:   data.salonName,
          name:        data.staffName,
          role:        s.role,
          paymentStatus: 'paid_verified',
          actorType:   'staff',
        });
      }, 1500);
    } catch {
      setError(isAr ? 'تعذّر الاتصال بالخادم' : 'Could not reach server');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = password.length >= 12 ? 'strong' : password.length >= 8 ? 'medium' : 'weak';
  const strengthColor = { strong: '#059669', medium: '#D97706', weak: '#DC2626' }[strength];
  const strengthLabel = { strong: isAr ? 'قوية' : 'Strong', medium: isAr ? 'متوسطة' : 'Medium', weak: isAr ? 'ضعيفة' : 'Weak' }[strength];

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #0a1218 0%, #0a1628 100%)' }}>

      {/* Geometric overlay */}
      <div className="fixed inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(60deg, #C9A84C 0, #C9A84C 1px, transparent 0, transparent 50%)', backgroundSize: '30px 30px' }} />

      <div className="relative z-10 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-white font-black tracking-[6px] text-xl mb-1" style={{ fontFamily: 'serif' }}>CONFIRMED</p>
          <p className="text-xs" style={{ color: '#C9A84C', letterSpacing: '2px' }}>دعوة للانضمام إلى الفريق</p>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">

          {loading && (
            <div className="p-10 text-center">
              <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">{isAr ? 'جاري التحقق من الدعوة…' : 'Verifying invitation…'}</p>
            </div>
          )}

          {!loading && error && !info && (
            <div className="p-10 text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
              <p className="font-bold text-gray-800">{isAr ? 'رابط غير صالح' : 'Invalid Link'}</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-10 text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-bold text-gray-800">{isAr ? 'مرحباً في الفريق!' : 'Welcome to the team!'}</p>
              <p className="text-sm text-gray-500">{isAr ? 'جاري فتح لوحة التحكم…' : 'Opening dashboard…'}</p>
            </div>
          )}

          {!loading && info && !success && (
            <>
              {/* Salon info header */}
              <div className="p-6 text-center" style={{ background: '#0F1923' }}>
                <p className="text-xs mb-1" style={{ color: '#C9A84C', letterSpacing: '2px' }}>{isAr ? 'دُعيت للانضمام إلى' : 'YOU\'VE BEEN INVITED TO'}</p>
                <h2 className="text-white font-bold text-lg">{info.salonName}</h2>
                <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
                  {roleLabel(info.staffRole, isAr)}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{isAr ? 'مرحباً،' : 'Hello,'}</p>
                  <p className="font-bold text-gray-900">{info.staffName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{info.staffEmail}</p>
                </div>

                <div className="h-px bg-gray-100" />

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {/* Password field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {isAr ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required minLength={8}
                      placeholder={isAr ? '٨ أحرف على الأقل' : 'At least 8 characters'}
                      className="w-full ps-9 pe-9 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 transition-all"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute end-3 top-3 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: strength === 'strong' ? '100%' : strength === 'medium' ? '60%' : '25%', background: strengthColor }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: strengthColor }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      placeholder={isAr ? 'أعد كتابة كلمة المرور' : 'Repeat your password'}
                      className={`w-full ps-9 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none transition-all ${
                        confirm && confirm !== password
                          ? 'border-red-300 bg-red-50 focus:border-red-400'
                          : 'border-gray-200 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20'
                      }`}
                    />
                  </div>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-60"
                  style={{ background: '#0F1923', color: '#C9A84C' }}>
                  {submitting
                    ? (isAr ? 'جاري إنشاء الحساب…' : 'Creating account…')
                    : (isAr ? 'إنشاء الحساب والدخول' : 'Create Account & Sign In')}
                </button>

                <p className="text-center text-xs text-gray-400">
                  {isAr ? 'الدعوة صالحة لمدة 72 ساعة من وقت إرسالها' : 'Invitation valid for 72 hours from when it was sent'}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
