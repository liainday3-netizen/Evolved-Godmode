import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { WebhookHandlers } from "./webhookHandlers";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { randomUUID } from "crypto";
import router from "./routes";
import { logger } from "./lib/logger";
import { registerImageRoutes } from "./replit_integrations/image";

const PgStore = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";

declare module "express-session" {
  interface SessionData {
    clientId: string;
  }
}

const app: Express = express();

// Replit and other hosted deployments terminate TLS at a reverse proxy.
// Trust one proxy hop so secure session cookies work behind that proxy.
if (isProduction) {
  app.set("trust proxy", 1);
}

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

// In production, explicitly allow configured browser origins. Requests without
// an Origin header (server-to-server/native clients) remain usable.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !isProduction) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);

// Stripe webhook MUST be registered before express.json() — needs raw Buffer body.
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
    } catch (error: unknown) {
      logger.error({ error }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

// Keep request bodies bounded to reduce accidental or abusive memory pressure.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const configuredSessionSecret = process.env["SESSION_SECRET"];
if (isProduction && !configuredSessionSecret) {
  throw new Error("SESSION_SECRET must be configured in production.");
}
const sessionSecret = configuredSessionSecret ?? randomUUID();
const databaseUrl = process.env["DATABASE_URL"];

app.use(
  session({
    store: databaseUrl
      ? new PgStore({
          conString: databaseUrl,
          createTableIfMissing: true,
          ttl: 365 * 24 * 60 * 60,
        })
      : undefined,
    secret: sessionSecret,
    resave: false,
    // The session middleware below assigns clientId, which causes the session
    // to be saved. Avoid issuing empty session cookies for every request.
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60 * 1000,
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
registerImageRoutes(app);

export default app;
