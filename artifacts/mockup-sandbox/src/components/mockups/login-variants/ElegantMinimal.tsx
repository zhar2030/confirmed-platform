import { useState } from 'react';

export function ElegantMinimal() {
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleOtp = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) {
      const el = document.getElementById(`otp-a-${i + 1}`);
      el?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center p-6 font-sans" dir="rtl">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[#C9A84C]" />
              <span className="w-2 h-2 rounded-full bg-[#0F1923]" />
              <span className="w-2 h-2 rounded-full bg-[#C9A84C] opacity-50" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-[0.3em] text-[#0F1923]">CONFIRMED</h1>
          <p className="text-xs text-[#9CA3AF] mt-1 tracking-widest">منصة إدارة الصالونات</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E5E7EB] overflow-hidden">

          {/* Step indicator */}
          <div className="flex border-b border-[#F3F4F6]">
            <div className={`flex-1 py-3 text-center text-xs font-bold tracking-wide transition-colors ${step === 1 ? 'text-[#0F1923] border-b-2 border-[#C9A84C]' : 'text-[#9CA3AF]'}`}>
              ① الدخول
            </div>
            <div className={`flex-1 py-3 text-center text-xs font-bold tracking-wide transition-colors ${step === 2 ? 'text-[#0F1923] border-b-2 border-[#C9A84C]' : 'text-[#9CA3AF]'}`}>
              ② التحقق
            </div>
          </div>

          <div className="p-8">
            {step === 1 ? (
              <>
                <h2 className="text-lg font-bold text-[#0F1923] mb-1">مرحباً بعودتك</h2>
                <p className="text-sm text-[#6B7280] mb-6">أدخل اسم المستخدم أو البريد الإلكتروني</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-2">اسم المستخدم / البريد</label>
                    <div className="relative">
                      <input
                        className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 transition-all"
                        placeholder="salon.owner"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-[#0F1923] text-white rounded-xl py-3.5 text-sm font-bold tracking-wide hover:bg-[#1a2a3a] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <span>إرسال رمز التحقق</span>
                    <span className="text-[#C9A84C]">←</span>
                  </button>
                </div>

                <p className="text-center text-xs text-[#9CA3AF] mt-6">
                  سيُرسَل رمز OTP إلى بريدك المسجّل
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <button onClick={() => setStep(1)} className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#374151] hover:bg-[#E5E7EB] transition-colors text-sm">→</button>
                  <div>
                    <h2 className="text-lg font-bold text-[#0F1923]">رمز التحقق</h2>
                    <p className="text-xs text-[#6B7280]">أُرسل إلى s••••r@gmail.com</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-center mb-6" dir="ltr">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-a-${i}`}
                      maxLength={1}
                      value={d}
                      onChange={e => handleOtp(i, e.target.value)}
                      className="w-11 h-14 text-center text-xl font-black bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 text-[#0F1923] transition-all"
                    />
                  ))}
                </div>

                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 mb-5 text-center">
                  <p className="text-xs text-[#92400E]">⏱ صالح لمدة <strong>10 دقائق</strong></p>
                </div>

                <button className="w-full bg-[#0F1923] text-white rounded-xl py-3.5 text-sm font-bold tracking-wide hover:bg-[#1a2a3a] transition-all">
                  تسجيل الدخول
                </button>

                <button className="w-full mt-3 text-xs text-[#C9A84C] font-semibold hover:underline">
                  إعادة إرسال الرمز
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-[#9CA3AF] mt-6">© 2026 CONFIRMED — confirmedgrowth.com</p>
      </div>
    </div>
  );
}
