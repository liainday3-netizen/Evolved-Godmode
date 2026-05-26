import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Streaming chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, mode = "genius" } = req.body;

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
      console.error("Chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to get AI response" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
        res.end();
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
