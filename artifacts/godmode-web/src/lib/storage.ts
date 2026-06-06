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

const BASE = "/api";

async function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
  });
  return res;
}

export async function loadConversations(): Promise<Conversation[]> {
  const res = await apiRequest("/conversations");
  if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`);
  const data = (await res.json()) as Omit<Conversation, "messages">[];
  return data.map((c) => ({ ...c, messages: [] }));
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  const res = await apiRequest(`/conversations/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load conversation: ${res.status}`);
  return (await res.json()) as Conversation;
}

export async function upsertConversation(conv: Conversation): Promise<void> {
  const res = await apiRequest(`/conversations/${encodeURIComponent(conv.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(conv),
  });
  if (!res.ok) throw new Error(`Failed to save conversation: ${res.status}`);
}

export async function createConversation(conv: Conversation): Promise<void> {
  const res = await apiRequest("/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(conv),
  });
  if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await apiRequest(`/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete conversation: ${res.status}`);
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
