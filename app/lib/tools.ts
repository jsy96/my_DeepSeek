// Search tools for AI agent

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface UnsplashPhoto {
  id: string;
  description: string | null;
  urls: {
    regular: string;
    raw: string;
  };
  user: {
    name: string;
    username: string;
  };
}

interface UnsplashResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
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
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Tavily API error:", response.status, errorText);
      return `搜索失败: ${response.statusText} - ${errorText}`;
    }

    const data = await response.json();

    let results = "📋 网络搜索结果:\n\n";

    // Add answer if available
    if (data.answer) {
      results += `💡 ${data.answer}\n\n`;
    }

    // Add search results
    if (data.results && data.results.length > 0) {
      results += "🔗 相关链接:\n";
      data.results.forEach((result: SearchResult, i: number) => {
        results += `\n${i + 1}. ${result.title}\n`;
        results += `   ${result.snippet}\n`;
        results += `   ${result.url}\n`;
      });
    } else {
      results += "\n未找到相关结果。";
    }

    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    console.error("Search error:", errorMsg, error);
    return `搜索出错: ${errorMsg}`;
  }
}

// Unsplash API for image search
export async function searchImages(query: string, apiKey: string): Promise<string> {
  try {
    if (!apiKey) {
      return "图片搜索功能未配置 API Key";
    }

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&order_by=relevant`;

    console.log("Fetching Unsplash:", url);

    const response = await fetch(url, {
      headers: {
        "Authorization": `Client-ID ${apiKey}`,
        "Accept-Version": "v1",
      },
    });

    console.log("Unsplash response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Unsplash API error:", response.status, errorText);
      return `图片搜索失败 (${response.status}): ${errorText}`;
    }

    const data: UnsplashResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      return `未找到关于"${query}"的图片。`;
    }

    let results = `🖼️ 找到 ${data.total} 张关于 "${query}" 的图片:\n\n`;

    data.results.forEach((img, i) => {
      results += `${i + 1}. **${img.description || "无描述"}**\n`;
      results += `   🔗 ${img.urls.regular}\n`;
      results += `   📷 by ${img.user.name} (@${img.user.username})\n\n`;
    });

    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    console.error("Image search error:", errorMsg, error);
    return `图片搜索出错: ${errorMsg}`;
  }
}

// Detect if user message needs search or image search
export function detectToolNeeds(userMessage: string): { needsSearch: boolean; needsImages: boolean; searchQuery?: string } {
  const lowerMsg = userMessage.toLowerCase();

  // Image search keywords
  const imageKeywords = [
    "图片", "图像", "照片", "截图", "图", "照片", "image", "photo", "picture", "pic",
    "找点图", "给我看", "有没有图", "来张图", "看看", "展示"
  ];

  // Search keywords (need fresh info)
  const searchKeywords = [
    "搜索", "查一下", "找一下", "最新", "最近", "新闻", "现在", "当前",
    "2024", "2025", "search", "latest", "recent", "news", "现在是什么"
  ];

  const needsImages = imageKeywords.some(kw => lowerMsg.includes(kw));
  const needsSearch = searchKeywords.some(kw => lowerMsg.includes(kw)) ||
                      (lowerMsg.includes("搜") && !lowerMsg.includes("图片"));

  // Extract search query (remove the trigger words)
  let searchQuery = userMessage;
  imageKeywords.forEach(kw => {
    searchQuery = searchQuery.replace(new RegExp(kw, "gi"), "").trim();
  });
  searchKeywords.forEach(kw => {
    searchQuery = searchQuery.replace(new RegExp(kw, "gi"), "").trim();
  });

  // Clean up common prefixes
  searchQuery = searchQuery.replace(/^(帮我|给我|能否|可以|帮我搜|搜一下|搜索|查找)/, "").trim();

  return {
    needsSearch,
    needsImages,
    searchQuery: searchQuery || userMessage
  };
}
