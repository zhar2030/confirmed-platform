import { useState } from 'react';

export function PremiumDark() {
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleOtp = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) document.getElementById(`otp-b-${i + 1}`)?.focus();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      dir="rtl"
      style={{
        background: 'linear-gradient(135deg, #0a1018 0%, #0F1923 50%, #0d1f2d 100%)',
      }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #C9A84C, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block">
            <div className="flex gap-1.5 justify-center mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E84E4E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#C9A84C]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF7D]" />
            </div>
            <h1 className="text-3xl font-black tracking-[0.4em] text-white">CONFIRMED</h1>
            <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent mt-3" />
            <p className="text-[10px] text-[#C9A84C] tracking-[0.3em] mt-2">منصة إدارة الصالونات</p>
          </div>
        </div>

        {/* Glass card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(201,168,76,0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* Gold top bar */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

          <div className="p-8">
            {step === 1 ? (
              <>
                <h2 className="text-xl font-bold text-white mb-1">تسجيل الدخول</h2>
                <p className="text-sm text-[#94A3B8] mb-7">أدخل بياناتك للمتابعة</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-2 tracking-wide">اسم المستخدم أو البريد</label>
                    <input
                      className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#475569] focus:outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      onFocus={e => {
                        e.target.style.border = '1px solid rgba(201,168,76,0.6)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)';
                      }}
                      onBlur={e => {
                        e.target.style.border = '1px solid rgba(255,255,255,0.1)';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="salon.owner"
                    />
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #C9A84C, #b8912f)',
                      color: '#0F1923',
                      boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
                    }}
                  >
                    إرسال رمز التحقق
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                  <p className="text-xs text-[#475569]">سيُرسَل رمز OTP إلى بريدك المسجّل</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setStep(1)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    →
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-white">رمز التحقق</h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">أُرسل إلى s••••r@gmail.com</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-center mb-6" dir="ltr">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-b-${i}`}
                      maxLength={1}
                      value={d}
                      onChange={e => handleOtp(i, e.target.value)}
                      className="w-11 h-14 text-center text-xl font-black text-[#C9A84C] rounded-xl focus:outline-none transition-all"
                      style={{
                        background: d ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.07)',
                        border: d ? '1.5px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.12)',
                      }}
                      onFocus={e => { e.target.style.border = '1.5px solid rgba(201,168,76,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)'; }}
                      onBlur={e => { e.target.style.border = d ? '1.5px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  ))}
                </div>

                <div className="rounded-xl p-3 mb-5 text-center" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <p className="text-xs text-[#C9A84C]">⏱ الرمز صالح لـ <strong>10 دقائق</strong></p>
                </div>

                <button
                  className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-all"
                  style={{ background: 'linear-gradient(135deg, #C9A84C, #b8912f)', color: '#0F1923', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}
                >
                  دخول اللوحة
                </button>

                <button className="w-full mt-3 text-xs text-[#475569] hover:text-[#C9A84C] transition-colors font-medium">
                  إعادة إرسال الرمز
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-[#334155] mt-6">© 2026 CONFIRMED</p>
      </div>
    </div>
  );
}
