// Vision API for image recognition

interface VisionMessage {
  role: string;
  content: Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

// 通义千问 VL API - 推荐，便宜且快
export async function recognizeImageWithQwen(imageBase64: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen-vl-plus",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
              {
                type: "text",
                text: "请详细描述这张图片的内容，包括主要物体、场景、文字等细节。",
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Qwen VL API error:", response.status, errorText);
      return `图片识别失败 (${response.status}): ${errorText}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "无法识别图片内容";
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    console.error("Vision API error:", errorMsg);
    return `图片识别出错: ${errorMsg}`;
  }
}

// 豆包 Vision API - 备选方案
export async function recognizeImageWithDoubao(imageBase64: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "doubao-vision",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
              {
                type: "text",
                text: "请详细描述这张图片的内容。",
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Doubao Vision API error:", response.status, errorText);
      return `图片识别失败 (${response.status}): ${errorText}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "无法识别图片内容";
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    console.error("Vision API error:", errorMsg);
    return `图片识别出错: ${errorMsg}`;
  }
}

// Convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/xxx;base64, prefix if needed
      const base64 = result.split(",")[1];
      resolve(result); // Keep the full data URL
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Resize image to reduce size (max 1MB)
export async function resizeImage(file: File, maxSizeKB: number = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions (max 1280px)
      const maxDimension = 1280;
      if (width > height) {
        if (width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法获取 canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try JPEG with decreasing quality until size is acceptable
      let quality = 0.9;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      while (dataUrl.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
