# My AI Website

一个简单的个人网页，接入 AI 对话功能，调用 DeepSeek API。

## 功能

- 与 AI 进行多轮对话
- Edge Runtime 部署，低延迟
- 可自定义 system prompt，配置 AI 人设和背景信息

## 本地开发

1. 配置环境变量：

编辑 `.env.local` 文件：

```env
DEEPSEEK_API_KEY=your_actual_api_key_here
DEEPSEEK_SYSTEM_PROMPT=你是一个友好的AI助手...
```

2. 安装依赖并启动：

```bash
npm install
npm run dev
```

3. 打开浏览器访问 http://localhost:3000

## 部署到 Vercel

### 方法一：通过 Vercel CLI

```bash
npm install -g vercel
vercel
```

部署时会自动提示配置环境变量。

### 方法二：通过 GitHub 连接

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 在 Vercel 项目设置中添加环境变量：
   - `DEEPSEEK_API_KEY`: 你的 DeepSeek API 密钥
   - `DEEPSEEK_SYSTEM_PROMPT`: 你的 system prompt（可选）

## 自定义 System Prompt

在 `.env.local` 或 Vercel 环境变量中设置 `DEEPSEEK_SYSTEM_PROMPT`：

```env
DEEPSEEK_SYSTEM_PROMPT=你是一个专业的软件工程师，名叫张三，擅长全栈开发...
```

## 项目结构

```
.
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts     # Edge API Route
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
- DeepSeek API
