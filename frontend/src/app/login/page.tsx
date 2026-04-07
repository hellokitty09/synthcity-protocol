/* eslint-disable */
// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthGuard";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Login failed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !submitting) handleLogin();
  };

  return (
    <div className="min-h-screen bg-[#030308] flex items-center justify-center relative overflow-hidden">
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan/[0.02] blur-[150px]" />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#00ffff 1px, transparent 1px), linear-gradient(90deg, #00ffff 1px, transparent 1px)", backgroundSize: "60px 60px" }}
      />

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <div className="w-12 h-12 border-2 border-cyan/40 rotate-45 flex items-center justify-center bg-cyan/5 mx-auto mb-4 shadow-[0_0_20px_rgba(0,255,255,0.1)] hover:shadow-[0_0_30px_rgba(0,255,255,0.2)] transition-shadow">
              <span className="text-cyan text-sm -rotate-45">S</span>
            </div>
          </Link>
          <h1 className="text-xl text-cyan tracking-[0.15em] mb-1">WELCOME BACK</h1>
          <p className="text-[9px] text-dim tracking-[0.2em] uppercase">authenticate to the protocol</p>
        </div>

        {/* Card */}
        <div className="panel panel-glow p-6">
          {/* Error display */}
          {error && (
            <div className="mb-4 px-3 py-2 border-2 border-red-500/30 bg-red-500/10 rounded">
              <p className="text-[9px] text-red">{error}</p>
            </div>
          )}

          <div className="space-y-4" onKeyDown={handleKeyDown}>
            <div>
              <label className="text-[7px] text-dim uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-cyan/40 focus:outline-none focus:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all"
              />
            </div>

            <div>
              <label className="text-[7px] text-dim uppercase tracking-wider">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-cyan/40 focus:outline-none focus:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                    ) : (
                      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-cyan/20 to-cyan/10 border-2 border-cyan/30 text-[10px] text-cyan uppercase tracking-[0.2em] hover:bg-cyan/25 hover:border-cyan/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Authenticating..." : "Enter Protocol →"}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t-2 border-[#1a1a2a] text-center">
            <p className="text-[8px] text-dim">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-cyan hover:underline transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Protocol badge */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 text-[7px] text-dim">
            <span className="w-[4px] h-[4px] rounded-full bg-green-400 shadow-[0_0_4px_#4ade80]" />
            <span>Protocol v8.0 · Secure Auth · SQLite Persistence</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
