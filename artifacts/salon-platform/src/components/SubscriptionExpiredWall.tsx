/**
 * SubscriptionExpiredWall — shown when tenant subscription has expired.
 * Owner sees renewal options; staff sees "contact your owner" message.
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Phone, LogOut } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { getUnifiedSession } from '../lib/unifiedAuth';

interface SubscriptionExpiredWallProps {
  salonName?: string;
  onLogout: () => void;
  onRenew?: () => void;  // owner only
}

export default function SubscriptionExpiredWall({
  salonName,
  onLogout,
  onRenew,
}: SubscriptionExpiredWallProps) {
  const { isAr } = useLanguage();
  const session = getUnifiedSession();
  const isOwner = session?.actorType === 'owner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #0a1218 0%, #0a1628 100%)' }}>
      {/* Geometric overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(60deg, #C9A84C 0, #C9A84C 1px, transparent 0, transparent 50%)', backgroundSize: '30px 30px' }} />

      <div className="relative z-10 w-full max-w-md text-center space-y-6">

        {/* Logo */}
        <p className="text-white font-black tracking-[6px] text-xl" style={{ fontFamily: 'serif' }}>
          CONFIRMED
        </p>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)' }}>
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
        </div>

        {/* Main message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-white">
            {isAr ? 'اشتراككم منتهٍ' : 'Subscription Expired'}
          </h1>
          {salonName && (
            <p className="text-sm font-semibold" style={{ color: '#C9A84C' }}>
              {salonName}
            </p>
          )}
          <p className="text-sm text-white/60 leading-relaxed max-w-sm mx-auto">
            {isOwner
              ? isAr
                ? 'انتهى اشتراك صالونك على منصة CONFIRMED. جدد الاشتراك الآن لاستعادة الوصول الكامل إلى جميع الميزات.'
                : 'Your salon subscription on CONFIRMED has expired. Renew now to restore full access to all features.'
              : isAr
                ? 'اشتراك الصالون منتهٍ — تواصل مع صاحب الصالون لتجديد الاشتراك والعودة إلى العمل.'
                : "Your salon's subscription has expired. Contact the salon owner to renew and restore access."}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {isOwner && onRenew && (
            <button
              onClick={onRenew}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all"
              style={{ background: '#C9A84C', color: '#0F1923' }}>
              <RefreshCw className="w-4 h-4" />
              {isAr ? 'تجديد الاشتراك الآن' : 'Renew Subscription Now'}
            </button>
          )}

          {!isOwner && (
            <div className="flex items-center justify-center gap-3 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Phone className="w-5 h-5 shrink-0" style={{ color: '#C9A84C' }} />
              <p className="text-sm text-white/70 text-start">
                {isAr
                  ? 'تواصل مع صاحب الصالون لتجديد الاشتراك'
                  : 'Contact your salon owner to renew the subscription'}
              </p>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
            <LogOut className="w-4 h-4" />
            {isAr ? 'تسجيل الخروج' : 'Sign Out'}
          </button>
        </div>

        <p className="text-xs text-white/20">
          {isAr ? '© 2026 CONFIRMED · confirmedgrowth.com' : '© 2026 CONFIRMED · confirmedgrowth.com'}
        </p>
      </div>
    </div>
  );
}
