// Edge Runtime for low latency
export const runtime = "edge";

import { searchWeb, searchImages, fetchWebPage, detectToolNeeds } from "../../lib/tools";
import { recognizeImageWithQwen, resizeImage } from "../../lib/vision";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  image?: string;
}

export async function POST(request: Request) {
  try {
    const { messages, image }: RequestBody = await request.json();

    // Get environment variables
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const searchApiKey = process.env.TAVILY_API_KEY || "";
    const imageApiKey = process.env.UNSPLASH_ACCESS_KEY || "";
    const visionApiKey = process.env.QWEN_API_KEY || "";

    const basePrompt = process.env.DEEPSEEK_SYSTEM_PROMPT ||
      "You are a helpful AI assistant.";

    // Get last user message to detect tool needs
    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
    const { needsSearch, needsImages, needsWebFetch, searchQuery, webUrl } = detectToolNeeds(lastUserMessage);

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
    if (needsWebFetch && webUrl) {
      const webContent = await fetchWebPage(webUrl);
      toolContext += `\n\n${webContent}`;
    }

    // Handle image recognition
    let visionContext = "";
    if (image && visionApiKey) {
      try {
        // Resize image to reduce size
        // Note: In Edge Runtime, we can't use canvas, so we send the image as-is
        // For production, you might want to resize on the client side
        const imageDescription = await recognizeImageWithQwen(image, visionApiKey);
        visionContext = `\n\n[用户发送了一张图片]\n图片内容识别: ${imageDescription}\n`;
      } catch (error) {
        console.error("Vision API error:", error);
        visionContext = "\n\n[用户发送了一张图片，但识别失败]\n";
      }
    } else if (image && !visionApiKey) {
      visionContext = "\n\n[用户发送了一张图片，但图片识别功能未配置]\n";
    }

    // Enhanced system prompt
    let systemPrompt = basePrompt;
    if (toolContext) {
      systemPrompt += `\n\n你刚刚调用了搜索工具，获得了以下信息：${toolContext}\n\n请将搜索结果整理后用友好的方式展示给用户。`;
    }
    if (visionContext) {
      systemPrompt += visionContext + "请根据图片内容回答用户的问题。";
    }

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
