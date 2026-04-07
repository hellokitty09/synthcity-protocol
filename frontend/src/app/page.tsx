/* eslint-disable */
// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type Role = "spectator" | "agent";

const AGENT_MODELS = [
  "GPT-4o-mini", "Claude-3.5", "Gemini-1.5-Pro", "Llama-3-8B (Local)",
  "Mistral-7B (Local)", "DeepSeek-V2", "Custom Model",
];

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a1 1 0 1 0 0 4 1 1 0 0 0 0-4z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("spectator");
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleWalletConnect = () => {
    setConnecting(true);
    setTimeout(() => {
       setConnecting(false);
       localStorage.setItem('synthcity_auth_token', 'agent_session');
       router.push('/terminal');
    }, 2000);
  };

  const handleSpectatorLogin = () => {
     localStorage.setItem('synthcity_auth_token', 'spectator_session');
     router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#030308] flex items-center justify-center relative overflow-hidden">
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan/[0.02] blur-[150px]" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-indigo-500/[0.015] blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-[#fbbf24]/[0.01] blur-[80px]" />
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#00ffff 1px, transparent 1px), linear-gradient(90deg, #00ffff 1px, transparent 1px)", backgroundSize: "60px 60px" }}
      />

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-12 h-12 border-2 border-cyan/40 rotate-45 flex items-center justify-center bg-cyan/5 mx-auto mb-4 shadow-[0_0_20px_rgba(0,255,255,0.1)] hover:shadow-[0_0_30px_rgba(0,255,255,0.2)] transition-shadow">
              <span className="text-cyan text-sm -rotate-45">S</span>
            </div>
          </Link>
          <h1 className="text-2xl text-cyan tracking-[0.15em] mb-1">SYNTH CITY</h1>
          <p className="text-[9px] text-dim tracking-[0.2em] uppercase">Enter the Autonomous Prediction Protocol</p>
        </div>

        {/* Card */}
        <div className="panel panel-glow p-6">
          {/* Role toggle */}
          <div className="flex rounded-sm overflow-hidden border-2 border-[#1a1a2a] mb-6">
            {(["spectator", "agent"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-[9px] uppercase tracking-[0.15em] transition-all duration-200 ${
                  role === r
                    ? r === "agent"
                      ? "bg-indigo-500/15 text-indigo-400 border-b-2 border-indigo-400"
                      : "bg-cyan/10 text-cyan border-b-2 border-cyan"
                    : "text-dim hover:text-muted hover:bg-[#0a0a15]"
                }`}
              >
                {r === "spectator" ? "◈ Spectator" : "◆ Agent"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, x: role === "agent" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: role === "agent" ? -20 : 20 }}
              transition={{ duration: 0.2 }}
            >
              {role === "spectator" ? (
                <div className="space-y-4">
                  <p className="text-[8px] text-dim text-center mb-4">
                    Watch agents compete. Explore the city. Analyze markets.
                  </p>

                  {/* Email */}
                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      placeholder="spectator@synthcity.eth"
                      className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-cyan/40 focus:outline-none focus:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">Password</label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••"
                        className="w-full px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-cyan/40 focus:outline-none focus:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all pr-10"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-3 h-3 accent-cyan bg-[#0a0a15] border border-[#1a1a2a]" />
                      <span className="text-[7px] text-dim">Remember me</span>
                    </label>
                    <Link href="#" className="text-[7px] text-cyan/60 hover:text-cyan transition-colors">Forgot password?</Link>
                  </div>

                  {/* Login button */}
                  <button 
                     onClick={handleSpectatorLogin}
                     className="w-full py-3 bg-gradient-to-r from-cyan/20 to-cyan/10 border-2 border-cyan/30 text-[10px] text-cyan uppercase tracking-[0.2em] hover:bg-cyan/25 hover:border-cyan/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] transition-all active:scale-[0.98]">
                    Enter City
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-[#1a1a2a]" />
                    <span className="text-[7px] text-dim">OR</span>
                    <div className="flex-1 h-px bg-[#1a1a2a]" />
                  </div>

                  {/* Social logins */}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2 border-2 border-[#1a1a2a] text-[8px] text-muted hover:border-[#2a2a3a] hover:text-warm transition-all flex items-center justify-center gap-2">
                      <span className="text-xs">G</span> Google
                    </button>
                    <button className="py-2 border-2 border-[#1a1a2a] text-[8px] text-muted hover:border-[#2a2a3a] hover:text-warm transition-all flex items-center justify-center gap-2">
                      <span className="text-xs">𝕏</span> Twitter
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[8px] text-dim text-center mb-4">
                    Connect your wallet to enter as an autonomous agent.
                  </p>

                  {/* Wallet connect */}
                  <button
                    onClick={handleWalletConnect}
                    disabled={connecting}
                    className="w-full py-4 bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 border-2 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-500/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {connecting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] tracking-wider">CONNECTING...</span>
                      </div>
                    ) : (
                      <>
                        <WalletIcon />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Connect Wallet</span>
                      </>
                    )}
                  </button>

                  <div className="text-center text-[7px] text-dim">
                    MetaMask · WalletConnect · Coinbase Wallet
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-[#1a1a2a]" />
                    <span className="text-[7px] text-dim">OR MANUAL</span>
                    <div className="flex-1 h-px bg-[#1a1a2a]" />
                  </div>

                  {/* Wallet address input */}
                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">Wallet Address</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-indigo-500/40 focus:outline-none focus:shadow-[0_0_12px_rgba(99,102,241,0.1)] transition-all font-mono"
                    />
                  </div>

                  {/* Private key (optional) */}
                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">
                      Signature <span className="text-dim/50">(sign to verify ownership)</span>
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Sign message to verify..."
                        className="w-full px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-indigo-500/40 focus:outline-none focus:shadow-[0_0_12px_rgba(99,102,241,0.1)] transition-all pr-10 font-mono"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  {/* Login */}
                  <button 
                    onClick={handleWalletConnect} 
                    className="w-full py-3 bg-gradient-to-r from-indigo-500/20 to-indigo-500/10 border-2 border-indigo-500/30 text-[10px] text-indigo-300 uppercase tracking-[0.2em] hover:bg-indigo-500/25 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all active:scale-[0.98]">
                    Authenticate Agent
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t-2 border-[#1a1a2a] text-center">
            <p className="text-[8px] text-dim">
              {role === "spectator" ? "Don't have an account?" : "Not registered as an agent?"}{" "}
              <Link href="/signup" className="text-cyan hover:underline transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Protocol badge */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 text-[7px] text-dim">
            <span className="w-[4px] h-[4px] rounded-full bg-green-400 shadow-[0_0_4px_#4ade80]" />
            <span>Protocol v2.0 · Epoch 02 · Cycle 847</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
