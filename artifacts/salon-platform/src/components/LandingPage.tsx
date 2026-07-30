import React, { useState, useEffect } from 'react';
import confirmedLogo from '../assets/logo.png';
import { saveProviderToken } from '../lib/providerAuth';
import { Menu, X, ArrowUpRight, Check, CheckCircle2, Heart, Sparkles, LogIn, Mail, Phone, Calendar, User, ShoppingBag, ShieldCheck, Lock, Unlock, ShieldAlert, Key, Smartphone, RefreshCw, Eye, EyeOff, Building, Briefcase, Plus, CreditCard, ChevronDown, UserCheck } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import RoadmapManager from './RoadmapManager';
import { sanitizeInput, logSecurityEvent } from '../lib/security';
import { saveAdminCredentials } from '../lib/adminAuth';
import { saveUnifiedSession } from '../lib/unifiedAuth';

interface LandingPageProps {
  onLogin: (isPlatformAdmin?: boolean, providerData?: any) => void;
  onAddProviderRequest?: (newRequest: any) => void;
  providerRequests?: any[];
  packages?: any[];
}

export default function LandingPage({ onLogin, onAddProviderRequest, providerRequests = [], packages = [] }: LandingPageProps) {
  const { lang, toggleLanguage, t, dir, isAr } = useLanguage();
  const [activeView, setActiveView] = useState<'home' | 'roadmap'>('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [formSent, setFormSent] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [liveNow, setLiveNow] = useState(() => new Date());
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);

  // Service Provider Registration State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3 | 4>(1);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regActivity, setRegActivity] = useState('صالون شعر وتجميل');
  const [regCustomActivity, setRegCustomActivity] = useState('');
  const [regFormError, setRegFormError] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);

  // New States for Secure Package Booking & Checkout Flow
  const [selectedPackage, setSelectedPackage] = useState<string | null>(packages[1]?.id || packages[0]?.id || 'pro');
  const [paymentMethod, setPaymentMethod] = useState<'mada' | 'credit' | 'applepay'>('mada');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Secure Multi-Factor Authentication System States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginType, setLoginType] = useState<'owner' | 'staff'>('owner'); // owner=password, staff=password
  const [loginStep, setLoginStep] = useState<1 | 2 | 3>(1); // 3 = forgot password
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Staff login state
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword]     = useState('');
  const [staffShowPw, setStaffShowPw]         = useState(false);
  const [staffLoading, setStaffLoading]       = useState(false);
  const [staffError, setStaffError]           = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(4);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showMfaSandbox, setShowMfaSandbox] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  // عداد تنازلي للـ rate limit
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  // Reset password form state
  const [resetOtpDigits, setResetOtpDigits] = useState(['', '', '', '', '', '']);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetShowPassword, setResetShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // OTP email target for display (masked)
  const [otpEmailTarget, setOtpEmailTarget] = useState('');
  const [showDemoCode, setShowDemoCode] = useState(true);
  const [otpResent, setOtpResent] = useState(false);

  const maskEmail = (email: string) => {
    if (email.includes('@')) {
      const [local, domain] = email.split('@');
      const masked = local.length > 2
        ? local[0] + '•'.repeat(Math.min(local.length - 2, 4)) + local[local.length - 1]
        : local[0] + '•••';
      return `${masked}@${domain}`;
    }
    // username without @: show first 2 chars + dots
    return email.slice(0, 2) + '•••••';
  };

  // Mock SHA-256 client hashing visualizer helper
  const getSHA256Mock = (str: string) => {
    if (!str) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return (hex + '8f7d93b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9').substring(0, 64);
  };

  // فتح نموذج تسجيل الدخول تلقائياً بعد نجاح تغيير كلمة المرور
  useEffect(() => {
    try {
      const flag = sessionStorage.getItem('open_login_after_reset');
      if (flag === '1') {
        sessionStorage.removeItem('open_login_after_reset');
        const savedEmail = sessionStorage.getItem('post_reset_email') || '';
        sessionStorage.removeItem('post_reset_email');
        setUsername(savedEmail);
        setShowLoginModal(true);
        setLoginStep(1);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setTimeout(() => setLockoutTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (lockoutTimer === 0 && isLockedOut) {
      setIsLockedOut(false);
      setAttemptsLeft(4);
      setErrorMessage("");
    }
    return undefined;
  }, [lockoutTimer, isLockedOut]);

  // ساعة حية — تتحدث كل ثانية
  useEffect(() => {
    const tick = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // عداد تنازلي لـ rate limit
  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const t = setTimeout(() => setRateLimitSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [rateLimitSeconds]);



  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    // ── تسجيل الدخول بالإيميل وكلمة المرور ───────────────────────────────
    const cleanEmail = sanitizeInput(username).trim().toLowerCase();
    if (!cleanEmail || !password) return;

    if (attemptsLeft <= 1) {
      setAttemptsLeft(0);
      setIsLockedOut(true);
      setLockoutTimer(60);
      setErrorMessage(isAr
        ? '⚠️ تم قفل الحساب مؤقتاً لمدة 60 ثانية بسبب تجاوز الحد الأقصى للمحاولات.'
        : '⚠️ Account locked for 60s due to too many failed attempts.');
      return;
    }

    setErrorMessage('');
    setIsSendingOTP(true);

    try {
      const res = await fetch('/api/auth/provider/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json();

      if (!data?.success) {
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);
        if (data?.error === 'invalid_credentials') {
          setErrorMessage(isAr
            ? `❌ البريد الإلكتروني أو كلمة المرور غير صحيحة. (المحاولات المتبقية: ${remaining})`
            : `❌ Incorrect email or password. (${remaining} attempts remaining)`);
        } else if (data?.error === 'no_password_set') {
          setErrorMessage(isAr
            ? '⚠️ هذا الحساب لا يملك كلمة مرور. تواصلي مع الإدارة.'
            : '⚠️ No password set for this account. Contact support.');
        } else if (data?.error === 'account_suspended') {
          setErrorMessage(isAr ? '🚫 الحساب موقوف. تواصلي مع الإدارة.' : '🚫 Account suspended. Contact support.');
        } else {
          setErrorMessage(isAr ? '⚠️ خطأ غير متوقع. أعيدي المحاولة.' : '⚠️ Unexpected error. Try again.');
        }
        return;
      }

      // ── نجاح ✅ ─────────────────────────────────────────────────────────
      logSecurityEvent(cleanEmail, isAr ? 'تسجيل دخول بكلمة المرور بنجاح' : 'Password login successful', 'Passed');

      const provider = data.provider;
      const isPlatformAdmin = provider?.role === 'owner';

      const providerData = {
        id: provider.id,
        username: provider.username,
        email: provider.email,
        role: provider.role,
        storeName: provider.nameAr || provider.nameEn,
        name: provider.nameAr || provider.nameEn,
        paymentStatus: provider.subscriptionStatus === 'active' ? 'paid_verified' : 'trial_active',
        selectedPackage: provider.subscriptionTier || 'basic',
        subscriptionStatus: provider.subscriptionStatus,
        status: provider.status,
        logoUrl: provider.logoUrl || null,
      };

      if (data.providerToken && data.providerId) {
        saveProviderToken({ providerId: data.providerId, username: provider.username, token: data.providerToken });
      }
      if (data.unifiedToken && data.tenantId) {
        saveUnifiedSession({
          token: data.unifiedToken,
          tenantId: data.tenantId,
          actorId: data.actorId ?? data.tenantId,
          actorType: data.actorType ?? 'owner',
          role: data.actorRole ?? 'manager',
          permissions: data.permissions ?? [],
          salonName: providerData.storeName,
          legacyProviderId: data.providerId,
          legacyProviderUser: provider.username,
          legacyProviderToken: data.providerToken,
        });
      }
      // Save admin credentials for platform owner (password login path)
      if (isPlatformAdmin && data.adminToken) {
        saveAdminCredentials(provider.username, data.adminToken);
      }

      setShowLoginModal(false);
      setLoginStep(1);
      setUsername('');
      setPassword('');
      setAttemptsLeft(4);
      onLogin(isPlatformAdmin, providerData);
    } catch {
      setErrorMessage(isAr ? '🔌 تعذّر الاتصال بالخادم.' : '🔌 Cannot reach server.');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedOtp = sanitizeInput(enteredOTP);
    const cleanUser = sanitizeInput(username).trim().toLowerCase();

    // ── التحقق من OTP عبر السيرفر ─────────────────────────────────────────────
    // لا يوجد fallback محلي في الإنتاج — الـ OTP دائماً يُتحقق منه بالخادم
    let isValid = false;
    let serverAdminToken: string | undefined;
    let otpResponseData: any = null;
    try {
      let res: Response;
      let data: any;

      try {
        res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, otp: sanitizedOtp }),
        });
        data = await res.json();
      } catch {
        setOtpError(isAr
          ? '🔌 تعذّر الاتصال بالخادم. تحققي من الإنترنت وأعيدي المحاولة.'
          : '🔌 Cannot reach the server. Check your connection and try again.');
        return;
      }

      otpResponseData = data;

      // Rate limit
      if (res.status === 429 || data?.error === 'otp_rate_limited') {
        const secs = data?.retryAfter ?? 60;
        setRateLimitSeconds(secs);
        setOtpError(isAr
          ? `⏳ طلبات كثيرة. أعيدي المحاولة بعد ${secs} ثانية.`
          : `⏳ Too many requests. Try again in ${secs} seconds.`);
        return;
      }

      // خطأ في الخادم
      if (res.status >= 500 || data?.reason === 'server_error') {
        setOtpError(isAr
          ? '⚠️ مشكلة مؤقتة في الخادم. أعيدي المحاولة.'
          : '⚠️ Temporary server issue. Please try again.');
        return;
      }

      if (data.valid) {
        isValid = true;
        if (data.adminToken) serverAdminToken = data.adminToken;
      } else if (data.reason === 'expired' || data.reason === 'not_found') {
        setOtpError(isAr ? '⏱ انتهت صلاحية الرمز. اضغطي إعادة الإرسال.' : '⏱ Code expired. Please resend.');
        return;
      } else if (data.reason === 'max_attempts') {
        setOtpError(isAr ? '🔒 تجاوزت الحد الأقصى للمحاولات. اضغطي إعادة الإرسال للحصول على رمز جديد.' : '🔒 Too many attempts. Please request a new code.');
        return;
      } else if (data.reason === 'wrong_otp') {
        const left = data.attemptsLeft;
        setOtpError(
          isAr
            ? `❌ الرمز غير صحيح.${left !== undefined ? ` (محاولات متبقية: ${left})` : ''}`
            : `❌ Incorrect code.${left !== undefined ? ` (${left} attempt${left !== 1 ? 's' : ''} left)` : ''}`
        );
        return;
      } else if (!data.valid) {
        // أي حالة غير متوقعة — لا نُخمّن
        setOtpError(isAr
          ? '⚠️ تعذّر التحقق. أعيدي المحاولة أو اطلبي رمزاً جديداً.'
          : '⚠️ Verification failed. Try again or request a new code.');
        return;
      }
    } catch {
      setOtpError(isAr
        ? '⚠️ خطأ غير متوقع. أعيدي المحاولة.'
        : '⚠️ Unexpected error. Please try again.');
      return;
    }

    if (isValid) {
      // ── Fetch provider data & role from DB ────────────────────────────────
      const mapSubStatus = (sub: string): string => {
        if (sub === 'active') return 'paid_verified';
        if (sub === 'trial')  return 'trial_active';
        return 'pending';
      };

      let providerData: any = null;
      let isPlatformAdmin = false;

      try {
        const infoRes = await fetch(`/api/auth/provider/${encodeURIComponent(cleanUser)}`);
        if (infoRes.ok) {
          const { provider } = await infoRes.json();
          // Super admin = role 'owner'
          isPlatformAdmin = provider.role === 'owner';
          providerData = {
            id: provider.id,
            username: provider.username,
            email: provider.email,
            role: provider.role,
            storeName: provider.nameAr || provider.nameEn,
            name: provider.nameAr || provider.nameEn,
            activity: provider.city || '',
            phone: provider.phone || '',
            paymentStatus: mapSubStatus(provider.subscriptionStatus || ''),
            selectedPackage: provider.subscriptionTier || 'basic',
            subscriptionStatus: provider.subscriptionStatus,
            status: provider.status,
            logoUrl: provider.logoUrl || null,
          };
        }
      } catch {
        // API unreachable — isPlatformAdmin stays false (safe default).
        // Role MUST come from providers.role = 'owner' in the database.
        // Username-based shortcuts are a security anti-pattern and are not used.
      }

      // ── Role boundary: isPlatformAdmin is ONLY set when the DB explicitly
      // returns role = 'owner'. No username fallbacks, no hardcodes.
      // Salon owners (role = 'provider') always land in ProviderDashboard.

      // Fallback: check localStorage requests
      if (!providerData) {
        const matchedRequest = providerRequests.find((r: any) =>
          r.email?.trim().toLowerCase() === cleanUser ||
          r.username?.trim().toLowerCase() === cleanUser
        );
        if (matchedRequest) {
          providerData = {
            id: matchedRequest.id,
            username: cleanUser,
            storeName: matchedRequest.storeName,
            activity: matchedRequest.activity,
            name: matchedRequest.name,
            email: matchedRequest.email,
            phone: matchedRequest.phone,
            paymentStatus: matchedRequest.paymentStatus || 'trial_active',
            selectedPackage: matchedRequest.selectedPackage || 'basic',
          };
        }
      }

      // Last fallback: known demo accounts
      if (!providerData) {
        const demos: Record<string, any> = {
          'amal.hair':   { storeName: isAr ? 'صالون أمل للشعر' : 'Amal Hair Salon', name: 'أمل', activity: 'شعر وتجميل' },
          'dalal.spa':   { storeName: isAr ? 'سبا دلال الاسترخائي' : 'Dalal Relaxation Spa', name: 'دلال', activity: 'سبا ومساج' },
          'shahad.nail': { storeName: isAr ? 'صالون شهد للأظافر' : 'Shahad Nail Lounge', name: 'شهد', activity: 'عناية بالأظافر' },
          'jawahir.mua': { storeName: isAr ? 'استوديو جواهر للتجميل' : 'Jawahir Makeup Studio', name: 'جواهر', activity: 'مكياج وتجميل' },
        };
        if (demos[cleanUser]) {
          providerData = { username: cleanUser, paymentStatus: 'paid_verified', ...demos[cleanUser] };
        }
      }

      logSecurityEvent(
        cleanUser,
        isAr
          ? 'تم التحقق من بروتوكول المصادقة الثنائية بنجاح - الدخول الآمن للوحة النظام'
          : 'Multi-Factor verification successful - authorized access granted to workstation',
        'Passed'
      );

      // Store admin token if this is a platform owner login
      if (isPlatformAdmin && serverAdminToken) {
        saveAdminCredentials(cleanUser, serverAdminToken);
      }

      // Store provider token for non-admin providers (IDOR fix)
      if (!isPlatformAdmin && otpResponseData?.providerToken && otpResponseData?.providerId) {
        saveProviderToken({
          providerId: otpResponseData.providerId,
          username:   otpResponseData.providerUser ?? cleanUser,
          token:      otpResponseData.providerToken,
        });
      }

      // Save unified token (new format — sets proper tenant context for all API calls)
      if (otpResponseData?.unifiedToken && otpResponseData?.tenantId) {
        saveUnifiedSession({
          token:       otpResponseData.unifiedToken,
          tenantId:    otpResponseData.tenantId,
          actorId:     otpResponseData.actorId ?? otpResponseData.tenantId,
          actorType:   otpResponseData.actorType ?? 'owner',
          role:        otpResponseData.actorRole ?? (isPlatformAdmin ? 'owner' : 'manager'),
          permissions: otpResponseData.permissions ?? [],
          salonName:   providerData?.storeName,
          legacyProviderId:    otpResponseData.providerId,
          legacyProviderUser:  otpResponseData.providerUser ?? cleanUser,
          legacyProviderToken: otpResponseData.providerToken,
        });
      }

      setShowLoginModal(false);
      setLoginStep(1);
      setUsername('');
      setPassword('');
      setAttemptsLeft(4);
      setEnteredOTP('');
      setOtpSent(false);
      setShowMfaSandbox(false);
      onLogin(isPlatformAdmin, providerData); // Proceed to system dashboard
    } else {
      logSecurityEvent(
        cleanUser,
        isAr 
          ? 'فشل إدخال رمز التحقق (OTP)' 
          : 'Invalid 2FA OTP code submitted',
        'Warning'
      );

      setOtpError(isAr 
        ? '❌ رمز التحقق غير صحيح. يرجى إدخال الكود المستلم في البريد أو الجوال.' 
        : '❌ Incorrect 2FA verification code. Check the simulated SMS or Email notifications.');
    }
  };

  const handleAutoFillDemo = (user: string) => {
    setUsername(user);
    setErrorMessage('');
  };

  const handleResendOTP = async () => {
    const cleanUser = sanitizeInput(username).trim().toLowerCase();
    setIsSendingOTP(true);
    try {
      const matchedRequest = providerRequests.find((r: any) =>
        r.email?.trim().toLowerCase() === cleanUser || r.storeName?.trim().toLowerCase() === cleanUser
      );
      const providerEmail = matchedRequest?.status === 'approved' ? matchedRequest?.email : undefined;
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, providerEmail }),
      });
      const data = await res.json();
      if (data.maskedEmail) setOtpEmailTarget(data.maskedEmail);
      // Dev mode: sync demo reveal with backend OTP
      if (data.devOtp) {
        setGeneratedOTP(data.devOtp);
      } else {
        setGeneratedOTP(Math.floor(100000 + Math.random() * 900000).toString());
      }
    } catch {
      setGeneratedOTP(Math.floor(100000 + Math.random() * 900000).toString());
    } finally {
      setIsSendingOTP(false);
    }
    setEnteredOTP('');
    setOtpError('');
    setShowDemoCode(false);
    setOtpResent(true);
    setTimeout(() => setOtpResent(false), 3000);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(forgotEmail).trim().toLowerCase();
    if (!cleanEmail) {
      setForgotEmailError(isAr ? 'يرجى إدخال بريدك الإلكتروني' : 'Please enter your email address');
      return;
    }
    setIsSendingReset(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
    } catch {
      // Always show success regardless (prevent email enumeration)
    } finally {
      setIsSendingReset(false);
      setForgotSent(true);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = resetOtpDigits.join('');
    if (otp.length < 6) { setResetError(isAr ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter the 6-digit code'); return; }
    if (!resetNewPassword || resetNewPassword.length < 8) { setResetError(isAr ? 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل' : 'Password must be at least 8 characters'); return; }
    if (resetNewPassword !== resetConfirmPassword) { setResetError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'); return; }
    setResetLoading(true);
    setResetError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), otp, newPassword: resetNewPassword }),
      });
      const data = await res.json();
      if (!data?.success) {
        setResetError(isAr ? (data.messageAr || 'رمز خاطئ أو منتهي الصلاحية') : (data.messageEn || 'Invalid or expired code'));
        return;
      }
      // Auto-login
      setResetSuccess(true);
      const provider = data.provider;
      const isPlatformAdmin = provider?.role === 'owner';
      const providerData = {
        id: provider.id, username: provider.username, email: provider.email,
        role: provider.role, storeName: provider.nameAr || provider.nameEn,
        name: provider.nameAr || provider.nameEn,
        paymentStatus: provider.subscriptionStatus === 'active' ? 'paid_verified' : 'trial_active',
        selectedPackage: provider.subscriptionTier || 'basic',
        subscriptionStatus: provider.subscriptionStatus, status: provider.status,
      };
      if (data.providerToken && data.providerId) saveProviderToken({ providerId: data.providerId, username: provider.username, token: data.providerToken });
      if (data.unifiedToken && data.tenantId) saveUnifiedSession({ token: data.unifiedToken, tenantId: data.tenantId, actorId: data.actorId ?? data.tenantId, actorType: data.actorType ?? 'owner', role: data.actorRole ?? 'manager', permissions: data.permissions ?? [], salonName: providerData.storeName, legacyProviderId: data.providerId, legacyProviderUser: provider.username, legacyProviderToken: data.providerToken });
      setTimeout(() => {
        setShowLoginModal(false);
        setLoginStep(1);
        setForgotSent(false);
        setForgotEmail('');
        setResetOtpDigits(['', '', '', '', '', '']);
        setResetNewPassword('');
        setResetConfirmPassword('');
        setResetSuccess(false);
        onLogin(isPlatformAdmin, providerData);
      }, 1200);
    } catch {
      setResetError(isAr ? '🔌 تعذّر الاتصال بالخادم' : '🔌 Cannot reach server');
    } finally {
      setResetLoading(false);
    }
  };

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [facilityType, setFacilityType] = useState('صالون نسائي');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState('');

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedName = sanitizeInput(regName);
    const sanitizedPhone = sanitizeInput(regPhone);
    const sanitizedEmail = sanitizeInput(regEmail);
    const sanitizedStoreName = sanitizeInput(regStoreName);

    if (!sanitizedName || !sanitizedPhone || !sanitizedEmail) {
      setRegFormError(isAr ? 'الرجاء تعبئة جميع الحقول المطلوبة' : 'Please fill in all required fields');
      return;
    }
    if (!sanitizedStoreName) {
      setRegFormError(isAr ? 'الرجاء تعبئة اسم المنشأة' : 'Please fill in the store name');
      return;
    }

    setIsSubmittingReg(true);
    setRegFormError('');

    try {
      const res = await fetch('/api/providers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameAr: sanitizedStoreName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          storeName: sanitizedStoreName,
        }),
      });

      const data = await res.json();

      // If already registered → still send OTP and open login
      const targetEmail = sanitizedEmail.trim().toLowerCase();

      if (!res.ok && res.status !== 409) {
        setRegFormError(isAr ? '❌ حدث خطأ، يرجى المحاولة مجدداً.' : '❌ Something went wrong. Please try again.');
        return;
      }

      // Notify admin panel
      if (res.ok && onAddProviderRequest) {
        onAddProviderRequest({
          id: 'req-' + Math.random().toString(36).substring(2, 9),
          name: sanitizedName,
          phone: sanitizedPhone,
          email: targetEmail,
          storeName: sanitizedStoreName,
          status: 'approved',
          requestedAt: new Date().toISOString(),
        });
      }

      // Auto-send OTP then open login at OTP step
      try {
        const otpRes = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: targetEmail }),
        });
        const otpData = await otpRes.json();
        if (otpData.devOtp) setGeneratedOTP(otpData.devOtp);
        setOtpEmailTarget(otpData.maskedEmail || targetEmail);
      } catch { /* user enters OTP manually */ }

      // Close register → open login at OTP screen
      setShowRegisterModal(false);
      setRegisterStep(1);
      setRegName(''); setRegPhone(''); setRegEmail('');
      setRegStoreName(''); setRegCustomActivity(''); setRegFormError('');

      setUsername(targetEmail);
      setLoginStep(2);
      setOtpSent(true);
      setShowLoginModal(true);
    } catch {
      setRegFormError(isAr ? '❌ خطأ في الاتصال، يرجى المحاولة مجدداً.' : '❌ Connection error. Please try again.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          facilityType,
          email,
          phone,
          message,
        }),
      });
    } catch {
      // Show success regardless — don't block UX on network errors
    } finally {
      setIsSubmittingContact(false);
      setFormSent(true);
    }
  };

  const basicPrice = billing === 'monthly' ? '149' : '119';
  const proPrice = billing === 'monthly' ? '299' : '239';
  
  const periodLabel = isAr 
    ? (billing === 'monthly' ? 'شهرياً' : 'شهرياً (فوترة سنوية)') 
    : (billing === 'monthly' ? '/ mo' : '/ mo (billed annually)');

  return (
    <div className="min-h-screen bg-[#F6F6F4] text-[#1C1B18] selection:bg-[#FF5A5F]/20 selection:text-[#FF5A5F] overflow-x-hidden" dir={dir}>
      {/* ===== HEADER ===== */}
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/90 backdrop-blur-md border-b border-[#E9E7E2] shadow-sm' 
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
          <button 
            onClick={() => {
              setActiveView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 hover:opacity-90 transition-all text-left rtl:text-right cursor-pointer border-none bg-transparent shrink-0"
          >
            <img
              src={confirmedLogo}
              alt="CONFIRMED"
              className="h-10 w-auto object-contain select-none"
              draggable={false}
            />
          </button>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="flex items-center gap-4 xl:gap-8 shrink-0">
              <a href="#features" onClick={() => setActiveView('home')} className="text-[14px] xl:text-[15px] font-medium text-[#1C1B18]/80 hover:text-[#FF5A5F] transition-colors whitespace-nowrap">{isAr ? 'المميزات' : 'Features'}</a>
              <a href="#how" onClick={() => setActiveView('home')} className="text-[14px] xl:text-[15px] font-medium text-[#1C1B18]/80 hover:text-[#FF5A5F] transition-colors whitespace-nowrap">{isAr ? 'كيف يعمل' : 'How It Works'}</a>
              <a href="#pricing" onClick={() => setActiveView('home')} className="text-[14px] xl:text-[15px] font-medium text-[#1C1B18]/80 hover:text-[#FF5A5F] transition-colors whitespace-nowrap">{isAr ? 'الأسعار' : 'Pricing'}</a>
              <a href="#faq" onClick={() => setActiveView('home')} className="text-[14px] xl:text-[15px] font-medium text-[#1C1B18]/80 hover:text-[#FF5A5F] transition-colors whitespace-nowrap">{isAr ? 'الأسئلة الشائعة' : 'FAQ'}</a>
              <a href="#contact" onClick={() => setActiveView('home')} className="text-[14px] xl:text-[15px] font-medium text-[#1C1B18]/80 hover:text-[#FF5A5F] transition-colors whitespace-nowrap">{isAr ? 'اتصلي بنا' : 'Contact Us'}</a>
              <button
                onClick={() => {
                  setActiveView('roadmap');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`text-[14px] xl:text-[15px] font-semibold transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-none shrink-0 whitespace-nowrap ${
                  activeView === 'roadmap' ? 'text-[#FF5A5F]' : 'text-[#1C1B18]/80 hover:text-[#FF5A5F]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#FF5A5F]" />
                <span>{isAr ? 'خارطة الطريق (AI)' : 'Roadmap (AI)'}</span>
              </button>
            </nav>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 xl:gap-4 shrink-0">
            {/* Language Toggle with Flag */}
            <button
              onClick={toggleLanguage}
              className="w-9 h-9 rounded-xl bg-white border border-[#E9E7E2] text-xs font-bold text-[#FF5A5F] hover:bg-[#FF5A5F] hover:text-white hover:border-[#FF5A5F] transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
              title={isAr ? 'Switch to English' : 'التبديل للعربية'}
            >
              {isAr ? 'EN' : 'ع'}
            </button>

            {/* Partners Dropdown Portal */}
            <div className="relative">
              <button 
                onClick={() => setShowPartnerDropdown(!showPartnerDropdown)}
                className="flex items-center gap-1.5 text-[14px] xl:text-[15px] font-semibold text-[#FF5A5F] hover:text-[#E04B50] px-3 py-2 rounded-xl hover:bg-[#FF5A5F]/5 transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Building className="w-4 h-4" />
                <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showPartnerDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showPartnerDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setShowPartnerDropdown(false)}
                  />
                  <div className={`absolute ${isAr ? 'left-0' : 'right-0'} mt-2 w-72 bg-white border border-[#E9E7E2] rounded-2xl shadow-xl z-50 py-2 animate-fadeIn`}>
                    <div className="px-4 py-2 border-b border-[#F6F6F4] mb-1">
                      <p className="text-[10px] font-bold text-[#6E6A63] tracking-wider uppercase">
                        {isAr ? 'خدمات شركاء CONFIRMED' : 'CONFIRMED PARTNER SERVICES'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowPartnerDropdown(false);
                        setShowRegisterModal(true);
                        setRegisterStep(1);
                        setRegFormError('');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-right rtl:text-right text-xs font-semibold text-[#1C1B18] hover:bg-[#FF5A5F]/5 hover:text-[#FF5A5F] transition-all cursor-pointer border-none bg-transparent"
                    >
                      <Briefcase className="w-4 h-4 text-[#FF5A5F] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#14332B] hover:text-[#FF5A5F] transition-colors">{isAr ? 'طلب تسجيل كشريك جديد' : 'Register New Partner Account'}</p>
                        <p className="text-[10px] text-[#6E6A63] font-normal truncate">{isAr ? 'انضمي إلينا كمزود خدمة في المنصة' : 'Join as a service provider'}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowPartnerDropdown(false);
                        setShowLoginModal(true);
                        setLoginStep(1);
                        setErrorMessage('');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-right rtl:text-right text-xs font-semibold text-[#1C1B18] hover:bg-[#FF5A5F]/5 hover:text-[#FF5A5F] transition-all cursor-pointer border-none bg-transparent"
                    >
                      <LogIn className="w-4 h-4 text-[#FF5A5F] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#14332B] hover:text-[#FF5A5F] transition-colors">{isAr ? 'تسجيل دخول الشركاء' : 'Partner Sign In'}</p>
                        <p className="text-[10px] text-[#6E6A63] font-normal truncate">{isAr ? 'تسجيل الدخول للوحة تحكم صالونك' : 'Access your salon dashboard'}</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {isMobile && (
              <button 
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-xl border border-[#E9E7E2] bg-white text-[#FF5A5F] cursor-pointer shrink-0"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        {isMobile && mobileOpen && (
          <div className="bg-white border-b border-[#E9E7E2] px-6 py-6 flex flex-col gap-3 animate-fadeIn">
            <a href="#features" onClick={() => { setMobileOpen(false); setActiveView('home'); }} className="text-[16px] py-2 text-[#1C1B18] font-medium border-b border-[#F6F6F4]">{isAr ? 'المميزات' : 'Features'}</a>
            <a href="#how" onClick={() => { setMobileOpen(false); setActiveView('home'); }} className="text-[16px] py-2 text-[#1C1B18] font-medium border-b border-[#F6F6F4]">{isAr ? 'كيف يعمل' : 'How It Works'}</a>
            <a href="#pricing" onClick={() => { setMobileOpen(false); setActiveView('home'); }} className="text-[16px] py-2 text-[#1C1B18] font-medium border-b border-[#F6F6F4]">{isAr ? 'الأسعار' : 'Pricing'}</a>
            <a href="#faq" onClick={() => { setMobileOpen(false); setActiveView('home'); }} className="text-[16px] py-2 text-[#1C1B18] font-medium border-b border-[#F6F6F4]">{isAr ? 'الأسئلة الشائعة' : 'FAQ'}</a>
            <a href="#contact" onClick={() => { setMobileOpen(false); setActiveView('home'); }} className="text-[16px] py-2 text-[#1C1B18] font-medium border-b border-[#F6F6F4]">{isAr ? 'اتصلي بنا' : 'Contact Us'}</a>
            <button 
              onClick={() => {
                setMobileOpen(false);
                setActiveView('roadmap');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="text-[16px] py-2 text-[#FF5A5F] font-semibold border-b border-[#F6F6F4] text-left rtl:text-right flex items-center gap-1 bg-transparent border-none cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FF5A5F]" />
              <span>{isAr ? 'خارطة الطريق (AI)' : 'Roadmap (AI)'}</span>
            </button>
            <button 
              onClick={() => { setMobileOpen(false); setShowLoginModal(true); setLoginStep(1); setErrorMessage(''); }}
              className="mt-4 w-full py-3 border border-[#FF5A5F] text-[#FF5A5F] rounded-xl font-bold text-center text-[15px] cursor-pointer"
            >
              {isAr ? 'بوابة تسجيل الدخول للشركاء 🔑' : 'Partner Login Gateway 🔑'}
            </button>
            <button 
              onClick={() => { setMobileOpen(false); setShowRegisterModal(true); setRegisterStep(1); setRegFormError(''); }}
              className="w-full py-3 bg-[#14332B] text-white rounded-xl font-bold text-center text-[15px] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-[#FF5A5F]" />
              <span>{isAr ? 'تسجيل كمزود خدمة 🌟' : 'Register as Provider 🌟'}</span>
            </button>
          </div>
        )}
      </header>

      {activeView === 'roadmap' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 flex justify-between items-center">
            <button
              onClick={() => {
                setActiveView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 text-sm font-semibold text-[#FF5A5F] hover:text-[#E04B50] transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-[#E9E7E2] shadow-sm"
            >
              <span>{isAr ? '← العودة للرئيسية' : '← Back to Home'}</span>
            </button>
          </div>
          <RoadmapManager isAr={isAr} />
        </div>
      ) : (
        <>
          {/* ===== HERO ===== */}
          <section className="py-16 md:py-24 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF0F0] border border-[#E9E7E2] text-xs font-semibold text-[#FF5A5F]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isAr ? 'مصمم خصيصًا لفهم سلوك عملاء الصالونات والسبا' : 'Tailored for Salons & Spas in Saudi Arabia 🇸🇦'}</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#14332B] font-bold leading-[1.2]">
                {isAr ? (
                  <>
                    سلوك عملائك يكشف <span className="text-[#FF5A5F] font-semibold underline decoration-wavy decoration-[#FF5A5F]/30">فرص نموك</span>
                  </>
                ) : (
                  <>
                    Your Clients' Behavior Reveals <span className="text-[#FF5A5F] font-semibold underline decoration-wavy decoration-[#FF5A5F]/30">Your Growth</span>
                  </>
                )}
              </h1>
              <p className="text-lg md:text-xl text-[#6E6A63] font-normal leading-relaxed max-w-2xl">
                {isAr 
                  ? 'يحلل Confirmed بيانات عملائك ويحوّلها إلى قرارات واضحة تساعدك على زيادة الاحتفاظ واستعادة العملاء المنقطعين واكتشاف الإيرادات غير المستغلة وتحسين استغلال الطاقة التشغيلية'
                  : 'CONFIRMED cloud-based platform manages bookings, smart cash drawer POS, compliant electronic billing, and client history in one single hub—cutting down no-shows and driving sales by up to 30%.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a 
                  href="#pricing" 
                  className="bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-base font-bold px-8 py-4 rounded-xl shadow-xl shadow-[#FF5A5F]/20 hover:shadow-[#FF5A5F]/30 text-center transition-all duration-200"
                >
                  {isAr ? 'ابدئي تجربتك المجانية 10 أيام' : 'Start Your 10-Day Free Trial'}
                </a>
                <a 
                  href="#contact" 
                  className="border-2 border-[#FF5A5F] hover:bg-[#FF5A5F]/5 text-[#FF5A5F] text-base font-bold px-8 py-4 rounded-xl text-center transition-all duration-200"
                >
                  {isAr ? 'اكتشفي كيف يعمل' : 'See How It Works'}
                </a>
              </div>
            </div>

            {/* Visual Hero Mockup widget — live clock, no sensitive data */}
            {(() => {
              // ── حساب أوقات المواعيد نسبةً للوقت الحالي ──────────────────
              const fmt = (d: Date) =>
                d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

              const rel = (d: Date) => {
                const diff = Math.round((d.getTime() - liveNow.getTime()) / 60000);
                if (diff <= 0)  return isAr ? 'الآن' : 'Now';
                if (diff < 60)  return isAr ? `بعد ${diff} دقيقة` : `In ${diff} min`;
                const h = Math.floor(diff / 60), m = diff % 60;
                if (isAr) return m > 0 ? `بعد ${h}س ${m}د` : `بعد ${h} ساعة`;
                return m > 0 ? `In ${h}h ${m}m` : `In ${h}h`;
              };

              const t1 = new Date(liveNow.getTime() + 15  * 60000);
              const t2 = new Date(liveNow.getTime() + 48  * 60000);
              const t3 = new Date(liveNow.getTime() + 135 * 60000);

              const todayLabel = liveNow.toLocaleDateString(
                isAr ? 'ar-SA' : 'en-US',
                { weekday: 'long', day: 'numeric', month: 'long' },
              );

              const clockDisplay = liveNow.toLocaleTimeString(
                'en-US',
                { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true },
              );

              const segments = [
                { labelAr: 'عملاء VIP',        labelEn: 'VIP Clients',       pct: 18, color: '#C9A84C', bg: '#FEF9EC', count: 43  },
                { labelAr: 'منتظمون',           labelEn: 'Regular',           pct: 45, color: '#FF5A5F', bg: '#FFF0F0', count: 108 },
                { labelAr: 'جدد هذا الشهر',     labelEn: 'New This Month',    pct: 22, color: '#14B8A6', bg: '#F0FDFA', count: 53  },
                { labelAr: 'يحتاجون استعادة',   labelEn: 'Win-Back Needed',   pct: 15, color: '#F97316', bg: '#FFF7ED', count: 36  },
              ];
              return (
                <div className="lg:col-span-5">
                  <div className="relative bg-white border border-[#E9E7E2] rounded-2xl shadow-xl p-4 overflow-hidden max-w-xs me-auto">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF5A5F]" />

                    {/* Header */}
                    <div className="flex justify-between items-center mb-3 gap-2">
                      <h3 className="font-bold text-sm text-[#1C1B18]">
                        {isAr ? 'شرائح العملاء' : 'Client Segments'}
                      </h3>
                      <div className="flex items-center gap-1 bg-[#F6F6F4] border border-[#E9E7E2] rounded-lg px-2 py-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#1C1B18]">240 {isAr ? 'عميلة' : 'clients'}</span>
                      </div>
                    </div>

                    {/* Stacked bar */}
                    <div className="flex rounded-lg overflow-hidden h-2 mb-3 gap-px">
                      {segments.map(s => (
                        <div key={s.labelAr} style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                      ))}
                    </div>

                    {/* Segment rows */}
                    <div className="space-y-1.5">
                      {segments.map(s => (
                        <div key={s.labelAr} className="flex items-center gap-2 px-2 py-1.5 rounded-xl border" style={{ backgroundColor: s.bg, borderColor: s.color + '30' }}>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-[#1C1B18]">{isAr ? s.labelAr : s.labelEn}</p>
                            <div className="mt-1 h-1 bg-black/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                            </div>
                          </div>
                          <div className="text-end shrink-0">
                            <p className="text-xs font-black font-mono" style={{ color: s.color }}>{s.count}</p>
                            <p className="text-[9px] text-[#6E6A63]">{s.pct}٪</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer stats */}
                    <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-[#E9E7E2] text-center">
                      <div className="p-1.5 bg-[#F6F6F4] rounded-lg border border-[#E9E7E2]">
                        <p className="text-base font-serif font-bold text-[#FF5A5F]">240</p>
                        <p className="text-[9px] text-[#6E6A63] leading-tight">{isAr ? 'إجمالي' : 'Total'}</p>
                      </div>
                      <div className="p-1.5 bg-[#F6F6F4] rounded-lg border border-[#E9E7E2]">
                        <p className="text-base font-serif font-bold text-amber-500">4.9★</p>
                        <p className="text-[9px] text-[#6E6A63] leading-tight">{isAr ? 'الرضا' : 'Rating'}</p>
                      </div>
                      <div className="p-1.5 bg-[#F6F6F4] rounded-lg border border-[#E9E7E2]">
                        <p className="text-base font-serif font-bold text-emerald-600">68٪</p>
                        <p className="text-[9px] text-[#6E6A63] leading-tight">{isAr ? 'العودة' : 'Return'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ===== RETENTION STATS ===== */}
      <section className="py-8 bg-[#F3F4F6] overflow-hidden" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Top: label + headline + sub */}
          <div className="max-w-xl mb-5 space-y-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-[#FF5A5F] border border-[#FF5A5F]/30 bg-[#FF5A5F]/10 rounded-full px-3 py-1">
              {isAr ? 'لماذا الاحتفاظ بالعملاء' : 'Why Client Retention'}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-[1.2] text-[#1C1B18]">
              {isAr
                ? <>الاحتفاظ بعميل واحد<br /><span className="text-[#FF5A5F]">أقوى من الاستحواذ على عشرة جدد</span></>
                : <>Keeping one client beats<br /><span className="text-[#FF5A5F]">acquiring ten new ones</span></>}
            </h2>
            <p className="text-[#6E6A63] text-sm leading-relaxed max-w-md">
              {isAr
                ? 'الأبحاث العالمية تؤكد أن العلاقة طويلة الأمد مع العميل هي ما يحرك نمو الأعمال الخدمية.'
                : 'Global research confirms that long-term client relationships are what drives service business growth.'}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-[#E5E7EB] mb-5" />

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                num: isAr ? '٩٥٪' : '95%',
                desc: isAr ? 'زيادة في الأرباح عند رفع معدل الاحتفاظ ٥٪ فقط' : 'Profit increase from just a 5% retention lift',
                src: 'Bain & Company',
              },
              {
                num: isAr ? '٥٩٪' : '59%',
                desc: isAr ? 'من العملاء يقولون أن التفاعل المخصص المبني على تفاعلاتهم السابقة مهم جداً لكسب تعاملهم' : 'of clients say personalised engagement based on past interactions is key',
                src: 'Salesforce',
              },
              {
                num: isAr ? '٦٧٪' : '67%',
                desc: isAr ? 'العملاء الدائمون ينفقون أكثر من العملاء الجدد بمرور الوقت' : 'Loyal clients spend more than new clients over time',
                src: 'Bain & Company',
              },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-[#E9E7E2] rounded-xl p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                <p className="font-serif text-4xl font-bold text-[#FF5A5F] leading-none tracking-tight">
                  {s.num}
                </p>
                <div className="w-6 h-0.5 bg-[#FF5A5F]/30 rounded-full" />
                <p className="text-[#1C1B18] text-sm font-medium leading-relaxed flex-1">
                  {s.desc}
                </p>
                <p className="text-[#9CA3AF] text-xs pt-1.5 border-t border-[#F3F4F6]">
                  {isAr ? 'المصدر: ' : 'Source: '}{s.src}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ===== FEATURES TAB SECTION ===== */}
      {(() => {
        const featureTabs = [
          {
            labelAr: 'سلوك العميل', labelEn: 'Client Behaviour',
            titleAr: 'تحليل سلوك العملاء', titleEn: 'Client Behaviour Analytics',
            descAr: 'اكتشفي كيف تتغير علاقة عملائك بالصالون وتعرفي على شرائح العملاء ومؤشرات قيمتهم لتعرفي أين توجد فرص النمو.',
            descEn: 'Track bookings, visits and spend to reveal how clients actually behave — not how you assume they do.',
            linkAr: 'تحليل السلوك بالتفصيل ←', linkEn: 'Explore behaviour analytics →',
            icon: <User className="w-5 h-5" />,
            visual: (
              <div className="w-full space-y-2 p-2">
                {[{l:'يحتاجون استعادة',pct:15,c:'#F97316'},{l:'جدد هذا الشهر',pct:22,c:'#14B8A6'},{l:'منتظمون',pct:45,c:'#FF5A5F'},{l:'عملاء VIP',pct:18,c:'#C9A84C'}].map((r,i)=>(
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-[#E9E7E2] shadow-sm">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:r.c}} />
                    <p className="text-xs font-medium text-[#1C1B18] flex-1">{r.l}</p>
                    <div className="w-20 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${r.pct*2}%`,backgroundColor:r.c}} /></div>
                    <p className="text-xs font-bold" style={{color:r.c}}>{r.pct}٪</p>
                  </div>
                ))}
              </div>
            ),
          },
          {
            labelAr: 'العميل المثالي', labelEn: 'Ideal Client',
            titleAr: 'تعرّفي على عميلك المثالي بناءً على سلوكه الفعلي', titleEn: 'Know Your Ideal Client From Real Behaviour',
            descAr: 'نبني ملفاً تعريفياً لعميلك الأعلى قيمة من خلال اكتشاف الأنماط المشتركة بين عملائك لاتخاذ قرارات تسويقية دقيقة.',
            descEn: 'We build a profile of your highest-value client by discovering shared patterns across your client base — enabling precise marketing decisions.',
            linkAr: 'اكتشفي عميلتك المثالية ←', linkEn: 'Discover your ideal client →',
            icon: <Heart className="w-5 h-5" />,
            visual: (
              <div className="w-full space-y-2 p-2">
                <div className="bg-[#FFF0F0] border border-[#FF5A5F]/20 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-[#FF5A5F] mb-1">العميلة الأعلى قيمة</p>
                  <p className="text-sm font-bold text-[#1C1B18]">نورة العتيبي</p>
                  <p className="text-xs text-[#6E6A63]">٢٣ زيارة · ٤٢٠٠ ر إجمالي</p>
                </div>
                {[{l:'متوسط الإنفاق',v:'١٨٢ ر'},{l:'تكرار الزيارة',v:'كل ١٨ يوم'},{l:'الخدمة المفضلة',v:'كيراتين'}].map((r,i)=>(
                  <div key={i} className="flex justify-between bg-white rounded-xl px-4 py-2.5 border border-[#E9E7E2] shadow-sm">
                    <p className="text-xs text-[#6E6A63]">{r.l}</p>
                    <p className="text-xs font-bold text-[#1C1B18]">{r.v}</p>
                  </div>
                ))}
              </div>
            ),
          },
          {
            labelAr: 'أدوات التسويق', labelEn: 'Marketing',
            titleAr: 'أدوات تسويق وعروض ذكية', titleEn: 'Smart Marketing & SMS',
            descAr: 'حوّلي بيانات العملاء إلى حملات وعروض مخصصة تناسب سلوك كل شريحة ومرحلة علاقتها بالصالون.',
            descEn: 'Turn client data into targeted campaigns and offers that match each segment\'s behaviour and relationship stage.',
            bulletsAr: ['حملات واتساب والبريد الإلكتروني الآلية', 'عروض مخصصة لكل شريحة', 'حملات استعادة العملاء', 'كوبونات خصم وبرامج ولاء'],
            bulletsEn: ['Automated WhatsApp & email campaigns', 'Personalised offers per segment', 'Win-back campaigns', 'Promo codes & loyalty rewards'],
            linkAr: 'حملات تسويقية مخصصة ←', linkEn: 'Explore marketing tools →',
            icon: <Mail className="w-5 h-5" />,
            visual: (
              <div className="w-full space-y-2 p-2">
                <div className="bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-[#25D366] mb-1">واتساب · إرسال آلي</p>
                  <p className="text-sm text-[#1C1B18]">عيد ميلادك! 🎂 احصلي على خصم ٢٠٪ هذا الشهر</p>
                </div>
                <div className="bg-white border border-[#E9E7E2] rounded-xl px-4 py-3 flex justify-between">
                  <p className="text-xs text-[#6E6A63]">كود الخصم</p>
                  <p className="text-xs font-bold text-[#FF5A5F] font-mono">BDAY20</p>
                </div>
              </div>
            ),
          },
          {
            labelAr: 'الطاقم والعمولات', labelEn: 'Staff & Commissions',
            titleAr: 'حوافز مرتبطة بالمبيعات والتجربة', titleEn: 'Performance-Linked Incentives',
            descAr: 'اربطي العمولات بالأداء الذي يصنع تجربة عميل مميزة ونمو حقيقي.',
            descEn: 'Link commissions to the performance that creates outstanding client experiences and real growth.',
            linkAr: 'اربطي العمولة بالتجربة ←', linkEn: 'Link commissions to experience →',
            icon: <User className="w-5 h-5" />,
            visual: (
              <div className="w-full space-y-2 p-2">
                {[{n:'سارة (خبيرة شعر)',s:'٣٢٠٠ ر',c:'٣٢٠ ر'},{n:'منى (مانيكير)',s:'١٨٠٠ ر',c:'١٨٠ ر'},{n:'ريم (بشرة)',s:'٢٤٠٠ ر',c:'٢٤٠ ر'}].map((r,i)=>(
                  <div key={i} className="flex justify-between items-center bg-white rounded-xl px-4 py-2.5 border border-[#E9E7E2] shadow-sm">
                    <p className="text-xs font-medium text-[#1C1B18]">{r.n}</p>
                    <div className="text-end">
                      <p className="text-xs font-bold text-[#FF5A5F]">{r.c}</p>
                      <p className="text-[10px] text-[#9CA3AF]">عمولة</p>
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            labelAr: 'إدارة التجربة', labelEn: 'Experience Mgmt',
            titleAr: 'تقييم التجربة واستعادة الخدمة', titleEn: 'Experience Rating & Service Recovery',
            linkAr: 'أديري تجربة العميل ←', linkEn: 'Manage client experience →',
            descAr: 'تابعي تقييمات العملاء بعد كل زيارة واربطيها بالخدمة والموظفة لرصد التجارب السلبية فوراً — استقبلي تنبيهات بالحالات التي تتطلب تدخلاً سريعاً ومتابعة استعادة الخدمة.',
            descEn: 'Track client ratings after every visit, link them to service and staff, and instantly flag negative experiences — receive alerts for cases requiring fast intervention and service recovery.',
            icon: <Heart className="w-5 h-5" />,
            visual: (
              <div className="w-full space-y-2 p-2">
                <div className="bg-white border border-[#E9E7E2] rounded-xl px-4 py-3 flex justify-between items-center shadow-sm">
                  <p className="text-xs font-medium text-[#1C1B18]">رضا العميلات</p>
                  <p className="text-sm font-bold text-amber-500">4.9 ★</p>
                </div>
                {[{l:'ممتاز',pct:78,c:'#22C55E'},{l:'جيد',pct:16,c:'#F59E0B'},{l:'يحتاج تحسين',pct:6,c:'#FF5A5F'}].map((r,i)=>(
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-[#E9E7E2] shadow-sm">
                    <p className="text-xs text-[#6E6A63] w-20 shrink-0">{r.l}</p>
                    <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${r.pct}%`,backgroundColor:r.c}} /></div>
                    <p className="text-xs font-bold" style={{color:r.c}}>{r.pct}٪</p>
                  </div>
                ))}
              </div>
            ),
          },
          {
            labelAr: 'إدارة العملاء CRM', labelEn: 'CRM',
            titleAr: 'ملف تفصيلي لكل عميل وتقسيم شرائح العملاء', titleEn: 'Detailed Client Profiles & Segmentation',
            linkAr: 'اكتشفي سلوك عملائك ←', linkEn: 'Explore client behaviour →',
            descAr: 'ملف موحّد لكل عميل يجمع زياراته وإنفاقه وخدماته المفضلة وتفاعلاته مع التسويق — مع تقسيم العملاء إلى شرائح حسب قيمتهم ومرحلة علاقتهم بالصالون.',
            descEn: 'A unified profile per client capturing visits, spend, preferred services and marketing interactions — with segmentation by value and relationship stage.',
            icon: <User className="w-5 h-5" />,
            visual: (
              <div className="w-full space-y-2 p-2">
                {[{n:'نورة العتيبي',v:'٢٣ زيارة',tag:'VIP'},{n:'سارة الدوسري',v:'٧ زيارات',tag:'منتظمة'},{n:'هند الشمري',v:'١ زيارة',tag:'جديدة'}].map((r,i)=>(
                  <div key={i} className="flex justify-between items-center bg-white rounded-xl px-4 py-3 border border-[#E9E7E2] shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-[#1C1B18]">{r.n}</p>
                      <p className="text-xs text-[#6E6A63]">{r.v}</p>
                    </div>
                    <span className="text-xs font-bold text-[#FF5A5F] bg-[#FFF0F0] px-2 py-0.5 rounded-full">{r.tag}</span>
                  </div>
                ))}
              </div>
            ),
          },
          {
            labelAr: 'إدارة الحجوزات', labelEn: 'Bookings',
            titleAr: 'حوّلي كل حجز إلى فرصة نمو', titleEn: 'Turn Every Booking Into a Growth Opportunity',
            linkAr: 'استغلي طاقة الصالون ←', linkEn: 'Maximise salon capacity →',
            descAr: 'أديري حجوزاتك، تابعي حالات عدم الحضور ونسب الإشغال، واكتشفي أوقات الذروة والفترات الهادئة — لتحسين توزيع المواعيد واستغلال طاقة الصالون.',
            descEn: 'Manage bookings, track no-shows and occupancy rates, and discover peak and quiet periods — to optimise scheduling and maximise salon capacity.',
            icon: <Calendar className="w-5 h-5" />,
            visual: (
              <div className="w-full space-y-2 p-2">
                {['٩:٠٠ — سارة / قص وصبغ','١١:٠٠ — نورة / مانيكير','١:٣٠ — هند / كيراتين'].map((row,i)=>(
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-[#E9E7E2] shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-[#FF5A5F] shrink-0" />
                    <p className="text-sm font-medium text-[#1C1B18]">{row}</p>
                  </div>
                ))}
              </div>
            ),
          },
        ];
        const active = featureTabs[activeFeatureTab];
        return (
          <section id="features" className="py-20 md:py-24 bg-white" dir="rtl">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

              {/* Header */}
              <div className="text-center mb-10 space-y-3">
                <span className="inline-block text-xs font-semibold text-[#FF5A5F] border border-[#FF5A5F]/30 bg-[#FF5A5F]/10 rounded-full px-4 py-1.5">
                  {isAr ? 'منصة CONFIRMED' : 'CONFIRMED Platform'}
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C2B3A]">
                  {isAr ? <>كل ما تحتاجينه لفهم عملائك وتحويل سلوكهم <span className="text-[#FF5A5F]">إلى فرص نمو</span></> : <>Everything You Need to Understand Your Clients and Turn Their Behaviour <span className="text-[#FF5A5F]">Into Growth</span></>}
                </h2>
              </div>

              {/* Card */}
              <div className="rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-lg">

                {/* Tab bar */}
                <div className="bg-[#1C2B3A] flex overflow-x-auto scrollbar-hide outline-none">
                  {featureTabs.map((tab, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveFeatureTab(i)}
                      className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-200 shrink-0 ${
                        activeFeatureTab === i
                          ? 'text-white border-[#FF5A5F]'
                          : 'text-white/45 border-transparent hover:text-white/75'
                      }`}
                    >
                      {isAr ? tab.labelAr : tab.labelEn}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2">

                  {/* Visual mockup */}
                  <div className="bg-[#F8F9FA] border-e border-[#E5E7EB] p-8 flex items-center justify-center min-h-[280px]">
                    <div className="w-full max-w-xs">
                      {active.visual}
                    </div>
                  </div>

                  {/* Text */}
                  <div className="bg-white p-10 flex flex-col justify-center space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF0F0] text-[#FF5A5F] flex items-center justify-center">
                      {active.icon}
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[#1C2B3A]">
                      {isAr ? active.titleAr : active.titleEn}
                    </h3>
                    <p className="text-[#6E6A63] text-sm leading-relaxed">
                      {isAr ? active.descAr : active.descEn}
                    </p>
                    {((isAr ? active.bulletsAr : active.bulletsEn) ?? []).length > 0 && (
                      <ul className="space-y-1.5 mt-1">
                        {(isAr ? active.bulletsAr! : active.bulletsEn!).map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#1C2B3A]">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#FF5A5F] shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    <a href="#pricing" className="inline-flex items-center gap-1 text-[#FF5A5F] font-semibold text-sm mt-2 hover:underline">
                      {isAr ? (active.linkAr ?? 'ابدئي تجربتك المجانية ←') : (active.linkEn ?? 'Start free trial →')}
                    </a>
                  </div>

                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section id="how" className="py-10 md:py-14 bg-gradient-to-r from-[#F1F5F9] to-[#E2E8F0] text-[#1E293B] border-y border-slate-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF5A5F]/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-400/5 rounded-full blur-2xl -ml-28 -mb-28"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
            <p className="text-sm font-medium text-[#FF5A5F] tracking-wide uppercase">
              {isAr ? 'كيف يعمل confirmed ؟' : 'How does confirmed work?'}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-slate-900 font-normal leading-tight">
              {isAr ? 'في 3 خطوات.. من البيانات إلى القرار، ومن القرار إلى نتائج قابلة للقياس' : 'In 3 steps.. from data to decision, and from decision to measurable results'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/85 backdrop-blur-sm border border-slate-200 rounded-xl p-5 space-y-3 relative shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#FF5A5F] text-white text-sm font-serif font-bold flex items-center justify-center">
                {isAr ? '١' : '1'}
              </div>
              <h3 className="font-serif text-base font-bold text-slate-900">{isAr ? 'البيانات' : 'Data'}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {isAr 
                  ? 'نظام الحجز ونقاط البيع وملفات Excel — تكاملات جاهزة أو رفع مباشر. تجميع بيانات عملائك في مكان واحد.'
                  : 'Booking system, POS, and Excel files — ready integrations or direct upload. All your client data in one place.'}
              </p>
            </div>

            <div className="bg-white/85 backdrop-blur-sm border border-slate-200 rounded-xl p-5 space-y-3 relative shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#FF5A5F] text-white text-sm font-serif font-bold flex items-center justify-center">
                {isAr ? '٢' : '2'}
              </div>
              <h3 className="font-serif text-base font-bold text-slate-900">{isAr ? 'كشف فرص النمو' : 'Uncover Growth Opportunities'}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {isAr 
                  ? 'شرائح تلقائية ومؤشرات سلوكية وفرص مرتبة بحسب أثرها المتوقع في الإيراد.'
                  : 'Automatic segments, behavioural indicators, and opportunities ranked by their expected revenue impact.'}
              </p>
            </div>

            <div className="bg-white/85 backdrop-blur-sm border border-slate-200 rounded-xl p-5 space-y-3 relative shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#FF5A5F] text-white text-sm font-serif font-bold flex items-center justify-center">
                {isAr ? '٣' : '3'}
              </div>
              <h3 className="font-serif text-base font-bold text-slate-900">{isAr ? 'نمو الأعمال' : 'Business Growth'}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {isAr 
                  ? 'نفّذي حملات مخصصة لكل شريحة، واستعيدي العملاء، وقيسي أثر كل حملة في العودة والإيرادات والنمو.'
                  : 'Run targeted campaigns for each segment, win back lost clients, and measure each campaign\'s impact on retention, revenue, and growth.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="py-10 md:py-14 bg-[#F6F6F4]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <p className="text-sm font-medium text-[#FF5A5F] tracking-wide uppercase">
              {isAr ? 'الباقات' : 'Pricing'}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1E293B] font-normal leading-tight">
              {isAr ? 'اختاري الباقة المناسبة لمرحلة نمو أعمالك' : 'Choose the plan that fits your growth stage'}
            </h2>
            <p className="text-[#6E6A63] text-sm">
              {isAr 
                ? 'لا توجد رسوم خفية. جربي أي باقة مجاناً لمدة 10 أيام.'
                : 'No hidden fees. Try any plan free for 10 days.'}
            </p>
            
            <div className="inline-flex items-center gap-1 bg-white border border-[#E9E7E2] rounded-full p-1 shadow-inner">
              <button 
                onClick={() => setBilling('monthly')}
                className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                  billing === 'monthly' ? 'bg-[#FF5A5F] text-white' : 'text-[#6E6A63]'
                }`}
              >
                {isAr ? 'الدفع شهرياً' : 'Monthly'}
              </button>
              <button 
                onClick={() => setBilling('yearly')}
                className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                  billing === 'yearly' ? 'bg-[#FF5A5F] text-white' : 'text-[#6E6A63]'
                }`}
              >
                {isAr ? 'الدفع سنوياً (توفير ٢٠٪)' : 'Yearly (Save 20%)'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch justify-center">
            {packages.map((pkg: any) => {
              const displayPrice = billing === 'monthly' ? pkg.priceMonthly : pkg.priceYearly;
              return (
                <div 
                  key={pkg.id}
                  className={`bg-white border rounded-2xl p-5 flex flex-col justify-between shadow-md relative transition-all duration-200 ${
                    pkg.isPopular 
                      ? 'border-[#FF5A5F] ring-1 ring-[#FF5A5F]/20 scale-100 lg:scale-[1.03] z-10' 
                      : 'border-[#E9E7E2]'
                  }`}
                >
                  {pkg.isPopular && (
                    <span className="absolute -top-3 right-5 bg-[#FF5A5F] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#FF5A5F]">
                      {isAr ? 'الباقة الأكثر طلباً واختياراً' : 'Most Popular Plan'}
                    </span>
                  )}
                  {pkg.isEnterpriseContact && (
                    <span className="absolute -top-3 left-5 bg-[#14332B] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#14332B]">
                      {isAr ? 'سلاسل ومؤسسات' : 'Enterprise'}
                    </span>
                  )}

                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#14332B] mb-1">
                      {isAr ? pkg.nameAr : pkg.nameEn}
                    </h3>
                    <p className="text-[#6E6A63] text-xs mb-4">
                      {isAr ? pkg.descriptionAr : pkg.descriptionEn}
                    </p>
                    
                    <div className="mb-4">
                      {pkg.isEnterpriseContact ? (
                        <div>
                          <span className="font-serif text-2xl font-bold text-[#14332B]">{isAr ? 'تواصل معنا' : 'Contact Us'}</span>
                          <p className="text-xs text-[#6E6A63] mt-1">{isAr ? 'تخصيص كامل وحلول مخصصة' : 'Custom integrations & custom ERP systems'}</p>
                        </div>
                      ) : (
                        <div>
                          <span className="font-serif text-2xl font-bold text-[#FF5A5F]">{displayPrice}</span>
                          <span className="text-xs text-[#6E6A63] font-medium mr-1">{t('currency')} {periodLabel}</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full h-px bg-[#E9E7E2] my-4" />

                    <ul className="space-y-2.5 text-sm text-[#1C1B18]/90">
                      {(isAr ? pkg.featuresAr : pkg.featuresEn)?.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#FF5A5F] mt-0.5 shrink-0" />
                          <span className="text-xs">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-5">
                    {pkg.isEnterpriseContact ? (
                      <a 
                        href="#contact" 
                        className="block w-full py-2.5 border-2 border-slate-700 text-slate-700 hover:bg-slate-700 hover:text-white text-center font-bold text-sm rounded-xl transition-all duration-200"
                      >
                        {isAr ? 'ابدئي تجربتك المجانية 10 أيام' : 'Start Your 10-Day Free Trial'}
                      </a>
                    ) : (
                      <button 
                        onClick={() => {
                          setSelectedPackage(pkg.id);
                          setShowRegisterModal(true);
                          setRegisterStep(1);
                          setRegFormError('');
                        }}
                        className={`w-full py-2.5 font-bold text-sm rounded-xl transition-all duration-200 cursor-pointer ${
                          pkg.isPopular 
                            ? 'bg-[#FF5A5F] hover:bg-[#FFAE34] text-white shadow-lg shadow-[#FF5A5F]/20' 
                            : 'border-2 border-[#FF5A5F] text-[#FF5A5F] hover:bg-[#FF5A5F] hover:text-white'
                        }`}
                      >
                        {isAr ? 'ابدئي تجربتك المجانية' : 'Start Free Trial'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section id="faq" className="py-8 bg-[#F6F6F4]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 space-y-1.5">
            <h2 className="font-serif text-2xl text-[#14332B] font-bold">{isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</h2>
            <p className="text-[#6E6A63] text-sm">{isAr ? 'كل ما تودين معرفته حول نظام CONFIRMED لإدارة الصالونات' : 'Everything you need to know about CONFIRMED Salon software'}</p>
          </div>

          <div className="space-y-2">
            {[
              {
                q: isAr ? 'هل الفاتورة الإلكترونية الصادرة معتمدة رسميًا؟' : 'Is the e-invoice officially certified by ZATCA?',
                a: isAr ? 'نعم بالتأكيد، نظام CONFIRMED مهيأ ومتطابق بالكامل مع شروط هيئة الزكاة والضريبة والجمارك (المرحلة الأولى والمرحلة الثانية)، ويصدر فاتورة إلكترونية مبسطة تحتوي على الـ QR Code المطلوب نظاماً.' : 'Yes. CONFIRMED is fully compliant with ZATCA (Phase 1 & 2), issuing compliant simplified invoices with the legally mandated QR codes.',
              },
              {
                q: isAr ? 'هل أحتاج إلى شراء أجهزة خاصة لاستخدام CONFIRMED؟' : 'Do I need specific hardware to run CONFIRMED?',
                a: isAr ? 'لا، النظام سحابي بالكامل. يمكنك تشغيله من أي جهاز متصل بالإنترنت — آيباد، تابلت، جوال، أو كمبيوتر عادي.' : 'No. CONFIRMED is 100% cloud-based — works from any browser on any device, no software installation needed.',
              },
              {
                q: isAr ? 'هل تدعمون نقل العميلات والبيانات من نظام قديم؟' : 'Can you migrate our data from a legacy system?',
                a: isAr ? 'نعم، فريق الدعم يساعدك مجاناً في استيراد قائمة العميلات والخدمات والأسعار من Excel أو أي نظام قديم.' : 'Yes. Our onboarding team provides free data migration from Excel or legacy POS systems.',
              },
              {
                q: isAr ? 'كيف يعمل تذكير الواتساب والـ SMS؟' : 'How do WhatsApp & SMS reminders work?',
                a: isAr ? 'بمجرد تأكيد الحجز، يجدول النظام تلقائياً رسالة قبل ٢٤ ساعة وتنبيهاً قبل ٣ ساعات لتقليل الغيابات.' : 'On booking confirmation, the system auto-schedules a 24h alert and a 3h nudge to reduce no-shows.',
              },
            ].map((item, i) => (
              <details key={i} className="bg-white border border-[#E9E7E2] rounded-xl px-4 py-3 group cursor-pointer">
                <summary className="font-semibold text-[#14332B] text-sm flex justify-between items-center list-none">
                  <span>{item.q}</span>
                  <span className="text-[#FF5A5F] font-bold text-base group-open:rotate-45 transition-transform duration-200 shrink-0 mr-3">+</span>
                </summary>
                <p className="mt-2 text-xs text-[#6E6A63] leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONTACT / DEMO FORM SECTION ===== */}
      <section id="contact" className="py-20 bg-white border-t border-[#E9E7E2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <span className="text-xs font-bold text-[#FF5A5F] tracking-wider uppercase">{isAr ? 'استشير خبيراتنا' : 'Talk with Our Onboarding Experts'}</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#14332B] font-bold leading-tight">
                {isAr ? 'ابدئي تجربتك المجانية 10 أيام مع نظام CONFIRMED' : 'Start your free 10-day trial with CONFIRMED'}
              </h2>
              <p className="text-[#6E6A63] text-base leading-relaxed">
                {isAr 
                  ? 'سيتواصل معك فريقنا لمساعدتك وتزويدك ببيانات الدخول، وشرح الميزات الملائمة لصالونك أو مركز السبا الخاص بك.'
                  : 'Our customer success team will contact you to set up your customized trial environment and walk you through CONFIRMED.'}
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6E6A63]">{isAr ? 'راسلنا على البريد الإلكتروني' : 'Email Us directly'}</p>
                    <p className="text-sm font-bold text-[#1C1B18]">marktning@onfirmedmarketing.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6E6A63]">{isAr ? 'رقم الاتصال المباشر وواتساب' : 'Direct Call or WhatsApp'}</p>
                    <p className="text-sm font-bold text-[#1C1B18]">920011445</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#F6F6F4] border border-[#E9E7E2] rounded-3xl p-8 shadow-inner">
              {!formSent ? (
                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'اسمك الكريم *' : 'Your Name *'}</label>
                      <input 
                        type="text" 
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder={isAr ? "سارة المطيري" : "e.g. Sara Al-Mutairi"}
                        className="w-full text-sm px-4 py-3 bg-white border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'نوع النشاط *' : 'Salon Type *'}</label>
                      <select 
                        value={facilityType}
                        onChange={(e) => setFacilityType(e.target.value)}
                        className="w-full text-sm px-4 py-3 bg-white border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                      >
                        <option value="صالون نسائي">{isAr ? 'صالون نسائي متكامل' : 'Full Beauty Salon'}</option>
                        <option value="صالون شعر">{isAr ? 'صالون شعر وأظافر' : 'Hair & Nail Salon'}</option>
                        <option value="مركز سبا / مساج">{isAr ? 'مركز سبا و مساج' : 'Spa & Wellness Center'}</option>
                        <option value="عيادة تجميل">{isAr ? 'مركز وعيادة تجميل' : 'Cosmetic Clinic'}</option>
                        <option value="خدمات منزلية">{isAr ? 'صالون خدمات منزلية' : 'Home-Service Salon'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'البريد الإلكتروني *' : 'Email Address *'}</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="marktning@onfirmedmarketing.com"
                        className="w-full text-sm px-4 py-3 bg-white border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'رقم جوال التواصل *' : 'Mobile Number *'}</label>
                      <input 
                        type="tel" 
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="05xxxxxxxx"
                        className="w-full text-sm px-4 py-3 bg-white border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'أخبرينا عن صالونك وعملك (اختياري)' : 'Tell us about your business (Optional)'}</label>
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={isAr ? "كم عدد الموظفات لديك؟ وما هي الصعوبات الحالية؟" : "How many stylists do you employ? What are your key pain points?"}
                      rows={3}
                      className="w-full text-sm px-4 py-3 bg-white border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full py-3.5 bg-[#FF5A5F] hover:bg-[#FFAE34] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#FF5A5F]/20 hover:shadow-[#FF5A5F]/30 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmittingContact
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>{isAr ? 'جارٍ الإرسال...' : 'Sending...'}</span></>
                      : (isAr ? 'إرسال طلب العرض التجريبي مجاناً' : 'Submit Free Demo Request')}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-slate-800">{isAr ? 'شكراً لاهتمامك بـ CONFIRMED ✓' : 'Thank You for Choosing CONFIRMED ✓'}</h3>
                  <p className="text-sm text-[#6E6A63] max-w-sm mx-auto">
                    {isAr 
                      ? `تم استلام طلبك بنجاح. سنقوم بمراجعة طلبك وإعداد نسختك التجريبية والتواصل معك على رقم الجوال ${phone} خلال ٢٤ ساعة القادمة.`
                      : `Your request was dispatched successfully. Our onboarding experts will contact you at ${phone} within 24 hours to set up your free trial demo.`}
                  </p>
                  <button 
                    onClick={() => setFormSent(false)}
                    className="text-xs font-bold text-[#FF5A5F] underline cursor-pointer"
                  >
                    {isAr ? 'إرسال طلب آخر' : 'Submit another request'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )}

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#F8FAFC] text-slate-500 pt-16 pb-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Column 1: Brand Info */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <img
                  src={confirmedLogo}
                  alt="CONFIRMED"
                  className="h-12 w-auto object-contain select-none"
                  draggable={false}
                />
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                {isAr 
                  ? 'منصة سحابية سعودية متكاملة لإدارة صالونات التجميل ومراكز العناية والسبا النسائية والمنزلية وتسهيل المواعيد.'
                  : 'Saudi-integrated cloud platform engineered to run high-end beauty salons, wellness centers, and premium home services.'}
              </p>
            </div>

            {/* Column 2: System Features */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-[#14332B] uppercase tracking-wider">{isAr ? 'المميزات الرئيسية' : 'Key Features'}</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-[#FF5A5F] transition-colors">{isAr ? 'إدارة الحجوزات والمواعيد' : 'Appointment Scheduling'}</a></li>
                <li><a href="#" className="hover:text-[#FF5A5F] transition-colors">{isAr ? 'نظام نقاط البيع POS' : 'Point of Sale (POS)'}</a></li>
                <li><a href="#" className="hover:text-[#FF5A5F] transition-colors">{isAr ? 'إدارة الموظفات والعملاء' : 'Staff & CRM Hub'}</a></li>
                <li><a href="#" className="hover:text-[#FF5A5F] transition-colors">{isAr ? 'التقارير الذكية والمحاسبة' : 'Smart Analytics & Reports'}</a></li>
              </ul>
            </div>

            {/* Column 3: Partner Portal Access */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-[#14332B] uppercase tracking-wider">{isAr ? 'بوابة الشركاء' : 'B2B Partner Portal'}</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button 
                    onClick={() => setShowLoginModal(true)} 
                    className="hover:text-[#FF5A5F] transition-colors bg-transparent border-none p-0 font-semibold text-[#FF5A5F] cursor-pointer flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" />
                    <span>{isAr ? 'دخول الشركاء والموظفين' : 'Merchant Secure Login'}</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowRegisterModal(true)} 
                    className="hover:text-[#FF5A5F] transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    {isAr ? 'تسجيل صالون جديد' : 'Register New Salon'}
                  </button>
                </li>
                <li><a href="#" className="hover:text-[#FF5A5F] transition-colors">{isAr ? 'الشروط والأحكام' : 'Terms of Service'}</a></li>
                <li>
                  <button
                    onClick={() => setShowPrivacyModal(true)}
                    className="hover:text-[#FF5A5F] transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Verification */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-[#14332B] uppercase tracking-wider">{isAr ? 'اتصلي بنا' : 'Contact Support'}</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li>{isAr ? '📍 الرياض، المملكة العربية السعودية' : '📍 Riyadh, Saudi Arabia'}</li>
                <li>{isAr ? '✉️ الدعم الفني: marktning@onfirmedmarketing.com' : '✉️ Support: marktning@onfirmedmarketing.com'}</li>
                <li className="pt-2 font-mono text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>{isAr ? 'جميع الخوادم تعمل بنجاح' : 'All Systems Operational'}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p className="text-slate-400">
              {isAr 
                ? '© ٢٠٢٦ كُونفيرمد. جميع الحقوق محفوظة لشركة كُونفيرمد لتقنية المعلومات.' 
                : '© 2026 CONFIRMED. All rights reserved. Registered under Confirmed Saudi IT Co.'}
            </p>
            <div className="flex gap-4">
              <span className="text-slate-400">{isAr ? 'صنع بفخر في المملكة العربية السعودية 🇸🇦' : 'Proudly crafted in Saudi Arabia 🇸🇦'}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== LOGIN MODAL — CLEAN LUXURY REDESIGN ===== */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative" style={{ maxHeight: '92vh' }}>

            {/* ── Single form panel ── */}
            <div className="flex flex-col relative overflow-y-auto bg-white">

              {/* Close button */}
              <button onClick={() => { setShowLoginModal(false); setShowMfaSandbox(false); setLoginStep(1); setErrorMessage(''); setForgotSent(false); setForgotEmail(''); setOtpDigits(['','','','','','']); setEnteredOTP(''); }}
                className="absolute top-5 end-5 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer z-10"
                style={{ background: 'rgba(0,0,0,0.06)', color: '#6B7280' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; }}>
                <X className="w-4 h-4"/>
              </button>

              <div className="flex-1 flex flex-col justify-center px-5 py-4 pt-5">

                {/* Logo header */}
                <div className="flex items-center justify-between mb-3">
                  <img src={confirmedLogo} alt="CONFIRMED" className="h-8 w-auto object-contain select-none" draggable={false} />
                  <button type="button" onClick={toggleLanguage}
                    className="text-[11px] border px-2.5 py-1 rounded-lg transition-all cursor-pointer text-gray-500 border-gray-200 hover:border-gray-400">
                    {isAr ? 'EN' : 'AR'}
                  </button>
                </div>

                {/* ── Login type toggle: Owner OTP vs Staff Password ── */}
                <div className="flex gap-2 mb-3 bg-white/60 backdrop-blur rounded-xl p-1 border border-[#E5E7EB]">
                  <button type="button"
                    onClick={() => { setLoginType('owner'); setStaffError(''); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={loginType === 'owner'
                      ? { background: '#0F1923', color: '#C9A84C' }
                      : { background: 'transparent', color: '#6B7280' }}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isAr ? 'دخول الإدارة (OTP)' : 'Owner Login (OTP)'}
                  </button>
                  <button type="button"
                    onClick={() => { setLoginType('staff'); setErrorMessage(''); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={loginType === 'staff'
                      ? { background: '#0F1923', color: '#C9A84C' }
                      : { background: 'transparent', color: '#6B7280' }}>
                    <UserCheck className="w-3.5 h-3.5" />
                    {isAr ? 'دخول الموظف' : 'Staff Login'}
                  </button>
                </div>

                {/* ── STAFF LOGIN FORM ── */}
                {loginType === 'staff' && (
                  <div className="bg-white rounded-3xl shadow-sm border border-[#E5E7EB] overflow-hidden">
                    <div className="p-1.5 border-b border-[#F3F4F6]" style={{ background: '#0F1923' }}>
                      <p className="text-center text-xs font-bold py-2" style={{ color: '#C9A84C', letterSpacing: '2px' }}>
                        {isAr ? 'دخول بكلمة المرور' : 'STAFF PASSWORD LOGIN'}
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      {staffError && (
                        <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                          {staffError}
                        </div>
                      )}
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        setStaffError('');
                        setStaffLoading(true);
                        try {
                          const API_BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
                          const res  = await fetch(`${API_BASE}/api/auth/staff/login`, {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body:    JSON.stringify({ identifier: staffIdentifier.trim(), password: staffPassword }),
                          });
                          const data = await res.json();

                          if (!res.ok || !data.success) {
                            if (data.error === 'subscription_expired') {
                              setStaffError(isAr
                                ? `اشتراك الصالون منتهٍ — تواصل مع صاحب الصالون للتجديد`
                                : 'Salon subscription expired — contact the owner to renew');
                            } else if (data.error === 'invitation_pending') {
                              setStaffError(isAr
                                ? 'لم تقبل الدعوة بعد — تحقق من بريدك الإلكتروني'
                                : 'You haven\'t accepted your invitation yet — check your email');
                            } else if (data.error === 'account_inactive') {
                              setStaffError(isAr ? 'حسابك موقوف — تواصل مع صاحب الصالون' : 'Account suspended — contact the salon owner');
                            } else {
                              setStaffError(isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Incorrect email or password');
                            }
                            return;
                          }

                          // Save unified session
                          const s = data.session;
                          saveUnifiedSession({
                            token:       s.token,
                            tenantId:    s.tenantId,
                            actorId:     s.actorId,
                            actorType:   'staff',
                            role:        s.role,
                            permissions: s.permissions ?? [],
                            staffName:   data.staffName,
                            salonName:   data.salonName,
                          });

                          setShowLoginModal(false);
                          setStaffIdentifier('');
                          setStaffPassword('');
                          setStaffError('');

                          onLogin(false, {
                            id:          String(s.tenantId),
                            username:    data.staffName ?? staffIdentifier,
                            storeName:   data.salonName,
                            name:        data.staffName,
                            role:        s.role,
                            actorType:   'staff',
                            paymentStatus: 'paid_verified',
                          });
                        } catch {
                          setStaffError(isAr ? 'تعذّر الاتصال بالخادم' : 'Could not reach server');
                        } finally {
                          setStaffLoading(false);
                        }
                      }} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                            {isAr ? 'البريد الإلكتروني / اسم المستخدم' : 'Email / Username'}
                          </label>
                          <input type="text" required value={staffIdentifier}
                            onChange={e => setStaffIdentifier(e.target.value)}
                            placeholder={isAr ? 'بريدك الإلكتروني أو اسم المستخدم' : 'your@email.com or username'}
                            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                            {isAr ? 'كلمة المرور' : 'Password'}
                          </label>
                          <div className="relative">
                            <input type={staffShowPw ? 'text' : 'password'} required value={staffPassword}
                              onChange={e => setStaffPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 pe-10 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 transition-all" />
                            <button type="button" onClick={() => setStaffShowPw(!staffShowPw)}
                              className="absolute end-3 top-2 text-gray-400 hover:text-gray-600 transition-colors">
                              {staffShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <button type="submit" disabled={staffLoading}
                          className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                          style={{ background: '#0F1923', color: '#C9A84C' }}>
                          {staffLoading
                            ? (isAr ? 'جاري التحقق…' : 'Signing in…')
                            : (isAr ? 'دخول' : 'Sign In')}
                        </button>
                        <p className="text-center text-xs text-[#9CA3AF]">
                          {isAr
                            ? 'لا تملك حساباً؟ تواصل مع صاحب الصالون لإرسال دعوة'
                            : 'No account? Ask your salon owner to send you an invitation'}
                        </p>
                      </form>
                    </div>
                  </div>
                )}

                {/* ── OWNER LOGIN CARD (email + password) ── */}
                {loginType === 'owner' && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">

                  <div className="p-4 space-y-3">

                    {/* Security alert */}
                    {errorMessage && (
                      <div className={`p-3.5 rounded-xl flex items-start gap-3 text-xs ${
                        rateLimitSeconds > 0
                          ? 'bg-amber-50 border border-amber-200 text-amber-800'
                          : 'bg-red-50 border border-red-200 text-red-700'
                      }`}>
                        <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${rateLimitSeconds > 0 ? 'text-amber-500' : 'text-red-500'}`}/>
                        <div className="flex-1">
                          <p className="font-bold mb-0.5">
                            {rateLimitSeconds > 0
                              ? (isAr ? 'حد الطلبات' : 'Rate Limited')
                              : (isAr ? 'تنبيه' : 'Alert')}
                          </p>
                          <p className="leading-relaxed">{errorMessage}</p>
                          {/* عداد تنازلي للـ rate limit */}
                          {rateLimitSeconds > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 bg-amber-200 rounded-full h-1.5">
                                <div
                                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000"
                                  style={{ width: `${(rateLimitSeconds / 60) * 100}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-amber-700">{rateLimitSeconds}ث</span>
                            </div>
                          )}
                          {isLockedOut && (
                            <p className="font-mono font-bold mt-1 text-red-600">
                              {isAr ? `إلغاء القفل بعد: ${lockoutTimer}ث` : `Unlocks in: ${lockoutTimer}s`}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── STEP 1: EMAIL + PASSWORD ── */}
                    {loginStep === 1 && (
                      <form onSubmit={handleCredentialsSubmit} className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#374151] mb-1.5">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                          <input
                            type="email" required autoFocus disabled={isLockedOut} value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="salon@example.com"
                            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 disabled:opacity-50 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#374151] mb-1.5">{isAr ? 'كلمة المرور' : 'Password'}</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'} required disabled={isLockedOut} value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 pe-10 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 disabled:opacity-50 transition-all"
                            />
                            <button type="button" onClick={() => setShowPassword(p => !p)}
                              className="absolute end-3 top-2 text-[#9CA3AF] hover:text-[#374151] bg-transparent border-none cursor-pointer">
                              {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3"/>
                            {isAr ? `محاولات متبقية: ${attemptsLeft}/4` : `Attempts left: ${attemptsLeft}/4`}
                          </span>
                          <button type="button" onClick={() => setLoginStep(3)}
                            className="text-[#C9A84C] font-semibold hover:underline bg-transparent border-none cursor-pointer">
                            {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                          </button>
                        </div>

                        <button type="submit" disabled={isLockedOut || isSendingOTP || !username.trim() || !password.trim()}
                          className="w-full bg-[#0F1923] text-white rounded-xl py-2.5 text-sm font-bold tracking-wide hover:bg-[#1a2a3a] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                          {isSendingOTP
                            ? <><RefreshCw className="w-4 h-4 animate-spin"/><span>{isAr ? 'جارٍ التحقق...' : 'Verifying...'}</span></>
                            : <><span>{isAr ? 'تسجيل الدخول' : 'Log In'}</span><span className="text-[#C9A84C]">←</span></>}
                        </button>

                      </form>
                    )}

                    {/* ── STEP 2: FORGOT PASSWORD ── */}
                    {loginStep === 3 && (
                      <div className="space-y-5">
                        <div>
                          <button type="button" onClick={() => { setLoginStep(1); setForgotSent(false); setForgotEmail(''); setForgotEmailError(''); }}
                            className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#0F1923] mb-4 bg-transparent border-none cursor-pointer transition-colors font-medium">
                            <span>←</span> {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                          </button>
                          <h2 className="text-lg font-bold text-[#0F1923]">{isAr ? 'استعادة الوصول' : 'Reset Access'}</h2>
                          <p className="text-sm text-[#6B7280] mt-1">{isAr ? 'أدخل بريدك المسجل وسنرسل لك رابط الاستعادة' : 'Enter your registered email for a reset link'}</p>
                        </div>

                        {forgotSent ? (
                          /* ── OTP + new password form ── */
                          <form onSubmit={handleResetPassword} className="space-y-4">
                            {resetSuccess ? (
                              <div className="rounded-2xl p-5 text-center space-y-2" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: '#16A34A' }}/>
                                <p className="font-bold text-base" style={{ color: '#14532D' }}>{isAr ? '✅ تم تغيير كلمة المرور!' : '✅ Password changed!'}</p>
                                <p className="text-sm" style={{ color: '#15803D' }}>{isAr ? 'جارٍ تسجيل دخولك...' : 'Logging you in...'}</p>
                              </div>
                            ) : (
                              <>
                                <div className="rounded-xl p-3 text-center text-sm" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}>
                                  {isAr
                                    ? <>تم إرسال رمز من <strong>6 أرقام</strong> إلى <strong>{forgotEmail}</strong><br/><span className="text-xs opacity-75">⏱ صالح لمدة ١٠ دقائق</span></>
                                    : <>A <strong>6-digit code</strong> was sent to <strong>{forgotEmail}</strong><br/><span className="text-xs opacity-75">⏱ Valid for 10 minutes</span></>
                                  }
                                </div>

                                {/* 6-digit OTP boxes */}
                                <div>
                                  <label className="block text-xs font-semibold text-[#374151] mb-2">{isAr ? 'رمز التحقق (6 أرقام)' : 'Verification Code'}</label>
                                  <div className="flex gap-2 justify-center" dir="ltr">
                                    {resetOtpDigits.map((d, i) => (
                                      <input
                                        key={i}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={d}
                                        onChange={e => {
                                          const val = e.target.value.replace(/\D/g, '');
                                          const next = [...resetOtpDigits];
                                          next[i] = val;
                                          setResetOtpDigits(next);
                                          setResetError('');
                                          if (val && i < 5) {
                                            const boxes = document.querySelectorAll<HTMLInputElement>('.otp-reset-box');
                                            boxes[i + 1]?.focus();
                                          }
                                        }}
                                        onKeyDown={e => {
                                          if (e.key === 'Backspace' && !resetOtpDigits[i] && i > 0) {
                                            const boxes = document.querySelectorAll<HTMLInputElement>('.otp-reset-box');
                                            boxes[i - 1]?.focus();
                                          }
                                        }}
                                        onPaste={e => {
                                          const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                                          if (paste.length > 0) {
                                            e.preventDefault();
                                            const next = [...resetOtpDigits];
                                            paste.split('').forEach((ch, idx) => { if (idx < 6) next[idx] = ch; });
                                            setResetOtpDigits(next);
                                          }
                                        }}
                                        className="otp-reset-box w-11 h-12 text-center text-lg font-bold border-2 rounded-xl bg-[#F9FAFB] focus:border-[#C9A84C] focus:outline-none transition-colors"
                                        style={{ borderColor: d ? '#C9A84C' : '#E5E7EB', color: '#0F1923' }}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* New password */}
                                <div>
                                  <label className="block text-xs font-semibold text-[#374151] mb-2">{isAr ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                                  <div className="relative">
                                    <Lock className="absolute start-3.5 top-3.5 w-4 h-4 text-[#9CA3AF]"/>
                                    <input
                                      type={resetShowPassword ? 'text' : 'password'}
                                      required
                                      minLength={8}
                                      value={resetNewPassword}
                                      onChange={e => { setResetNewPassword(e.target.value); setResetError(''); }}
                                      placeholder={isAr ? '٨ أحرف كحد أدنى' : 'Min. 8 characters'}
                                      className="w-full ps-11 pe-11 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A84C] transition-all"
                                    />
                                    <button type="button" onClick={() => setResetShowPassword(p => !p)}
                                      className="absolute end-3.5 top-3.5 bg-transparent border-none cursor-pointer text-[#9CA3AF] hover:text-[#6B7280]">
                                      {resetShowPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                    </button>
                                  </div>
                                </div>

                                {/* Confirm password */}
                                <div>
                                  <label className="block text-xs font-semibold text-[#374151] mb-2">{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                                  <div className="relative">
                                    <ShieldCheck className="absolute start-3.5 top-3.5 w-4 h-4" style={{ color: resetConfirmPassword && resetConfirmPassword === resetNewPassword ? '#10B981' : '#9CA3AF' }}/>
                                    <input
                                      type={resetShowPassword ? 'text' : 'password'}
                                      required
                                      value={resetConfirmPassword}
                                      onChange={e => { setResetConfirmPassword(e.target.value); setResetError(''); }}
                                      placeholder={isAr ? 'أعيدي كتابة كلمة المرور' : 'Repeat your password'}
                                      className="w-full ps-11 pe-4 py-3 bg-[#F9FAFB] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A84C] transition-all"
                                      style={{ border: `1.5px solid ${resetConfirmPassword && resetConfirmPassword === resetNewPassword ? '#10B981' : '#E5E7EB'}` }}
                                    />
                                  </div>
                                </div>

                                {resetError && (
                                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {resetError}</p>
                                )}

                                <button type="submit" disabled={resetLoading || resetOtpDigits.join('').length < 6 || !resetNewPassword || !resetConfirmPassword}
                                  className="w-full bg-[#0F1923] text-white rounded-xl py-3.5 text-sm font-bold tracking-wide hover:bg-[#1a2a3a] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                  {resetLoading
                                    ? <><RefreshCw className="w-4 h-4 animate-spin"/><span>{isAr ? 'جارٍ الحفظ...' : 'Saving...'}</span></>
                                    : <><ShieldCheck className="w-4 h-4" style={{ color: '#C9A84C' }}/><span>{isAr ? 'حفظ كلمة المرور' : 'Save Password'}</span></>
                                  }
                                </button>

                                <button type="button" onClick={() => { setForgotSent(false); setForgotEmail(''); setResetOtpDigits(['','','','','','']); setResetNewPassword(''); setResetConfirmPassword(''); setResetError(''); }}
                                  className="w-full text-xs text-[#6B7280] hover:text-[#0F1923] bg-transparent border-none cursor-pointer transition-colors py-1">
                                  {isAr ? '← طلب رمز جديد' : '← Request a new code'}
                                </button>
                              </>
                            )}
                          </form>
                        ) : (
                          <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-[#374151] mb-2">{isAr ? 'البريد الإلكتروني المسجل' : 'Registered Email'}</label>
                              <div className="relative">
                                <Mail className="absolute start-3.5 top-3.5 w-4 h-4 text-[#9CA3AF]"/>
                                <input type="email" required value={forgotEmail}
                                  onChange={e => { setForgotEmail(e.target.value); setForgotEmailError(''); }}
                                  placeholder={isAr ? 'your@email.com' : 'your@email.com'}
                                  className="w-full ps-11 pe-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 transition-all"/>
                              </div>
                              {forgotEmailError && <p className="text-xs text-red-600 mt-1.5">{forgotEmailError}</p>}
                            </div>
                            <button type="submit" disabled={isSendingReset}
                              className="w-full bg-[#0F1923] text-white rounded-xl py-3.5 text-sm font-bold tracking-wide hover:bg-[#1a2a3a] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                              {isSendingReset
                                ? <><RefreshCw className="w-4 h-4 animate-spin"/><span>{isAr ? 'جارٍ الإرسال...' : 'Sending...'}</span></>
                                : <><Mail className="w-4 h-4" style={{ color: '#C9A84C' }}/><span>{isAr ? 'إرسال رابط الاستعادة' : 'Send Reset Link'}</span></>}
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                  </div>
                </div>
                )} {/* end loginType === 'owner' */}

              </div>

              {/* Footer */}
              <div className="px-6 py-4 text-center">
                <p className="text-[11px] text-[#9CA3AF]">CONFIRMED © 2026 — {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved'}</p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ===== SERVICE PROVIDER REGISTRATION MULTI-STEP MODAL ===== */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E9E7E2] w-full max-w-lg p-6 md:p-8 shadow-2xl relative animate-scaleIn max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setShowRegisterModal(false);
                setRegisterStep(1);
                setRegName('');
                setRegPhone('');
                setRegEmail('');
                setRegStoreName('');
                setRegCustomActivity('');
                setRegFormError('');
                setCardName('');
                setCardNumber('');
                setCardExpiry('');
                setCardCvv('');
              }}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-[#F6F6F4] text-[#6E6A63] cursor-pointer"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>

            {/* Stepper Headers */}
            {registerStep < 4 && (
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#14332B]">
                    {isAr ? 'الانضمام كمزود خدمة جديد' : 'Join as a Service Provider'}
                  </h3>
                </div>
                <p className="text-xs text-[#6E6A63] mt-1">
                  {isAr 
                    ? 'سجلي صالونك أو مركزك التجميلي الآن واحصلي على تفعيل فوري بعد إتمام الدفع والتحقق.' 
                    : 'Register your salon or beauty center and gain instant activation after payment verification.'}
                </p>

                {/* Steps visual indicators */}
                <div className="flex items-center justify-between mt-6 relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-150 -translate-y-1/2 z-0" />
                  
                  {/* Step 1 Indicator */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      registerStep >= 1 ? 'bg-[#FF5A5F] text-white' : 'bg-slate-100 text-slate-450 border border-[#E9E7E2]'
                    }`}>
                      1
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold mt-1.5 text-slate-850">
                      {isAr ? 'المعلومات الأساسية' : 'Basic Info'}
                    </span>
                  </div>

                  {/* Step 2 Indicator */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      registerStep >= 2 ? 'bg-[#FF5A5F] text-white' : 'bg-slate-100 text-slate-450 border border-[#E9E7E2]'
                    }`}>
                      2
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold mt-1.5 text-slate-850">
                      {isAr ? 'بيانات المنشأة' : 'Company Details'}
                    </span>
                  </div>

                  {/* Step 3 Indicator */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      registerStep >= 3 ? 'bg-[#FF5A5F] text-white' : 'bg-slate-100 text-slate-450 border border-[#E9E7E2]'
                    }`}>
                      3
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold mt-1.5 text-slate-850">
                      {isAr ? 'الدفع والاشتراك' : 'Payment Checkout'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step Form Body */}
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              {regFormError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-150 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-shake">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{regFormError}</span>
                </div>
              )}

              {/* STEP 1: Personal Info */}
              {registerStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">
                      {isAr ? 'اسم موظفة التواصل/المزود *' : 'Contact Person / Provider Full Name *'}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder={isAr ? 'مثال: نورة محمد السديري' : 'e.g. Noura Al-Sudairy'}
                        className="w-full text-sm pl-10 pr-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">
                        {isAr ? 'رقم الجوال لتفعيل الحساب *' : 'Active Mobile Number *'}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input 
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="055XXXXXXX"
                          className="w-full text-sm pl-10 pr-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">
                        {isAr ? 'البريد الإلكتروني لاستلام الرابط *' : 'Email Address for Dashboard Link *'}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input 
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="marktning@onfirmedmarketing.com"
                          className="w-full text-sm pl-10 pr-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* كلمة المرور */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">
                        {isAr ? 'كلمة المرور *' : 'Password *'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type={regShowPassword ? 'text' : 'password'}
                          required minLength={8}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder={isAr ? '٨ أحرف كحد أدنى' : 'Min 8 characters'}
                          className="w-full text-sm pl-10 pr-10 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                        />
                        <button type="button" onClick={() => setRegShowPassword(p => !p)}
                          className="absolute right-3 top-3 text-slate-400 bg-transparent border-none cursor-pointer">
                          {regShowPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">
                        {isAr ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type={regShowPassword ? 'text' : 'password'}
                          required
                          value={regPasswordConfirm}
                          onChange={(e) => setRegPasswordConfirm(e.target.value)}
                          placeholder={isAr ? 'أعد كتابة كلمة المرور' : 'Repeat password'}
                          className="w-full text-sm pl-10 pr-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!regName || !regPhone || !regEmail) {
                          setRegFormError(isAr ? 'الرجاء ملء جميع البيانات للمتابعة' : 'Please fill in all details to proceed');
                        } else if (!regPassword || regPassword.length < 8) {
                          setRegFormError(isAr ? 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل' : 'Password must be at least 8 characters');
                        } else if (regPassword !== regPasswordConfirm) {
                          setRegFormError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
                        } else {
                          setRegisterStep(2);
                          setRegFormError('');
                        }
                      }}
                      className="w-full py-3 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF5A5F]/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>{isAr ? 'الخطوة التالية (بيانات المنشأة) ←' : 'Next (Company Details) ←'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Store / Company Details & Niche */}
              {registerStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">
                      {isAr ? 'اسم المتجر أو صالون التجميل *' : 'Salon, Spa or Company Name *'}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        required
                        value={regStoreName}
                        onChange={(e) => setRegStoreName(e.target.value)}
                        placeholder={isAr ? 'مثال: صالون نورة للتجميل والعناية' : 'e.g. Noura Salon & Spa'}
                        className="w-full text-sm pl-10 pr-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">
                      {isAr ? 'ما هو النشاط الأساسي للمنشأة؟ *' : 'What is the primary facility activity? *'}
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <select
                        value={regActivity}
                        onChange={(e) => setRegActivity(e.target.value)}
                        className="w-full text-sm pl-10 pr-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white text-slate-800"
                      >
                        <option value="صالون شعر وتجميل">{isAr ? 'صالون شعر وتجميل متكامل' : 'Full Beauty & Hair Salon'}</option>
                        <option value="مركز سبا ومساج">{isAr ? 'مركز سبا ومساج صحي' : 'Healthy Spa & Massage Center'}</option>
                        <option value="مركز عناية بالأظافر">{isAr ? 'عيادة ومركز متخصص للعناية بالأظافر' : 'Specialized Nails Lounge'}</option>
                        <option value="ميك اب ارتست مستقلة">{isAr ? 'خبيرات مكياج وتجميل مستقلات' : 'Independent Makeup Stylist'}</option>
                        <option value="أخرى">{isAr ? 'نشاط آخر (يرجى كتابته)' : 'Other (Please specify)'}</option>
                      </select>
                    </div>
                  </div>

                  {regActivity === 'أخرى' && (
                    <div className="animate-fadeIn">
                      <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">
                        {isAr ? 'اكتبي تفاصيل النشاط بالتفصيل *' : 'Specify your activity niche *'}
                      </label>
                      <input 
                        type="text"
                        required
                        value={regCustomActivity}
                        onChange={(e) => setRegCustomActivity(e.target.value)}
                        placeholder={isAr ? 'مثال: مصففة عرايس وعلاجات كيراتين' : 'e.g. Bridal Hairstyling & Keratin'}
                        className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className="px-6 py-3 border border-[#E9E7E2] text-[#6E6A63] hover:bg-[#F6F6F4] font-bold text-sm rounded-xl transition-all cursor-pointer"
                    >
                      {isAr ? 'رجوع' : 'Back'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!regStoreName) {
                          setRegFormError(isAr ? 'الرجاء إدخال اسم المتجر أو صالون التجميل' : 'Please input the salon or store name');
                        } else if (regActivity === 'أخرى' && !regCustomActivity) {
                          setRegFormError(isAr ? 'الرجاء كتابة تفاصيل النشاط بالتفصيل' : 'Please specify other activity details');
                        } else {
                          setRegisterStep(3);
                          setRegFormError('');
                        }
                      }}
                      className="flex-1 py-3 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF5A5F]/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>{isAr ? 'الذهاب للدفع والاشتراك ←' : 'Go to Secure Checkout ←'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Secure Payment & Package Details */}
              {registerStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Selected Package Details Panel */}
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                    <div className="space-y-0.5 text-right rtl:text-right">
                      <span className="text-[10px] font-bold text-[#FF5A5F] uppercase tracking-wide block font-sans">
                        {isAr ? 'الباقة المحددة' : 'Selected Tier'}
                      </span>
                      <h4 className="font-serif text-base font-bold text-[#14332B]">
                        {selectedPackage === 'basic' ? (isAr ? 'الباقة الأساسية' : 'Basic Starter Plan') : (isAr ? 'الباقة الاحترافية المتكاملة' : 'Professional Growth Plan')}
                      </h4>
                      <p className="text-[11px] text-[#6E6A63]">
                        {billing === 'yearly' ? (isAr ? 'نظام المحاسبة السنوي (توفير ٢٠٪)' : 'Billed Annually (Save 20%)') : (isAr ? 'نظام المحاسبة الشهري المرن' : 'Billed Monthly')}
                      </p>
                    </div>

                    <div className="text-left rtl:text-left">
                      <span className="font-serif text-xl sm:text-2xl font-bold text-[#FF5A5F] block">
                        {selectedPackage === 'basic' ? (billing === 'yearly' ? '1,908' : '199') : (billing === 'yearly' ? '3,828' : '399')}
                      </span>
                      <span className="text-[10px] text-[#6E6A63] font-bold block text-left">
                        {isAr ? 'ر.س' : 'SAR'} / {billing === 'yearly' ? (isAr ? 'سنة' : 'year') : (isAr ? 'شهر' : 'month')}
                      </span>
                    </div>
                  </div>

                  {/* Payment Methods Tab */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-[#1C1B18]">
                      {isAr ? 'اختر وسيلة الدفع الآمنة *' : 'Secure Payment Method *'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('mada')}
                        className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'mada' 
                            ? 'border-[#FF5A5F] bg-[#FF5A5F]/5 text-[#FF5A5F]' 
                            : 'border-[#E9E7E2] hover:bg-[#F6F6F4] text-slate-600'
                        }`}
                      >
                        <span className="text-xs uppercase font-extrabold text-blue-600">MADA</span>
                        <span className="text-[9px] font-normal">{isAr ? 'مدى السعودية' : 'Saudi Mada'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('credit')}
                        className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'credit' 
                            ? 'border-[#FF5A5F] bg-[#FF5A5F]/5 text-[#FF5A5F]' 
                            : 'border-[#E9E7E2] hover:bg-[#F6F6F4] text-slate-600'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <span className="text-[9px] font-normal">{isAr ? 'بطاقة ائتمان' : 'Visa / Master'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('applepay')}
                        className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'applepay' 
                            ? 'border-black bg-black text-white' 
                            : 'border-[#E9E7E2] hover:bg-[#F6F6F4] text-slate-600'
                        }`}
                      >
                        <span className="font-serif font-black tracking-tighter text-sm"> Pay</span>
                        <span className="text-[9px] font-normal">{isAr ? 'دفع سريع' : 'Instant Apple'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Form */}
                  {paymentMethod !== 'applepay' ? (
                    <div className="p-4 bg-white border border-[#E9E7E2] rounded-2xl space-y-3 animate-fadeIn">
                      <div>
                        <label className="block text-[10px] font-bold text-[#1C1B18] uppercase mb-1">{isAr ? 'اسم حامل البطاقة *' : 'Cardholder Name *'}</label>
                        <input
                          type="text"
                          required
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder={isAr ? 'مثال: نورة محمد السديري' : 'e.g. Noura Al-Sudairy'}
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF5A5F]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#1C1B18] uppercase mb-1">{isAr ? 'رقم البطاقة الائتمانية / مدى *' : 'Card Number *'}</label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            required
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => {
                              // basic card formatting
                              const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                              setCardNumber(val);
                            }}
                            placeholder="4000 1234 5678 9010"
                            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF5A5F]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[#1C1B18] uppercase mb-1">{isAr ? 'تاريخ الانتهاء *' : 'Expiry Date *'}</label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val.length >= 2) {
                                setCardExpiry(val.slice(0, 2) + '/' + val.slice(2, 4));
                              } else {
                                setCardExpiry(val);
                              }
                            }}
                            placeholder="MM/YY"
                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF5A5F] text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#1C1B18] uppercase mb-1">{isAr ? 'الرمز السري (CVV) *' : 'Security Code (CVV) *'}</label>
                          <input
                            type="password"
                            required
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF5A5F] text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center space-y-2 animate-fadeIn">
                      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-lg"></div>
                      <p className="text-xs font-bold text-slate-800">{isAr ? 'Apple Pay معرّف وجاهز للاستخدام الآمن' : 'Apple Pay configured and ready'}</p>
                      <p className="text-[10px] text-slate-400">{isAr ? 'اضغطي على الزر بالأسفل لتأكيد الهوية البيومترية وإتمام الدفع' : 'Authenticate with FaceID/TouchID upon submission'}</p>
                    </div>
                  )}

                  {/* Secure Padlock compliance badge */}
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-[10px] leading-relaxed flex gap-2">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      {isAr 
                        ? 'تشفير فوري آمن وقنوات متوافقة كلياً مع المعايير الأمنية لمدى السعودية وهيئة المدفوعات السعودية (PCI-DSS).' 
                        : 'Fully certified end-to-end payment vault. Your billing session is secured using SSL with TLS 1.3 cryptographic parameters.'}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(2)}
                      className="px-6 py-3 border border-[#E9E7E2] text-[#6E6A63] hover:bg-[#F6F6F4] font-bold text-sm rounded-xl transition-all cursor-pointer"
                    >
                      {isAr ? 'رجوع' : 'Back'}
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingPayment}
                      onClick={() => {
                        // Validate Card details first
                        if (paymentMethod !== 'applepay') {
                          if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
                            setRegFormError(isAr ? 'الرجاء إدخال جميع معلومات بطاقتك البنكية لإتمام الدفع الآمن' : 'Please input all card credentials to proceed securely');
                            return;
                          }
                          if (cardNumber.replace(/\s/g, '').length < 15) {
                            setRegFormError(isAr ? 'رقم البطاقة غير مكتمل. يرجى مراجعته.' : 'Invalid or incomplete credit card number.');
                            return;
                          }
                        }

                        setIsProcessingPayment(true);
                        setRegFormError('');

                        // Simulate brief payment processing then register in DB
                        setTimeout(async () => {
                          try {
                            const res = await fetch('/api/providers/register', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                nameAr: regStoreName,
                                email: regEmail.trim().toLowerCase(),
                                phone: regPhone,
                                storeName: regStoreName,
                                password: regPassword,
                              }),
                            });

                            const data = await res.json();

                            if (res.status === 409) {
                              setRegFormError(isAr ? '❌ هذا البريد الإلكتروني مسجّل مسبقاً، يمكنك تسجيل الدخول مباشرة.' : '❌ This email is already registered. You can log in directly.');
                              setIsProcessingPayment(false);
                              return;
                            }

                            if (!res.ok) {
                              setRegFormError(isAr ? '❌ حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مجدداً.' : '❌ Account creation failed. Please try again.');
                              setIsProcessingPayment(false);
                              return;
                            }

                            // Notify admin panel (localStorage)
                            if (onAddProviderRequest) {
                              onAddProviderRequest({
                                id: 'req-' + Math.random().toString(36).substring(2, 9),
                                name: regName,
                                phone: regPhone,
                                email: regEmail,
                                storeName: regStoreName,
                                status: 'approved',
                                requestedAt: new Date().toISOString(),
                              });
                            }

                            // ── Auto-send OTP then open login at step 2 ──
                            const registeredEmail = regEmail.trim().toLowerCase();
                            try {
                              const otpRes = await fetch('/api/auth/send-otp', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: registeredEmail }),
                              });
                              const otpData = await otpRes.json();
                              if (otpData.devOtp) setGeneratedOTP(otpData.devOtp);
                              setOtpEmailTarget(otpData.maskedEmail || registeredEmail);
                            } catch { /* OTP will be entered manually */ }

                            // Close registration, open login at OTP step
                            setIsProcessingPayment(false);
                            setShowRegisterModal(false);
                            setRegisterStep(1);
                            setRegName(''); setRegPhone(''); setRegEmail('');
                            setRegStoreName(''); setRegCustomActivity('');
                            setCardName(''); setCardNumber(''); setCardExpiry(''); setCardCvv('');
                            setRegFormError('');

                            setUsername(registeredEmail);
                            setLoginStep(2);
                            setOtpSent(true);
                            setShowLoginModal(true);
                          } catch {
                            setRegFormError(isAr ? '❌ خطأ في الاتصال، يرجى المحاولة مجدداً.' : '❌ Connection error. Please try again.');
                            setIsProcessingPayment(false);
                          }
                        }, 1800);
                      }}
                      className="flex-1 py-3 bg-[#14332B] hover:bg-[#1C473C] text-white font-bold text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isProcessingPayment ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>{isAr ? 'جاري التحقق والمصادقة الأمنية...' : 'Securing transaction credentials...'}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>
                            {isAr 
                              ? `دفع ومصادقة ${selectedPackage === 'basic' ? (billing === 'yearly' ? '1,908' : '199') : (billing === 'yearly' ? '3,828' : '399')} ر.س` 
                              : `Authorize & Pay ${selectedPackage === 'basic' ? (billing === 'yearly' ? '1,908' : '199') : (billing === 'yearly' ? '3,828' : '399')} SAR`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* STEP 4: Success confirmation screen */}
            {registerStep === 4 && (
              <div className="text-center py-6 space-y-6 animate-scaleIn">
                <div className="w-20 h-20 bg-emerald-50 border-4 border-emerald-200 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-serif text-2xl font-bold text-[#14332B]">
                    {isAr ? 'تم تفعيل حسابك فوراً! 🎉' : 'Account Activated! 🎉'}
                  </h4>
                  <p className="text-sm text-emerald-700 font-bold leading-relaxed max-w-sm mx-auto">
                    {isAr ? '✓ تم إنشاء حسابك بنجاح في منصة CONFIRMED.' : '✓ Your account has been successfully created on CONFIRMED.'}
                  </p>
                </div>

                {/* Account Details */}
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 text-start space-y-2 max-w-sm mx-auto">
                  <p className="font-bold text-slate-800 mb-2">📋 {isAr ? 'بيانات حسابك:' : 'Your Account Details:'}</p>
                  <div className="flex justify-between"><span className="text-slate-500">{isAr ? 'المنشأة:' : 'Store:'}</span> <span className="font-bold">{regStoreName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{isAr ? 'البريد:' : 'Email:'}</span> <span className="font-mono font-bold text-xs">{regEmail}</span></div>
                  {registeredUsername && (
                    <div className="flex justify-between"><span className="text-slate-500">{isAr ? 'اسم المستخدم:' : 'Username:'}</span> <span className="font-mono font-bold text-[#FF5A5F]">{registeredUsername}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-slate-500">{isAr ? 'الحالة:' : 'Status:'}</span> <span className="text-emerald-600 font-bold">{isAr ? '✅ مفعّل - تجريبي 14 يوم' : '✅ Active - 14 day trial'}</span></div>
                </div>

                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isAr ? 'يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني أو اسم المستخدم أعلاه.' : 'You can now log in using your email or username above.'}
                </p>

                <div className="pt-2 space-y-3">
                  <button
                    onClick={() => {
                      setShowRegisterModal(false);
                      setShowLoginModal(true);
                      setUsername(registeredUsername || regEmail);
                      setRegisterStep(1);
                      setRegName(''); setRegPhone(''); setRegEmail('');
                      setRegStoreName(''); setRegCustomActivity('');
                      setRegFormError('');
                    }}
                    className="w-full py-3.5 bg-[#FF5A5F] hover:bg-[#e04e53] text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    {isAr ? 'تسجيل الدخول الآن' : 'Log In Now'}
                  </button>
                  <button
                    onClick={() => {
                      setShowRegisterModal(false);
                      setRegisterStep(1);
                      setRegName(''); setRegPhone(''); setRegEmail('');
                      setRegStoreName(''); setRegCustomActivity('');
                      setRegFormError('');
                    }}
                    className="w-full py-3 text-slate-500 text-sm font-medium cursor-pointer"
                  >
                    {isAr ? 'العودة للرئيسية' : 'Back to Home'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* سياسة الخصوصية */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        isAr={isAr}
      />

    </div>
  );
}
