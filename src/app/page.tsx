"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [inputError, setInputError] = useState("");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = manualToken.trim();
    if (!token) {
      setInputError("Please enter a scan token.");
      return;
    }
    router.push(`/scan/${token}`);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 text-white">
      {/* Background Image with cover fit */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out scale-105"
        style={{
          backgroundImage: "url('/hero-bg.jpg')",
        }}
      />

      {/* Dark/Blue premium gradient overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-950/80 via-slate-900/85 to-blue-950/95" />

      {/* Main card content container */}
      <div className="relative z-20 mx-auto flex w-full max-w-md flex-col items-center text-center">
        
        {/* Logo Section */}
        <header className="mb-8 flex items-center justify-center gap-2.5 rounded-full bg-white/5 px-5 py-2.5 backdrop-blur-md border border-white/10 shadow-lg">
          <span className="text-2xl" role="img" aria-label="car">🚗</span>
          <span className="text-sm font-bold tracking-widest uppercase text-blue-400">
            Smart Vehicle
          </span>
        </header>

        {/* Hero Card */}
        <section className="w-full rounded-3xl bg-white/5 p-8 backdrop-blur-lg border border-white/10 shadow-2xl shadow-blue-950/50">
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-white sm:text-4xl">
            Report vehicle issues instantly.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Help vehicle owners reach their vehicle when needed.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3.5">
            <button
              type="button"
              onClick={() => router.push("/owner/dashboard")}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              Owner Login
            </button>

            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/10 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Scan / Report an Issue
            </button>
          </div>

          {/* Expandable Manual Token Form */}
          {showManualInput && (
            <form 
              onSubmit={handleManualSubmit}
              className="mt-6 border-t border-white/10 pt-5 text-left transition-all duration-300 animate-fadeIn"
            >
              <label 
                htmlFor="tokenInput"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
              >
                Enter QR scan token manually:
              </label>
              <div className="flex gap-2">
                <input
                  id="tokenInput"
                  type="text"
                  value={manualToken}
                  onChange={(e) => {
                    setManualToken(e.target.value);
                    setInputError("");
                  }}
                  placeholder="Paste QR token here..."
                  className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:bg-black/30"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 active:scale-95 transition"
                >
                  Go
                </button>
              </div>
              {inputError && (
                <p className="mt-2 text-xs text-red-400">{inputError}</p>
              )}
            </form>
          )}
        </section>

        {/* Footer info */}
        <footer className="mt-8 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Smart Vehicle. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
