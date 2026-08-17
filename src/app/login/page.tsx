"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Prevent syncUser from running twice
  const syncingRef = useRef(false);

  async function syncUser(accessToken: string) {
    if (syncingRef.current) {
      return;
    }

    syncingRef.current = true;

    try {
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const text = await response.text();

      console.log("AUTH SYNC STATUS:", response.status);
      console.log("AUTH SYNC RESPONSE:", text);

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Authentication sync returned an invalid response.`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to connect your account."
        );
      }

      console.log("AUTHENTICATION LINKED SUCCESSFULLY");

      window.location.href = "/owner/dashboard";
    } catch (error) {
      syncingRef.current = false;

      console.error("AUTH SYNC ERROR:", error);

      throw error;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function handleExistingSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted || !session) {
        return;
      }

      try {
        await syncUser(session.access_token);
      } catch (error) {
        if (mounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to connect your account."
          );
        }
      }
    }

    handleExistingSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("SUPABASE AUTH EVENT:", event);

        if (!mounted || !session) {
          return;
        }

        if (event === "SIGNED_IN") {
          try {
            await syncUser(session.access_token);
          } catch (error) {
            if (mounted) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Unable to connect your account."
              );
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function sendMagicLink(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const redirectUrl = `${window.location.origin}/login`;

      console.log("MAGIC LINK REDIRECT:", redirectUrl);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),

        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error("MAGIC LINK ERROR:", error);
        setError(error.message);
        return;
      }

      setMessage(
        "Magic link sent. Check your email and click the link to continue."
      );
    } catch (error) {
      console.error("MAGIC LINK ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to send magic link."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Smart Vehicle
          </p>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Owner Login
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Sign in securely using your email.
          </p>
        </div>

        <form onSubmit={sendMagicLink}>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-gray-900"
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}