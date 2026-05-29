import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

router.post("/codegen", async (req, res): Promise<void> => {
  try {
    const { prompt, language = "typescript" } = req.body as { prompt: string; language?: string };

    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const systemPrompt = `You are GODMODE Coder — a transcendent software engineering intelligence. Generate clean, production-ready ${language} code based on the user's prompt. 

Rules:
- Output ONLY the code, wrapped in a single \`\`\`${language} code block
- No explanations before the code block
- Add concise inline comments for non-obvious logic
- Include all necessary imports
- Write complete, runnable code — never use placeholders or TODOs
- Optimize for clarity, correctness, and best practices`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
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
    req.log.error({ error }, "Codegen error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate code" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
