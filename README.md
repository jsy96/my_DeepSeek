# My AI Website

一个简单的个人网页，接入 AI 对话功能，调用 DeepSeek API，支持网络搜索、图片查找和图片识别。

## 功能

- 与 AI 进行多轮对话
- Edge Runtime 部署，低延迟
- 可自定义 system prompt，配置 AI 人设和背景信息
- **MCP 工具能力**：网络搜索、图片搜索
- **图片识别**：发送图片让 AI 识别内容
- 美观的渐变 UI 设计
- Markdown 渲染支持

## MCP 工具能力

AI 可以使用以下工具获取信息：

| 工具 | 功能 | API 服务 |
|------|------|----------|
| 网络搜索 | 搜索最新网络信息 | Tavily API |
| 图片搜索 | 搜索高质量图片链接 | Unsplash API |
| 图片识别 | 识别用户上传的图片内容 | 通义千问 VL |

### 使用示例

**网络搜索 & 图片搜索：**
- "搜索2024年遥感技术的最新进展"
- "找一些卫星图像的图片"

**图片识别：**
- 点击图片按钮上传图片
- AI 会识别图片内容并回答相关问题

## 本地开发

1. 配置环境变量

编辑 `.env.local` 文件：

```env
# 必填 - DeepSeek API
DEEPSEEK_API_KEY=your_actual_api_key_here

# 必填 - AI 人设配置
DEEPSEEK_SYSTEM_PROMPT=你叫老金，是一位码农...

# 可选 - 网络搜索功能
TAVILY_API_KEY=your_tavily_api_key_here

# 可选 - 图片搜索功能
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here

# 可选 - 图片识别功能
QWEN_API_KEY=your_qwen_api_key_here
```

2. 安装依赖并启动

```bash
npm install
npm run dev
```

3. 打开浏览器访问 http://localhost:3000

## 获取 API 密钥

| API | 地址 | 免费额度 |
|-----|------|---------|
| DeepSeek | https://platform.deepseek.com/ | 按量付费 |
| Tavily (搜索) | https://tavily.com/ | 1000次/月 |
| Unsplash (图片) | https://unsplash.com/developers | 5000次/小时 |
| 通义千问 (识别) | https://dashscope.aliyuncs.com/ | 按量付费 |

## 部署到 Vercel

### 方法一：通过 Vercel CLI

```bash
npm install -g vercel
vercel
```

### 方法二：通过 GitHub 连接

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 在 Vercel 项目设置中添加环境变量：

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 是 |
| `DEEPSEEK_SYSTEM_PROMPT` | AI 人设配置 | 是 |
| `TAVILY_API_KEY` | 网络搜索功能 | 否 |
| `UNSPLASH_ACCESS_KEY` | 图片搜索功能 | 否 |
| `QWEN_API_KEY` | 图片识别功能 | 否 |

## 项目结构

```
.
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts     # Edge API Route
│   ├── lib/
│   │   ├── tools.ts         # 搜索工具函数
│   │   └── vision.ts        # 图片识别函数
│   ├── layout.tsx
│   ├── page.tsx             # 聊天界面
│   └── globals.css
├── .env.local               # 本地环境变量
├── package.json
└── tsconfig.json
```

## 技术栈

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Edge Runtime
- DeepSeek API (对话)
- Tavily API (网络搜索)
- Unsplash API (图片搜索)
- 通义千问 VL (图片识别)
- react-markdown (Markdown 渲染)
