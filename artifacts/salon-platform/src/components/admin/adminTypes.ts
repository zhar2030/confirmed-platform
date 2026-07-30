// ─── Shared Super-Admin Types ─────────────────────────────────────────────────
// PLATFORM OWNER dashboard only — NOT for salon owners or staff.

export interface RegisteredProvider {
  id: string;
  storeName: string;
  ownerName: string;
  phone: string;
  email: string;
  activity: string;
  city: string;
  status: 'active' | 'suspended' | 'trial' | 'deleted';
  joinedAt: string;
  subdomain: string;
  totalSales: number;
  paidOut: number;
  pendingPayout: number;
  subscriptionTier: 'basic' | 'pro' | 'enterprise';
  subscriptionPrice: number;
  subscriptionStatus: 'active' | 'overdue' | 'trial' | 'cancelled';
  staffCount: number;
  bookingsCount: number;
  rating: number;
  branches: number;
  country: 'SA';
  mrr: number;
  churnRisk: 'low' | 'medium' | 'high';
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'senior_admin' | 'ops_supervisor' | 'marketing_spec' | 'tech_support' | 'finance_admin';
  joinedAt: string;
  lastLogin: string;
  permissions: string[];
  status: 'active' | 'suspended';
  mfaEnabled: boolean;
  avatar?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  salonName: string;
  salonEmail: string;
  category: 'billing' | 'technical' | 'feature_request' | 'account' | 'general';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'pending_reply' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  messages: TicketMessage[];
  sla: number;
}

export interface TicketMessage {
  id: string;
  sender: string;
  senderType: 'client' | 'admin';
  content: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  targetType: 'salon' | 'user' | 'billing' | 'system' | 'security' | 'marketing';
  severity: 'info' | 'warning' | 'critical';
  ip: string;
  result: 'success' | 'failed';
}

export interface SystemMetric {
  label: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

export interface Integration {
  id: string;
  name: string;
  category: 'payment' | 'sms' | 'email' | 'erp' | 'analytics' | 'api';
  status: 'connected' | 'disconnected' | 'error';
  provider: string;
  lastSync: string;
  icon: string;
}

export interface RevenueDataPoint {
  month: string;
  subscriptions: number;
  commissions: number;
  total: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// ── New types for upgraded sections ──────────────────────────────────────────

export interface FeatureFlag {
  id: number;
  flag_key: string;
  enabled: boolean;
  label_ar: string;
  label_en: string;
  category: string;
  salon_id: number | null;
  updated_at: string;
}

export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  permissions: string[];
  environment: string;
  last_used_at: string | null;
  usage_count: number;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

export interface ContentBlock {
  id: number;
  content_key: string;
  value_ar: string;
  value_en: string;
  section: string;
  updated_at: string;
}

export interface BackupEntry {
  id: number;
  filename: string;
  size_bytes: number;
  status: string;
  tables_backed_up: number;
  created_at: string;
}

export interface SystemHealth {
  status: string;
  db: { status: string; responseMs: number; tables: number; totalRows: number };
  memory: { usedMB: number; totalMB: number; percent: number };
  uptime: number;
  nodeVersion: string;
  env: string;
  email: { brevo: boolean; resend: boolean };
}

export type AdminSection =
  | 'executive'
  | 'salons'
  | 'users'
  | 'billing'
  | 'bi'
  | 'finance'
  | 'marketing'
  | 'support'
  | 'reminders'
  | 'feature_flags'
  | 'api_keys'
  | 'monitoring'
  | 'content'
  | 'ai_insights'
  | 'export'
  | 'settings'
  | 'security';
