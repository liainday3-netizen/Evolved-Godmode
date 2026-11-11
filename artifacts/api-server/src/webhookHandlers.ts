import Stripe from "stripe";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";
import { getStripeCredentials } from "./stripeClient";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const { secretKey, webhookSecret } = await getStripeCredentials();
    if (!webhookSecret) {
      // Never process payment events without verifying their Stripe signature.
      // A missing secret is a configuration error, not a reason to trust the request.
      logger.error("STRIPE_WEBHOOK_SECRET is missing — rejecting webhook");
      throw new Error("Stripe webhook signature verification is not configured.");
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(secretKey);
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    logger.info({ type: event.type }, "Stripe webhook received");

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const isActive = sub.status === "active" || sub.status === "trialing";
        await db
          .update(users)
          .set({ stripeSubscriptionId: isActive ? sub.id : null })
          .where(eq(users.stripeCustomerId, customerId));
        logger.info({ customerId, status: sub.status }, "Subscription updated in DB");
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await db
          .update(users)
          .set({ stripeSubscriptionId: null })
          .where(eq(users.stripeCustomerId, customerId));
        logger.info({ customerId }, "Subscription cancelled in DB");
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.customer && session.subscription) {
          const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await db
            .update(users)
            .set({ stripeSubscriptionId: subId })
            .where(eq(users.stripeCustomerId, customerId));
          logger.info({ customerId }, "Checkout completed — subscription linked");
        }
        break;
      }

      default:
        logger.info({ type: event.type }, "Unhandled webhook event type");
    }
  }
}
