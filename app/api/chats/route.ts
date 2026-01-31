import { NextRequest, NextResponse } from "next/server";
import { getChatSessions, saveChatSession, deleteChatSession } from "../../lib/kv";

export const runtime = "edge";

// GET /api/chats - Get all chat sessions
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await getChatSessions(userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error getting sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/chats - Create/update a chat session
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, title } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    await saveChatSession(userId, sessionId, title || "新对话");

    const sessions = await getChatSessions(userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error saving session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/chats - Delete a chat session
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    await deleteChatSession(userId, sessionId);

    const sessions = await getChatSessions(userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get user ID from request (simplified - uses IP address or random ID)
function getUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // For demo purposes, use a default user ID
  // In production, you'd use proper authentication
  return "default_user";
}
