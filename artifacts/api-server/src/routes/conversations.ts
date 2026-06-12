import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, desc, asc, and } from "drizzle-orm";

const router: IRouter = Router();

function getOwner(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  const headerUserId = req.headers["x-user-id"];
  if (typeof headerUserId === "string" && headerUserId.trim()) {
    return headerUserId.trim();
  }
  return req.session.clientId as string;
}

router.get("/conversations", async (req, res): Promise<void> => {
  try {
    const ownerId = getOwner(req);
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.ownerId, ownerId))
      .orderBy(desc(conversations.timestamp));

    res.json(
      rows.map((c) => ({
        id: c.id,
        title: c.title,
        lastMessage: c.lastMessage,
        mode: c.mode,
        timestamp: Number(c.timestamp),
        messageCount: c.messageCount,
      }))
    );
  } catch (error) {
    req.log.error({ error }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.get("/conversations/:id", async (req, res): Promise<void> => {
  try {
    const ownerId = getOwner(req);
    const { id } = req.params;

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerId, ownerId)));

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const msgs = await db
      .select()
      .from(messages)
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
  try {
    const ownerId = getOwner(req);
    const body = req.body as {
      id?: string;
      title?: string;
      lastMessage?: string;
      mode?: string;
      timestamp?: number;
      messageCount?: number;
      messages?: { role: string; content: string }[];
    };

    const id = body.id ?? crypto.randomUUID();
    const title = body.title ?? "Session";
    const mode = body.mode ?? "genius";
    const lastMessage = body.lastMessage ?? "";
    const timestamp = body.timestamp ?? Date.now();
    const messageCount = body.messageCount ?? 0;
    const msgs = body.messages ?? [];

    const result = await upsertConv(ownerId, id, { title, mode, lastMessage, timestamp, messageCount, msgs });
    res.status(201).json(result);
  } catch (error) {
    req.log.error({ error }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.put("/conversations/:id", async (req, res): Promise<void> => {
  try {
    const ownerId = getOwner(req);
    const { id } = req.params;
    const body = req.body as {
      title?: string;
      lastMessage?: string;
      mode?: string;
      timestamp?: number;
      messageCount?: number;
      messages?: { role: string; content: string }[];
    };

    const title = body.title ?? "Session";
    const mode = body.mode ?? "genius";
    const lastMessage = body.lastMessage ?? "";
    const timestamp = body.timestamp ?? Date.now();
    const messageCount = body.messageCount ?? 0;
    const msgs = body.messages ?? [];

    const result = await upsertConv(ownerId, id, { title, mode, lastMessage, timestamp, messageCount, msgs });
    res.json(result);
  } catch (error) {
    req.log.error({ error }, "Failed to upsert conversation");
    res.status(500).json({ error: "Failed to upsert conversation" });
  }
});

router.delete("/conversations/:id", async (req, res): Promise<void> => {
  try {
    const ownerId = getOwner(req);
    const { id } = req.params;
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerId, ownerId)));
    res.status(204).end();
  } catch (error) {
    req.log.error({ error }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

async function upsertConv(
  ownerId: string,
  id: string,
  data: {
    title: string;
    mode: string;
    lastMessage: string;
    timestamp: number;
    messageCount: number;
    msgs: { role: string; content: string }[];
  }
) {
  const { title, mode, lastMessage, timestamp, messageCount, msgs } = data;
  return db.transaction(async (tx) => {
    await tx
      .insert(conversations)
      .values({ id, ownerId, title, mode, lastMessage, messageCount, timestamp })
      .onConflictDoUpdate({
        target: conversations.id,
        set: { title, mode, lastMessage, messageCount, timestamp },
        setWhere: eq(conversations.ownerId, ownerId),
      });

    const [conv] = await tx
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerId, ownerId)));

    if (!conv) {
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    }

    await tx.delete(messages).where(eq(messages.conversationId, id));

    if (msgs.length > 0) {
      await tx.insert(messages).values(
        msgs.map((m, idx) => ({
          conversationId: id,
          role: m.role,
          content: m.content,
          position: idx,
        }))
      );
    }

    const savedMsgs = await tx
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.position));

    return {
      id: conv.id,
      title: conv.title,
      lastMessage: conv.lastMessage,
      mode: conv.mode,
      timestamp: Number(conv.timestamp),
      messageCount: conv.messageCount,
      messages: savedMsgs.map((m) => ({ role: m.role, content: m.content })),
    };
  });
}

export default router;
