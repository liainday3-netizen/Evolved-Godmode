import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, bigint, timestamp, date, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  mode: text("mode").notNull().default("genius"),
  lastMessage: text("last_message").notNull().default(""),
  messageCount: integer("message_count").notNull().default(0),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations);
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ConversationRow = typeof conversations.$inferSelect;

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageRow = typeof messages.$inferSelect;
