/**
 * Creates CONFIRMED subscription products in Stripe (SAR pricing).
 * Idempotent — safe to run multiple times.
 * Run: pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 */
import { getUncachableStripeClient } from './stripeClient';

const PLANS = [
  {
    name: 'CONFIRMED — الباقة الأساسية',
    nameEn: 'CONFIRMED Basic Plan',
    plan: 'basic',
    monthly: 19900, // 199 SAR in halalas
    yearly:  190800, // 1908 SAR (159/mo × 12)
  },
  {
    name: 'CONFIRMED — الباقة المتقدمة',
    nameEn: 'CONFIRMED Pro Plan',
    plan: 'pro',
    monthly: 39900, // 399 SAR
    yearly:  382800, // 3828 SAR (319/mo × 12)
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log('🌱 Seeding Stripe products (SAR)...\n');

  for (const plan of PLANS) {
    // Check if product already exists
    const existing = await stripe.products.search({
      query: `metadata['plan']:'${plan.plan}' AND active:'true'`,
    });

    let productId: string;
    if (existing.data.length > 0) {
      productId = existing.data[0]!.id;
      console.log(`⏩  ${plan.name} already exists (${productId})`);
    } else {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.nameEn,
        metadata: { plan: plan.plan },
      });
      productId = product.id;
      console.log(`✅  Created product: ${plan.name} (${productId})`);
    }

    // Monthly price
    const existingMonthly = await stripe.prices.list({ product: productId, active: true });
    const hasMonthly = existingMonthly.data.some(p => p.recurring?.interval === 'month');
    const hasYearly  = existingMonthly.data.some(p => p.recurring?.interval === 'year');

    if (!hasMonthly) {
      const mp = await stripe.prices.create({
        product: productId,
        unit_amount: plan.monthly,
        currency: 'sar',
        recurring: { interval: 'month' },
      });
      console.log(`   💰 Monthly price: ${plan.monthly / 100} SAR/mo (${mp.id})`);
    } else {
      console.log(`   ⏩  Monthly price already exists`);
    }

    if (!hasYearly) {
      const yp = await stripe.prices.create({
        product: productId,
        unit_amount: plan.yearly,
        currency: 'sar',
        recurring: { interval: 'year' },
      });
      console.log(`   💰 Yearly price: ${plan.yearly / 100} SAR/yr (${yp.id})`);
    } else {
      console.log(`   ⏩  Yearly price already exists`);
    }

    console.log();
  }

  console.log('✨ Done! Webhooks will sync data to stripe.* tables automatically.\n');
}

seedProducts().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
