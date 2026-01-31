import { NextRequest, NextResponse } from "next/server";
import { getChatMessages, saveChatMessages } from "../../../lib/kv";

export const runtime = "edge";

// GET /api/chats/[sessionId] - Get messages for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const messages = await getChatMessages(userId, sessionId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error getting messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/chats/[sessionId] - Save messages for a session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
    }

    const { sessionId } = await params;
    await saveChatMessages(userId, sessionId, messages);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return "default_user";
}
