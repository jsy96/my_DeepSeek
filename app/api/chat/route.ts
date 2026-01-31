// Edge Runtime for low latency
export const runtime = "edge";

import { searchWeb, searchImages, detectToolNeeds } from "../../lib/tools";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(request: Request) {
  try {
    const { messages }: RequestBody = await request.json();

    // Get environment variables
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const searchApiKey = process.env.TAVILY_API_KEY || "";
    const imageApiKey = process.env.UNSPLASH_ACCESS_KEY || "";

    const basePrompt = process.env.DEEPSEEK_SYSTEM_PROMPT ||
      "You are a helpful AI assistant.";

    // Get last user message to detect tool needs
    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
    const { needsSearch, needsImages, searchQuery } = detectToolNeeds(lastUserMessage);

    // Execute tools if needed
    let toolContext = "";
    if (needsSearch && searchApiKey && searchQuery) {
      const searchResult = await searchWeb(searchQuery, searchApiKey);
      toolContext += `\n\n[网络搜索结果]\n${searchResult}`;
    }
    if (needsImages && imageApiKey && searchQuery) {
      const imageResult = await searchImages(searchQuery, imageApiKey);
      toolContext += `\n\n[图片搜索结果]\n${imageResult}`;
    }

    // Enhanced system prompt
    const systemPrompt = basePrompt +
      (toolContext ? `\n\n你刚刚调用了搜索工具，获得了以下信息，请基于这些信息回答用户：${toolContext}\n\n请将搜索结果整理后用友好的方式展示给用户。` : "");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build messages array with system prompt
    const apiMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Call DeepSeek API
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(
        JSON.stringify({ error: `DeepSeek API error: ${error}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
