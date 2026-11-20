export interface StoredSessionUser {
  id: string;
  email: string;
  fullName: string;
  pictureUrl?: string;
  preferredCurrency: string;
  createdAt: string;
}

export interface ITokenStorage {
  getAccessToken(): string | undefined;
  setAccessToken(token: string): void;
  getRefreshToken(): string | undefined;
  setRefreshToken(token: string): void;
  getUser<T extends StoredSessionUser = StoredSessionUser>(): T | null;
  setUser(user: StoredSessionUser): void;
  clearSession(): void;
}
