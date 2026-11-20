import { ITokenStorage, StoredSessionUser } from "../application/token-storage.contract";

const STORAGE_KEY_TOKEN = "billefy_access_token";
const STORAGE_KEY_REFRESH = "billefy_refresh_token";
const STORAGE_KEY_USER = "billefy_user";

export class LocalStorageTokenAdapter implements ITokenStorage {
  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  getAccessToken(): string | undefined {
    if (!this.isBrowser()) return undefined;
    return localStorage.getItem(STORAGE_KEY_TOKEN) || undefined;
  }

  setAccessToken(token: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  }

  getRefreshToken(): string | undefined {
    if (!this.isBrowser()) return undefined;
    return localStorage.getItem(STORAGE_KEY_REFRESH) || undefined;
  }

  setRefreshToken(token: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEY_REFRESH, token);
  }

  getUser<T extends StoredSessionUser = StoredSessionUser>(): T | null {
    if (!this.isBrowser()) return null;
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setUser(user: StoredSessionUser): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  }

  clearSession(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH);
    localStorage.removeItem(STORAGE_KEY_USER);
  }
}

export const defaultTokenStorage = new LocalStorageTokenAdapter();
