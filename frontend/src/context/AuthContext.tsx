import React, { createContext, useContext, useEffect, useState } from "react";
import api, { extractError } from "../api/client";

export type User = { id: number; name: string; phone: string; role: string };

type Ctx = {
  user: User | null;
  loading: boolean;
  register: (name: string, phone: string, password: string) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const AuthCtx = createContext<Ctx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data } = await api.get<User>("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // быстрый пинг, чтобы сразу увидеть проблему с API в консоли
        api.get("/health").then(r => console.log("API OK:", r.data))
                          .catch(e => console.warn("API ERR:", e?.message || e));
        await refresh();
      } finally {
        setLoading(false); // важно — в finally
      }
    })();
  }, []);

  const register = async (name: string, phone: string, password: string) => {
    try {
      await api.post("/auth/register", { name, phone, phone_number: phone, password });
    } catch (e1: any) {
      try {
        const body = new URLSearchParams();
        body.set("name", name);
        body.set("phone", phone);
        body.set("password", password);
        await api.post("/auth/register", body, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch {
        throw new Error(extractError(e1));
      }
    }
    await refresh();
  };

  const login = async (phone: string, password: string) => {
    try {
      await api.post("/auth/login", { phone, password }); // JSON
    } catch (e1: any) {
      try {
        const form = new URLSearchParams();
        form.set("username", phone);
        form.set("password", password);
        await api.post("/auth/token", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch {
        throw new Error(extractError(e1));
      }
    }
    await refresh();
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthCtx.Provider value={{ user, loading, register, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
};
