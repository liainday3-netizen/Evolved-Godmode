import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Creating GODMODE products in Stripe...');

    const existing = await stripe.products.search({ query: "name:'GODMODE Pro' AND active:'true'" });
    if (existing.data.length > 0) {
      console.log('GODMODE Pro already exists:', existing.data[0].id);
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      for (const p of prices.data) {
        console.log(`  Price: ${p.id} — $${(p.unit_amount ?? 0) / 100}/${(p.recurring as any)?.interval}`);
      }
      return;
    }

    const product = await stripe.products.create({
      name: 'GODMODE Pro',
      description: 'Unlimited AI sessions across all 4 modes — Genius, Coder, Strategist, Oracle. Plus AI code generator and community access.',
      metadata: { tier: 'pro' },
    });
    console.log('Created product:', product.id);

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: 1200,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log('Monthly price:', monthly.id, '— $12/mo');

    const yearly = await stripe.prices.create({
      product: product.id,
      unit_amount: 9900,
      currency: 'usd',
      recurring: { interval: 'year' },
    });
    console.log('Yearly price:', yearly.id, '— $99/yr');

    console.log('\n✓ GODMODE Pro created! Webhooks will sync to database automatically.');
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createProducts();
