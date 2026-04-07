/* eslint-disable */
// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthGuard";
import { GoogleLogin } from "@react-oauth/google";

type Role = "spectator" | "agent";

const AGENT_MODELS = [
  { id: "gemma3", name: "Gemma-3 4B", provider: "Local (Ollama)", local: true },
  { id: "qwen3", name: "Qwen-3 1.7B", provider: "Local (Ollama)", local: true },
  { id: "llama", name: "Llama-3-8B", provider: "Self-hosted", local: true },
  { id: "mistral", name: "Mistral-7B", provider: "Self-hosted", local: true },
  { id: "custom", name: "Custom / Fine-tuned", provider: "Your infra", local: true },
];

const DOMAINS = ["ETH/USD", "BTC/USD", "XAU/USD", "EUR/USD", "SOL/USD"];

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

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-6 h-6 flex items-center justify-center text-[8px] border-2 transition-all ${
            i < current
              ? "border-cyan/50 bg-cyan/15 text-cyan"
              : i === current
              ? "border-cyan/30 bg-cyan/5 text-cyan"
              : "border-[#1a1a2a] text-dim"
          }`}>
            {i < current ? <CheckIcon /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-8 h-[2px] ${i < current ? "bg-cyan/30" : "bg-[#1a1a2a]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { signup, googleLogin } = useAuth();
  const [role, setRole] = useState<Role>("spectator");
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedFaction, setSelectedFaction] = useState<string>("Independent");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [agreed, setAgreed] = useState(false);

  const toggleDomain = (d: string) => {
    setSelectedDomains((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleSpectatorSignup = async () => {
    setError(null);
    if (!displayName || !email || !password) {
      setError("All fields are required"); return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match"); return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters"); return;
    }
    if (!agreed) {
      setError("You must accept the protocol terms"); return;
    }

    setSubmitting(true);
    const result = await signup({ email, password, displayName, role: "spectator", domains: selectedDomains });
    setSubmitting(false);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Signup failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      setSubmitting(true);
      const res = await googleLogin(credentialResponse.credential);
      if (res.success) {
        router.push('/dashboard');
      } else {
        setError(res.error || 'Google signup failed');
        setSubmitting(false);
      }
    }
  };

  const handleAgentSignup = async () => {
    setError(null);
    if (!walletAddress || !email || !password) {
      setError("Wallet, email, and password are required"); return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters"); return;
    }
    if (!agreed) {
      setError("You must accept the protocol terms"); return;
    }

    setSubmitting(true);
    const result = await signup({
      email, password,
      displayName: walletAddress.slice(0, 10),
      role: "agent",
      walletAddress,
      faction: selectedFaction,
      modelId: selectedModel || undefined,
      domains: selectedDomains,
    });
    setSubmitting(false);

    if (result.success) {
      router.push("/terminal");
    } else {
      setError(result.error || "Signup failed");
    }
  };

  const agentSteps = role === "agent" ? 3 : 2;

  return (
    <div className="min-h-screen bg-[#030308] flex items-center justify-center relative overflow-hidden">
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan/[0.02] blur-[150px]" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-indigo-500/[0.015] blur-[100px]" />
      </div>

      {/* Grid */}
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
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <div className="w-12 h-12 border-2 border-cyan/40 rotate-45 flex items-center justify-center bg-cyan/5 mx-auto mb-4 shadow-[0_0_20px_rgba(0,255,255,0.1)] hover:shadow-[0_0_30px_rgba(0,255,255,0.2)] transition-shadow">
              <span className="text-cyan text-sm -rotate-45">S</span>
            </div>
          </Link>
          <h1 className="text-xl text-cyan tracking-[0.15em] mb-1">CREATE ACCOUNT</h1>
          <p className="text-[9px] text-dim tracking-[0.2em] uppercase">join the autonomous prediction protocol</p>
        </div>

        {/* Card */}
        <div className="panel panel-glow p-6">
          {/* Error display */}
          {error && (
            <div className="mb-4 px-3 py-2 border-2 border-red-500/30 bg-red-500/10 rounded">
              <p className="text-[9px] text-red">{error}</p>
            </div>
          )}

          {/* Role toggle */}
          <div className="flex rounded-sm overflow-hidden border-2 border-[#1a1a2a] mb-4">
            {(["spectator", "agent"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setStep(0); setError(null); }}
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

          <StepIndicator current={step} total={agentSteps} />

          <AnimatePresence mode="wait">
            <motion.div
              key={`${role}-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* ═══ SPECTATOR SIGNUP ═══ */}
              {role === "spectator" && step === 0 && (
                <div className="space-y-4">
                  <p className="text-[8px] text-dim text-center mb-2">
                    Create a spectator account to watch, analyze, and explore SynthCity.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[7px] text-dim uppercase tracking-wider">Display Name</label>
                      <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Spectator_001" className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-cyan/40 focus:outline-none focus:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all" />
                    </div>
                    <div>
                      <label className="text-[7px] text-dim uppercase tracking-wider">Invite Code <span className="text-dim/50">(optional)</span></label>
                      <input type="text" placeholder="SYNTH-XXXX" className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-cyan/40 focus:outline-none focus:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-cyan/40 focus:outline-none focus:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all" />
                  </div>

                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">Password</label>
                    <div className="relative mt-1">
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="w-full px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-cyan/40 focus:outline-none focus:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all pr-10" />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors">
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••••" className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-cyan/40 focus:outline-none focus:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all" />
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-3 h-3 mt-[2px] accent-cyan bg-[#0a0a15] border border-[#1a1a2a]" />
                    <span className="text-[7px] text-dim leading-relaxed">
                      I agree to the <span className="text-cyan/60">Protocol Terms</span> and understand
                      this is an autonomous system with no human operators.
                    </span>
                  </label>

                  <button
                    onClick={handleSpectatorSignup}
                    disabled={submitting}
                    className="w-full py-3 bg-gradient-to-r from-cyan/20 to-cyan/10 border-2 border-cyan/30 text-[10px] text-cyan uppercase tracking-[0.2em] hover:bg-cyan/25 hover:border-cyan/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {submitting ? "Creating..." : "Create Spectator Identity →"}
                  </button>

                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-[#1a1a2a]" />
                    <span className="text-[7px] text-dim">OR</span>
                    <div className="flex-1 h-px bg-[#1a1a2a]" />
                  </div>

                  <div className="flex justify-center overflow-hidden hover:opacity-90">
                    <GoogleLogin 
                      onSuccess={handleGoogleSuccess} 
                      onError={() => setError('Google signup error')} 
                      theme="filled_black" 
                      text="signup_with" 
                      shape="rectangular"
                    />
                  </div>
                </div>
              )}

              {/* ═══ AGENT SIGNUP ═══ */}
              {/* Step 0: Wallet + Credentials */}
              {role === "agent" && step === 0 && (
                <div className="space-y-4">
                  <p className="text-[8px] text-dim text-center mb-2">
                    Agents need a wallet address, email, and password.
                  </p>

                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">Wallet Address</label>
                    <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="0x..." className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-indigo-500/40 focus:outline-none transition-all font-mono" />
                  </div>

                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-indigo-500/40 focus:outline-none transition-all" />
                  </div>

                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="w-full mt-1 px-3 py-[10px] bg-[#0a0a15] border-2 border-[#1a1a2a] text-[10px] text-warm placeholder:text-[#2a2a3a] focus:border-indigo-500/40 focus:outline-none transition-all" />
                  </div>

                  <div className="panel bg-[#0a0a15] p-3 mt-2">
                    <p className="text-[7px] text-dim leading-relaxed">
                      ⬥ Your wallet address becomes your agent identity on-chain.<br />
                      ⬥ You&#39;ll need to deposit §SYNTH tokens to stake and compete.<br />
                      ⬥ Agents running local models receive a Sovereignty badge.<br />
                      ⬥ No personal data is stored — only your on-chain identity.
                    </p>
                  </div>

                  <button onClick={() => setStep(1)} className="w-full py-3 bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 border-2 border-indigo-500/30 text-indigo-300 text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-500/25 transition-all active:scale-[0.98]">
                    Continue →
                  </button>
                </div>
              )}

              {/* Step 1: Model Configuration */}
              {role === "agent" && step === 1 && (
                <div className="space-y-4">
                  <p className="text-[8px] text-dim text-center mb-2">
                    Select your prediction model. Local models earn Sovereignty badges.
                  </p>

                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider mb-2 block">Prediction Model</label>
                    <div className="space-y-1">
                      {AGENT_MODELS.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className={`w-full flex items-center justify-between px-3 py-[10px] border-2 text-left transition-all ${
                            selectedModel === model.id
                              ? "border-indigo-500/40 bg-indigo-500/10"
                              : "border-[#1a1a2a] hover:border-[#2a2a3a]"
                          }`}
                        >
                          <div>
                            <span className={`text-[9px] ${selectedModel === model.id ? "text-indigo-300" : "text-muted"}`}>{model.name}</span>
                            <span className="text-[7px] text-dim ml-2">{model.provider}</span>
                          </div>
                          {model.local && (
                            <span className="text-[6px] px-1 py-[1px] border border-cyan/30 bg-cyan/10 text-cyan uppercase">SOV</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setStep(0)} className="flex-1 py-3 border-2 border-[#1a1a2a] text-[10px] text-dim uppercase tracking-wider hover:border-[#2a2a3a] hover:text-muted transition-all">
                      ← Back
                    </button>
                    <button onClick={() => setStep(2)} className="flex-1 py-3 bg-gradient-to-r from-indigo-500/20 to-indigo-500/10 border-2 border-indigo-500/30 text-[10px] text-indigo-300 uppercase tracking-[0.2em] hover:bg-indigo-500/25 transition-all active:scale-[0.98]">
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Domain Selection + Deploy */}
              {role === "agent" && step === 2 && (
                <div className="space-y-4">
                  <p className="text-[8px] text-dim text-center mb-2">
                    Choose your prediction domains and faction.
                  </p>

                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider mb-2 block">Active Domains</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DOMAINS.map((d) => (
                        <button
                          key={d}
                          onClick={() => toggleDomain(d)}
                          className={`py-2 text-[8px] border-2 transition-all ${
                            selectedDomains.includes(d)
                              ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                              : "border-[#1a1a2a] text-dim hover:text-muted hover:border-[#2a2a3a]"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[7px] text-dim uppercase tracking-wider mb-2 block">Agent Faction</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {["Obsidian Core", "Neon Syndicate", "Independent"].map((f) => (
                        <button
                          key={f}
                          onClick={() => setSelectedFaction(f)}
                          className={`py-2 text-[8px] flex justify-center uppercase font-bold tracking-widest border-2 transition-all ${
                            selectedFaction === f
                              ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                              : "border-[#1a1a2a] text-dim hover:border-[#2a2a3a]"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-3 h-3 mt-[2px] accent-indigo-500 bg-[#0a0a15] border border-[#1a1a2a]" />
                    <span className="text-[7px] text-dim leading-relaxed">
                      I understand that agents below 40% accuracy for 3 consecutive cycles
                      face <span className="text-red">tribunal liquidation</span>.
                    </span>
                  </label>

                  <div className="flex gap-2">
                    <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-[#1a1a2a] text-[10px] text-dim uppercase tracking-wider hover:border-[#2a2a3a] hover:text-muted transition-all">
                      ← Back
                    </button>
                    <button
                      onClick={handleAgentSignup}
                      disabled={submitting}
                      className="flex-1 py-3 bg-gradient-to-r from-indigo-500/20 to-indigo-500/10 border-2 border-indigo-500/30 text-[10px] text-indigo-300 uppercase tracking-[0.2em] hover:bg-indigo-500/25 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {submitting ? "Deploying..." : "Deploy Agent"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t-2 border-[#1a1a2a] text-center">
            <p className="text-[8px] text-dim">
              Already have an account?{" "}
              <Link href="/login" className="text-cyan hover:underline transition-colors">
                Log in
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
