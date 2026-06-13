"use client";

import { useState } from "react";

type SessionUser = {
  id: string;
  email: string;
  name: string;
};

type LoginViewProps = {
  onLogin: (user: SessionUser) => void;
};

export function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { user?: SessionUser; error?: string };

      if (!response.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      if (data.user) {
        onLogin(data.user);
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--shell-bg)] px-4 py-10">
      <div className="widget-card w-full max-w-sm">
        <h1 className="page-title mb-4">Field Tasks</h1>

        <p className="mb-4 body-sm text-zinc-500">
          Demo login for connecting Google Calendar and Gmail integrations.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="body-sm font-medium text-zinc-600">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              autoComplete="email"
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="body-sm font-medium text-zinc-600">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <p className="callout callout-error">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary focus-ring mt-1 w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
