"use client";

// Auth context for Billefy authentication state
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { FetchHttpClient } from "@/shared/infrastructure/fetch-http.client";
import { defaultTokenStorage } from "@/shared/infrastructure/local-storage-token.adapter";
import { AuthResponseDto, UserDto } from "../domain/identity.types";
import { IdentityApiRepository } from "../infrastructure/identity-api.repository";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserDto | null;
  token: string | null;
  error: string | null;
  loginWithPassword: (email: string, password: string) => Promise<AuthResponseDto>;
  registerWithPassword: (fullName: string, email: string, password: string) => Promise<AuthResponseDto>;
  loginWithGoogle: (idToken: string) => Promise<AuthResponseDto>;
  updatePreferredCurrency: (preferredCurrency: string) => Promise<UserDto>;
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

  useEffect(() => {
    async function verifyAuth() {
      try {
        const storedToken = defaultTokenStorage.getAccessToken();
        const storedRefresh = defaultTokenStorage.getRefreshToken();
        const storedUser = defaultTokenStorage.getUser<UserDto>();

        if (!storedToken) {
          setIsLoading(false);
          setIsAuthenticated(false);
          return;
        }

        const http = new FetchHttpClient({
          authToken: storedToken,
          userId: storedUser?.id,
        });
        const repo = new IdentityApiRepository(http);

        try {
          const freshUser = await repo.getCurrentUser();
          const currentToken = defaultTokenStorage.getAccessToken() || storedToken;
          setToken(currentToken);
          setUser(freshUser);
          setIsAuthenticated(true);
          defaultTokenStorage.setUser(freshUser);
        } catch {
          if (storedRefresh) {
            try {
              const refreshRes = await repo.refreshToken(storedRefresh);
              setToken(refreshRes.accessToken);
              setUser(refreshRes.user);
              setIsAuthenticated(true);
              defaultTokenStorage.setAccessToken(refreshRes.accessToken);
              defaultTokenStorage.setRefreshToken(refreshRes.refreshToken);
              defaultTokenStorage.setUser(refreshRes.user);
            } catch {
              defaultTokenStorage.clearSession();
              setIsAuthenticated(false);
            }
          } else {
            defaultTokenStorage.clearSession();
            setIsAuthenticated(false);
          }
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string): Promise<AuthResponseDto> => {
    setError(null);
    setIsLoading(true);

    const repo = new IdentityApiRepository(new FetchHttpClient());

    try {
      const res = await repo.loginWithPassword(email, password);
      setToken(res.accessToken);
      setUser(res.user);
      setIsAuthenticated(true);

      defaultTokenStorage.setAccessToken(res.accessToken);
      defaultTokenStorage.setRefreshToken(res.refreshToken);
      defaultTokenStorage.setUser(res.user);

      return res;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Credenciales inválidas. Revisa tu email y contraseña.";
      setError(message);
      setIsAuthenticated(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerWithPassword = useCallback(async (fullName: string, email: string, password: string): Promise<AuthResponseDto> => {
    setError(null);
    setIsLoading(true);

    const repo = new IdentityApiRepository(new FetchHttpClient());

    try {
      const res = await repo.registerWithPassword(fullName, email, password);
      setToken(res.accessToken);
      setUser(res.user);
      setIsAuthenticated(true);

      defaultTokenStorage.setAccessToken(res.accessToken);
      defaultTokenStorage.setRefreshToken(res.refreshToken);
      defaultTokenStorage.setUser(res.user);

      return res;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al registrar la cuenta.";
      setError(message);
      setIsAuthenticated(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<AuthResponseDto> => {
    setError(null);
    setIsLoading(true);

    const repo = new IdentityApiRepository(new FetchHttpClient());

    try {
      const res = await repo.loginWithGoogle(idToken);
      setToken(res.accessToken);
      setUser(res.user);
      setIsAuthenticated(true);

      defaultTokenStorage.setAccessToken(res.accessToken);
      defaultTokenStorage.setRefreshToken(res.refreshToken);
      defaultTokenStorage.setUser(res.user);

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
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const storedRefresh = defaultTokenStorage.getRefreshToken();
    const storedToken = defaultTokenStorage.getAccessToken();

    if (storedRefresh && storedToken) {
      try {
        const repo = new IdentityApiRepository(
          new FetchHttpClient({ authToken: storedToken })
        );
        await repo.logout(storedRefresh);
      } catch {
        // Logout is best-effort
      }
    }

    defaultTokenStorage.clearSession();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const updatePreferredCurrency = useCallback(async (preferredCurrency: string): Promise<UserDto> => {
    const storedToken = defaultTokenStorage.getAccessToken() || token;
    const storedUser = user || defaultTokenStorage.getUser<UserDto>();
    const repo = new IdentityApiRepository(
      new FetchHttpClient({
        authToken: storedToken ?? undefined,
        userId: storedUser?.id,
      })
    );
    const updated = await repo.updatePreferredCurrency(preferredCurrency);
    setUser(updated);
    defaultTokenStorage.setUser(updated);
    return updated;
  }, [token, user]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        error,
        loginWithPassword,
        registerWithPassword,
        loginWithGoogle,
        updatePreferredCurrency,
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
