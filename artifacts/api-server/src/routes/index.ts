import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import { contactRouter } from "./contact";
import providersRouter from "./providers";
import bookingsRouter from "./bookings";
import clientsRouter from "./clients-routes";
import staffRouter from "./staff-routes";
import staffAuthRouter from "./staffAuth";
import remindersRouter from "./reminders";
import approvalsRouter from "./approvals";
import auditRouter from "./auditRoutes";
import internalRouter from "./internal";
import servicesRouter from "./services-routes";
import invoicesRouter from "./invoices-routes";
import adminPlatformRouter from "./admin-platform";
import whatsappWebhookRouter from "./whatsapp-webhook";
import whatsappConfigRouter from "./whatsapp-config";
import financialSettingsRouter from "./financial-settings";
import accountingIntegrationRouter from "./accounting-integration";
import branchesRouter from "./branches";

import publicRouter from "./public";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(internalRouter);
router.use(authRouter);
router.use(contactRouter);
router.use(providersRouter);
// Public/open routes MUST come before any router that calls router.use(tenantAuth)
// without a path prefix — those apply auth to ALL requests, causing 401s on public endpoints.
router.use(remindersRouter);
router.use(feedbackRouter);
router.use(publicRouter);
// WhatsApp webhook — public (HMAC-verified internally, no tenantAuth)
router.use(whatsappWebhookRouter);
// Staff auth routes (partially public: accept-invitation, invitation-info)
router.use(staffAuthRouter);
// Platform Owner (Super Admin) — MUST come before tenant-auth routers.
// bookingsRouter/clientsRouter etc. call router.use(tenantAuth) without a path
// prefix, which intercepts ALL requests (including /api/admin/*) and returns 401
// if tenant headers are absent.  Registering adminPlatformRouter first lets admin
// requests resolve before they ever hit tenantAuth.
router.use(adminPlatformRouter);
// WhatsApp config — also placed before tenant-auth routers for the same reason.
router.use(whatsappConfigRouter);
// Tenant-authenticated routers
router.use(bookingsRouter);
router.use(clientsRouter);
router.use(staffRouter);
router.use(approvalsRouter);
router.use(auditRouter);
router.use(servicesRouter);
router.use(invoicesRouter);
router.use(financialSettingsRouter);
// Accounting system integration: public webhook (token-auth) + pull sync settings (tenantAuth)
router.use(accountingIntegrationRouter);
// Branch management
router.use(branchesRouter);

export default router;
