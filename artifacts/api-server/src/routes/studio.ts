import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const STYLE_ENHANCERS = {
  token: "crypto token logo, coin art, centered emblem, metallic sheen, vibrant colors, clean edges, transparent-ready, ultra-detailed, professional mint-quality, DeFi aesthetic",
  brand: "professional brand logo, clean vector-style, minimal, bold, memorable, scalable, dark background, premium quality, modern design studio",
  neon: "neon glow art, cyberpunk aesthetic, dark background, electric light trails, vibrant neon colors, cinematic lighting, ultra high detail",
  cinematic: "cinematic poster art, dramatic lighting, epic scale, photorealistic, cinematic composition, depth of field, volumetric light",
  sacred: "sacred geometry, mystical mandala, golden ratio, intricate patterns, glowing lines, cosmic background, ultra-detailed, spiritual art",
  abstract: "abstract digital art, generative art, bold geometric forms, vibrant palette, studio lighting, detailed digital artwork",
  portrait: "portrait photography, dramatic studio lighting, shallow depth of field, ultra sharp, photorealistic, professional retouching, cinematic color grade",
  icon: "app icon design, flat design, bold colors, crisp edges, high contrast, professional UI asset, square composition",
} as const;

const BASE_QUALITY = "high quality, detailed, sharp focus, professional";
const FREE_DAILY_IMAGE_LIMIT = 2;
const VALID_SIZES = ["1024x1024", "1536x1024", "1024x1536"] as const;

const generateSchema = z.object({
  prompt: z.string().trim().min(2).max(4_000),
  style: z.enum(["token", "brand", "neon", "cinematic", "sacred", "abstract", "portrait", "icon"]).default("brand"),
  size: z.enum(VALID_SIZES).default("1024x1024"),
}).strict();

async function checkAndIncrementImageUsage(ownerId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10);

  await db.insert(users)
    .values({ id: ownerId, dailyImageCount: 0, lastImageDate: null })
    .onConflictDoNothing();

  const updated = await db.update(users)
    .set({
      dailyImageCount: sql`CASE
        WHEN ${users.lastImageDate} = ${today}::date
        THEN ${users.dailyImageCount} + 1
        ELSE 1
      END`,
      lastImageDate: today,
    })
    .where(and(
      eq(users.id, ownerId),
      sql`(
        ${users.lastImageDate} IS DISTINCT FROM ${today}::date
        OR ${users.dailyImageCount} < ${FREE_DAILY_IMAGE_LIMIT}
      )`,
    ))
    .returning({ dailyImageCount: users.dailyImageCount });

  if (updated.length === 0) return { allowed: false, remaining: 0 };
  return {
    allowed: true,
    remaining: Math.max(0, FREE_DAILY_IMAGE_LIMIT - updated[0].dailyImageCount),
  };
}

async function refundImageUsage(ownerId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.update(users)
    .set({ dailyImageCount: sql`GREATEST(${users.dailyImageCount} - 1, 0)` })
    .where(and(
      eq(users.id, ownerId),
      sql`${users.lastImageDate} = ${today}::date`,
      sql`${users.dailyImageCount} > 0`,
    ));
}

router.post("/studio/generate", async (req, res): Promise<void> => {
  const ownerId = req.session?.clientId;
  if (!ownerId) {
    res.status(401).json({ error: "A valid session is required." });
    return;
  }

  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid image request.",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  let remaining: number;
  try {
    const usage = await checkAndIncrementImageUsage(ownerId);
    if (!usage.allowed) {
      res.status(429).json({
        error: "Daily image limit reached. You can try again tomorrow.",
        limitReached: true,
        remaining: 0,
      });
      return;
    }
    remaining = usage.remaining;
  } catch (error) {
    logger.error({ error }, "Image quota check failed");
    res.status(503).json({ error: "Image generation is temporarily unavailable. Please try again shortly." });
    return;
  }

  const { prompt, style, size } = parsed.data;
  const fullPrompt = `${prompt}, ${STYLE_ENHANCERS[style]}, ${BASE_QUALITY}`;

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      n: 1,
      size,
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json && !imageData?.url) {
      await refundImageUsage(ownerId).catch((refundError) => logger.error({ refundError }, "Image quota refund failed"));
      res.status(502).json({ error: "The image service returned no image. Please try again." });
      return;
    }

    res.setHeader("X-Images-Remaining", String(remaining));
    res.json({
      b64_json: imageData.b64_json ?? null,
      url: imageData.url ?? null,
      enhancedPrompt: fullPrompt,
    });
  } catch (error) {
    logger.error({ error }, "Studio image generation failed");
    await refundImageUsage(ownerId).catch((refundError) => logger.error({ refundError }, "Image quota refund failed"));
    res.status(502).json({ error: "Image generation failed. Please try again shortly." });
  }
});

export default router;
