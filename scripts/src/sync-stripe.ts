import { getStripeSync } from './stripeClient';

const sync = await getStripeSync();
console.log('Running Stripe syncBackfill...');
await sync.syncBackfill();
console.log('Done');
