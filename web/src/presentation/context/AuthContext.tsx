"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BillefyApiClient, UserDto, AuthResponseDto } from "@/infrastructure/api/client";

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const STORAGE_KEY_TOKEN = "billefy_access_token";
const STORAGE_KEY_REFRESH = "billefy_refresh_token";
const STORAGE_KEY_USER = "billefy_user";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserDto | null;
  token: string | null;
  error: string | null;
  loginWithGoogle: (idToken: string) => Promise<AuthResponseDto>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserDto | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and verify authentication on mount
  useEffect(() => {
    async function verifyAuth() {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        const storedRefresh = localStorage.getItem(STORAGE_KEY_REFRESH);
        const storedUserJson = localStorage.getItem(STORAGE_KEY_USER);

        if (!storedToken) {
          setIsLoading(false);
          setIsAuthenticated(false);
          return;
        }

        let parsedUser: UserDto | null = null;
        if (storedUserJson) {
          try {
            parsedUser = JSON.parse(storedUserJson);
          } catch {
            // Ignore parse errors
          }
        }

        // Validate token against backend /api/v1/auth/me
        const client = new BillefyApiClient({
          baseUrl: DEFAULT_API_URL,
          authToken: storedToken,
          userId: parsedUser?.id,
        });

        try {
          const freshUser = await client.getCurrentUser();
          setToken(storedToken);
          setUser(freshUser);
          setIsAuthenticated(true);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(freshUser));
        } catch {
          // Token expired or invalid, try refresh
          if (storedRefresh) {
            try {
              const refreshRes = await client.refreshToken(storedRefresh);
              setToken(refreshRes.accessToken);
              setUser(refreshRes.user);
              setIsAuthenticated(true);
              localStorage.setItem(STORAGE_KEY_TOKEN, refreshRes.accessToken);
              localStorage.setItem(STORAGE_KEY_REFRESH, refreshRes.refreshToken);
              localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(refreshRes.user));
            } catch {
              // Refresh failed, clear session
              localStorage.removeItem(STORAGE_KEY_TOKEN);
              localStorage.removeItem(STORAGE_KEY_REFRESH);
              localStorage.removeItem(STORAGE_KEY_USER);
              setIsAuthenticated(false);
            }
          } else {
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_USER);
            setIsAuthenticated(false);
          }
        }
      } catch (err: unknown) {
        console.error("Auth verification failed:", err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<AuthResponseDto> => {
      setError(null);
      setIsLoading(true);

      const client = new BillefyApiClient({ baseUrl: DEFAULT_API_URL });

      try {
        const res = await client.loginWithGoogle(idToken);

        setToken(res.accessToken);
        setUser(res.user);
        setIsAuthenticated(true);

        localStorage.setItem(STORAGE_KEY_TOKEN, res.accessToken);
        localStorage.setItem(STORAGE_KEY_REFRESH, res.refreshToken);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user));

        return res;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo iniciar sesión con Google. Revisa tu conexión o credenciales.";
        setError(message);
        setIsAuthenticated(false);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    const storedRefresh = localStorage.getItem(STORAGE_KEY_REFRESH);
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);

    if (storedRefresh && storedToken) {
      try {
        const client = new BillefyApiClient({
          baseUrl: DEFAULT_API_URL,
          authToken: storedToken,
        });
        await client.logout(storedRefresh);
      } catch {
        // Logout is best-effort
      }
    }

    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH);
    localStorage.removeItem(STORAGE_KEY_USER);

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        error,
        loginWithGoogle,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
