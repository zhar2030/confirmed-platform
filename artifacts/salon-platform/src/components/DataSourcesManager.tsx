import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import {
  Database, Upload, Link2, FileSpreadsheet, CheckCircle, XCircle,
  Plus, Trash2, RefreshCw, Eye, EyeOff, ChevronDown, ChevronUp,
  AlertTriangle, Loader2, Download, Search, Table, Wifi, WifiOff,
  Key, Shield, Globe, FileText, X, Banknote, CheckCircle2, ArrowRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getProviderHeaders } from '../lib/providerAuth';

const API_BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') + '/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: 'csv' | 'xlsx' | 'xls';
  uploadedAt: string;
  rowCount: number;
  columns: string[];
  preview: Record<string, string | number>[];   // first 50 rows
}

type AuthType = 'none' | 'api_key' | 'bearer' | 'basic';
type ConnStatus = 'untested' | 'testing' | 'ok' | 'error';

interface ApiConnection {
  id: string;
  name: string;
  baseUrl: string;
  authType: AuthType;
  apiKeyHeader: string;
  apiKeyValue: string;
  bearerToken: string;
  basicUser: string;
  basicPass: string;
  lastTested?: string;
  status: ConnStatus;
  note?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;

const parseFileData = (file: File): Promise<Pick<UploadedFile, 'columns' | 'preview' | 'rowCount'>> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: '' });
        const cols = json.length > 0 ? Object.keys(json[0]) : [];
        resolve({ columns: cols, preview: json.slice(0, 50), rowCount: json.length });
      } catch {
        reject(new Error('فشل في قراءة الملف'));
      }
    };
    reader.onerror = () => reject(new Error('خطأ في القراءة'));
    reader.readAsArrayBuffer(file);
  });

const STORAGE_FILES = 'confirmed_data_files';
const STORAGE_APIS  = 'confirmed_api_connections';

const loadFiles  = (): UploadedFile[]    => { try { return JSON.parse(localStorage.getItem(STORAGE_FILES) || '[]'); } catch { return []; } };
const loadApis   = (): ApiConnection[]   => { try { return JSON.parse(localStorage.getItem(STORAGE_APIS)  || '[]'); } catch { return []; } };
const saveFiles  = (v: UploadedFile[])   => localStorage.setItem(STORAGE_FILES, JSON.stringify(v));
const saveApis   = (v: ApiConnection[])  => localStorage.setItem(STORAGE_APIS,  JSON.stringify(v));

const newConn = (): ApiConnection => ({
  id: 'api_' + Date.now(),
  name: '', baseUrl: '',
  authType: 'none',
  apiKeyHeader: 'X-API-Key', apiKeyValue: '',
  bearerToken: '', basicUser: '', basicPass: '',
  status: 'untested',
  createdAt: new Date().toISOString().split('T')[0],
});

// ─── Component ────────────────────────────────────────────────────────────────

interface DataSourcesManagerProps {
  dbProviderId?: number | null;
}

// ── Invoice import row shape ───────────────────────────────────────────────────
interface ImportRow {
  clientName: string;
  date: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  invoiceNumber: string;
}

