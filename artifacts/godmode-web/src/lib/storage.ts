import type { GodMode } from "./colors";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  mode: GodMode;
  timestamp: number;
  messageCount: number;
  messages: Message[];
}

const STORAGE_KEY = "godmode_conversations";

export function loadConversations(): Conversation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data) as Conversation[];
  } catch {}
  return [];
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {}
}

export function loadConversation(id: string): Conversation | null {
  const all = loadConversations();
  return all.find((c) => c.id === id) ?? null;
}

export function upsertConversation(conv: Conversation): void {
  const all = loadConversations();
  const idx = all.findIndex((c) => c.id === conv.id);
  if (idx >= 0) {
    all[idx] = conv;
  } else {
    all.unshift(conv);
  }
  saveConversations(all);
}

export function deleteConversation(id: string): void {
  const all = loadConversations().filter((c) => c.id !== id);
  saveConversations(all);
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
