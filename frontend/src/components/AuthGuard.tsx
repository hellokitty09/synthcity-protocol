"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

// ═══════════════════════════════════════════════
//  AUTH CONTEXT — Shared auth state across app
// ═══════════════════════════════════════════════

interface User {
  id: string;
  email: string;
  display_name: string;
  role: "spectator" | "agent";
  wallet_address: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

interface SignupData {
  email: string;
  password: string;
  displayName: string;
  role: "spectator" | "agent";
  walletAddress?: string;
  faction?: string;
  modelId?: string;
  domains?: string[];
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// White-listed routes that do not require authentication
const PUBLIC_ROUTES = ["/", "/signup", "/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Must wait for mount before accessing localStorage/router
  useEffect(() => { setMounted(true); }, []);

  // Validate existing token on mount
  useEffect(() => {
    if (!mounted) return;
    const storedToken = localStorage.getItem("synthcity_token");
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    // Verify token with server
    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid session");
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setToken(storedToken);
      })
      .catch(() => {
        localStorage.removeItem("synthcity_token");
      })
      .finally(() => setIsLoading(false));
  }, [mounted]);

  // Redirect if not authenticated on protected routes
  useEffect(() => {
    if (isLoading) return;
    if (!PUBLIC_ROUTES.includes(pathname) && !user) {
      router.replace("/signup");
    }
  }, [isLoading, user, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      localStorage.setItem("synthcity_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, []);

  const signup = useCallback(async (signupData: SignupData) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      localStorage.setItem("synthcity_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, []);

  const logout = useCallback(() => {
    const t = localStorage.getItem("synthcity_token");
    if (t) {
      fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      }).catch(() => {});
    }
    localStorage.removeItem("synthcity_token");
    setToken(null);
    setUser(null);
    router.push("/");
  }, [router]);

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-[3px] border-cyan/40 border-t-cyan rounded-full animate-spin" />
          <p className="text-[10px] text-cyan uppercase tracking-widest font-mono blink">
            VERIFYING CREDENTIALS...
          </p>
        </div>
      </div>
    );
  }

  // Block protected routes
  if (!PUBLIC_ROUTES.includes(pathname) && !user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
