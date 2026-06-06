import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { WebhookHandlers } from "./webhookHandlers";
import session from "express-session";
import { randomUUID } from "crypto";
import router from "./routes";
import { logger } from "./lib/logger";

declare module "express-session" {
  interface SessionData {
    clientId: string;
  }
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));

// Stripe webhook MUST be registered before express.json() — needs raw Buffer body
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ error }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env["SESSION_SECRET"] ?? randomUUID();

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use((req, _res, next) => {
  if (!req.session.clientId) {
    req.session.clientId = randomUUID();
  }
  next();
});

app.use("/api", router);

export default app;
