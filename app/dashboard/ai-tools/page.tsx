"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowDown,
  Bot,
  CloudSun,
  Copy,
  History,
  Newspaper,
  Plus,
  Radio,
  RefreshCw,
  Send,
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  ACTIVE_SESSION_KEY,
  CHAT_SESSIONS_KEY,
  getUserStorageKey,
  LIVE_UPDATES_KEY,
  WEATHER_CITY_KEY,
} from "@/lib/storageKeys";

type ToolType = "ai" | "weather" | "news";
type LiveToolType = "weather" | "news";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool?: ToolType;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

type LiveToolState = {
  content: string;
  loading: boolean;
  updatedAt?: number;
};

type GenerateResult = {
  text: string;
  tool: ToolType;
  ok: boolean;
};

const DEFAULT_WEATHER_CITY = "Surat";
const DEFAULT_NEWS_PROMPT = "latest news";

const toolDetails: Record<
  ToolType,
  {
    label: string;
    icon: typeof Bot;
    className: string;
  }
> = {
  ai: {
    label: "AI",
    icon: Bot,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  },
  weather: {
    label: "Weather",
    icon: CloudSun,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  news: {
    label: "News",
    icon: Newspaper,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  },
};

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function detectTool(prompt: string): ToolType {
  const text = prompt.toLowerCase();

  if (text.includes("weather")) {
    return "weather";
  }

  if (text.includes("news")) {
    return "news";
  }

  return "ai";
}

function createWelcomeMessage(): Message {
  return {
    id: makeId(),
    role: "assistant",
    content: "Hello. Ask me anything, or open Weather and News.",
    tool: "ai",
  };
}

function createSession(): ChatSession {
  return {
    id: makeId(),
    title: "New chat",
    messages: [createWelcomeMessage()],
    updatedAt: Date.now(),
  };
}

function getSessionTitle(prompt: string) {
  return prompt.length > 32 ? `${prompt.slice(0, 32)}...` : prompt;
}

function formatUpdatedAt(value?: number) {
  if (!value) {
    return "Not updated";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function ToolBadge({ tool }: { tool: ToolType }) {
  const details = toolDetails[tool];
  const Icon = details.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${details.className}`}
    >
      <Icon size={14} />
      {details.label}
    </span>
  );
}

function ToolButton({
  tool,
  onClick,
  disabled,
}: {
  tool: ToolType;
  onClick: () => void;
  disabled?: boolean;
}) {
  const details = toolDetails[tool];
  const Icon = details.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${details.className}`}
    >
      <Icon size={16} />
      {details.label}
    </button>
  );
}

function LiveUpdateCard({
  tool,
  state,
  onRefresh,
}: {
  tool: LiveToolType;
  state: LiveToolState;
  onRefresh: () => void;
}) {
  const details = toolDetails[tool];
  const Icon = details.icon;

  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={18} />
          <span className="truncate text-sm font-semibold">{details.label}</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={state.loading}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-900"
          aria-label={`Refresh ${details.label}`}
          title={`Refresh ${details.label}`}
        >
          <RefreshCw size={16} className={state.loading ? "animate-spin" : ""} />
        </button>
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-gray-700 dark:text-gray-200">
        {state.loading && !state.content ? "Updating..." : state.content || "No update yet."}
      </p>
      <p className="mt-2 text-xs text-gray-500">{formatUpdatedAt(state.updatedAt)}</p>
    </div>
  );
}

