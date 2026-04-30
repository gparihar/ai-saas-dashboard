"use client";

import {
  Check,
  CloudSun,
  Copy,
  MessageSquare,
  Radio,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ACTIVE_SESSION_KEY,
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

export default function SettingsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [query, setQuery] = useState("");
  const [weatherCity, setWeatherCity] = useState("Surat");
  const [liveUpdates, setLiveUpdates] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        const currentUsername = data.user?.username || "user";
        const storedSessions = window.localStorage.getItem(
          getUserStorageKey(currentUsername, CHAT_SESSIONS_KEY)
        );
        const storedWeatherCity = window.localStorage.getItem(
          getUserStorageKey(currentUsername, WEATHER_CITY_KEY)
        );
        const storedLiveUpdates = window.localStorage.getItem(
          getUserStorageKey(currentUsername, LIVE_UPDATES_KEY)
        );

      setUsername(currentUsername);
      setSessions(storedSessions ? (JSON.parse(storedSessions) as ChatSession[]) : []);
      setWeatherCity(storedWeatherCity?.trim() || "Surat");
      setLiveUpdates(storedLiveUpdates === "true");
      } catch {
      setUsername("user");
      setSessions([]);
      } finally {
      setLoaded(true);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    if (!loaded || !username) {
      return;
    }

    window.localStorage.setItem(
      getUserStorageKey(username, CHAT_SESSIONS_KEY),
      JSON.stringify(sessions)
    );
  }, [loaded, sessions, username]);

  useEffect(() => {
    if (!loaded || !username) {
      return;
    }

    window.localStorage.setItem(
      getUserStorageKey(username, WEATHER_CITY_KEY),
      weatherCity.trim() || "Surat"
    );
  }, [loaded, username, weatherCity]);

  useEffect(() => {
    if (!loaded || !username) {
      return;
    }

    window.localStorage.setItem(
      getUserStorageKey(username, LIVE_UPDATES_KEY),
      String(liveUpdates)
    );
  }, [liveUpdates, loaded, username]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...sessions]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((session) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          session.title.toLowerCase().includes(normalizedQuery) ||
          session.messages.some((message) =>
            message.content.toLowerCase().includes(normalizedQuery)
          )
        );
      });
  }, [query, sessions]);

  const totalMessages = sessions.reduce(
    (total, session) => total + session.messages.length,
    0
  );

  const handleOpenSession = (sessionId: string) => {
    window.localStorage.setItem(
      getUserStorageKey(username || "user", ACTIVE_SESSION_KEY),
      sessionId
    );
    router.push("/dashboard/ai-tools");
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  const handleClearHistory = () => {
    if (!window.confirm("Clear all chat history?")) {
      return;
    }

    setSessions([]);
    window.localStorage.removeItem(
      getUserStorageKey(username || "user", ACTIVE_SESSION_KEY)
    );
  };

  const handleCopyHistory = async () => {
    await navigator.clipboard.writeText(JSON.stringify(sessions, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="h-full overflow-y-auto bg-white p-4 dark:bg-[#0f172a] sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">Workspace preferences and chat history.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="mb-4 flex items-center gap-2">
              <CloudSun size={18} />
              <h2 className="text-lg font-semibold">Preferences</h2>
            </div>

            <label className="block text-sm font-medium text-gray-500" htmlFor="weather-city">
              Default weather city
            </label>
            <input
              id="weather-city"
              type="text"
              value={weatherCity}
              onChange={(event) => setWeatherCity(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
            />

            <button
              type="button"
              onClick={() => setLiveUpdates((prev) => !prev)}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                liveUpdates
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              }`}
            >
              <Radio size={17} />
              {liveUpdates ? "Live Updates On" : "Live Updates Off"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-sm text-gray-500">Chats</p>
              <p className="mt-2 text-2xl font-bold">{sessions.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-sm text-gray-500">Messages</p>
              <p className="mt-2 text-2xl font-bold">{totalMessages}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              <h2 className="text-lg font-semibold">Chat History</h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleCopyHistory}
                disabled={sessions.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy JSON"}</span>
                <span className="sm:hidden">{copied ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={handleClearHistory}
                disabled={sessions.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:hover:bg-red-500/10"
              >
                <Trash2 size={16} />
                Clear
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900">
            <Search size={17} className="text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search history"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
            />
          </div>

          <div className="max-h-[calc(100vh-18rem)] space-y-2 overflow-y-auto pr-1">
            {filteredSessions.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">
                No history found.
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 rounded-md bg-gray-50 px-3 py-3 dark:bg-gray-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <p className="text-xs text-gray-500">
                      {session.messages.length} messages - {formatDate(session.updatedAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSession(session.id)}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                      aria-label={`Delete ${session.title}`}
                      title={`Delete ${session.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
