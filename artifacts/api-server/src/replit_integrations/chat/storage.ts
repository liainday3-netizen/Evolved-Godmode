// @ts-ignore — conversations and messages tables are stubs from the original project;
// they don't exist in lib/db/src/schema/schema.ts (which only has users).
// This file is ported verbatim from .migration-backup/server/replit_integrations/chat/storage.ts.
import { db } from "@workspace/db";
// @ts-ignore
import { conversations, messages } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<any>;
  getAllConversations(): Promise<any[]>;
  createConversation(title: string): Promise<any>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<any[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<any>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    // @ts-ignore
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    // @ts-ignore
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  },

  async createConversation(title: string) {
    // @ts-ignore
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    // @ts-ignore
    await db.delete(messages).where(eq(messages.conversationId, id));
    // @ts-ignore
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    // @ts-ignore
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    // @ts-ignore
    const [message] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return message;
  },
};
