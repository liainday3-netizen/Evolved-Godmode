import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

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

router.post("/studio/generate", async (req, res) => {
  try {
    const { prompt, style = "brand", size = "1024x1024" } = req.body as {
      prompt: string;
      style?: string;
      size?: string;
    };

    if (!prompt || prompt.trim().length < 2) {
      res.status(400).json({ error: "Prompt is required" });
      return;
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
