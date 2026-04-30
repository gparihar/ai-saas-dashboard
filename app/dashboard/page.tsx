"use client";

import {
  Bot,
  CloudSun,
  MessageSquare,
  Newspaper,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CHAT_SESSIONS_KEY,
  getUserStorageKey,
  LIVE_UPDATES_KEY,
  WEATHER_CITY_KEY,
} from "@/lib/storageKeys";

type ToolType = "ai" | "weather" | "news";

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

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default function DashboardHome() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [weatherCity, setWeatherCity] = useState("Surat");
  const [liveUpdates, setLiveUpdates] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        const username = data.user?.username || "user";
        const storedSessions = window.localStorage.getItem(
          getUserStorageKey(username, CHAT_SESSIONS_KEY)
        );
        const storedWeatherCity = window.localStorage.getItem(
          getUserStorageKey(username, WEATHER_CITY_KEY)
        );
        const storedLiveUpdates = window.localStorage.getItem(
          getUserStorageKey(username, LIVE_UPDATES_KEY)
        );

      setSessions(storedSessions ? (JSON.parse(storedSessions) as ChatSession[]) : []);
      setWeatherCity(storedWeatherCity?.trim() || "Surat");
      setLiveUpdates(storedLiveUpdates === "true");
      } catch {
      setSessions([]);
      }
    }

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const messages = sessions.flatMap((session) => session.messages);
    const assistantMessages = messages.filter((message) => message.role === "assistant");

    return {
      chats: sessions.length,
      messages: messages.length,
      ai: assistantMessages.filter((message) => (message.tool || "ai") === "ai").length,
      weather: assistantMessages.filter((message) => message.tool === "weather").length,
      news: assistantMessages.filter((message) => message.tool === "news").length,
    };
  }, [sessions]);

  const recentSessions = [...sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <div className="h-full overflow-y-auto bg-white p-4 dark:bg-[#0f172a] sm:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back to AI SaaS.</p>
        </div>

        <Link
          href="/dashboard/ai-tools"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Sparkles size={17} />
          Open AI Tools
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Chats</span>
            <MessageSquare size={18} />
          </div>
          <p className="text-3xl font-bold">{stats.chats}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Messages</span>
            <Bot size={18} />
          </div>
          <p className="text-3xl font-bold">{stats.messages}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Weather</span>
            <CloudSun size={18} />
          </div>
          <p className="text-3xl font-bold">{stats.weather}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">News</span>
            <Newspaper size={18} />
          </div>
          <p className="text-3xl font-bold">{stats.news}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Chats</h2>
            <Link
              href="/dashboard/settings"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300"
            >
              View all
            </Link>
          </div>

          <div className="space-y-2">
            {recentSessions.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">
                No chats yet.
              </div>
            ) : (
              recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 rounded-md bg-gray-50 px-3 py-3 dark:bg-gray-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <p className="text-xs text-gray-500">
                      {session.messages.length} messages
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {formatDate(session.updatedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="mb-4 text-lg font-semibold">Workspace</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-3 dark:bg-gray-900">
              <span className="text-gray-500">Default city</span>
              <span className="font-medium">{weatherCity}</span>
            </div>

            <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-3 dark:bg-gray-900">
              <span className="text-gray-500">Live updates</span>
              <span className="font-medium">{liveUpdates ? "On" : "Off"}</span>
            </div>

            <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-3 dark:bg-gray-900">
              <span className="text-gray-500">AI replies</span>
              <span className="font-medium">{stats.ai}</span>
            </div>
          </div>

          <Link
            href="/dashboard/settings"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <Settings size={17} />
            Settings
          </Link>
        </section>
      </div>
    </div>
  );
}
