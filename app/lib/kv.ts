// KV storage helpers for chat history
import { kv } from "@vercel/kv";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

// Generate a unique chat ID
export function generateChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Get all chat sessions for a user
export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  const sessions = await kv.get(`sessions:${userId}`) as ChatSession[] | null;
  return sessions || [];
}

// Save a chat session
export async function saveChatSession(
  userId: string,
  sessionId: string,
  title: string
): Promise<void> {
  const sessions = await getChatSessions(userId);
  const now = Date.now();

  // Check if session exists
  const existingIndex = sessions.findIndex(s => s.id === sessionId);

  if (existingIndex >= 0) {
    // Update existing session
    sessions[existingIndex].updatedAt = now;
    if (title) sessions[existingIndex].title = title;
  } else {
    // Add new session
    sessions.unshift({
      id: sessionId,
      title: title || "新对话",
      createdAt: now,
      updatedAt: now,
    });
  }

  // Keep only last 50 sessions
  const trimmedSessions = sessions.slice(0, 50);
  await kv.set(`sessions:${userId}`, trimmedSessions);
}

// Get messages for a chat session
export async function getChatMessages(
  userId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const messages = await kv.get(`messages:${userId}:${sessionId}`) as ChatMessage[] | null;
  return messages || [];
}

// Save messages for a chat session
export async function saveChatMessages(
  userId: string,
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  await kv.set(`messages:${userId}:${sessionId}`, messages);
}

// Delete a chat session
export async function deleteChatSession(
  userId: string,
  sessionId: string
): Promise<void> {
  const sessions = await getChatSessions(userId);
  const filteredSessions = sessions.filter(s => s.id !== sessionId);
  await kv.set(`sessions:${userId}`, filteredSessions);
  await kv.del(`messages:${userId}:${sessionId}`);
}
