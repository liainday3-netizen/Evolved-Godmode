import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { communityPosts, postUpvotes, users } from "@workspace/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const MODES = ["genius", "coder", "strategist", "oracle"] as const;

const shareSchema = z.object({
  mode: z.enum(MODES),
  prompt: z.string().trim().min(1).max(500),
  response: z.string().trim().min(1).max(2_000),
}).strict();

function getSessionUser(req: Parameters<Parameters<typeof router.get>[1]>[0]): string | null {
  return req.session?.clientId || null;
}

async function ensureUser(userId: string): Promise<void> {
  await db.insert(users).values({ id: userId }).onConflictDoNothing();
}

// GET /api/community — paginated public feed with server-derived ownership.
router.get("/community", async (req, res): Promise<void> => {
  const ownerId = getSessionUser(req);
  if (!ownerId) {
    res.status(401).json({ error: "A valid session is required." });
    return;
  }

  const rawLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  const rawOffset = req.query.offset === undefined ? 0 : Number(req.query.offset);
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 50 ||
      !Number.isInteger(rawOffset) || rawOffset < 0 || rawOffset > 1_000_000) {
    res.status(400).json({ error: "Invalid pagination parameters." });
    return;
  }

  try {
    const posts = await db.select().from(communityPosts)
      .orderBy(desc(communityPosts.upvoteCount), desc(communityPosts.createdAt))
      .limit(rawLimit)
      .offset(rawOffset);

    const voted = posts.length > 0
      ? await db.select({ postId: postUpvotes.postId }).from(postUpvotes)
          .where(and(
            eq(postUpvotes.userId, ownerId),
            inArray(postUpvotes.postId, posts.map((post) => post.id)),
          ))
      : [];
    const votedIds = new Set(voted.map((vote) => vote.postId));

    res.json({
      data: posts.map((post) => ({
        ...post,
        isOwn: post.userId === ownerId,
        hasUpvoted: votedIds.has(post.id),
      })),
    });
  } catch (error) {
    logger.error({ error }, "Community feed error");
    res.status(500).json({ error: "Failed to fetch community posts" });
  }
});

// POST /api/community — share a conversation under the active server session.
router.post("/community", async (req, res): Promise<void> => {
  const ownerId = getSessionUser(req);
  if (!ownerId) {
    res.status(401).json({ error: "A valid session is required." });
    return;
  }

  const parsed = shareSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid post data." });
    return;
  }

  try {
    await ensureUser(ownerId);
    const [post] = await db.insert(communityPosts).values({
      id: randomUUID(),
      userId: ownerId,
      mode: parsed.data.mode,
      prompt: parsed.data.prompt,
      response: parsed.data.response,
    }).returning();

    res.status(201).json({ data: { ...post, isOwn: true } });
  } catch (error) {
    logger.error({ error }, "Share post error");
    res.status(500).json({ error: "Failed to share post" });
  }
});

// POST /api/community/:id/upvote — atomically toggle the session user's vote.
router.post("/community/:id/upvote", async (req, res): Promise<void> => {
  const ownerId = getSessionUser(req);
  if (!ownerId) {
    res.status(401).json({ error: "A valid session is required." });
    return;
  }

  try {
    await ensureUser(ownerId);
    const { id } = req.params;

    const result = await db.transaction(async (tx) => {
      const [post] = await tx.select({ id: communityPosts.id })
        .from(communityPosts).where(eq(communityPosts.id, id));
      if (!post) return null;

      const removed = await tx.delete(postUpvotes)
        .where(and(eq(postUpvotes.postId, id), eq(postUpvotes.userId, ownerId)))
        .returning({ postId: postUpvotes.postId });

      if (removed.length > 0) {
        await tx.update(communityPosts)
          .set({ upvoteCount: sql`GREATEST(${communityPosts.upvoteCount} - 1, 0)` })
          .where(eq(communityPosts.id, id));
        return { upvoted: false };
      }

      const inserted = await tx.insert(postUpvotes)
        .values({ postId: id, userId: ownerId })
        .onConflictDoNothing()
        .returning({ postId: postUpvotes.postId });

      if (inserted.length > 0) {
        await tx.update(communityPosts)
          .set({ upvoteCount: sql`${communityPosts.upvoteCount} + 1` })
          .where(eq(communityPosts.id, id));
      }
      return { upvoted: inserted.length > 0 };
    });

    if (!result) {
      res.status(404).json({ error: "Post not found." });
      return;
    }
    res.json(result);
  } catch (error) {
    logger.error({ error }, "Upvote error");
    res.status(500).json({ error: "Failed to update vote" });
  }
});

// DELETE /api/community/:id — only the session owner can delete a post.
router.delete("/community/:id", async (req, res): Promise<void> => {
  const ownerId = getSessionUser(req);
  if (!ownerId) {
    res.status(401).json({ error: "A valid session is required." });
    return;
  }

  try {
    const { id } = req.params;
    const result = await db.transaction(async (tx) => {
      const [post] = await tx.select({ userId: communityPosts.userId })
        .from(communityPosts).where(eq(communityPosts.id, id));
      if (!post) return "missing" as const;
      if (post.userId !== ownerId) return "forbidden" as const;

      await tx.delete(postUpvotes).where(eq(postUpvotes.postId, id));
      await tx.delete(communityPosts).where(
        and(eq(communityPosts.id, id), eq(communityPosts.userId, ownerId)),
      );
      return "deleted" as const;
    });

    if (result === "missing") {
      res.status(404).json({ error: "Post not found." });
      return;
    }
    if (result === "forbidden") {
      res.status(403).json({ error: "You can only delete your own posts." });
      return;
    }
    res.json({ deleted: true });
  } catch (error) {
    logger.error({ error }, "Delete post error");
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;