export default function AIToolsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [username, setUsername] = useState("");
  const [liveUpdates, setLiveUpdates] = useState(false);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [weatherCity, setWeatherCity] = useState(DEFAULT_WEATHER_CITY);
  const [liveTools, setLiveTools] = useState<Record<LiveToolType, LiveToolState>>({
    weather: { content: "", loading: false },
    news: { content: "", loading: false },
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const refreshingToolsRef = useRef<Set<LiveToolType>>(new Set());

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions]
  );
  const messages = activeSession?.messages || [];
  const detectedTool = detectTool(input);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const requestGenerate = useCallback(
    async (
      prompt: string,
      onChunk?: (text: string, tool: ToolType) => void
    ): Promise<GenerateResult> => {
      const fallbackTool = detectTool(prompt);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const responseTool = (res.headers.get("X-AI-Tool") as ToolType | null) || fallbackTool;
      const reader = res.body?.getReader();

      if (!reader) {
        const text = await res.text();
        return { text: text || "No response", tool: responseTool, ok: res.ok };
      }

      const decoder = new TextDecoder();
      let reply = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        reply += decoder.decode(value, { stream: true });
        onChunk?.(reply, responseTool);
      }

      reply += decoder.decode();

      if (!reply.trim()) {
        reply = res.ok ? "No response" : "Request failed";
      }

      return { text: reply, tool: responseTool, ok: res.ok };
    },
    []
  );

  useEffect(() => {
    async function loadUserState() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        const currentUsername = data.user?.username || "user";
        const sessionsKey = getUserStorageKey(currentUsername, CHAT_SESSIONS_KEY);
        const activeSessionKey = getUserStorageKey(currentUsername, ACTIVE_SESSION_KEY);
        const weatherCityKey = getUserStorageKey(currentUsername, WEATHER_CITY_KEY);
        const liveUpdatesKey = getUserStorageKey(currentUsername, LIVE_UPDATES_KEY);
        const stored = window.localStorage.getItem(sessionsKey);
      const parsed = stored ? (JSON.parse(stored) as ChatSession[]) : [];
      const initialSessions = parsed.length > 0 ? parsed : [createSession()];
        const storedActiveSessionId = window.localStorage.getItem(activeSessionKey);
        const storedWeatherCity = window.localStorage.getItem(weatherCityKey);
        const storedLiveUpdates = window.localStorage.getItem(liveUpdatesKey);
      const initialActiveSessionId = initialSessions.some(
        (session) => session.id === storedActiveSessionId
      )
        ? storedActiveSessionId || initialSessions[0].id
        : initialSessions[0].id;

        setUsername(currentUsername);
      setSessions(initialSessions);
      setActiveSessionId(initialActiveSessionId);
      setWeatherCity(storedWeatherCity?.trim() || DEFAULT_WEATHER_CITY);
      setLiveUpdates(storedLiveUpdates === "true");
      } catch {
      const session = createSession();

        setUsername("user");
      setSessions([session]);
      setActiveSessionId(session.id);
      } finally {
      setLoaded(true);
      }
    }

    loadUserState();
  }, []);

  useEffect(() => {
    if (loaded && username) {
      window.localStorage.setItem(
        getUserStorageKey(username, CHAT_SESSIONS_KEY),
        JSON.stringify(sessions)
      );
    }
  }, [loaded, sessions, username]);

  useEffect(() => {
    if (loaded && activeSessionId && username) {
      window.localStorage.setItem(
        getUserStorageKey(username, ACTIVE_SESSION_KEY),
        activeSessionId
      );
    }
  }, [activeSessionId, loaded, username]);

  useEffect(() => {
    if (loaded && username) {
      window.localStorage.setItem(
        getUserStorageKey(username, LIVE_UPDATES_KEY),
        String(liveUpdates)
      );
    }
  }, [liveUpdates, loaded, username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const updateSession = (
    sessionId: string,
    updater: (session: ChatSession) => ChatSession
  ) => {
    setSessions((prev) =>
      prev
        .map((session) => (session.id === sessionId ? updater(session) : session))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  const updateAssistantMessage = (
    sessionId: string,
    messageId: string,
    content: string,
    tool: ToolType
  ) => {
    updateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.id === messageId ? { ...message, content, tool } : message
      ),
      updatedAt: Date.now(),
    }));
  };

  const refreshLiveTool = useCallback(
    async (tool: LiveToolType) => {
      if (refreshingToolsRef.current.has(tool)) {
        return;
      }

      refreshingToolsRef.current.add(tool);
      setLiveTools((prev) => ({
        ...prev,
        [tool]: { ...prev[tool], loading: true },
      }));

      try {
        const prompt =
          tool === "weather" ? `weather in ${weatherCity}` : DEFAULT_NEWS_PROMPT;
        const result = await requestGenerate(prompt);

        setLiveTools((prev) => ({
          ...prev,
          [tool]: {
            content: result.text,
            loading: false,
            updatedAt: Date.now(),
          },
        }));
      } catch {
        setLiveTools((prev) => ({
          ...prev,
          [tool]: {
            content: `Could not update ${tool}.`,
            loading: false,
            updatedAt: Date.now(),
          },
        }));
      } finally {
        refreshingToolsRef.current.delete(tool);
      }
    },
    [requestGenerate, weatherCity]
  );

  useEffect(() => {
    if (!liveUpdates) {
      return;
    }

    refreshLiveTool("weather");
    refreshLiveTool("news");

    const weatherInterval = window.setInterval(() => {
      refreshLiveTool("weather");
    }, 60_000);
    const newsInterval = window.setInterval(() => {
      refreshLiveTool("news");
    }, 180_000);

    return () => {
      window.clearInterval(weatherInterval);
      window.clearInterval(newsInterval);
    };
  }, [liveUpdates, refreshLiveTool]);

  const handleScroll = () => {
    const element = chatScrollRef.current;

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    setShowJumpButton(distanceFromBottom > 120);
  };

  const handleNewChat = () => {
    const session = createSession();

    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setInput("");
  };

  const handleSend = async (promptOverride?: string) => {
    const prompt = (promptOverride || input).trim();
    const targetSession = activeSession;

    if (!prompt || loading || !targetSession) {
      return;
    }

    const sessionId = targetSession.id;
    const tool = detectTool(prompt);
    const userMessage: Message = {
      id: makeId(),
      role: "user",
      content: prompt,
      tool,
    };
    const assistantMessage: Message = {
      id: makeId(),
      role: "assistant",
      content: "",
      tool,
    };

    updateSession(sessionId, (session) => ({
      ...session,
      title: session.title === "New chat" ? getSessionTitle(prompt) : session.title,
      messages: [...session.messages, userMessage, assistantMessage],
      updatedAt: Date.now(),
    }));

    if (!promptOverride) {
      setInput("");
    }

    setLoading(true);

    try {
      const result = await requestGenerate(prompt, (reply, responseTool) => {
        updateAssistantMessage(sessionId, assistantMessage.id, reply, responseTool);
      });

      updateAssistantMessage(sessionId, assistantMessage.id, result.text, result.tool);

      if (result.tool === "weather" || result.tool === "news") {
        setLiveTools((prev) => ({
          ...prev,
          [result.tool]: {
            content: result.text,
            loading: false,
            updatedAt: Date.now(),
          },
        }));
      }
    } catch {
      updateAssistantMessage(
        sessionId,
        assistantMessage.id,
        "Error from AI. Please try again.",
        tool
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToolClick = (tool: ToolType) => {
    if (tool === "ai") {
      inputRef.current?.focus();
      return;
    }

    const prompt = tool === "weather" ? `weather in ${weatherCity}` : DEFAULT_NEWS_PROMPT;

    handleSend(prompt);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">AI Tools</h1>
          <p className="text-sm text-gray-500">{activeSession?.title || "New chat"}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Chat</span>
            <span className="sm:hidden">New</span>
          </button>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            <History size={16} />
            <span className="hidden sm:inline">History</span>
          </Link>
          {(Object.keys(toolDetails) as ToolType[]).map((tool) => (
            <ToolButton
              key={tool}
              tool={tool}
              onClick={() => handleToolClick(tool)}
              disabled={loading && tool !== "ai"}
            />
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <LiveUpdateCard
          tool="weather"
          state={liveTools.weather}
          onRefresh={() => refreshLiveTool("weather")}
        />
        <LiveUpdateCard
          tool="news"
          state={liveTools.news}
          onRefresh={() => refreshLiveTool("news")}
        />
        <button
          type="button"
          onClick={() => setLiveUpdates((prev) => !prev)}
          className={`flex min-h-[5.75rem] items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition ${
            liveUpdates
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
          }`}
        >
          <Radio size={17} />
          {liveUpdates ? "Live On" : "Live Off"}
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={chatScrollRef}
          onScroll={handleScroll}
          className="h-full space-y-4 overflow-y-auto scroll-smooth pr-2"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed sm:max-w-[72%] ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-950 dark:bg-gray-800 dark:text-white"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <ToolBadge tool={msg.tool || "ai"} />
                  {msg.role === "assistant" && !msg.content && loading && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      typing...
                    </span>
                  )}
                </div>

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{msg.content || " "}</ReactMarkdown>
                </div>

                {msg.role === "assistant" && msg.content && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="absolute right-2 top-2 opacity-50 hover:opacity-100"
                    aria-label="Copy assistant message"
                    title="Copy assistant message"
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {showJumpButton && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="absolute bottom-3 left-1/2 inline-flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
            aria-label="Jump to latest message"
            title="Jump to latest message"
          >
            <ArrowDown size={18} />
          </button>
        )}
      </div>

      <div className="mt-4 shrink-0">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>Detected tool</span>
          <ToolBadge tool={detectedTool} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
          >
            <Send size={17} />
            <span className="hidden sm:inline">{loading ? "Sending" : "Send"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
