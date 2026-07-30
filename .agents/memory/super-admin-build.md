---
name: Super Admin Control Center
description: Enterprise admin panel built as 12-file modular system replacing the old PlatformOwnerDashboard monolith
---

## Architecture
- **Entry point**: `src/components/PlatformOwnerDashboard.tsx` — sidebar layout container, maintains same props interface as the old monolith
- **Sub-components**: all in `src/components/admin/`

## 9 Sections
| Section | File | Key features |
|---------|------|------|
| Executive | AdminExecutive.tsx | KPI cards, revenue AreaChart, tier PieChart, churn BarChart, health snapshot |
| Salons | AdminSalons.tsx | CRUD, pending approvals, status/tier filter, detail drawer |
| Users & Roles | AdminUsers.tsx | Role management, permission toggles, add/suspend/delete |
| Billing | AdminBilling.tsx | Settlement ledger, Excel export, package CRUD modal |
| Business Intel | AdminBI.tsx | Forecast BarChart+Line, city breakdown, radar, churn LineChart |
| Marketing | AdminMarketing.tsx | Audience segmentation, multi-channel broadcast, campaign log |
| Support | AdminSupport.tsx | Ticket management, SLA display, in-app reply, status flow |
| Settings | AdminSettings.tsx | Integrations toggle/test, general settings, API keys |
| Security | AdminSecurity.tsx | Server health metrics, audit log with Excel export |

## Shared utilities
- `adminTypes.ts` — all shared TypeScript interfaces
- `adminData.ts` — mock data (6 salons, 6 users, 5 tickets, 8 audit entries, 8 integrations)
- `AdminToast.tsx` — 4-type toast notifications (auto-dismiss 4s)
- `AdminConfirm.tsx` — modal for destructive confirmations (replaces all alert()/confirm())

## Key design decisions
- **No alert()/confirm()** — all destructive actions go through AdminConfirm modal
- **Toast notifications** — all actions produce typed toasts
- **Sidebar** collapsible (desktop), drawer overlay (mobile)
- **RTL-first** — all `start/end` Tailwind logical properties used
- **Recharts** for all charts (already installed)
- **xlsx** for Excel export in Billing and Security

**Why:** The original 2710-line monolith used alert()/confirm(), had broken links, typos, and no charts. The rebuild needed clear section separation for future maintainability.
