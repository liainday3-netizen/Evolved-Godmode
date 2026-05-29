import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp, date, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  dailyMessageCount: integer("daily_message_count").default(0).notNull(),
  lastMessageDate: date("last_message_date"),
  createdAt: timestamp("created_at").default(sql`NOW()`).notNull(),
});

export const communityPosts = pgTable("community_posts", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  mode: text("mode").notNull(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  upvoteCount: integer("upvote_count").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`NOW()`).notNull(),
});

export const postUpvotes = pgTable("post_upvotes", {
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.userId] }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = typeof communityPosts.$inferInsert;
