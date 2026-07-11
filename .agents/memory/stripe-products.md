---
name: Stripe products endpoint
description: Why /api/stripe/products queries Stripe API directly instead of the synced DB tables
---

The `stripe.products` and `stripe.prices` tables created by the stripe-replit-sync migration have `id`, `object`, and `active` defined as `GENERATED ALWAYS` columns. This means any direct INSERT (including `syncBackfill()`) fails with "cannot insert a non-DEFAULT value into column". 

**Why:** The generated columns are computed from `_raw_data`, so the sync migration was designed for upsert-via-raw-data, not direct value insert. Rather than fight the schema, the products route calls `stripe.products.list()` and `stripe.prices.list()` directly from the Stripe SDK and returns the combined result.

**How to apply:** Keep `/api/stripe/products` using `getUncachableStripeClient()` + direct Stripe API calls. Do not attempt to read from `stripe.products` or `stripe.prices` DB tables for the products listing — they will be empty.
