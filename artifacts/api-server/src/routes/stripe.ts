import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Get products with prices directly from Stripe API
router.get("/stripe/products", async (_req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const [productsRes, pricesRes] = await Promise.all([
      stripe.products.list({ active: true, limit: 100 }),
      stripe.prices.list({ active: true, limit: 100 }),
    ]);

    const productsMap = new Map<string, any>();
    for (const p of productsRes.data) {
      productsMap.set(p.id, {
        id: p.id,
        name: p.name,
        description: p.description,
        metadata: p.metadata,
        prices: [],
      });
    }
    for (const pr of pricesRes.data) {
      const productId = typeof pr.product === "string" ? pr.product : pr.product.id;
      if (productsMap.has(productId)) {
        productsMap.get(productId).prices.push({
          id: pr.id,
          unit_amount: pr.unit_amount,
          currency: pr.currency,
          recurring: pr.recurring,
          active: pr.active,
        });
      }
    }
    // Sort prices by unit_amount within each product
    for (const product of productsMap.values()) {
      product.prices.sort((a: any, b: any) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0));
    }
    res.json({ data: Array.from(productsMap.values()) });
  } catch (err) {
    logger.error({ err }, "Failed to fetch products");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Create Stripe checkout session
router.post("/stripe/checkout", async (req, res) => {
  try {
    const { priceId, userId, email } = req.body as { priceId: string; userId: string; email?: string };
    if (!priceId || !userId) {
      res.status(400).json({ error: "priceId and userId are required" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    // Find or create user record
    let [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      [user] = await db.insert(users).values({ id: userId, email: email ?? null }).returning();
    }

    // Find or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId },
      });
      await db.update(users).set({ stripeCustomerId: customer.id, email: email ?? user.email }).where(eq(users.id, userId));
      customerId = customer.id;
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/godmode-web/pricing?success=1`,
      cancel_url: `${baseUrl}/godmode-web/pricing?canceled=1`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err }, "Checkout error");
    res.status(500).json({ error: err.message ?? "Checkout failed" });
  }
});

// Create customer portal session
router.post("/stripe/portal", async (req, res) => {
  try {
    const { userId } = req.body as { userId: string };
    if (!userId) { res.status(400).json({ error: "userId required" }); return; }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No subscription found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/godmode-web/pricing`,
    });
    res.json({ url: portalSession.url });
  } catch (err: any) {
    logger.error({ err }, "Portal error");
    res.status(500).json({ error: err.message ?? "Portal failed" });
  }
});

// Get subscription status for a user — queries Stripe API directly
router.get("/stripe/subscription/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.stripeCustomerId) {
      res.json({ active: false });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
      limit: 1,
    });
    const trialing = subs.data.length === 0
      ? await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "trialing", limit: 1 })
      : null;

    const activeSub = subs.data[0] ?? trialing?.data[0] ?? null;
    res.json({ active: activeSub !== null, status: activeSub?.status ?? null });
  } catch (err) {
    logger.error({ err }, "Subscription check error");
    res.json({ active: false });
  }
});

export default router;
