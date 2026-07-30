/**
 * Seed script — run once to populate the database with initial data.
 * Usage: pnpm --filter @workspace/api-server tsx src/scripts/seed.ts
 */
import { db, providers, clients, staff, bookings, subscriptionPackages } from '../lib/db';

async function seed() {
  console.log('🌱 Starting seed...');

  // ── Subscription Packages ──────────────────────────────────────────────────
  console.log('  → Seeding subscription packages...');
  await db.insert(subscriptionPackages).values([
    {
      tier: 'basic',
      nameAr: 'الأساسية',
      nameEn: 'Basic',
      priceMonthly: 299,
      priceYearly: 2990,
      featuresJson: JSON.stringify([
        'حجوزات غير محدودة',
        'إدارة العملاء',
        'تقارير أساسية',
        'دعم فني بالإيميل',
      ]),
      isPopular: false,
    },
    {
      tier: 'pro',
      nameAr: 'الاحترافية',
      nameEn: 'Pro',
      priceMonthly: 599,
      priceYearly: 5990,
      featuresJson: JSON.stringify([
        'كل مزايا الأساسية',
        'بوابة حجز للعملاء',
        'إشعارات SMS',
        'نقطة البيع (POS)',
        'تقارير متقدمة',
        'دعم فني بالواتساب',
      ]),
      isPopular: true,
    },
    {
      tier: 'enterprise',
      nameAr: 'المتقدمة',
      nameEn: 'Enterprise',
      priceMonthly: 999,
      priceYearly: 9990,
      featuresJson: JSON.stringify([
        'كل مزايا الاحترافية',
        'فروع متعددة',
        'تكاملات مخصصة',
        'مدير حساب مخصص',
        'API كامل',
        'دعم فني 24/7',
      ]),
      isPopular: false,
    },
  ]).onConflictDoNothing();

  // ── Providers (Salon Accounts) ────────────────────────────────────────────
  console.log('  → Seeding providers...');
  const [amalProvider] = await db.insert(providers).values([
    {
      username: 'amal.hair',
      email: 'marktning@onfirmedmarketing.com',
      nameAr: 'صالون أمل للشعر',
      nameEn: 'Amal Hair Studio',
      slug: 'amal-hair',
      status: 'active',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      churnRisk: 'low',
      mrr: 599,
      onlineBookingEnabled: true,
      city: 'الرياض',
      phone: '0551112222',
    },
    {
      username: 'dalal.spa',
      email: 'marktning@onfirmedmarketing.com',
      nameAr: 'سبا دلال',
      nameEn: 'Dalal Spa & Wellness',
      slug: 'dalal-spa',
      status: 'active',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      churnRisk: 'low',
      mrr: 599,
      onlineBookingEnabled: false,
      city: 'جدة',
      phone: '0552223333',
    },
    {
      username: 'shahad.nail',
      email: 'marktning@onfirmedmarketing.com',
      nameAr: 'صالون شهد للأظافر',
      nameEn: "Shahad's Nail Studio",
      slug: 'shahad-nail',
      status: 'trial',
      subscriptionTier: 'basic',
      subscriptionStatus: 'trial',
      churnRisk: 'medium',
      mrr: 0,
      onlineBookingEnabled: false,
      city: 'الدمام',
      phone: '0553334444',
    },
    {
      username: 'jawahir.mua',
      email: 'marktning@onfirmedmarketing.com',
      nameAr: 'جواهر للمكياج',
      nameEn: 'Jawahir MUA',
      slug: 'jawahir-mua',
      status: 'suspended',
      subscriptionTier: 'basic',
      subscriptionStatus: 'expired',
      churnRisk: 'high',
      mrr: 0,
      onlineBookingEnabled: false,
      city: 'الرياض',
      phone: '0554445555',
    },
  ]).onConflictDoNothing().returning();

  const firstProvider = amalProvider;
  if (!firstProvider) {
    console.log('  ⚠️  Providers already seeded, skipping clients/staff/bookings.');
    console.log('✅ Seed complete (already existed).');
    process.exit(0);
  }

  // Get all inserted providers
  const allProviders = await db.select().from(providers);
  const amal = allProviders.find(p => p.username === 'amal.hair')!;

  // ── Staff for Amal's salon ────────────────────────────────────────────────
  console.log('  → Seeding staff...');
  const insertedStaff = await db.insert(staff).values([
    {
      providerId: amal.id,
      name: 'أمل',
      role: 'خبيرة شعر',
      email: 'marktning@onfirmedmarketing.com',
      phone: '0551112222',
      isActive: true,
      username: 'staff_amal_hair',
      secureLinkToken: 'token_amal_8a92f0',
    },
    {
      providerId: amal.id,
      name: 'دلال',
      role: 'خبيرة بشرة وسبا',
      email: 'marktning@onfirmedmarketing.com',
      phone: '0552223333',
      isActive: true,
      username: 'staff_dalal_spa',
      secureLinkToken: 'token_dalal_4b77c1',
    },
    {
      providerId: amal.id,
      name: 'شهد',
      role: 'فنية أظافر',
      email: 'marktning@onfirmedmarketing.com',
      phone: '0553334444',
      isActive: true,
      username: 'staff_shahad_nail',
      secureLinkToken: 'token_shahad_9c21e3',
    },
    {
      providerId: amal.id,
      name: 'جواهر',
      role: 'خبيرة مكياج',
      email: 'marktning@onfirmedmarketing.com',
      phone: '0554445555',
      isActive: false,
      username: 'staff_jawahir_mua',
      secureLinkToken: 'token_jawahir_5e88d0',
    },
  ]).onConflictDoNothing().returning();

  // ── Clients for Amal's salon ──────────────────────────────────────────────
  console.log('  → Seeding clients...');
  const insertedClients = await db.insert(clients).values([
    {
      providerId: amal.id,
      name: 'سارة المطيري',
      phone: '0551112222',
      visits: 12,
      notes: 'حساسية من مادة الأمونيا في الصبغات',
      loyaltyPoints: 125,
      totalSpend: 2350,
      manualClassification: 'Regular',
      manualRating: 4,
    },
    {
      providerId: amal.id,
      name: 'نوف العتيبي',
      phone: '0553334444',
      visits: 8,
      notes: 'تفضل أمل دائماً لقص وسشوار الشعر',
      loyaltyPoints: 80,
      totalSpend: 1120,
      manualClassification: 'Regular',
      manualRating: 4,
    },
    {
      providerId: amal.id,
      name: 'حصة الكثيري',
      phone: '0555556666',
      visits: 15,
      notes: 'تحب المشروبات الساخنة بدون سكر',
      loyaltyPoints: 195,
      totalSpend: 4200,
      manualClassification: 'VIP',
      manualRating: 5,
    },
    {
      providerId: amal.id,
      name: 'لمى السبيعي',
      phone: '0557778888',
      visits: 5,
      notes: 'آخر صبغة شعر استخدمت درجة لون 6.35',
      loyaltyPoints: 50,
      totalSpend: 780,
      manualClassification: 'New',
      manualRating: 3,
    },
    {
      providerId: amal.id,
      name: 'ريما القحطاني',
      phone: '0559990000',
      visits: 22,
      notes: 'عضوة في باقة السبا الشهرية',
      loyaltyPoints: 340,
      totalSpend: 6850,
      manualClassification: 'VIP',
      manualRating: 5,
    },
  ]).returning();

  // ── Bookings for Amal's salon ──────────────────────────────────────────────
  console.log('  → Seeding bookings...');
  const today = new Date().toISOString().split('T')[0];
  const sara = insertedClients[0];
  const nouf = insertedClients[1];
  const hessa = insertedClients[2];
  const lama = insertedClients[3];
  const rima = insertedClients[4];
  const amalStaff = insertedStaff[0];
  const dalalStaff = insertedStaff[1];
  const shahadStaff = insertedStaff[2];

  await db.insert(bookings).values([
    {
      providerId: amal.id,
      clientId: sara?.id,
      staffId: amalStaff?.id,
      clientName: 'سارة المطيري',
      clientPhone: '0551112222',
      serviceId: 's1',
      serviceName: 'قص وسشوار',
      branchId: 'br-riyadh',
      date: today,
      time: '10:00',
      duration: 45,
      price: 120,
      status: 'confirmed',
      notes: 'تفضل سشوار مموج',
      source: 'manual',
    },
    {
      providerId: amal.id,
      clientId: nouf?.id,
      staffId: shahadStaff?.id,
      clientName: 'نوف العتيبي',
      clientPhone: '0553334444',
      serviceId: 's5',
      serviceName: 'عناية بالأظافر (مانيكير)',
      branchId: 'br-riyadh',
      date: today,
      time: '11:30',
      duration: 40,
      price: 90,
      status: 'confirmed',
      notes: 'عناية كاملة مع طلاء شفاف',
      source: 'manual',
    },
    {
      providerId: amal.id,
      clientId: hessa?.id,
      staffId: dalalStaff?.id,
      clientName: 'حصة الكثيري',
      clientPhone: '0555556666',
      serviceId: 's4',
      serviceName: 'جلسة سبا 90 دقيقة',
      branchId: 'br-riyadh',
      date: today,
      time: '13:00',
      duration: 90,
      price: 280,
      status: 'attended',
      notes: 'استرخاء عميق',
      source: 'manual',
    },
    {
      providerId: amal.id,
      clientId: lama?.id,
      staffId: amalStaff?.id,
      clientName: 'لمى السبيعي',
      clientPhone: '0557778888',
      serviceId: 's2',
      serviceName: 'صبغة كاملة',
      branchId: 'br-riyadh',
      date: today,
      time: '15:30',
      duration: 120,
      price: 350,
      status: 'confirmed',
      source: 'manual',
    },
    {
      providerId: amal.id,
      clientId: rima?.id,
      staffId: dalalStaff?.id,
      clientName: 'ريما القحطاني',
      clientPhone: '0559990000',
      serviceId: 's6',
      serviceName: 'تنظيف بشرة عميق',
      branchId: 'br-riyadh',
      date: today,
      time: '16:45',
      duration: 60,
      price: 220,
      status: 'confirmed',
      source: 'manual',
    },
  ]);

  console.log('✅ Seed complete!');
  console.log(`   • ${allProviders.length} providers`);
  console.log(`   • ${insertedStaff.length} staff`);
  console.log(`   • ${insertedClients.length} clients`);
  console.log('   • 5 bookings');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
