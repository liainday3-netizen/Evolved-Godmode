import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const STYLE_ENHANCERS: Record<string, string> = {
  token: "crypto token logo, coin art, centered emblem, metallic sheen, vibrant colors, clean edges, transparent-ready, ultra-detailed, professional mint-quality, DeFi aesthetic",
  brand: "professional brand logo, clean vector-style, minimal, bold, memorable, scalable, dark background, premium quality, modern design studio",
  neon: "neon glow art, cyberpunk aesthetic, dark background, electric light trails, vibrant neon colors, cinematic lighting, ultra high detail, 8K",
  cinematic: "cinematic poster art, dramatic lighting, epic scale, photorealistic, 8K resolution, movie-quality composition, depth of field, volumetric light",
  sacred: "sacred geometry, mystical mandala, golden ratio, intricate patterns, glowing lines, cosmic background, ultra-detailed, spiritual art",
  abstract: "abstract digital art, generative art, bold geometric forms, vibrant palette, studio lighting, award-winning, trending on ArtStation",
  portrait: "portrait photography, dramatic studio lighting, shallow depth of field, ultra sharp, photorealistic, professional retouching, cinematic color grade",
  icon: "app icon design, flat design, bold colors, crisp edges, high contrast, pixel-perfect, professional UI asset, 1024x1024",
};

const BASE_QUALITY = "masterpiece, best quality, ultra-detailed, sharp focus, professional";
const FREE_DAILY_IMAGE_LIMIT = 2;

async function checkIsPro(userId: string): Promise<boolean> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.stripeCustomerId) return false;
    const stripe = await getUncachableStripeClient();
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
      limit: 1,
    });
    if (subs.data.length > 0) return true;
    const trialing = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "trialing",
      limit: 1,
    });
    return trialing.data.length > 0;
  } catch {
    return false;
  }
}

async function checkAndIncrementImageUsage(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split("T")[0];

  await db.insert(users).values({ id: userId, dailyImageCount: 0, lastImageDate: null }).onConflictDoNothing();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { allowed: true, remaining: FREE_DAILY_IMAGE_LIMIT };

  const isNewDay = !user.lastImageDate || user.lastImageDate !== today;
  const currentCount = isNewDay ? 0 : (user.dailyImageCount ?? 0);

  if (currentCount >= FREE_DAILY_IMAGE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  await db.update(users).set({
    dailyImageCount: currentCount + 1,
    lastImageDate: today,
  }).where(eq(users.id, userId));

  return { allowed: true, remaining: FREE_DAILY_IMAGE_LIMIT - currentCount - 1 };
}

router.post("/studio/generate", async (req, res) => {
  try {
    const { prompt, style = "brand", size = "1024x1024", userId } = req.body as {
      prompt: string;
      style?: string;
      size?: string;
      userId?: string;
    };

    if (!prompt || prompt.trim().length < 2) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    // Rate limit free users
    if (userId) {
      const isPro = await checkIsPro(userId);
      if (!isPro) {
        const { allowed, remaining } = await checkAndIncrementImageUsage(userId);
        if (!allowed) {
          res.status(402).json({
            error: `Free plan limit reached — 2 images per day. Upgrade to Pro for unlimited generations.`,
            limitReached: true,
            remaining: 0,
          });
          return;
        }
        res.setHeader("X-Images-Remaining", String(remaining));
      }
    }

    const styleEnhancer = STYLE_ENHANCERS[style] ?? STYLE_ENHANCERS.brand;
    const fullPrompt = `${prompt.trim()}, ${styleEnhancer}, ${BASE_QUALITY}`;

    const validSizes = ["1024x1024", "1792x1024", "1024x1792"] as const;
    const imageSize = validSizes.includes(size as any)
      ? (size as "1024x1024" | "1792x1024" | "1024x1792")
      : "1024x1024";

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      n: 1,
      size: imageSize,
    });

    const imageData = response.data?.[0];
    res.json({
      b64_json: imageData?.b64_json ?? null,
      url: imageData?.url ?? null,
      enhancedPrompt: fullPrompt,
    });
  } catch (err: any) {
    logger.error({ err }, "Studio image generation failed");
    res.status(500).json({ error: err.message ?? "Image generation failed" });
  }
});

export default router;
