// Edge Runtime for low latency
export const runtime = "edge";

import { executeTools } from "@/lib/tools";

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

    // Enhanced system prompt with tool usage instructions
    const toolInstructions = searchApiKey || imageApiKey ? `

【工具使用能力】
你可以使用以下工具来获取信息：

1. 网络搜索：使用格式 [搜索:关键词] 来搜索网络信息
   示例：[搜索:2024年遥感技术最新进展]

2. 图片搜索：使用格式 [图片:关键词] 来搜索相关图片
   示例：[图片:卫星图像 北京]

当你需要获取最新信息或图片时，请在回答中嵌入这些工具调用格式。` : "";

    const systemPrompt = basePrompt + toolInstructions;

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
    let assistantMessage = data.choices[0]?.message?.content || "";

    // Execute tool calls if present
    const { processedContent, toolResults } = await executeTools(
      assistantMessage,
      searchApiKey,
      imageApiKey
    );

    // If tools were executed, do a follow-up call to incorporate results
    if (toolResults.length > 0) {
      const followUpMessages: Message[] = [
        { role: "system", content: systemPrompt },
        ...messages,
        { role: "assistant", content: processedContent },
        { role: "user", content: `请基于以上工具搜索结果，给用户一个完整的回答。` },
      ];

      const followUpResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: followUpMessages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: false,
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        assistantMessage = followUpData.choices[0]?.message?.content || assistantMessage;
      } else {
        // If follow-up fails, return the processed content with tool results
        assistantMessage = processedContent;
      }
    }

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
