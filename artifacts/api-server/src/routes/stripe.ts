import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Get products with prices from Stripe-synced DB
router.get("/stripe/products", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p.metadata as product_metadata,
        pr.id as price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring,
        pr.active as price_active
      FROM stripe.products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = true
      ORDER BY pr.unit_amount ASC
    `);

    const productsMap = new Map<string, any>();
    for (const row of result.rows as any[]) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata,
          prices: [],
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
          active: row.price_active,
        });
      }
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

// Get subscription status for a user
router.get("/stripe/subscription/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.stripeCustomerId) {
      res.json({ active: false });
      return;
    }

    const result = await db.execute(sql`
      SELECT status FROM stripe.subscriptions
      WHERE customer = ${user.stripeCustomerId}
      ORDER BY created DESC LIMIT 1
    `);

    const sub = result.rows[0] as any;
    const active = sub?.status === "active" || sub?.status === "trialing";
    res.json({ active, status: sub?.status ?? null });
  } catch (err) {
    logger.error({ err }, "Subscription check error");
    res.json({ active: false });
  }
});

export default router;