export default function DataSourcesManager({ dbProviderId }: DataSourcesManagerProps = {}) {
  const { isAr } = useLanguage();

  const [tab, setTab] = useState<'files' | 'api' | 'invoices'>('files');

  // ── Files state ──────────────────────────────────────────────────────────
  const [files, setFiles]       = useState<UploadedFile[]>(loadFiles);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [searchCol, setSearchCol]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Invoice import state ──────────────────────────────────────────────────
  const invFileRef = useRef<HTMLInputElement>(null);
  // invRawData: full raw dataset from XLSX/CSV parse — never shown in full, used for import
  const [invRawData, setInvRawData]   = useState<Record<string, string | number>[]>([]);
  // invPreview: first 5 rows after applying current mapping — shown in UI
  const [invPreview, setInvPreview]   = useState<ImportRow[]>([]);
  const [invTotalRows, setInvTotalRows] = useState(0);
  const [invColumns, setInvColumns]   = useState<string[]>([]);
  const [invParsed, setInvParsed]     = useState(false);
  const [invMapping, setInvMapping]   = useState<Record<string, string>>({});
  const [invImporting, setInvImporting] = useState(false);
  const [invResult, setInvResult]     = useState<{ imported: number; skipped: number } | null>(null);
  const [invError, setInvError]       = useState('');

  // Helper: apply mapping to one raw row
  const applyMapping = (r: Record<string, string | number>, m: Record<string, string>): ImportRow => ({
    clientName:    String(r[m.clientName ?? '']    ?? ''),
    date:          String(r[m.date ?? '']          ?? ''),
    subtotal:      Number(r[m.subtotal ?? '']      ?? 0),
    tax:           Number(r[m.tax ?? '']           ?? 0),
    total:         Number(r[m.total ?? '']         ?? 0),
    paymentMethod: String(r[m.paymentMethod ?? ''] ?? 'cash'),
    invoiceNumber: String(r[m.invoiceNumber ?? ''] ?? ''),
  });

  const resetInvoiceImport = () => {
    setInvRawData([]); setInvPreview([]); setInvTotalRows(0);
    setInvColumns([]); setInvParsed(false);
    setInvMapping({}); setInvResult(null); setInvError('');
  };

  // Recompute preview whenever mapping changes (reactive)
  useEffect(() => {
    if (invRawData.length === 0) return;
    setInvPreview(invRawData.slice(0, 5).map(r => applyMapping(r, invMapping)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invMapping, invRawData]);

  const handleInvoiceFile = async (file: File) => {
    resetInvoiceImport();
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setInvError(isAr ? 'نوع الملف غير مدعوم. CSV أو Excel فقط.' : 'Unsupported file type. Use CSV or Excel.');
      return;
    }
    try {
      const parsed = await parseFileData(file);
      // Store full raw dataset for import; preview is a subset
      const rawAll = parsed.preview; // parseFileData stores up to 50 rows in preview
      // For full-file import we need to re-parse with no row limit — but parseFileData caps at 50.
      // Read raw file again with no limit using XLSX directly:
      const rawFull = await new Promise<Record<string, string | number>[]>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const wb = XLSX.read(ev.target?.result, { type: 'array', cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, {
              defval: '',
              raw: false, // stringify dates
            });
            resolve(rows);
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(new Error('Read error'));
        reader.readAsArrayBuffer(file);
      });

      setInvRawData(rawFull);
      setInvTotalRows(rawFull.length);
      setInvColumns(parsed.columns);
      setInvParsed(true);

      // Auto-detect common column names
      const autoMap: Record<string, string> = {};
      const tryMap = (field: string, patterns: string[]) => {
        const found = parsed.columns.find(c =>
          patterns.some(p => c.toLowerCase().replace(/[_ -]/g, '').includes(p.replace(/[_ -]/g, '')))
        );
        if (found) autoMap[field] = found;
      };
      tryMap('date',          ['date', 'تاريخ', 'tarikh']);
      tryMap('total',         ['total', 'amount', 'إجمالي', 'ijmali', 'مبلغ']);
      tryMap('subtotal',      ['subtotal', 'المبلغ قبل', 'net', 'subtot']);
      tryMap('tax',           ['tax', 'vat', 'ضريبة', 'dariba']);
      tryMap('clientName',    ['client', 'customer', 'عميل', 'name', 'اسم']);
      tryMap('paymentMethod', ['payment', 'method', 'طريقة', 'pay']);
      tryMap('invoiceNumber', ['invoice', 'inv', 'number', 'رقم', 'فاتورة']);
      setInvMapping(autoMap);
      // Preview is set by the useEffect watching invMapping + invRawData
    } catch (e: unknown) {
      setInvError(e instanceof Error ? e.message : 'خطأ في القراءة');
    }
  };

  const confirmInvoiceImport = async () => {
    if (!dbProviderId || invRawData.length === 0) return;
    setInvImporting(true);
    setInvError('');
    try {
      // Apply current mapping to ALL raw rows (not just preview)
      const allMapped = invRawData.map(r => applyMapping(r, invMapping));
      const res = await fetch(`${API_BASE}/invoices/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getProviderHeaders() },
        body: JSON.stringify({ rows: allMapped }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'server_error'); }
      const data = await res.json();
      setInvResult({ imported: data.imported, skipped: data.skipped });
      setInvRawData([]); setInvPreview([]); setInvParsed(false);
    } catch (e: unknown) {
      setInvError(e instanceof Error ? e.message : 'فشل الاستيراد');
    } finally {
      setInvImporting(false);
    }
  };

  // ── API state ─────────────────────────────────────────────────────────────
  const [connections, setConnections] = useState<ApiConnection[]>(loadApis);
  const [showAddApi, setShowAddApi]   = useState(false);
  const [draft, setDraft]             = useState<ApiConnection>(newConn);
  const [showPass, setShowPass]       = useState(false);
  const [showToken, setShowToken]     = useState(false);
  const [expandedApi, setExpandedApi] = useState<string | null>(null);

  // ── File handlers ─────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setUploadError(isAr ? 'نوع الملف غير مدعوم. يُقبل CSV و Excel فقط.' : 'Unsupported file type. Only CSV and Excel accepted.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const parsed = await parseFileData(file);
      const entry: UploadedFile = {
        id: 'f_' + Date.now(),
        name: file.name,
        size: file.size,
        type: ext as UploadedFile['type'],
        uploadedAt: new Date().toISOString().split('T')[0],
        ...parsed,
      };
      setFiles(prev => {
        const next = [entry, ...prev];
        saveFiles(next);
        return next;
      });
      setPreviewFile(entry.id);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setUploading(false);
    }
  }, [isAr]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const deleteFile = (id: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      saveFiles(next);
      return next;
    });
    if (previewFile === id) setPreviewFile(null);
  };

  // ── API handlers ──────────────────────────────────────────────────────────

  const saveConnection = () => {
    if (!draft.name || !draft.baseUrl) return;
    const exists = connections.find(c => c.id === draft.id);
    const next = exists
      ? connections.map(c => c.id === draft.id ? draft : c)
      : [draft, ...connections];
    setConnections(next);
    saveApis(next);
    setShowAddApi(false);
    setDraft(newConn());
  };

  const deleteConnection = (id: string) => {
    const next = connections.filter(c => c.id !== id);
    setConnections(next);
    saveApis(next);
    if (expandedApi === id) setExpandedApi(null);
  };

  const testConnection = async (id: string) => {
    const conn = connections.find(c => c.id === id);
    if (!conn) return;
    setConnections(prev => prev.map(c => c.id === id ? { ...c, status: 'testing' } : c));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (conn.authType === 'api_key' && conn.apiKeyValue)
        headers[conn.apiKeyHeader || 'X-API-Key'] = conn.apiKeyValue;
      if (conn.authType === 'bearer' && conn.bearerToken)
        headers['Authorization'] = `Bearer ${conn.bearerToken}`;
      if (conn.authType === 'basic' && conn.basicUser)
        headers['Authorization'] = 'Basic ' + btoa(`${conn.basicUser}:${conn.basicPass}`);
      const res = await fetch(conn.baseUrl, { method: 'GET', headers, mode: 'no-cors' });
      const ok  = res.type === 'opaque' || res.ok;
      setConnections(prev => {
        const next = prev.map(c => c.id === id
          ? { ...c, status: (ok ? 'ok' : 'error') as ConnStatus, lastTested: new Date().toISOString().split('T')[0] }
          : c);
        saveApis(next);
        return next;
      });
    } catch {
      setConnections(prev => {
        const next = prev.map(c => c.id === id
          ? { ...c, status: 'error' as ConnStatus, lastTested: new Date().toISOString().split('T')[0] }
          : c);
        saveApis(next);
        return next;
      });
    }
  };

  // ── Preview helpers ───────────────────────────────────────────────────────

  const activePreview = files.find(f => f.id === previewFile);
  const filteredRows  = activePreview?.preview.filter(row =>
    searchCol === '' ||
    Object.values(row).some(v => String(v).toLowerCase().includes(searchCol.toLowerCase()))
  ) ?? [];

  const authLabels: Record<AuthType, { ar: string; en: string }> = {
    none:    { ar: 'بدون مصادقة', en: 'No Auth' },
    api_key: { ar: 'مفتاح API',   en: 'API Key' },
    bearer:  { ar: 'Bearer Token', en: 'Bearer Token' },
    basic:   { ar: 'Basic Auth',   en: 'Basic Auth' },
  };

  const statusIcon = (s: ConnStatus) => {
    if (s === 'ok')      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (s === 'error')   return <XCircle     className="w-4 h-4 text-red-400" />;
    if (s === 'testing') return <Loader2     className="w-4 h-4 text-blue-400 animate-spin" />;
    return <WifiOff className="w-4 h-4 text-slate-300" />;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-slate-800">
            {isAr ? 'مصادر البيانات' : 'Data Sources'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAr ? 'رفع الملفات وربط الأنظمة الخارجية عبر API' : 'Upload files and connect external systems via API'}
          </p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-2 border-b border-[#E9E7E2]">
        {([
          { id: 'files',    icon: FileSpreadsheet, ar: 'الملفات المرفوعة', en: 'Uploaded Files',      badge: files.length },
          { id: 'api',      icon: Link2,           ar: 'روابط API',        en: 'API Connections',      badge: connections.length },
          { id: 'invoices', icon: Banknote,        ar: 'استيراد فواتير',   en: 'Import Invoices',      badge: 0 },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer -mb-px ${
                tab === t.id
                  ? 'border-violet-500 text-violet-700'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}>
              <Icon className="w-4 h-4" />
              {isAr ? t.ar : t.en}
              {t.badge > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${tab === t.id ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════
          FILES TAB
      ════════════════════════════════════════════ */}
      {tab === 'files' && (
        <div className="space-y-5">

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-violet-400 bg-violet-50'
                : 'border-[#E9E7E2] hover:border-violet-300 hover:bg-violet-50/40 bg-white'
            }`}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileInput} className="hidden" />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                <p className="text-sm text-violet-600 font-bold">{isAr ? 'جاري قراءة الملف...' : 'Reading file...'}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{isAr ? 'اسحبي الملف هنا أو انقري للاختيار' : 'Drag & drop or click to upload'}</p>
                  <p className="text-xs text-slate-400 mt-1">{isAr ? 'يُقبل: Excel (.xlsx, .xls) و CSV' : 'Accepted: Excel (.xlsx, .xls) and CSV'}</p>
                </div>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {uploadError}
            </div>
          )}

          {/* File list */}
          {files.length === 0 ? (
            <div className="text-center py-12 text-slate-300">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{isAr ? 'لا توجد ملفات مرفوعة بعد' : 'No files uploaded yet'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map(f => (
                <div key={f.id} className="bg-white rounded-2xl border border-[#E9E7E2] overflow-hidden shadow-xs">
                  {/* File header */}
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      f.type === 'csv' ? 'bg-emerald-50' : 'bg-green-50'
                    }`}>
                      <FileText className={`w-4 h-4 ${f.type === 'csv' ? 'text-emerald-600' : 'text-green-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {fmt(f.size)} · {f.rowCount.toLocaleString()} {isAr ? 'صف' : 'rows'} · {f.columns.length} {isAr ? 'عمود' : 'cols'} · {f.uploadedAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPreviewFile(previewFile === f.id ? null : f.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-all cursor-pointer"
                      >
                        {previewFile === f.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {isAr ? (previewFile === f.id ? 'إخفاء' : 'معاينة') : (previewFile === f.id ? 'Hide' : 'Preview')}
                      </button>
                      <button
                        onClick={() => deleteFile(f.id)}
                        className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Column chips */}
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {f.columns.slice(0, 10).map(col => (
                      <span key={col} className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-full">
                        {col}
                      </span>
                    ))}
                    {f.columns.length > 10 && (
                      <span className="text-[9px] text-slate-300 px-2 py-0.5">+{f.columns.length - 10}</span>
                    )}
                  </div>

                  {/* Preview table */}
                  {previewFile === f.id && (
                    <div className="border-t border-[#E9E7E2]">
                      <div className="flex items-center gap-3 p-3 bg-[#F8FAFC]">
                        <Table className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <p className="text-[10px] text-slate-500 font-bold flex-1">
                          {isAr ? `معاينة أول ${Math.min(50, f.preview.length)} صف` : `Preview: first ${Math.min(50, f.preview.length)} rows`}
                        </p>
                        <div className="relative">
                          <Search className="w-3 h-3 text-slate-300 absolute top-1/2 -translate-y-1/2 start-2.5" />
                          <input
                            value={searchCol}
                            onChange={e => setSearchCol(e.target.value)}
                            placeholder={isAr ? 'بحث...' : 'Search...'}
                            className="text-[10px] ps-7 pe-3 py-1.5 border border-[#E9E7E2] rounded-lg bg-white focus:outline-none focus:border-violet-300 w-36"
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-[10px]">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-start text-slate-400 font-bold border-b border-[#E9E7E2] whitespace-nowrap">#</th>
                              {f.columns.map(col => (
                                <th key={col} className="px-3 py-2 text-start text-slate-600 font-bold border-b border-[#E9E7E2] whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRows.map((row, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="px-3 py-1.5 text-slate-300 font-mono border-b border-[#F0EDE8]">{i + 1}</td>
                                {f.columns.map(col => (
                                  <td key={col} className="px-3 py-1.5 text-slate-600 border-b border-[#F0EDE8] whitespace-nowrap max-w-[160px] truncate">
                                    {String(row[col] ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          API TAB
      ════════════════════════════════════════════ */}
      {tab === 'api' && (
        <div className="space-y-5">

          {/* Add button */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">
              {isAr ? 'اربطي أي نظام خارجي عبر API واختبري الاتصال مباشرة' : 'Connect any external system via API and test connectivity'}
            </p>
            <button
              onClick={() => { setDraft(newConn()); setShowAddApi(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? 'إضافة رابط جديد' : 'Add Connection'}
            </button>
          </div>

          {/* Add / Edit form */}
          {showAddApi && (
            <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-sm font-bold text-slate-800">{isAr ? 'إضافة رابط API جديد' : 'New API Connection'}</h4>
                <button onClick={() => setShowAddApi(false)} className="text-slate-300 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1.5">{isAr ? 'اسم الرابط *' : 'Connection Name *'}</label>
                  <input
                    value={draft.name}
                    onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
                    placeholder={isAr ? 'مثال: نظام ERP الرئيسي' : 'e.g. Main ERP System'}
                    className="w-full text-xs px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1.5">{isAr ? 'الرابط الأساسي (Base URL) *' : 'Base URL *'}</label>
                  <input
                    value={draft.baseUrl}
                    onChange={e => setDraft(p => ({ ...p, baseUrl: e.target.value }))}
                    placeholder="https://api.example.com/v1"
                    dir="ltr"
                    className="w-full text-xs px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-violet-400 font-mono"
                  />
                </div>
              </div>

              {/* Auth type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-2">{isAr ? 'نوع المصادقة' : 'Authentication Type'}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['none', 'api_key', 'bearer', 'basic'] as AuthType[]).map(at => (
                    <button
                      key={at}
                      onClick={() => setDraft(p => ({ ...p, authType: at }))}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${
                        draft.authType === at
                          ? 'border-violet-400 bg-violet-50 text-violet-700'
                          : 'border-[#E9E7E2] text-slate-500 hover:border-violet-200'
                      }`}
                    >
                      {at === 'none'    && <Globe  className="w-3.5 h-3.5" />}
                      {at === 'api_key' && <Key    className="w-3.5 h-3.5" />}
                      {at === 'bearer'  && <Shield className="w-3.5 h-3.5" />}
                      {at === 'basic'   && <Shield className="w-3.5 h-3.5" />}
                      {isAr ? authLabels[at].ar : authLabels[at].en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auth fields */}
              {draft.authType === 'api_key' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E9E7E2]">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1.5">{isAr ? 'اسم الـ Header' : 'Header Name'}</label>
                    <input dir="ltr" value={draft.apiKeyHeader} onChange={e => setDraft(p => ({ ...p, apiKeyHeader: e.target.value }))}
                      placeholder="X-API-Key"
                      className="w-full text-xs px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-violet-400 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1.5">{isAr ? 'قيمة المفتاح' : 'Key Value'}</label>
                    <div className="relative">
                      <input dir="ltr" type={showPass ? 'text' : 'password'} value={draft.apiKeyValue}
                        onChange={e => setDraft(p => ({ ...p, apiKeyValue: e.target.value }))}
                        placeholder="sk-..."
                        className="w-full text-xs px-3 py-2.5 pe-9 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-violet-400 font-mono" />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {draft.authType === 'bearer' && (
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E9E7E2]">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1.5">Bearer Token</label>
                  <div className="relative">
                    <input dir="ltr" type={showToken ? 'text' : 'password'} value={draft.bearerToken}
                      onChange={e => setDraft(p => ({ ...p, bearerToken: e.target.value }))}
                      placeholder="eyJhbGciOiJ..."
                      className="w-full text-xs px-3 py-2.5 pe-9 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-violet-400 font-mono" />
                    <button type="button" onClick={() => setShowToken(v => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {draft.authType === 'basic' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E9E7E2]">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1.5">{isAr ? 'اسم المستخدم' : 'Username'}</label>
                    <input dir="ltr" value={draft.basicUser} onChange={e => setDraft(p => ({ ...p, basicUser: e.target.value }))}
                      className="w-full text-xs px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-violet-400 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1.5">{isAr ? 'كلمة المرور' : 'Password'}</label>
                    <div className="relative">
                      <input dir="ltr" type={showPass ? 'text' : 'password'} value={draft.basicPass}
                        onChange={e => setDraft(p => ({ ...p, basicPass: e.target.value }))}
                        className="w-full text-xs px-3 py-2.5 pe-9 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-violet-400 font-mono" />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1.5">{isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'}</label>
                <input value={draft.note ?? ''} onChange={e => setDraft(p => ({ ...p, note: e.target.value }))}
                  placeholder={isAr ? 'وصف قصير لهذا الرابط...' : 'Short description...'}
                  className="w-full text-xs px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-violet-400" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={saveConnection} disabled={!draft.name || !draft.baseUrl}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
                  {isAr ? 'حفظ الرابط' : 'Save Connection'}
                </button>
                <button onClick={() => setShowAddApi(false)}
                  className="px-5 py-2 border border-[#E9E7E2] text-slate-500 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-50 transition-all">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Connection list */}
          {connections.length === 0 && !showAddApi ? (
            <div className="text-center py-16 text-slate-300">
              <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">{isAr ? 'لا توجد روابط محفوظة بعد' : 'No API connections yet'}</p>
              <p className="text-xs mt-1 opacity-70">{isAr ? 'أضيفي أول رابط API للبدء' : 'Add your first connection to get started'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map(conn => (
                <div key={conn.id} className="bg-white rounded-2xl border border-[#E9E7E2] overflow-hidden shadow-xs">
                  {/* Card header */}
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      conn.status === 'ok' ? 'bg-emerald-50' : conn.status === 'error' ? 'bg-red-50' : 'bg-slate-50'
                    }`}>
                      {conn.status === 'ok'    ? <Wifi     className="w-4 h-4 text-emerald-500" />
                      : conn.status === 'error' ? <WifiOff  className="w-4 h-4 text-red-400" />
                      : conn.status === 'testing'? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      :                           <Globe    className="w-4 h-4 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{conn.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate" dir="ltr">{conn.baseUrl}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status badge */}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        conn.status === 'ok'      ? 'bg-emerald-50 text-emerald-700'
                        : conn.status === 'error'  ? 'bg-red-50 text-red-600'
                        : conn.status === 'testing'? 'bg-blue-50 text-blue-600'
                        :                            'bg-slate-50 text-slate-400'
                      }`}>
                        {conn.status === 'ok'       ? (isAr ? 'متصل ✓' : 'Connected ✓')
                        : conn.status === 'error'   ? (isAr ? 'خطأ'    : 'Error')
                        : conn.status === 'testing' ? (isAr ? 'جاري الاختبار...' : 'Testing...')
                        :                             (isAr ? 'لم يُختبر' : 'Untested')}
                      </span>
                      {/* Auth chip */}
                      <span className="text-[9px] bg-violet-50 text-violet-600 font-bold px-2 py-0.5 rounded-full">
                        {isAr ? authLabels[conn.authType].ar : authLabels[conn.authType].en}
                      </span>
                      {/* Expand toggle */}
                      <button onClick={() => setExpandedApi(expandedApi === conn.id ? null : conn.id)}
                        className="p-1.5 text-slate-300 hover:text-slate-600 cursor-pointer">
                        {expandedApi === conn.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {expandedApi === conn.id && (
                    <div className="border-t border-[#E9E7E2] p-4 bg-[#F8FAFC] space-y-4">
                      {conn.note && (
                        <p className="text-xs text-slate-500 italic">{conn.note}</p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px]">
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">{isAr ? 'تاريخ الإضافة' : 'Added'}</span>
                          <span className="font-mono text-slate-600">{conn.createdAt}</span>
                        </div>
                        {conn.lastTested && (
                          <div>
                            <span className="text-slate-400 font-bold block mb-0.5">{isAr ? 'آخر اختبار' : 'Last Tested'}</span>
                            <span className="font-mono text-slate-600">{conn.lastTested}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">{isAr ? 'الحالة' : 'Status'}</span>
                          <span className="flex items-center gap-1">{statusIcon(conn.status)}
                            {conn.status === 'ok'    ? (isAr ? 'اتصال ناجح' : 'Connected')
                            : conn.status === 'error' ? (isAr ? 'فشل الاتصال' : 'Connection failed')
                            :                           (isAr ? 'لم يُختبر بعد' : 'Not tested yet')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => testConnection(conn.id)}
                          disabled={conn.status === 'testing'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-violet-100 transition-all disabled:opacity-50"
                        >
                          {conn.status === 'testing'
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RefreshCw className="w-3.5 h-3.5" />}
                          {isAr ? 'اختبار الاتصال' : 'Test Connection'}
                        </button>
                        <button
                          onClick={() => { setDraft({ ...conn }); setShowAddApi(true); setExpandedApi(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-100 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {isAr ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          onClick={() => deleteConnection(conn.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 text-xs font-bold rounded-lg cursor-pointer hover:bg-red-100 transition-all ms-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {isAr ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          INVOICES IMPORT TAB
      ════════════════════════════════════════════ */}
      {tab === 'invoices' && (
        <div className="space-y-5">

          {/* Header info */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-700">
            <Banknote className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">
                {isAr ? 'استيراد فواتيرك من نظام محاسبي خارجي' : 'Import invoices from an external accounting system'}
              </p>
              <p className="text-emerald-600 leading-relaxed">
                {isAr
                  ? 'ارفع ملف CSV أو Excel يحتوي على بيانات الفواتير. النظام سيتعرف تلقائياً على الأعمدة ويعرض معاينة قبل الاستيراد.'
                  : 'Upload a CSV or Excel file containing invoice data. The system will auto-detect columns and show a preview before importing.'}
              </p>
            </div>
          </div>

          {!dbProviderId && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              {isAr ? 'يجب تسجيل الدخول أولاً لاستيراد الفواتير.' : 'You must be logged in to import invoices.'}
            </div>
          )}

          {/* Success result */}
          {invResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-700 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">{isAr ? 'تم الاستيراد بنجاح ✓' : 'Import Successful ✓'}</p>
                <p>
                  {isAr
                    ? `تم استيراد ${invResult.imported} فاتورة${invResult.skipped ? `، تم تخطي ${invResult.skipped} صف غير صالح` : ''}.`
                    : `Imported ${invResult.imported} invoice${invResult.skipped ? `, skipped ${invResult.skipped} invalid row(s)` : ''}.`}
                </p>
              </div>
              <button onClick={resetInvoiceImport} className="ms-auto text-[10px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer">
                {isAr ? 'استيراد آخر' : 'Import More'}
              </button>
            </div>
          )}

          {/* Upload zone */}
          {!invResult && (
            <div
              onClick={() => invFileRef.current?.click()}
              className="relative border-2 border-dashed border-[#E9E7E2] hover:border-emerald-400 hover:bg-emerald-50/30 rounded-2xl p-10 text-center cursor-pointer transition-all bg-white"
            >
              <input
                ref={invFileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleInvoiceFile(f); e.target.value = ''; }}
                className="hidden"
              />
              <Banknote className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-[#14332B] mb-1">
                {isAr ? 'انقري لرفع ملف الفواتير' : 'Click to upload your invoice file'}
              </p>
              <p className="text-xs text-[#6E6A63]">
                {isAr ? 'يقبل CSV و Excel (.xlsx, .xls)' : 'Accepts CSV and Excel (.xlsx, .xls)'}
              </p>
            </div>
          )}

          {invError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {invError}
            </div>
          )}

          {/* Column mapping + preview */}
          {invParsed && !invResult && (
            <div className="space-y-4">
              {/* Column mapping */}
              <div className="bg-white border border-[#E9E7E2] rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#14332B] flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                  {isAr ? 'ربط الأعمدة' : 'Column Mapping'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { field: 'date',          label: isAr ? 'التاريخ *'      : 'Date *',           required: true },
                    { field: 'total',         label: isAr ? 'الإجمالي *'     : 'Total *',          required: true },
                    { field: 'clientName',    label: isAr ? 'اسم العميل'     : 'Client Name',      required: false },
                    { field: 'subtotal',      label: isAr ? 'المبلغ قبل الضريبة' : 'Subtotal',     required: false },
                    { field: 'tax',           label: isAr ? 'الضريبة'        : 'Tax',              required: false },
                    { field: 'paymentMethod', label: isAr ? 'طريقة الدفع'    : 'Payment Method',   required: false },
                    { field: 'invoiceNumber', label: isAr ? 'رقم الفاتورة'   : 'Invoice Number',   required: false },
                  ] as const).map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label>
                      <select
                        value={invMapping[field] ?? ''}
                        onChange={e => setInvMapping(m => ({ ...m, [field]: e.target.value }))}
                        className="w-full text-xs px-2.5 py-2 border border-[#E9E7E2] rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
                      >
                        <option value="">{isAr ? '— لا شيء —' : '— none —'}</option>
                        {invColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              {invPreview.length > 0 && (
                <div className="bg-white border border-[#E9E7E2] rounded-2xl p-4 space-y-3 overflow-x-auto">
                  <h4 className="text-xs font-bold text-[#14332B] flex items-center gap-2">
                    <Table className="w-3.5 h-3.5" />
                    {isAr
                      ? `معاينة أول ${invPreview.length} صفوف (الملف: ${invTotalRows} صف)`
                      : `Preview — first ${invPreview.length} rows (file: ${invTotalRows} rows total)`}
                  </h4>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-[#F6F6F4]">
                        {['clientName', 'date', 'subtotal', 'tax', 'total', 'paymentMethod'].map(k => (
                          <th key={k} className="px-2 py-1.5 text-start font-bold text-slate-500 border border-[#E9E7E2] whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invPreview.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F7]'}>
                          {(['clientName', 'date', 'subtotal', 'tax', 'total', 'paymentMethod'] as const).map(k => (
                            <td key={k} className="px-2 py-1.5 border border-[#E9E7E2] font-mono">{String(r[k])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={confirmInvoiceImport}
                  disabled={invImporting || !dbProviderId || invRawData.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {invImporting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />}
                  {invImporting
                    ? (isAr ? 'جاري الاستيراد...' : 'Importing...')
                    : (isAr ? `تأكيد الاستيراد (${invTotalRows} صف)` : `Confirm Import (${invTotalRows} rows)`)}
                </button>
                <button
                  onClick={resetInvoiceImport}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Expected columns hint */}
          {!invParsed && !invResult && (
            <div className="bg-[#F6F6F4] rounded-xl p-4 text-xs text-[#6E6A63] space-y-2">
              <p className="font-bold text-[#1C1B18]">{isAr ? 'الأعمدة المتوقعة في ملفك:' : 'Expected columns in your file:'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: 'date',           desc: isAr ? 'YYYY-MM-DD' : 'YYYY-MM-DD' },
                  { key: 'total',          desc: isAr ? 'الإجمالي الكامل' : 'Total amount' },
                  { key: 'subtotal',       desc: isAr ? 'قبل الضريبة'    : 'Before tax' },
                  { key: 'tax',            desc: isAr ? 'مبلغ الضريبة'   : 'Tax amount' },
                  { key: 'clientName',     desc: isAr ? 'اسم العميل'     : 'Client name' },
                  { key: 'paymentMethod',  desc: isAr ? 'cash / card'     : 'cash / card' },
                ].map(col => (
                  <div key={col.key} className="flex items-start gap-1.5">
                    <span className="text-[#FF5A5F] font-bold font-mono">{col.key}</span>
                    <span className="text-[10px] text-[#9CA3AF]">— {col.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
