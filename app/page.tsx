"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string;
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

// Custom Markdown renderer with styled components
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mb-3 mt-4 text-white">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mb-2 mt-3 text-white/90">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mb-2 mt-2 text-white/80">{children}</h3>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1 text-white/80">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1 text-white/80">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="ml-2">{children}</li>
        ),
        code: ({ className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <code className={`${className} block bg-black/30 p-3 rounded-lg my-2 text-sm overflow-x-auto`} {...props}>
              {children}
            </code>
          ) : (
            <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-purple-300" {...props}>
              {children}
            </code>
          );
        },
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-purple-200 underline"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-purple-400/50 pl-4 py-1 my-2 bg-white/5 italic text-white/70">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-white/80">{children}</em>
        ),
        hr: () => (
          <hr className="border-white/20 my-3" />
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full divide-y divide-white/20 text-white/80">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-white/10">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-white/10">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr>{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white/90">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-sm whitespace-nowrap">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const response = await fetch("/api/chats");
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  const saveMessages = async () => {
    if (!currentSessionId) return;

    try {
      // Generate title from first user message
      const firstUserMessage = messages.find(m => m.role === "user");
      const title = firstUserMessage?.content.substring(0, 30) || "新对话";

      await fetch(`/api/chats/${currentSessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      // Also update session title
      await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentSessionId, title }),
      });
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chats/${sessionId}`);
      const data = await response.json();
      setMessages(data.messages || []);
      setCurrentSessionId(sessionId);
      setShowHistory(false);
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const newChat = () => {
    setMessages([]);
    setCurrentSessionId(`chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    setShowHistory(false);
    setInput("");
    setSelectedImage(null);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await fetch(`/api/chats?sessionId=${sessionId}`, {
        method: "DELETE",
      });

      // Reload sessions
      await loadSessions();

      // If deleted current session, start new chat
      if (sessionId === currentSessionId) {
        newChat();
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const imageData = selectedImage;

    // Create new session if needed
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setCurrentSessionId(sessionId);
    }

    const userMessage: Message = {
      role: "user",
      content: input || (selectedImage ? "[图片]" : ""),
      image: selectedImage || undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          image: imageData,
        }),
      });

      const data = await response.json();
      const finalMessages = [...newMessages, { role: "assistant" as const, content: data.message }];
      setMessages(finalMessages);

      // Save messages after receiving AI response
      await saveMessages();

      // Refresh sessions list to show updated title
      await loadSessions();
    } catch (error) {
      console.error("Error:", error);
      setMessages([...newMessages, { role: "assistant", content: "抱歉，出了点问题，请稍后再试。" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/background.png')",
          filter: "brightness(0.3) saturate(0.7)",
        }}
      />
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="聊天记录"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
            <img
              src="/avatar.jpg"
              alt="Eunice"
              className="w-10 h-10 rounded-full object-cover shadow-lg border-2 border-white/20"
            />
            <div className="flex-1">
              <h1 className="text-white font-semibold text-lg">Eunice 的 AI 助手</h1>
              <p className="text-white/60 text-sm">测绘遥感 · 图像处理 · 码农日常</p>
            </div>
            <button
              onClick={newChat}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-white/80 text-sm transition-colors"
            >
              + 新对话
            </button>
          </div>
        </header>

        {/* History Sidebar */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowHistory(false)} />
            <div className="relative w-80 h-full bg-slate-900/95 backdrop-blur-md border-r border-white/10 overflow-y-auto">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-white font-semibold">聊天记录</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-white/60 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-2">
                {sessions.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">暂无聊天记录</p>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => loadSession(session.id)}
                      className={`group p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                        currentSessionId === session.id
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white/90 text-sm truncate">{session.title}</p>
                          <p className="text-white/40 text-xs mt-1">
                            {new Date(session.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <main className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-140px)] flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 mb-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/60">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-lg">和 Eunice 聊聊吧</p>
                <p className="text-sm mt-2 text-white/40">支持文字对话、发送图片识别</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar */}
                    {msg.role === "assistant" ? (
                      <img
                        src="/avatar.jpg"
                        alt="Eunice"
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/20"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                        我
                      </div>
                    )}
                    {/* Message */}
                    <div className={`px-4 py-2.5 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-white/10 text-white/90 rounded-bl-md border border-white/10"
                    }`}>
                      {msg.image && (
                        <img src={msg.image} alt="Uploaded" className="max-w-full rounded-lg mb-2" />
                      )}
                      {msg.role === "assistant" ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <MarkdownContent content={msg.content} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex gap-3">
                  <img
                    src="/avatar.jpg"
                    alt="Eunice"
                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                  />
                  <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="space-y-3">
            {/* Image Preview */}
            {selectedImage && (
              <div className="flex items-center gap-3 px-3">
                <div className="relative">
                  <img src={selectedImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-white/20" />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
                <span className="text-white/60 text-sm">已选择图片</span>
              </div>
            )}

            {/* Text Input + Actions */}
            <div className="flex gap-3">
              {/* Image Upload Button */}
              <label className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/60 hover:text-white hover:bg-white/15 cursor-pointer transition-all flex items-center justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={loading}
                />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </label>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="输入消息..."
                className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent backdrop-blur-sm transition-all"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || (!input.trim() && !selectedImage)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-purple-500/25 font-medium"
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
