/**
 * AccountingIntegration — Per-system cards
 *
 * Each accounting system has its own card with:
 *  - Webhook (Push): we generate a URL → salon owner pastes it into their system
 *  - API Pull:       salon owner copies their API key → pastes it here
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy, Check, RefreshCw, AlertCircle, CheckCircle2, Loader2,
  Zap, CloudDownload, RotateCcw, Database, ChevronDown, ChevronUp,
  ArrowLeft, ArrowRight, Eye, EyeOff, Link2, ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { getProviderHeaders } from '../lib/providerAuth';

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api';

// ── Per-system definitions ─────────────────────────────────────────────────────
type IntegrationMode = 'webhook' | 'pull' | 'both';

interface SystemDef {
  id:             string;
  nameAr:         string;
  nameEn:         string;
  descAr:         string;
  descEn:         string;
  mode:           IntegrationMode;
  color:          string;          // Tailwind bg class for icon bg
  iconColor:      string;          // Tailwind text class for icon
  keyInstructAr?: string;          // how to get key from that system (Arabic)
  keyInstructEn?: string;          // how to get key from that system (English)
  apiPlaceholder: string;
  keyPlaceholder: string;
}

const SYSTEMS: SystemDef[] = [
  {
    id: 'foodics',
    nameAr: 'Foodics',
    nameEn: 'Foodics',
    descAr: 'نظام نقاط بيع سحابي — السعودية والخليج',
    descEn: 'Cloud POS — Saudi & GCC',
    mode: 'pull',
    color: 'bg-orange-50',
    iconColor: 'text-orange-500',
    keyInstructAr: 'من لوحة تحكم Foodics → الإعدادات → API Keys → أنشئ مفتاح جديد وانسخه هنا.',
    keyInstructEn: 'From Foodics dashboard → Settings → API Keys → Create a new key and paste it here.',
    apiPlaceholder: 'https://api.foodics.com/v5/invoices',
    keyPlaceholder: 'fds_live_xxxxxxxx...',
  },
  {
    id: 'marn',
    nameAr: 'مرن (Marn)',
    nameEn: 'Marn (مرن)',
    descAr: 'نظام كاشير سحابي سعودي',
    descEn: 'Saudi cloud POS system',
    mode: 'pull',
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
    keyInstructAr: 'من إعدادات مرن → الواجهة البرمجية → انسخ مفتاح الوصول.',
    keyInstructEn: 'From Marn settings → API section → Copy your access token.',
    apiPlaceholder: 'https://api.marn.com/v1/invoices',
    keyPlaceholder: 'marn_tk_xxxxxxxx...',
  },
  {
    id: 'zatca',
    nameAr: 'فاتورة (ZATCA)',
    nameEn: 'ZATCA e-Invoicing',
    descAr: 'أي نظام فوترة إلكترونية متوافق مع هيئة الزكاة والضريبة',
    descEn: 'Any ZATCA-compliant e-invoicing system',
    mode: 'webhook',
    color: 'bg-green-50',
    iconColor: 'text-green-600',
    apiPlaceholder: '',
    keyPlaceholder: '',
  },
  {
    id: 'odoo',
    nameAr: 'Odoo',
    nameEn: 'Odoo',
    descAr: 'نظام ERP / محاسبة مفتوح المصدر',
    descEn: 'Open-source ERP / accounting',
    mode: 'pull',
    color: 'bg-purple-50',
    iconColor: 'text-purple-600',
    keyInstructAr: 'من Odoo → الإعدادات → Technical → API Keys → أنشئ مفتاح وانسخه.',
    keyInstructEn: 'From Odoo → Settings → Technical → API Keys → Create a key and paste it here.',
    apiPlaceholder: 'https://your-odoo.com/api/invoices',
    keyPlaceholder: 'odoo_token_xxxxxxxx...',
  },
  {
    id: 'generic',
    nameAr: 'نظام عام (JSON)',
    nameEn: 'Generic (Custom JSON)',
    descAr: 'أي نظام يدعم تصدير JSON — يدعم كلا الطريقتين',
    descEn: 'Any JSON-export system — supports both webhook & pull',
    mode: 'both',
    color: 'bg-slate-50',
    iconColor: 'text-slate-500',
    keyInstructAr: 'انسخ مفتاح الـ API من نظامك وألصقه هنا.',
    keyInstructEn: 'Copy the API key from your system and paste it here.',
    apiPlaceholder: 'https://api.yoursystem.com/invoices',
    keyPlaceholder: 'sk_live_...',
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface SystemPullConfig {
  apiUrl:   string;
  apiKey:   string;
  authType: 'bearer' | 'basic';
}

type PullConfigs = Record<string, SystemPullConfig>;

interface SyncLog {
  id:            number;
  sync_type:     string;
  source_system: string;
  status:        string;
  imported:      number;
  skipped:       number;
  duplicates:    number;
  error_message: string | null;
  created_at:    string;
}

interface Props { dbProviderId?: number | null; }

// ── Icons per system ──────────────────────────────────────────────────────────
function SystemBadge({ sys, size = 'md' }: { sys: SystemDef; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-base' : 'w-10 h-10 text-lg';
  return (
    <div className={`${sz} rounded-xl ${sys.color} flex items-center justify-center font-black ${sys.iconColor} shrink-0`}>
      {sys.nameEn[0]}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AccountingIntegration({ dbProviderId }: Props) {
  const { isAr } = useLanguage();

  const [loading, setLoading]           = useState(true);
  const [webhookToken, setWebhookToken] = useState('');
  const [pullConfigs, setPullConfigs]   = useState<PullConfigs>({});
  const [logs, setLogs]                 = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading]   = useState(false);
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [tokenCopied, setTokenCopied]   = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', ...getProviderHeaders() };

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!dbProviderId) return;
    try {
      const [cfgRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/settings/accounting`, { headers }),
        fetch(`${API_BASE}/settings/accounting/logs`, { headers }),
      ]);
      if (cfgRes.ok) {
        const d = await cfgRes.json();
        setWebhookToken(d.webhookToken ?? '');
        // Support both legacy flat format and new per-system format
        const raw = d.pullConfig ?? {};
        const isLegacy = raw.system && typeof raw.system === 'string' && typeof raw.apiUrl === 'string';
        if (isLegacy) {
          setPullConfigs({ [raw.system]: { apiUrl: raw.apiUrl ?? '', apiKey: raw.apiKey ?? '', authType: raw.authType ?? 'bearer' } });
        } else {
          setPullConfigs(raw as PullConfigs);
        }
      }
      if (logsRes.ok) setLogs(((await logsRes.json()).logs ?? []) as SyncLog[]);
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [dbProviderId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Webhook URL for a given system ────────────────────────────────────────
  const webhookUrl = (sysId: string) =>
    webhookToken
      ? `${window.location.origin}${(import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')}/api/webhooks/accounting/${webhookToken}?system=${sysId}`
      : '';

  const copyText = async (text: string, key: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setTokenCopied(key);
    setTimeout(() => setTokenCopied(null), 2000);
  };

  const regenerateToken = async () => {
    if (!dbProviderId) return;
    if (!window.confirm(isAr ? 'هل تريد توليد رمز جديد؟ الرمز القديم سيُلغى فوراً وعليك تحديثه في كل الأنظمة.' : 'Generate a new token? The old token will stop working immediately across all systems.')) return;
    setRegenLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/accounting/token`, { method: 'POST', headers });
      if (res.ok) { const d = await res.json(); setWebhookToken(d.webhookToken); }
    } catch { /* ignore */ }
    finally { setRegenLoading(false); }
  };

  if (!dbProviderId) return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
      {isAr ? 'يجب تسجيل الدخول لإعداد ربط النظام المحاسبي.' : 'Login required to configure accounting integration.'}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin text-[#FF5A5F]" />
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 pb-4 border-b border-[#F0EFEC]">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <Database className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[#14332B]">
            {isAr ? 'ربط النظام المحاسبي' : 'Accounting System Integration'}
          </h4>
          <p className="text-[11px] text-[#6E6A63] leading-relaxed mt-0.5">
            {isAr
              ? 'اختر النظام الذي تستخدمه وافتح بطاقته — كل نظام يوضح بدقة إذا كنت ستعطينا مفتاحك أو نحن من نعطيك الرابط.'
              : 'Select the system you use and open its card — each one clearly shows whether you give us your key, or we give you a URL.'}
          </p>
        </div>
      </div>

      {/* ── Security notice ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700 leading-relaxed">
          {isAr
            ? 'احتفظ بمفاتيح API سرية. لا تشاركها مع أي جهة خارجية. الرابط السري الخاص بك مشفَّر بـ 256-bit.'
            : 'Keep API keys secret. Never share them externally. Your webhook token is 256-bit cryptographically random.'}
        </p>
      </div>

      {/* ── Per-system cards ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {SYSTEMS.map(sys => (
          <SystemCard
            key={sys.id}
            sys={sys}
            isAr={isAr}
            expanded={expanded === sys.id}
            onToggle={() => setExpanded(prev => prev === sys.id ? null : sys.id)}
            webhookUrl={webhookUrl(sys.id)}
            pullConfig={pullConfigs[sys.id] ?? { apiUrl: '', apiKey: '', authType: 'bearer' }}
            onPullConfigChange={(cfg) => setPullConfigs(prev => ({ ...prev, [sys.id]: cfg }))}
            onSavePullConfig={async (cfg) => {
              const next = { ...pullConfigs, [sys.id]: cfg };
              await fetch(`${API_BASE}/settings/accounting`, {
                method: 'PUT', headers,
                body: JSON.stringify({ pullConfig: next }),
              });
              setPullConfigs(next);
            }}
            onSync={async () => {
              const res = await fetch(`${API_BASE}/settings/accounting/sync`, {
                method: 'POST', headers,
                body: JSON.stringify({ system: sys.id }),
              });
              const d = await res.json();
              if (!res.ok) throw new Error(d.detail ?? d.error ?? 'Error');
              await loadAll();
              return d as { imported: number; skipped: number; duplicates: number };
            }}
            tokenCopied={tokenCopied}
            onCopy={copyText}
            logs={logs.filter(l => l.source_system === sys.id)}
          />
        ))}
      </div>

      {/* ── Shared token footer ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E9E7E2] bg-[#FAFAF8] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#1C1B18]">
              {isAr ? 'الرمز السري المشترك (Webhook Token)' : 'Shared Webhook Token'}
            </p>
            <p className="text-[11px] text-[#6E6A63] mt-0.5">
              {isAr
                ? 'هذا الرمز مدمج في روابط Webhook لجميع الأنظمة أعلاه. توليد رمز جديد يُلغي الروابط القديمة في كل الأنظمة.'
                : 'This token is embedded in all webhook URLs above. Regenerating it invalidates all existing webhook URLs.'}
            </p>
          </div>
          <button
            onClick={regenerateToken}
            disabled={regenLoading}
            className="flex items-center gap-1.5 text-[11px] text-red-500 hover:text-red-700 font-semibold transition-all disabled:opacity-50 shrink-0 ms-3"
          >
            {regenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            {isAr ? 'توليد رمز جديد' : 'Regenerate'}
          </button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 bg-white border border-[#E9E7E2] rounded-xl font-mono text-[10px] text-[#6E6A63] truncate" dir="ltr">
            {webhookToken || '—'}
          </div>
          <button
            onClick={() => copyText(webhookToken, 'shared-token')}
            className={`shrink-0 px-3 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              tokenCopied === 'shared-token' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-[#E9E7E2] hover:border-emerald-400 text-[#1C1B18]'
            }`}
          >
            {tokenCopied === 'shared-token' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {tokenCopied === 'shared-token' ? (isAr ? 'تم!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}
          </button>
        </div>
      </div>

    </div>
  );
}

// ── SystemCard ────────────────────────────────────────────────────────────────
interface CardProps {
  sys:              SystemDef;
  isAr:             boolean;
  expanded:         boolean;
  onToggle:         () => void;
  webhookUrl:       string;
  pullConfig:       SystemPullConfig;
  onPullConfigChange: (c: SystemPullConfig) => void;
  onSavePullConfig: (c: SystemPullConfig) => Promise<void>;
  onSync:           () => Promise<{ imported: number; skipped: number; duplicates: number }>;
  tokenCopied:      string | null;
  onCopy:           (text: string, key: string) => void;
  logs:             SyncLog[];
}

function SystemCard({ sys, isAr, expanded, onToggle, webhookUrl, pullConfig, onPullConfigChange, onSavePullConfig, onSync, tokenCopied, onCopy, logs }: CardProps) {
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [syncing,   setSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState<{ imported: number; skipped: number; duplicates: number } | null>(null);
  const [syncError, setSyncError] = useState('');
  const [showKey,   setShowKey]   = useState(false);

  const isConnected = sys.mode === 'webhook'
    ? !!webhookUrl
    : !!(pullConfig.apiUrl && pullConfig.apiKey);

  const modeBadge = sys.mode === 'webhook'
    ? { labelAr: 'إرسال تلقائي', labelEn: 'Webhook Push', cls: 'bg-emerald-100 text-emerald-700', icon: <Zap className="w-3 h-3" /> }
    : sys.mode === 'pull'
    ? { labelAr: 'سحب تلقائي',   labelEn: 'API Pull',     cls: 'bg-blue-100 text-blue-700',     icon: <CloudDownload className="w-3 h-3" /> }
    : { labelAr: 'طريقتان',      labelEn: 'Both Modes',   cls: 'bg-slate-100 text-slate-600',   icon: <RefreshCw className="w-3 h-3" /> };

  const handleSave = async () => {
    setSaving(true);
    try { await onSavePullConfig(pullConfig); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null); setSyncError('');
    try { const r = await onSync(); setSyncResult(r); }
    catch (e: any) { setSyncError(String(e?.message ?? e)); }
    finally { setSyncing(false); }
  };

  const webhookCopyKey = `wh-${sys.id}`;

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${expanded ? 'border-[#14332B]/30 shadow-sm' : 'border-[#E9E7E2]'} bg-white overflow-hidden`}>

      {/* ── Card header ───────────────────────────────────────────────── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#FAFAF8] transition-colors text-start"
      >
        <SystemBadge sys={sys} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#1C1B18]">
              {isAr ? sys.nameAr : sys.nameEn}
            </span>
            {/* Mode badge */}
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${modeBadge.cls}`}>
              {modeBadge.icon}
              {isAr ? modeBadge.labelAr : modeBadge.labelEn}
            </span>
            {/* Connection status dot */}
            <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400' : 'bg-[#D1CFC9]'}`} title={isConnected ? 'Connected' : 'Not configured'} />
          </div>
          <p className="text-[11px] text-[#6E6A63] mt-0.5 truncate">
            {isAr ? sys.descAr : sys.descEn}
          </p>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-[#6E6A63] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#6E6A63] shrink-0" />}
      </button>

      {/* ── Expanded body ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#F0EFEC] pt-4">

          {/* Webhook section (for webhook & both modes) */}
          {(sys.mode === 'webhook' || sys.mode === 'both') && (
            <WebhookSection
              sys={sys}
              isAr={isAr}
              webhookUrl={webhookUrl}
              tokenCopied={tokenCopied}
              onCopy={onCopy}
              webhookCopyKey={webhookCopyKey}
            />
          )}

          {/* Pull section (for pull & both modes) */}
          {(sys.mode === 'pull' || sys.mode === 'both') && (
            <PullSection
              sys={sys}
              isAr={isAr}
              pullConfig={pullConfig}
              onPullConfigChange={onPullConfigChange}
              showKey={showKey}
              setShowKey={setShowKey}
              saving={saving}
              saved={saved}
              onSave={handleSave}
              syncing={syncing}
              onSync={handleSync}
              syncResult={syncResult}
              syncError={syncError}
            />
          )}

          {/* Last sync logs for this system */}
          {logs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-[#1C1B18]">
                {isAr ? 'آخر عمليات المزامنة' : 'Recent Syncs'}
              </p>
              {logs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#FAFAF8] border border-[#F0EFEC] text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-[#6E6A63] capitalize">{log.sync_type}</span>
                    {log.status === 'success'
                      ? <span className="text-[#6E6A63]">✓ {log.imported} {isAr ? 'مستورد' : 'imported'}</span>
                      : <span className="text-red-500 truncate">{log.error_message}</span>
                    }
                  </div>
                  <span className="text-[#9CA3AF] shrink-0 font-mono" dir="ltr">
                    {new Date(log.created_at).toLocaleString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── WebhookSection ────────────────────────────────────────────────────────────
function WebhookSection({ sys, isAr, webhookUrl, tokenCopied, onCopy, webhookCopyKey }: {
  sys: SystemDef; isAr: boolean; webhookUrl: string;
  tokenCopied: string | null; onCopy: (t: string, k: string) => void; webhookCopyKey: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-3">
      {/* Direction label */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="text-xs font-bold text-[#14332B]">
          {isAr ? 'نحن نعطيك الرابط ← أنت تضعه في نظامك' : 'We give you the URL → You paste it in your system'}
        </span>
      </div>

      <p className="text-[11px] text-[#6E6A63] leading-relaxed">
        {isAr
          ? `في إعدادات ${sys.nameAr}، أضف الرابط التالي كـ Webhook — ستصل الفاتورة إلى الداشبورد فوراً عند إصدارها.`
          : `In your ${sys.nameEn} settings, add the URL below as a Webhook endpoint — invoices will appear in your dashboard the moment they're issued.`}
      </p>

      {/* Webhook URL */}
      <div>
        <p className="text-[11px] font-semibold text-[#1C1B18] mb-1.5">
          {isAr ? 'رابط الـ Webhook (انسخه وضعه في نظامك):' : 'Webhook URL (copy & paste into your system):'}
        </p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-xl font-mono text-[10px] text-[#6E6A63] truncate" dir="ltr">
            {webhookUrl || '…'}
          </div>
          <button
            onClick={() => onCopy(webhookUrl, webhookCopyKey)}
            className={`shrink-0 px-3 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              tokenCopied === webhookCopyKey ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-[#E9E7E2] hover:border-emerald-400 text-[#1C1B18]'
            }`}
          >
            {tokenCopied === webhookCopyKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {tokenCopied === webhookCopyKey ? (isAr ? 'تم!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}
          </button>
        </div>
      </div>

      {/* Header hint */}
      <div className="bg-white border border-emerald-100 rounded-xl px-3 py-2 text-[10px] font-mono text-[#6E6A63]" dir="ltr">
        <span className="font-bold text-[#1C1B18]">X-Accounting-System: {sys.id}</span>
        <span className="font-sans text-[#9CA3AF] ms-2" dir={isAr ? 'rtl' : 'ltr'}>
          {isAr ? '(أضف هذا الـ header اختيارياً)' : '(optional header to identify the source)'}
        </span>
      </div>
    </div>
  );
}

// ── PullSection ───────────────────────────────────────────────────────────────
function PullSection({ sys, isAr, pullConfig, onPullConfigChange, showKey, setShowKey,
  saving, saved, onSave, syncing, onSync, syncResult, syncError }: {
  sys: SystemDef; isAr: boolean;
  pullConfig: SystemPullConfig; onPullConfigChange: (c: SystemPullConfig) => void;
  showKey: boolean; setShowKey: (v: boolean) => void;
  saving: boolean; saved: boolean; onSave: () => void;
  syncing: boolean; onSync: () => void;
  syncResult: { imported: number; skipped: number; duplicates: number } | null;
  syncError: string;
}) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3.5 space-y-3">
      {/* Direction label */}
      <div className="flex items-center gap-2">
        <CloudDownload className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="text-xs font-bold text-[#14332B]">
          {isAr ? 'أنت تعطينا مفتاحك → نحن نسحب الفواتير' : 'You give us your key → We fetch invoices'}
        </span>
      </div>

      {/* How-to-get-key instruction */}
      {(isAr ? sys.keyInstructAr : sys.keyInstructEn) && (
        <div className="bg-white border border-blue-100 rounded-xl px-3 py-2 text-[11px] text-[#6E6A63] leading-relaxed">
          <span className="font-bold text-[#1C1B18]">{isAr ? 'كيف تحصل على المفتاح؟ ' : 'How to get your key: '}</span>
          {isAr ? sys.keyInstructAr : sys.keyInstructEn}
        </div>
      )}

      <div className="space-y-2.5">
        {/* API URL */}
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'رابط API نظامك' : 'Your System API URL'}
          </label>
          <input
            type="url"
            value={pullConfig.apiUrl}
            onChange={e => onPullConfigChange({ ...pullConfig, apiUrl: e.target.value })}
            placeholder={sys.apiPlaceholder || 'https://api.yoursystem.com/invoices'}
            dir="ltr"
            className="w-full text-xs px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-blue-400 font-mono text-[#1C1B18] placeholder:text-[#C9C7C2]"
          />
        </div>

        {/* Auth type + API Key row */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
              {isAr ? 'نوع المصادقة' : 'Auth Type'}
            </label>
            <select
              value={pullConfig.authType}
              onChange={e => onPullConfigChange({ ...pullConfig, authType: e.target.value as 'bearer' | 'basic' })}
              className="w-full text-[11px] px-2.5 py-2.5 border border-[#E9E7E2] rounded-xl bg-white focus:outline-none focus:border-blue-400"
            >
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
              {isAr ? 'المفتاح السري / API Key' : 'API Key / Secret'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={pullConfig.apiKey}
                onChange={e => onPullConfigChange({ ...pullConfig, apiKey: e.target.value })}
                placeholder={sys.keyPlaceholder || (pullConfig.authType === 'basic' ? 'username:password' : 'sk_live_...')}
                dir="ltr"
                className="w-full text-xs px-3 py-2.5 pe-9 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-blue-400 font-mono"
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute end-2.5 top-2.5 text-[#6E6A63] hover:text-[#1C1B18]">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Save + Sync row */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#14332B] hover:bg-[#1E4D41] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {isAr ? 'حفظ' : 'Save'}
          </button>

          {saved && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {isAr ? 'تم الحفظ ✓' : 'Saved ✓'}
            </span>
          )}

          <button
            onClick={onSync}
            disabled={syncing || !pullConfig.apiUrl}
            title={!pullConfig.apiUrl ? (isAr ? 'أدخل رابط API أولاً' : 'Enter API URL first') : undefined}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ms-auto"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {syncing ? (isAr ? 'جاري السحب...' : 'Fetching...') : (isAr ? 'سحب الآن' : 'Sync Now')}
          </button>
        </div>

        {/* Sync result / error */}
        {syncResult && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {isAr
              ? `تم استيراد ${syncResult.imported} · تخطي ${syncResult.skipped} · مكرر ${syncResult.duplicates}`
              : `Imported ${syncResult.imported} · Skipped ${syncResult.skipped} · Duplicates ${syncResult.duplicates}`}
          </div>
        )}
        {syncError && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {syncError}
          </div>
        )}
      </div>
    </div>
  );
}
