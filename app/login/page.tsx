"use client";

import { Lock, LogIn, Sparkles, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (next?.startsWith("/")) {
      setNextPath(next);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, mode }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Authentication failed.");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Could not continue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6 text-black dark:bg-[#0f172a] dark:text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI SaaS</h1>
            <p className="text-sm text-gray-500">Private dashboard access</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              mode === "login"
                ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-300"
                : "text-gray-500"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              mode === "signup"
                ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-300"
                : "text-gray-500"
            }`}
          >
            Sign up
          </button>
        </div>

        <label className="block text-sm font-medium text-gray-500" htmlFor="username">
          Email
        </label>
        <input
          id="username"
          type="email"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
          autoComplete="email"
          required
        />

        <label
          className="mt-4 block text-sm font-medium text-gray-500"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={6}
          required
        />

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Lock size={17} />
          ) : mode === "login" ? (
            <LogIn size={17} />
          ) : (
            <UserPlus size={17} />
          )}
          {loading ? "Please wait" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>
    </main>
  );
}
