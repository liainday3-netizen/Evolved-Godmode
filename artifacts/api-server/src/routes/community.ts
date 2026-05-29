import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { communityPosts, postUpvotes, users } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// Ensure user exists (upsert anonymous user)
async function ensureUser(userId: string) {
  const [existing] = await db.select().from(users).where(eq(users.id, userId));
  if (!existing) {
    await db.insert(users).values({ id: userId }).onConflictDoNothing();
  }
}

// GET /api/community — paginated feed ordered by upvotes then recency
router.get("/community", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;

    const posts = await db
      .select()
      .from(communityPosts)
      .orderBy(desc(communityPosts.upvoteCount), desc(communityPosts.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: posts });
  } catch (err) {
    logger.error({ err }, "Community feed error");
    res.status(500).json({ error: "Failed to fetch community posts" });
  }
});

// POST /api/community — share a conversation
router.post("/community", async (req, res) => {
  try {
    const { userId, mode, prompt, response } = req.body as {
      userId: string;
      mode: string;
      prompt: string;
      response: string;
    };

    if (!userId || !mode || !prompt || !response) {
      res.status(400).json({ error: "userId, mode, prompt, and response are required" });
      return;
    }

    await ensureUser(userId);

    const id = randomUUID();
    const [post] = await db.insert(communityPosts).values({
      id,
      userId,
      mode,
      prompt: prompt.slice(0, 500),
      response: response.slice(0, 2000),
    }).returning();

    res.status(201).json({ data: post });
  } catch (err) {
    logger.error({ err }, "Share post error");
    res.status(500).json({ error: "Failed to share post" });
  }
});

// POST /api/community/:id/upvote — toggle upvote
router.post("/community/:id/upvote", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body as { userId: string };

    if (!userId) { res.status(400).json({ error: "userId required" }); return; }

    await ensureUser(userId);

    // Check if already upvoted
    const [existing] = await db
      .select()
      .from(postUpvotes)
      .where(sql`${postUpvotes.postId} = ${id} AND ${postUpvotes.userId} = ${userId}`);

    if (existing) {
      // Remove upvote
      await db.delete(postUpvotes).where(
        sql`${postUpvotes.postId} = ${id} AND ${postUpvotes.userId} = ${userId}`
      );
      await db.update(communityPosts)
        .set({ upvoteCount: sql`GREATEST(${communityPosts.upvoteCount} - 1, 0)` })
        .where(eq(communityPosts.id, id));
      res.json({ upvoted: false });
    } else {
      // Add upvote
      await db.insert(postUpvotes).values({ postId: id, userId });
      await db.update(communityPosts)
        .set({ upvoteCount: sql`${communityPosts.upvoteCount} + 1` })
        .where(eq(communityPosts.id, id));
      res.json({ upvoted: true });
    }
  } catch (err) {
    logger.error({ err }, "Upvote error");
    res.status(500).json({ error: "Failed to upvote" });
  }
});

// DELETE /api/community/:id — delete own post
router.delete("/community/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body as { userId: string };

    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, id));
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    if (post.userId !== userId) { res.status(403).json({ error: "Not your post" }); return; }

    await db.delete(postUpvotes).where(eq(postUpvotes.postId, id));
    await db.delete(communityPosts).where(eq(communityPosts.id, id));
    res.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "Delete post error");
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;
