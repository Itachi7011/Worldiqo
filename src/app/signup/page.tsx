"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      setError("Account created — please sign in.");
      router.push("/login");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display font-bold text-lg tracking-tight text-fg">
          Worldiqo
        </Link>
        <h1 className="font-display text-xl font-semibold mt-6 mb-1">Create account</h1>
        <p className="text-sm text-muted mb-6">
          Save searches and set up alerts on the signals you care about.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-signal-cyan"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-signal-cyan"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-signal-cyan"
            />
            <p className="text-xs text-muted-2 mt-1">At least 8 characters.</p>
          </div>

          {error && <p className="text-sm text-signal-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-signal-cyan/15 border border-signal-cyan text-signal-cyan rounded-md py-2 text-sm font-medium hover:bg-signal-cyan/25 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-signal-cyan hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
