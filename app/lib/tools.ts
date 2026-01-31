// Search tools for AI agent

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface ImageResult {
  url: string;
  description: string;
  source: string;
}

// Tavily API for web search
export async function searchWeb(query: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        max_results: 5,
        include_images: false,
        include_answers: true,
      }),
    });

    if (!response.ok) {
      return `搜索失败: ${response.statusText}`;
    }

    const data = await response.json();

    let results = "📋 网络搜索结果:\n\n";

    // Add answer if available
    if (data.answer) {
      results += `💡 简要回答: ${data.answer}\n\n`;
    }

    // Add search results
    if (data.results && data.results.length > 0) {
      results += "🔍 相关链接:\n";
      data.results.forEach((result: SearchResult, i: number) => {
        results += `\n${i + 1}. ${result.title}\n`;
        results += `   ${result.snippet}\n`;
        results += `   🔗 ${result.url}\n`;
      });
    } else {
      results += "\n未找到相关结果。";
    }

    return results;
  } catch (error) {
    console.error("Search error:", error);
    return `搜索出错: ${error instanceof Error ? error.message : "未知错误"}`;
  }
}

// Unsplash API for image search
export async function searchImages(query: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6`,
      {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      return `图片搜索失败: ${response.statusText}`;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return `未找到关于"${query}"的图片。`;
    }

    let results = `🖼️ 图片搜索结果: "${query}"\n\n`;

    data.results.forEach((img: ImageResult, i: number) => {
      results += `${i + 1}. ${img.description || "无描述"}\n`;
      results += `   🔗 ${img.urls?.regular || img.url}\n`;
      results += `   📷 摄影师: ${img.user?.name || "未知"}\n\n`;
    });

    return results;
  } catch (error) {
    console.error("Image search error:", error);
    return `图片搜索出错: ${error instanceof Error ? error.message : "未知错误"}`;
  }
}

// Parse tool calls from AI response
export function parseToolCalls(content: string): Array<{ tool: string; args: string }> {
  const calls: Array<{ tool: string; args: string }> = [];

  // Match patterns like [搜索:xxx] or [图片:xxx]
  const searchRegex = /\[搜索:(.*?)\]/g;
  const imageRegex = /\[图片:(.*?)\]/g;

  let match;
  while ((match = searchRegex.exec(content)) !== null) {
    calls.push({ tool: "search", args: match[1].trim() });
  }

  while ((match = imageRegex.exec(content)) !== null) {
    calls.push({ tool: "image", args: match[1].trim() });
  }

  return calls;
}

// Execute tool calls and get formatted results
export async function executeTools(
  content: string,
  searchApiKey: string,
  imageApiKey: string
): Promise<{ processedContent: string; toolResults: string[] }> {
  const calls = parseToolCalls(content);
  const toolResults: string[] = [];

  if (calls.length === 0) {
    return { processedContent: content, toolResults: [] };
  }

  let processedContent = content;
  const results: Record<string, string> = {};

  // Execute all tool calls
  for (const call of calls) {
    let result = "";
    if (call.tool === "search" && searchApiKey) {
      result = await searchWeb(call.args, searchApiKey);
    } else if (call.tool === "image" && imageApiKey) {
      result = await searchImages(call.args, imageApiKey);
    }

    const placeholder = `[${call.tool === "search" ? "搜索" : "图片"}:${call.args}]`;
    results[placeholder] = result;
    toolResults.push(result);

    // Remove tool call from content
    processedContent = processedContent.replace(placeholder, "").trim();
  }

  // Append tool results to content
  if (toolResults.length > 0) {
    processedContent = processedContent + "\n\n" + toolResults.join("\n\n");
  }

  return { processedContent, toolResults };
}
