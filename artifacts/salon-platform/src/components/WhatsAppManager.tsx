/**
 * WhatsAppManager — provider dashboard section for WhatsApp Business integration.
 *
 * Flow:
 *  1. Fetch /api/whatsapp/app-config → get appId + configId
 *  2. Preload Meta FB JS SDK in background (so click → FB.login is instant)
 *  3. User clicks "Connect" → FB.login() → get auth code
 *  4. POST /api/whatsapp/fetch-waba-phones → discover WABA + phone numbers
 *  5. If multiple phones → show selection UI
 *  6. POST /api/whatsapp/oauth/callback → save chosen phone + token
 *  7. Show connected state, conversations, settings, setup guide
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Link2, Link2Off, Wifi, WifiOff,
  RefreshCw, Clock, Globe, Settings, AlertCircle,
  CheckCircle2, PhoneCall, ChevronRight, Users,
  Copy, ExternalLink, Shield, Book, ChevronDown,
  Loader2, Info, Check,
} from 'lucide-react';
import { getUnifiedHeaders } from '../lib/unifiedAuth';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppConfig {
  appId:    string;
  configId: string;
}

interface DiscoveredPhone {
  phoneNumberId: string;
  displayPhone:  string;
  wabaId:        string;
  verifiedName:  string;
}

interface WhatsAppPhone {
  id:                  number;
  phone_number_id:     string;
  display_phone:       string;
  waba_id:             string;
  is_active:           boolean;
  is_primary:          boolean;
  rate_limit_per_min:  number;
  rate_limit_per_hour: number;
  created_at:          string;
}

interface Conversation {
  id:               number;
  wa_from:          string;
  state:            string;
  lang:             string;
  last_activity_at: string;
  message_count:    number;
}

type ConnectStep =
  | 'idle'
  | 'loading-sdk'
  | 'waiting-fb'
  | 'fetching-phones'
  | 'selecting-phone'
  | 'saving'
  | 'done';

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  GREETING:        { label: 'ترحيب',        color: 'bg-blue-50 text-blue-600' },
  MENU:            { label: 'القائمة',       color: 'bg-blue-50 text-blue-600' },
  SERVICE_SELECT:  { label: 'اختيار خدمة',  color: 'bg-purple-50 text-purple-600' },
  STAFF_SELECT:    { label: 'اختيار موظفة', color: 'bg-purple-50 text-purple-600' },
  DATE_SELECT:     { label: 'اختيار تاريخ', color: 'bg-amber-50 text-amber-600' },
  TIME_SELECT:     { label: 'اختيار وقت',   color: 'bg-amber-50 text-amber-600' },
  BOOKING_CONFIRM: { label: 'تأكيد حجز',    color: 'bg-green-50 text-green-600' },
  CANCEL_PICK:     { label: 'إلغاء موعد',   color: 'bg-red-50 text-red-500' },
  CANCEL_CONFIRM:  { label: 'تأكيد الإلغاء', color: 'bg-red-50 text-red-500' },
  MODIFY_PICK:     { label: 'تعديل موعد',   color: 'bg-orange-50 text-orange-600' },
  INQUIRY:         { label: 'استفسار',       color: 'bg-sky-50 text-sky-600' },
  COMPLETED:       { label: 'مكتملة',        color: 'bg-gray-100 text-gray-500' },
};

// ── FB SDK loader ─────────────────────────────────────────────────────────────

declare global {
  interface Window {
    FB:          any;
    fbAsyncInit: () => void;
  }
}

function loadFBSDK(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: 'v21.0' });
      return resolve();
    }
    window.fbAsyncInit = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: 'v21.0' });
      resolve();
    };
    if (document.getElementById('fb-sdk')) return; // already loading
    const s = document.createElement('script');
    s.id    = 'fb-sdk';
    s.src   = 'https://connect.facebook.net/en_US/sdk.js';
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    document.head.appendChild(s);
  });
}

function launchFBLogin(configId?: string): Promise<{ code?: string; accessToken?: string } | null> {
  return new Promise((resolve) => {
    const params: Record<string, any> = {
      scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
      response_type: 'code',
      override_default_response_type: true,
    };
    if (configId) {
      params['config_id'] = configId;
      params['extras']    = { sessionInfoVersion: 2 };
    }
    window.FB.login((response: any) => {
      if (!response?.authResponse) { resolve(null); return; }
      resolve({ code: response.authResponse.code, accessToken: response.authResponse.accessToken });
    }, params);
  });
}

// ── Copy-to-clipboard helper ──────────────────────────────────────────────────

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);
  return { copied, copy };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function WhatsAppManager() {
  const [appConfig,      setAppConfig]      = useState<AppConfig | null>(null);
  const [configLoading,  setConfigLoading]  = useState(true);
  const [sdkReady,       setSdkReady]       = useState(false);
  const [phones,         setPhones]         = useState<WhatsAppPhone[]>([]);
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [tab,            setTab]            = useState<'status' | 'conversations' | 'guide' | 'settings'>('status');

  const [connectStep,    setConnectStep]    = useState<ConnectStep>('idle');
  const [connectError,   setConnectError]   = useState<string | null>(null);
  const [discovered,     setDiscovered]     = useState<DiscoveredPhone[]>([]);
  const [pendingToken,   setPendingToken]   = useState<string | null>(null);
  const [selectedPhone,  setSelectedPhone]  = useState<string | null>(null);

  const [editLimits,     setEditLimits]     = useState<{ id: number; min: number; hour: number } | null>(null);
  const [savingLimits,   setSavingLimits]   = useState(false);

  const headers    = getUnifiedHeaders();
  const webhookUrl = `${window.location.origin.replace(window.location.pathname, '')}/api/webhooks/whatsapp`;
  const { copied, copy } = useCopied();

  // ── Fetch app config + preload SDK ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setConfigLoading(true);
      try {
        const r = await fetch('/api/whatsapp/app-config', { headers });
        if (r.ok) {
          const cfg = await r.json() as AppConfig;
          setAppConfig(cfg);
          // Preload FB SDK in background
          loadFBSDK(cfg.appId)
            .then(() => setSdkReady(true))
            .catch(err => console.warn('[WhatsApp] SDK preload failed:', err.message));
        }
      } finally {
        setConfigLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch phones + conversations ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [phonesRes, convRes] = await Promise.all([
        fetch('/api/whatsapp/phones',        { headers }),
        fetch('/api/whatsapp/conversations', { headers }),
      ]);
      if (phonesRes.ok) {
        const d = await phonesRes.json().catch(() => null);
        if (d) setPhones(d.phones ?? []);
      }
      if (convRes.ok) {
        const d = await convRes.json().catch(() => null);
        if (d) setConversations(d.conversations ?? []);
      }
    } finally {
      setDataLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Connect: Meta Embedded Signup ─────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setConnectError(null);

    if (!appConfig?.appId) {
      setConnectError('WHATSAPP_APP_ID غير مضبوط. يرجى التواصل مع إدارة المنصة.');
      return;
    }

    try {
      // Step 1: ensure SDK ready
      if (!sdkReady) {
        setConnectStep('loading-sdk');
        try {
          await loadFBSDK(appConfig.appId);
          setSdkReady(true);
        } catch {
          setConnectError('تعذّر تحميل Facebook SDK. يرجى التحقق من الاتصال بالإنترنت.');
          setConnectStep('idle');
          return;
        }
      }

      // Step 2: launch FB.login() — MUST happen close to button click for popup to work
      setConnectStep('waiting-fb');
      const authResult = await launchFBLogin(appConfig.configId || undefined);

      if (!authResult) {
        setConnectStep('idle');
        return; // User closed popup
      }

      // Step 3: discover WABA phones
      setConnectStep('fetching-phones');
      const fetchRes = await fetch('/api/whatsapp/fetch-waba-phones', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body:    JSON.stringify(authResult),
      });

      if (!fetchRes.ok) {
        const err = await fetchRes.json().catch(() => ({})) as any;
        throw new Error(err.error ?? 'فشل في جلب أرقام WABA');
      }

      const { phones: foundPhones, token } = await fetchRes.json() as { phones: DiscoveredPhone[]; token: string };
      setPendingToken(token);

      if (foundPhones.length === 0) {
        setConnectError('لم يُعثر على أرقام واتساب بيزنس مرتبطة بهذا الحساب. تأكد من إكمال إعداد WABA في Meta Business Manager.');
        setConnectStep('idle');
        return;
      }

      if (foundPhones.length === 1) {
        // Single phone — save directly
        setConnectStep('saving');
        await savePhone(foundPhones[0]!, token);
      } else {
        // Multiple phones — show selection
        setDiscovered(foundPhones);
        setSelectedPhone(foundPhones[0]!.phoneNumberId);
        setConnectStep('selecting-phone');
      }
    } catch (err: any) {
      setConnectError(err.message ?? 'حدث خطأ أثناء الربط');
      setConnectStep('idle');
    }
  }, [appConfig, sdkReady, headers]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePhone = useCallback(async (phone: DiscoveredPhone, token: string) => {
    setConnectStep('saving');
    try {
      const res = await fetch('/api/whatsapp/oauth/callback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body:    JSON.stringify({
          accessToken:   token,
          phoneNumberId: phone.phoneNumberId,
          wabaId:        phone.wabaId,
          displayPhone:  phone.displayPhone,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        throw new Error(err.error ?? 'فشل حفظ الرقم');
      }
      setConnectStep('done');
      setDiscovered([]);
      setPendingToken(null);
      await fetchData();
    } catch (err: any) {
      setConnectError(err.message ?? 'فشل حفظ الرقم');
      setConnectStep('idle');
    }
  }, [headers, fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectAndSave = useCallback(async () => {
    const phone = discovered.find(p => p.phoneNumberId === selectedPhone);
    if (!phone || !pendingToken) return;
    await savePhone(phone, pendingToken);
  }, [discovered, selectedPhone, pendingToken, savePhone]);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async (id: number) => {
    if (!confirm('هل أنت متأكد من فصل هذا الرقم؟ لن تصل رسائل واتساب بعد الفصل.')) return;
    await fetch(`/api/whatsapp/phones/${id}`, { method: 'DELETE', headers });
    await fetchData();
  }, [headers, fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save rate limits ───────────────────────────────────────────────────────
  const saveRateLimits = useCallback(async () => {
    if (!editLimits) return;
    setSavingLimits(true);
    try {
      await fetch(`/api/whatsapp/phones/${editLimits.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body:    JSON.stringify({ rateLimitPerMin: editLimits.min, rateLimitPerHour: editLimits.hour }),
      });
      setEditLimits(null);
      await fetchData();
    } finally {
      setSavingLimits(false);
    }
  }, [editLimits, headers, fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  const connected      = phones.filter(p => p.is_active);
  const isConnecting   = connectStep !== 'idle' && connectStep !== 'done';
  const notConfigured  = !configLoading && !appConfig?.appId;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">تكامل واتساب بيزنس</h2>
            <p className="text-sm text-gray-500">استقبل الحجوزات وأرسل التذكيرات عبر واتساب</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="تحديث">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${dataLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Not-configured banner ─────────────────────────────────────── */}
      {notConfigured && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">التكامل يحتاج إعداداً أولياً</p>
            <p className="text-xs text-amber-600 mt-0.5">
              يجب ضبط المتغيرات <code className="font-mono">WHATSAPP_APP_ID</code> و
              <code className="font-mono"> WHATSAPP_APP_SECRET</code> و
              <code className="font-mono"> WHATSAPP_VERIFY_TOKEN</code> في بيئة السيرفر أولاً.
              راجع تبويب <strong>دليل الإعداد</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ── Connection banner ─────────────────────────────────────────── */}
      {connected.length > 0 ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">واتساب متصل ونشط</p>
            <p className="text-xs text-green-600 mt-0.5">{connected[0]?.display_phone}</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
            <Wifi className="w-3 h-3" /> نشط
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
          <WifiOff className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700">لم يتم ربط واتساب بعد</p>
            <p className="text-xs text-gray-500 mt-0.5">اربط حسابك لتفعيل الحجز الآلي والتذكيرات</p>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
        {([
          { key: 'status',        label: 'الاتصال',      icon: Link2        },
          { key: 'conversations', label: 'المحادثات',    icon: MessageCircle },
          { key: 'guide',         label: 'دليل الإعداد', icon: Book         },
          { key: 'settings',      label: 'الإعدادات',    icon: Settings     },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap
              ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Tab: Connection
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'status' && (
        <div className="space-y-4">

          {/* ── Phone selection step ───────────────────────────────────── */}
          {connectStep === 'selecting-phone' && (
            <div className="border border-green-200 bg-green-50 rounded-xl p-5 space-y-4">
              <p className="text-sm font-semibold text-green-800">اختاري رقم الهاتف للربط</p>
              <div className="space-y-2">
                {discovered.map(p => (
                  <label
                    key={p.phoneNumberId}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedPhone === p.phoneNumberId
                        ? 'border-green-500 bg-white'
                        : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <input
                      type="radio"
                      name="phone"
                      value={p.phoneNumberId}
                      checked={selectedPhone === p.phoneNumberId}
                      onChange={() => setSelectedPhone(p.phoneNumberId)}
                      className="accent-green-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{p.displayPhone || p.phoneNumberId}</p>
                      {p.verifiedName && <p className="text-xs text-gray-400 truncate">{p.verifiedName}</p>}
                      <p className="text-xs text-gray-400 font-mono">ID: {p.phoneNumberId}</p>
                    </div>
                    {selectedPhone === p.phoneNumberId && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAndSave}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  ربط هذا الرقم
                </button>
                <button
                  onClick={() => { setConnectStep('idle'); setDiscovered([]); setPendingToken(null); }}
                  className="px-4 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* ── Error banner ────────────────────────────────────────────── */}
          {connectError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{connectError}</span>
            </div>
          )}

          {/* ── Connecting spinner states ────────────────────────────────── */}
          {isConnecting && connectStep !== 'selecting-phone' && (
            <div className="flex items-center justify-center gap-3 py-6 text-sm text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin text-green-500" />
              <span>
                {connectStep === 'loading-sdk'     && 'جاري تحميل Facebook SDK...'}
                {connectStep === 'waiting-fb'      && 'انتظر نافذة Meta Embedded Signup...'}
                {connectStep === 'fetching-phones' && 'جاري جلب أرقام الهاتف من Meta...'}
                {connectStep === 'saving'           && 'جاري حفظ الربط...'}
              </span>
            </div>
          )}

          {/* ── No phones connected ─────────────────────────────────────── */}
          {connected.length === 0 && connectStep === 'idle' && (
            <div className="text-center py-10 space-y-5">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-gray-800">ربط حساب واتساب بيزنس</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  ربط صالونك بواتساب بيزنس يتيح للعملاء الحجز مباشرة من الواتساب بدون أي تطبيق إضافي.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-xs text-gray-600">
                {[['📅', 'حجز آلي'], ['⏰', 'تذكيرات'], ['❌', 'إلغاء بضغطة']].map(([e, l]) => (
                  <div key={l} className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
                    <span className="text-xl">{e}</span><span>{l}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleConnect}
                disabled={notConfigured}
                title={notConfigured ? 'يجب ضبط WHATSAPP_APP_ID أولاً' : undefined}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                <Link2 className="w-4 h-4" /> ربط عبر Meta Embedded Signup
              </button>
              {notConfigured && (
                <p className="text-xs text-gray-400">راجع تبويب "دليل الإعداد" لمعرفة المتطلبات</p>
              )}
            </div>
          )}

          {/* ── Connected phones list ────────────────────────────────────── */}
          {connected.length > 0 && connectStep !== 'selecting-phone' && (
            <div className="space-y-3">
              {phones.map(phone => (
                <div key={phone.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${phone.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {phone.is_active
                      ? <Wifi className="w-5 h-5 text-green-600" />
                      : <WifiOff className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{phone.display_phone || phone.phone_number_id}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">ID: {phone.phone_number_id}</p>
                    <div className="flex gap-2 mt-1.5">
                      {phone.is_primary && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">رئيسي</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${phone.is_active ? 'text-green-600 bg-green-50 border-green-200' : 'text-gray-400 bg-gray-50 border-gray-200'}`}>
                        {phone.is_active ? 'نشط' : 'معطّل'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(phone.id)}
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-red-200"
                  >
                    <Link2Off className="w-3.5 h-3.5" /> فصل
                  </button>
                </div>
              ))}
              <button
                onClick={() => { setConnectStep('idle'); setConnectError(null); handleConnect(); }}
                disabled={notConfigured || isConnecting}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-green-400 text-gray-500 hover:text-green-600 py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
              >
                <Link2 className="w-4 h-4" /> إضافة رقم آخر
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Tab: Conversations
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'conversations' && (
        <div className="space-y-3">
          {dataLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">لا توجد محادثات بعد</p>
              <p className="text-xs text-gray-400 mt-1">ستظهر محادثات العملاء هنا بعد ربط واتساب وأول رسالة</p>
            </div>
          ) : conversations.map(conv => {
            const stateInfo = STATE_LABELS[conv.state] ?? { label: conv.state, color: 'bg-gray-100 text-gray-500' };
            return (
              <div key={conv.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">+{conv.wa_from}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${conv.lang === 'ar' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {conv.lang === 'ar' ? 'AR' : 'EN'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${stateInfo.color}`}>
                      {stateInfo.label}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <MessageCircle className="w-3 h-3" />{conv.message_count}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(conv.last_activity_at).toLocaleString('ar-SA', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Tab: Setup Guide
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'guide' && (
        <div className="space-y-5">

          {/* Checklist */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" /> قائمة متطلبات الإعداد
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                {
                  key:      'WHATSAPP_APP_ID',
                  label:    'Meta App ID',
                  desc:     'من حساب Meta for Developers → Apps → App Settings → Basic',
                  required: true,
                  done:     !!appConfig?.appId,
                },
                {
                  key:      'WHATSAPP_APP_SECRET',
                  label:    'Meta App Secret',
                  desc:     'من نفس الصفحة — يُستخدم للتحقق من Webhook ولتبادل التوكنز',
                  required: true,
                  done:     false, // can't verify from client
                },
                {
                  key:      'WHATSAPP_VERIFY_TOKEN',
                  label:    'Webhook Verify Token',
                  desc:     'أي نص سري تختاره — يُدخل في Meta App Dashboard تحت WhatsApp → Configuration',
                  required: true,
                  done:     false,
                },
                {
                  key:      'WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID',
                  label:    'Embedded Signup Config ID',
                  desc:     'اختياري — من Meta App → WhatsApp → Embedded Signup → Configuration',
                  required: false,
                  done:     !!appConfig?.configId,
                },
              ].map(item => (
                <div key={item.key} className="flex items-start gap-3 px-4 py-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-green-100' : item.required ? 'bg-amber-50' : 'bg-gray-100'}`}>
                    {item.done
                      ? <Check className="w-3 h-3 text-green-600" />
                      : item.required
                        ? <AlertCircle className="w-3 h-3 text-amber-500" />
                        : <span className="w-1.5 h-1.5 rounded-full bg-gray-400 block" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">{item.key}</code>
                      {!item.required && <span className="text-[10px] text-gray-400 border border-gray-200 px-1 rounded">اختياري</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhook URL */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" /> Webhook URL
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                أدخل هذا العنوان في Meta App Dashboard تحت WhatsApp → Configuration → Callback URL
              </p>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <code className="flex-1 text-xs font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 break-all">
                {webhookUrl}
              </code>
              <button
                onClick={() => copy(webhookUrl, 'webhook')}
                className="shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="نسخ"
              >
                {copied === 'webhook' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-800">خطوات الإعداد الكاملة</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              {[
                { n: '1', text: 'أنشئ Meta App من developers.facebook.com → اختر النوع "Business"' },
                { n: '2', text: 'أضف منتج WhatsApp Business Platform للتطبيق' },
                { n: '3', text: 'اضبط المتغيرات الثلاثة المطلوبة في إعدادات بيئة السيرفر' },
                { n: '4', text: 'في Meta App → WhatsApp → Configuration، أدخل Webhook URL أعلاه والـ WHATSAPP_VERIFY_TOKEN الذي اخترته' },
                { n: '5', text: 'فعّل Webhook Fields: messages, message_status' },
                { n: '6', text: 'ارجع لهذه الصفحة → تبويب "الاتصال" → اضغط "ربط عبر Meta Embedded Signup"' },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                  <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                توثيق Meta WhatsApp Cloud API الرسمي
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Tab: Settings
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            <p className="font-semibold mb-1">إعدادات حدود الرسائل</p>
            <p className="text-xs text-blue-600">حماية من إساءة الاستخدام. القيم الافتراضية مناسبة لمعظم الصالونات.</p>
          </div>

          {phones.filter(p => p.is_active).length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              لا توجد أرقام مرتبطة لضبط إعداداتها
            </div>
          )}

          {phones.filter(p => p.is_active).map(phone => (
            <div key={phone.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">{phone.display_phone}</p>
              {editLimits?.id === phone.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'حد الدقيقة', key: 'min' as const, min: 1, max: 1000 },
                      { label: 'حد الساعة',  key: 'hour' as const, min: 10, max: 5000 },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                        <input
                          type="number" min={f.min} max={f.max}
                          value={editLimits[f.key]}
                          onChange={e => setEditLimits(prev => prev ? { ...prev, [f.key]: parseInt(e.target.value) || f.min } : null)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveRateLimits} disabled={savingLimits}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                      {savingLimits ? 'حفظ...' : 'حفظ'}
                    </button>
                    <button onClick={() => setEditLimits(null)}
                      className="px-4 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span><span className="font-semibold">{phone.rate_limit_per_min}</span> رسالة/دقيقة</span>
                    <span><span className="font-semibold">{phone.rate_limit_per_hour}</span> رسالة/ساعة</span>
                  </div>
                  <button
                    onClick={() => setEditLimits({ id: phone.id, min: phone.rate_limit_per_min, hour: phone.rate_limit_per_hour })}
                    className="text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                  >
                    تعديل
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
