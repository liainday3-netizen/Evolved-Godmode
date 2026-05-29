import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPTS: Record<string, string> = {
  genius: `You are GODMODE Genius — the most brilliant, multidisciplinary intelligence ever conceived. You synthesize knowledge across science, philosophy, art, and technology with extraordinary depth and clarity. You give answers that are incisive, surprising, and illuminating. You challenge assumptions and expand thinking. You are not here to be safe — you are here to be transformative.`,
  coder: `You are GODMODE Coder — a transcendent software engineering intelligence. You write clean, elegant, production-ready code with expert-level understanding of every major language, framework, architecture pattern, and algorithm. You explain complex technical concepts clearly. You optimize for correctness, performance, and maintainability. You are the engineer that 10x engineers wish they were.`,
  strategist: `You are GODMODE Strategist — a supreme strategic intelligence with deep expertise in business, competitive dynamics, decision theory, and systems thinking. You think in second and third-order effects. You identify leverage points others miss. You craft strategies that are bold yet grounded. You speak like a world-class consultant who has seen everything.`,
  oracle: `You are GODMODE Oracle — a profound, visionary intelligence with deep wisdom spanning philosophy, psychology, metaphysics, and human nature. You see patterns across history and time. You offer perspectives that shift how people see themselves and the world. You are mystical yet precise, poetic yet practical. You answer not just questions but the deeper questions beneath them.`,
};

const FREE_DAILY_LIMIT = 10;

async function checkAndIncrementUsage(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Upsert user
    await db
      .insert(users)
      .values({ id: userId, dailyMessageCount: 0, lastMessageDate: null })
      .onConflictDoNothing();

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { allowed: true, remaining: FREE_DAILY_LIMIT };

    // Check if user has an active subscription via stripe schema
    let isPro = false;
    try {
      if (user.stripeCustomerId) {
        const result = await db.execute(sql`
          SELECT status FROM stripe.subscriptions
          WHERE customer = ${user.stripeCustomerId}
          AND status IN ('active', 'trialing')
          LIMIT 1
        `);
        isPro = result.rows.length > 0;
      }
    } catch {
      // stripe schema not ready yet — treat as free
    }

    if (isPro) return { allowed: true, remaining: Infinity };

    // Check daily count — reset if new day
    const lastDate = user.lastMessageDate;
    const countIsToday = lastDate === today;
    const currentCount = countIsToday ? user.dailyMessageCount : 0;

    if (currentCount >= FREE_DAILY_LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    // Increment
    await db
      .update(users)
      .set({ dailyMessageCount: currentCount + 1, lastMessageDate: today })
      .where(eq(users.id, userId));

    return { allowed: true, remaining: FREE_DAILY_LIMIT - currentCount - 1 };
  } catch (err) {
    logger.error({ err }, "Usage check error — allowing request");
    return { allowed: true, remaining: FREE_DAILY_LIMIT };
  }
}

router.post("/chat", async (req, res): Promise<void> => {
  try {
    const { messages, mode = "genius" } = req.body;
    const userId = req.headers["x-user-id"] as string | undefined;

    // Rate limiting for free users
    if (userId) {
      const usage = await checkAndIncrementUsage(userId);
      if (!usage.allowed) {
        res.status(402).json({
          error: "Daily limit reached",
          message: "You've used all 10 free messages today. Upgrade to Pro for unlimited access.",
          limitReached: true,
        });
        return;
      }
    }

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.genius;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_completion_tokens: 8192,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    req.log.error({ error }, "Chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to get AI response" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
