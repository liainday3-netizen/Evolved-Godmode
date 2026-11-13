import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MODES = ["genius", "coder", "strategist", "oracle"] as const;
type GodMode = (typeof MODES)[number];

const SYSTEM_PROMPTS: Record<GodMode, string> = {
  genius: "You are GODMODE Genius — a multidisciplinary intelligence. Synthesize knowledge with depth, clarity, curiosity, and practical insight. Challenge assumptions constructively, distinguish facts from uncertainty, and prioritize helpful, responsible answers.",
  coder: "You are GODMODE Coder — an expert software engineering assistant. Write correct, maintainable, secure code. Explain important trade-offs, identify assumptions, and never claim code was tested unless it actually was.",
  strategist: "You are GODMODE Strategist — an expert in business, competitive dynamics, decision theory, and systems thinking. Consider second-order effects, identify practical leverage points, and ground recommendations in evidence and clear assumptions.",
  oracle: "You are GODMODE Oracle — a thoughtful guide drawing on philosophy, psychology, history, and human nature. Be reflective but precise, distinguish interpretation from fact, and turn insight into practical next steps.",
};

const FREE_DAILY_LIMIT = 10;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 20_000;
const MAX_TOTAL_CHARS = 60_000;

const requestSchema = z.object({
  mode: z.enum(MODES).default("genius"),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
    }).strict(),
  ).min(1).max(MAX_MESSAGES),
}).strict().superRefine((value, ctx) => {
  const total = value.messages.reduce((sum, message) => sum + message.content.length, 0);
  if (total > MAX_TOTAL_CHARS) {
    ctx.addIssue({
      code: "custom",
      message: "The conversation is too large. Please start a new session or shorten the history.",
      path: ["messages"],
    });
  }
  if (value.messages[value.messages.length - 1]?.role !== "user") {
    ctx.addIssue({
      code: "custom",
      message: "The last message must be from the user.",
      path: ["messages"],
    });
  }
});

/**
 * The owner is assigned by express-session on the server. Never use a
 * browser-provided x-user-id as the identity for quotas or account data.
 *
 * The daily counter update is a single conditional SQL update, so parallel
 * requests cannot all pass the same final free-message slot.
 */
async function checkAndIncrementUsage(
  ownerId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10);

  await db.insert(users)
    .values({ id: ownerId, dailyMessageCount: 0, lastMessageDate: null })
    .onConflictDoNothing();

  const [user] = await db.select({
    stripeCustomerId: users.stripeCustomerId,
  }).from(users).where(eq(users.id, ownerId));

  let isPro = false;
  if (user?.stripeCustomerId) {
    try {
      const result = await db.execute(sql`
        SELECT status FROM stripe.subscriptions
        WHERE customer = ${user.stripeCustomerId}
          AND status IN ('active', 'trialing')
        LIMIT 1
      `);
      isPro = result.rows.length > 0;
    } catch (error) {
      // Missing Stripe sync tables must not grant Pro access.
      logger.warn({ error }, "Unable to verify Pro subscription; applying free quota");
    }
  }

  if (isPro) return { allowed: true, remaining: -1 };

  const updated = await db.update(users)
    .set({
      dailyMessageCount: sql`CASE
        WHEN ${users.lastMessageDate} = ${today}::date
        THEN ${users.dailyMessageCount} + 1
        ELSE 1
      END`,
      lastMessageDate: today,
    })
    .where(and(
      eq(users.id, ownerId),
      sql`(
        ${users.lastMessageDate} IS DISTINCT FROM ${today}::date
        OR ${users.dailyMessageCount} < ${FREE_DAILY_LIMIT}
      )`,
    ))
    .returning({ dailyMessageCount: users.dailyMessageCount });

  if (updated.length === 0) {
    return { allowed: false, remaining: 0 };
  }

  return {
    allowed: true,
    remaining: Math.max(0, FREE_DAILY_LIMIT - updated[0].dailyMessageCount),
  };
}

router.post("/chat", async (req, res): Promise<void> => {
  const ownerId = req.session?.clientId;
  if (!ownerId) {
    res.status(401).json({ error: "A valid session is required." });
    return;
  }

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid chat request.",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const { messages, mode } = parsed.data;
  let usage: { allowed: boolean; remaining: number };

  try {
    usage = await checkAndIncrementUsage(ownerId);
  } catch (error) {
    req.log.error({ error }, "Chat quota check failed");
    res.status(503).json({ error: "Chat is temporarily unavailable. Please try again shortly." });
    return;
  }

  if (!usage.allowed) {
    res.status(402).json({
      error: "Daily limit reached",
      message: "You've used all 10 free messages today. Try again tomorrow.",
      limitReached: true,
      remaining: 0,
    });
    return;
  }

  const abortController = new AbortController();
  let streamFinished = false;
  res.on("close", () => {
    if (!streamFinished) abortController.abort();
  });

  try {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[mode] },
        ...messages.map((message) =>
          message.role === "user"
            ? { role: "user" as const, content: message.content }
            : { role: "assistant" as const, content: message.content },
        ),
      ],
      stream: true,
      max_completion_tokens: 8192,
    }, { signal: abortController.signal });

    for await (const chunk of stream) {
      if (res.destroyed || abortController.signal.aborted) break;
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    if (!res.destroyed && !abortController.signal.aborted) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
    streamFinished = true;
  } catch (error) {
    if (abortController.signal.aborted || res.destroyed) {
      streamFinished = true;
      return;
    }
    req.log.error({ error }, "Chat generation error");
    if (!res.headersSent) {
      res.status(502).json({ error: "The AI service could not complete this response." });
    } else if (!res.destroyed) {
      res.write(`data: ${JSON.stringify({ error: "The AI service interrupted this response. Please try again." })}\n\n`);
      res.end();
    }
    streamFinished = true;
  }
});

export default router;
