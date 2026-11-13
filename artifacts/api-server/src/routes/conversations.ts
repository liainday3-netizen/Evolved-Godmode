import { randomUUID } from "crypto";
import { Router, type IRouter, type Response } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, desc, asc, and } from "drizzle-orm";

const router: IRouter = Router();

const conversationSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  title: z.string().trim().min(1).max(120).default("Session"),
  lastMessage: z.string().max(2_000).default(""),
  mode: z.enum(["genius", "coder", "strategist", "oracle"]).default("genius"),
  timestamp: z.number().int().positive().default(() => Date.now()),
  messageCount: z.number().int().min(0).max(500).default(0),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(20_000),
  }).strict()).max(100).default([]),
}).strict();

type ConversationPayload = z.infer<typeof conversationSchema>;

function getOwner(req: Parameters<Parameters<typeof router.get>[1]>[0]): string | null {
  return req.session?.clientId || null;
}

function rejectMissingOwner(res: Response): void {
  res.status(401).json({ error: "A valid session is required." });
}

router.get("/conversations", async (req, res): Promise<void> => {
  try {
    const ownerId = getOwner(req);
    if (!ownerId) { rejectMissingOwner(res); return; }

    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.ownerId, ownerId))
      .orderBy(desc(conversations.timestamp));

    res.json(rows.map((c) => ({
      id: c.id,
      title: c.title,
      lastMessage: c.lastMessage,
      mode: c.mode,
      timestamp: Number(c.timestamp),
      messageCount: c.messageCount,
    })));
  } catch (error) {
    req.log.error({ error }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.get("/conversations/:id", async (req, res): Promise<void> => {
  try {
    const ownerId = getOwner(req);
    if (!ownerId) { rejectMissingOwner(res); return; }
    const { id } = req.params;

    const [conv] = await db.select().from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerId, ownerId)));

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.position));

    res.json({
      id: conv.id,
      title: conv.title,
      lastMessage: conv.lastMessage,
      mode: conv.mode,
      timestamp: Number(conv.timestamp),
      messageCount: conv.messageCount,
      messages: msgs.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (error) {
    req.log.error({ error }, "Failed to get conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.post("/conversations", async (req, res): Promise<void> => {
  const ownerId = getOwner(req);
  if (!ownerId) { rejectMissingOwner(res); return; }

  const parsed = conversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid conversation data.",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const body: ConversationPayload = parsed.data;
    const id = body.id ?? randomUUID();
    const result = await upsertConv(ownerId, id, body);
    res.status(201).json(result);
  } catch (error) {
    req.log.error({ error }, "Failed to create conversation");
    const status = (error as { status?: number })?.status;
    res.status(status === 403 ? 403 : 500).json({
      error: status === 403 ? "Conversation access denied." : "Failed to create conversation",
    });
  }
});

router.put("/conversations/:id", async (req, res): Promise<void> => {
  const ownerId = getOwner(req);
  if (!ownerId) { rejectMissingOwner(res); return; }

  const parsed = conversationSchema.omit({ id: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid conversation data.",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const result = await upsertConv(ownerId, req.params.id, parsed.data);
    res.json(result);
  } catch (error) {
    req.log.error({ error }, "Failed to upsert conversation");
    const status = (error as { status?: number })?.status;
    res.status(status === 403 ? 403 : 500).json({
      error: status === 403 ? "Conversation access denied." : "Failed to save conversation",
    });
  }
});

router.delete("/conversations/:id", async (req, res): Promise<void> => {
  try {
    const ownerId = getOwner(req);
    if (!ownerId) { rejectMissingOwner(res); return; }
    const { id } = req.params;

    await db.delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerId, ownerId)));
    res.status(204).end();
  } catch (error) {
    req.log.error({ error }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

async function upsertConv(ownerId: string, id: string, data: ConversationPayload) {
  const { title, mode, lastMessage, timestamp, messageCount, messages: msgs } = data;
  return db.transaction(async (tx) => {
    await tx.insert(conversations)
      .values({ id, ownerId, title, mode, lastMessage, messageCount, timestamp })
      .onConflictDoUpdate({
        target: conversations.id,
        set: { title, mode, lastMessage, messageCount, timestamp },
        setWhere: eq(conversations.ownerId, ownerId),
      });

    const [conv] = await tx.select().from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerId, ownerId)));

    if (!conv) {
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    }

    await tx.delete(messages).where(eq(messages.conversationId, id));
    if (msgs.length > 0) {
      await tx.insert(messages).values(msgs.map((message, position) => ({
        conversationId: id,
        role: message.role,
        content: message.content,
        position,
      })));
    }

    const savedMsgs = await tx.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.position));

    return {
      id: conv.id,
      title: conv.title,
      lastMessage: conv.lastMessage,
      mode: conv.mode,
      timestamp: Number(conv.timestamp),
      messageCount: conv.messageCount,
      messages: savedMsgs.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    };
  });
}

export default router;
