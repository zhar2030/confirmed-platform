import { useState } from 'react';
import { UserPlus, Search, Shield, ShieldOff, Trash2, Check, X } from 'lucide-react';
import type { PlatformUser, Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';
import { MOCK_USERS } from './adminData';

interface Props { isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; openConfirm: (cfg: any) => void; }

const ROLE_CFG: Record<string, { label_ar: string; label_en: string; color: string }> = {
  super_admin:    { label_ar: 'سوبر أدمن', label_en: 'Super Admin', color: 'text-[#FF5A5F] bg-[#FF5A5F]/15 border-[#FF5A5F]/30' },
  senior_admin:   { label_ar: 'أدمن أول', label_en: 'Senior Admin', color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
  ops_supervisor: { label_ar: 'مشرف عمليات', label_en: 'Operations', color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
  marketing_spec: { label_ar: 'مسؤول تسويق', label_en: 'Marketing', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  tech_support:   { label_ar: 'دعم فني', label_en: 'Tech Support', color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
  finance_admin:  { label_ar: 'مالية', label_en: 'Finance', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
};

const ALL_PERMS = ['manage_salons', 'manage_users', 'view_financials', 'process_payouts', 'manage_billing', 'send_broadcasts', 'view_analytics', 'approve_requests', 'manage_tickets', 'view_reports', 'system_settings', 'security_audit'];

export default function AdminUsers({ isAr, addToast, openConfirm }: Props) {
  const [users, setUsers] = useState<PlatformUser[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', role: 'ops_supervisor' as PlatformUser['role'], permissions: ['manage_salons', 'view_reports'], mfaEnabled: false });

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name.includes(q) || u.email.includes(q);
  });

  const toggleStatus = (id: string) => {
    const u = users.find(u => u.id === id)!;
    const next = u.status === 'active' ? 'suspended' : 'active';
    openConfirm({
      title: next === 'suspended' ? (isAr ? 'تعليق المستخدم' : 'Suspend User') : (isAr ? 'تفعيل المستخدم' : 'Activate User'),
      message: isAr ? `هل تريدين ${next === 'suspended' ? 'تعليق' : 'تفعيل'} حساب "${u.name}"؟` : `${next === 'suspended' ? 'Suspend' : 'Activate'} "${u.name}"?`,
      danger: next === 'suspended',
      onConfirm: async () => {
        setUsers(prev => prev.map(usr => usr.id === id ? { ...usr, status: next } : usr));
        // Sync to DB if we have a real DB id
        const dbId = (u as any).dbId;
        if (dbId) {
          try {
            await fetch(`/api/providers/${dbId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
              body: JSON.stringify({ status: next }),
            });
          } catch { /* silent — UI already updated */ }
        }
        addToast({ type: next === 'active' ? 'success' : 'warning', message: isAr ? `تم ${next === 'active' ? 'تفعيل' : 'تعليق'} "${u.name}"` : `"${u.name}" ${next}` });
      }
    });
  };

  const deleteUser = (id: string) => {
    const u = users.find(u => u.id === id)!;
    if (u.role === 'super_admin') { addToast({ type: 'error', message: isAr ? 'لا يمكن حذف السوبر أدمن' : 'Cannot delete Super Admin' }); return; }
    openConfirm({
      title: isAr ? 'حذف المستخدم' : 'Delete User',
      message: isAr ? `هل تريدين حذف "${u.name}" نهائياً؟` : `Permanently delete "${u.name}"?`,
      danger: true,
      onConfirm: async () => {
        setUsers(prev => prev.filter(usr => usr.id !== id));
        const dbId = (u as any).dbId;
        if (dbId) {
          try {
            await fetch(`/api/providers/${dbId}`, { method: 'DELETE', headers: getAdminHeaders() });
          } catch { /* silent */ }
        }
        addToast({ type: 'error', message: isAr ? `تم حذف "${u.name}"` : `"${u.name}" deleted` });
      }
    });
  };

  const [saving, setSaving] = useState(false);

  const addUser = async () => {
    if (!draft.name || !(draft as any).username || !draft.email || !draft.phone) {
      addToast({ type: 'error', message: isAr ? 'يرجى تعبئة جميع الحقول المطلوبة' : 'Fill all required fields' });
      return;
    }
    setSaving(true);
    try {
      // Save to DB so the account can actually log in
      const res = await fetch('/api/providers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameAr: draft.name,
          nameEn: draft.name,
          email: draft.email,
          phone: draft.phone,
          username: (draft as any).username || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === 'email_already_registered'
          ? (isAr ? 'هذا البريد مسجّل مسبقاً' : 'Email already registered')
          : data.error === 'username_already_taken'
          ? (isAr ? 'اسم المستخدم محجوز، جرّب آخر' : 'Username taken, try another')
          : (isAr ? 'حدث خطأ، حاول مجدداً' : 'Error, please try again');
        addToast({ type: 'error', message: msg });
        return;
      }
      // Add to local display list with the actual username from DB
      const user: PlatformUser = {
        id: 'u_' + Date.now(),
        ...draft,
        name: draft.name,
        email: draft.email,
        joinedAt: new Date().toISOString().split('T')[0],
        lastLogin: '—',
        status: 'active',
        dbId: data.id,          // real DB id for future PATCH/DELETE
        username: data.username, // confirmed username from DB
      } as any;
      setUsers(prev => [user, ...prev]);
      addToast({
        type: 'success',
        message: isAr
          ? `✅ تم إنشاء حساب "${draft.name}" — اسم المستخدم: ${data.username}`
          : `✅ "${draft.name}" created — username: ${data.username}`,
      });
      setShowAdd(false);
      setDraft({ name: '', email: '', phone: '', role: 'ops_supervisor', permissions: ['manage_salons', 'view_reports'], mfaEnabled: false });
    } catch {
      addToast({ type: 'error', message: isAr ? 'تعذّر الاتصال بالسيرفر' : 'Could not reach server' });
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (perm: string) => {
    setDraft(d => ({ ...d, permissions: d.permissions.includes(perm) ? d.permissions.filter(p => p !== perm) : [...d.permissions, perm] }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? 'بحث...' : 'Search...'} className="bg-white border border-slate-200 rounded-xl ps-8 pe-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F] w-52" />
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
          <UserPlus className="w-3.5 h-3.5" />{isAr ? 'إضافة مستخدم' : 'Add User'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border border-[#FF5A5F]/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">{isAr ? 'إضافة مستخدم جديد' : 'Add New User'}</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-900 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[{ k: 'name', l: isAr ? 'الاسم *' : 'Full Name *', ph: isAr ? 'الاسم الكامل' : 'Full name' }, { k: 'username', l: isAr ? 'اسم المستخدم *' : 'Username *', ph: 'ahmad.ops' }, { k: 'email', l: isAr ? 'البريد *' : 'Email *', ph: 'user@confirmed.sa' }, { k: 'phone', l: isAr ? 'الجوال *' : 'Phone *', ph: '05XXXXXXXX' }].map(f => (
              <div key={f.k}>
                <label className="block text-[10px] text-slate-500 font-bold mb-1">{f.l}</label>
                <input value={(draft as any)[f.k]} onChange={e => setDraft(d => ({ ...d, [f.k]: e.target.value }))} placeholder={f.ph} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F]" />
              </div>
            ))}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">{isAr ? 'الدور' : 'Role'}</label>
              <select value={draft.role} onChange={e => setDraft(d => ({ ...d, role: e.target.value as any }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F]">
                {Object.entries(ROLE_CFG).filter(([k]) => k !== 'super_admin').map(([k, v]) => <option key={k} value={k}>{isAr ? v.label_ar : v.label_en}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-2">{isAr ? 'الصلاحيات' : 'Permissions'}</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMS.map(p => (
                <button key={p} onClick={() => togglePerm(p)} className={`text-[9px] font-bold px-2 py-1 rounded-lg border cursor-pointer transition-all ${draft.permissions.includes(p) ? 'border-[#FF5A5F]/50 bg-[#FF5A5F]/15 text-[#FF5A5F]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {draft.permissions.includes(p) && <Check className="w-2.5 h-2.5 inline me-1" />}{p.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={addUser} className="px-5 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer">{isAr ? 'حفظ' : 'Save'}</button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2 border border-slate-200 text-slate-400 text-xs font-bold rounded-xl cursor-pointer hover:bg-white/5">{isAr ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </div>
      )}

      {/* Users grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(u => {
          const role = ROLE_CFG[u.role] || ROLE_CFG.tech_support;
          return (
            <div key={u.id} className={`bg-white border rounded-2xl p-5 space-y-4 transition-all ${u.status === 'suspended' ? 'border-red-500/20 opacity-70' : 'border-slate-200 hover:border-white/15'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5A5F]/30 to-[#FF5A5F]/10 flex items-center justify-center font-black text-[#FF5A5F] text-sm">{u.name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{u.name}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${role.color}`}>{isAr ? role.label_ar : role.label_en}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {u.mfaEnabled && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">MFA</span>}
                  <span className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
              </div>
              <div className="space-y-1.5 text-[10px] text-slate-500 font-mono">
                <p>{u.email}</p>
                <p>{u.phone}</p>
                <p>{isAr ? 'آخر دخول:' : 'Last login:'} {u.lastLogin === '—' ? '—' : new Date(u.lastLogin).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {u.permissions.slice(0, 3).map(p => <span key={p} className="text-[8px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded font-mono">{p.replace(/_/g, ' ')}</span>)}
                {u.permissions.length > 3 && <span className="text-[8px] text-slate-600">+{u.permissions.length - 3}</span>}
              </div>
              {u.role !== 'super_admin' && (
                <div className="flex gap-2 pt-1 border-t border-slate-200">
                  <button onClick={() => toggleStatus(u.id)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 ${u.status === 'active' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}>
                    {u.status === 'active' ? <ShieldOff className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    {u.status === 'active' ? (isAr ? 'تعليق' : 'Suspend') : (isAr ? 'تفعيل' : 'Activate')}
                  </button>
                  <button onClick={() => deleteUser(u.id)} className="px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
