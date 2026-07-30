import { useState } from 'react';

export function SaudiModern() {
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleOtp = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) document.getElementById(`otp-c-${i + 1}`)?.focus();
  };

  return (
    <div className="min-h-screen flex" dir="rtl">

      {/* Left brand panel */}
      <div
        className="hidden md:flex w-5/12 flex-col items-center justify-center p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0F1923 0%, #1a2e40 100%)' }}
      >
        {/* Pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #C9A84C 0, #C9A84C 1px, transparent 0, transparent 50%)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center">
          <div className="flex gap-1.5 justify-center mb-6">
            <span className="w-3 h-3 rounded-full bg-[#E84E4E]" />
            <span className="w-3 h-3 rounded-full bg-[#C9A84C]" />
            <span className="w-3 h-3 rounded-full bg-[#4CAF7D]" />
          </div>
          <h1 className="text-4xl font-black tracking-[0.35em] text-white mb-2">CONFIRMED</h1>
          <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-4" />
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em]">منصة إدارة الصالونات</p>

          <div className="mt-12 space-y-4 text-right">
            {[
              { icon: '📅', text: 'إدارة الحجوزات بذكاء' },
              { icon: '👥', text: 'فريق عمل منظّم' },
              { icon: '📊', text: 'تقارير وإحصائيات لحظية' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm text-[#94A3B8]">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 bg-[#FAFAFA] flex items-center justify-center p-8">
        <div className="w-full max-w-xs">

          {/* Mobile logo */}
          <div className="md:hidden text-center mb-8">
            <h1 className="text-2xl font-black tracking-[0.35em] text-[#0F1923]">CONFIRMED</h1>
            <p className="text-xs text-[#9CA3AF] mt-1">منصة إدارة الصالونات</p>
          </div>

          {step === 1 ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-black text-[#0F1923]">تسجيل الدخول</h2>
                <p className="text-sm text-[#6B7280] mt-1">مرحباً بعودتك إلى منصتك</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#374151] mb-2 tracking-wide">اسم المستخدم أو البريد</label>
                  <div className="relative">
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">@</div>
                    <input
                      className="w-full bg-white border-2 border-[#E5E7EB] rounded-2xl pr-9 pl-4 py-3.5 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A84C] transition-all"
                      placeholder="salon.owner"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full rounded-2xl py-4 text-sm font-black tracking-widest transition-all active:scale-[0.98] shadow-lg"
                  style={{
                    background: '#0F1923',
                    color: '#C9A84C',
                    boxShadow: '0 8px 25px rgba(15,25,35,0.25)',
                  }}
                >
                  إرسال رمز OTP
                </button>

                <p className="text-center text-xs text-[#9CA3AF]">
                  سيصلك رمز مكوّن من 6 أرقام
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0F1923] transition-colors mb-4 font-medium">
                  <span>←</span><span>رجوع</span>
                </button>
                <h2 className="text-2xl font-black text-[#0F1923]">التحقق بـ OTP</h2>
                <p className="text-sm text-[#6B7280] mt-1">أُرسل الرمز إلى <span className="font-semibold text-[#0F1923]">s••••r@gmail.com</span></p>
              </div>

              {/* OTP Boxes */}
              <div className="mb-6" dir="ltr">
                <div className="flex gap-2 justify-center">
                  {otp.map((d, i) => (
                    <div key={i} className="relative">
                      <input
                        id={`otp-c-${i}`}
                        maxLength={1}
                        value={d}
                        onChange={e => handleOtp(i, e.target.value)}
                        className="w-11 h-14 text-center text-xl font-black rounded-xl focus:outline-none transition-all"
                        style={{
                          background: d ? '#0F1923' : 'white',
                          color: d ? '#C9A84C' : '#0F1923',
                          border: d ? '2px solid #0F1923' : '2px solid #E5E7EB',
                        }}
                        onFocus={e => { if (!d) e.target.style.border = '2px solid #C9A84C'; }}
                        onBlur={e => { if (!d) e.target.style.border = '2px solid #E5E7EB'; }}
                      />
                      {i === 2 && <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#D1D5DB]" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-between text-xs mb-6 px-1">
                <span className="text-[#9CA3AF]">⏱ ينتهي خلال 10:00</span>
                <button className="text-[#C9A84C] font-bold hover:underline">إعادة الإرسال</button>
              </div>

              <button
                className="w-full rounded-2xl py-4 text-sm font-black tracking-widest shadow-lg transition-all"
                style={{ background: '#0F1923', color: '#C9A84C', boxShadow: '0 8px 25px rgba(15,25,35,0.25)' }}
              >
                دخول اللوحة
              </button>

              {/* Security note */}
              <p className="text-center text-xs text-[#9CA3AF] mt-4">
                🔒 CONFIRMED لن تطلب منك مشاركة هذا الرمز
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
