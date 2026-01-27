/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API = import.meta.env.VITE_API_URL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("auth");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { user: User | null; token: string | null };
      return parsed.user ?? null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("auth");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { user: User | null; token: string | null };
      return parsed.token ?? null;
    } catch {
      return null;
    }
  });

  async function login(username: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      // let the caller show the appropriate message
      throw new Error("LOGIN_FAILED");
    }
    const data = await res.json();
    if (!data?.token) {
      throw new Error("LOGIN_FAILED");
    }
    setToken(data.token);
    setUser(data.user);
  }

  async function signup(username: string, password: string) {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      throw new Error("SIGNUP_FAILED");
    }
    const data = await res.json();
    if (!data?.token) {
      throw new Error("SIGNUP_FAILED");
    }
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    setUser(null);
    setToken(null);
  }

  // keep auth state in localStorage so refreshes stay logged in
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user && token) {
      window.localStorage.setItem("auth", JSON.stringify({ user, token }));
    } else {
      window.localStorage.removeItem("auth");
    }
  }, [user, token]);

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
