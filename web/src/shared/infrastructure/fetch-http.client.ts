import {
  ApiProblemDetails,
  HttpRequestOptions,
  IHttpClient,
} from "../application/http-client.contract";
import { ITokenStorage } from "../application/token-storage.contract";
import { defaultTokenStorage } from "./local-storage-token.adapter";

export interface HttpClientConfig {
  baseUrl?: string;
  userId?: string;
  authToken?: string;
  fetchFn?: typeof fetch;
  tokenStorage?: ITokenStorage;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    pictureUrl?: string;
    preferredCurrency: string;
    createdAt: string;
  };
}

export class FetchHttpClient implements IHttpClient {
  private readonly baseUrl: string;
  private userId?: string;
  private authToken?: string;
  private readonly fetchFn: typeof fetch;
  private readonly tokenStorage: ITokenStorage;

  constructor(config: HttpClientConfig = {}) {
    const defaultBaseUrl =
      (typeof window !== "undefined" && (window.localStorage?.getItem("billefy_api_url") || (window as unknown as { __BILLEFY_API_URL__?: string }).__BILLEFY_API_URL__)) ||
      (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
      "http://localhost:5267";
    this.baseUrl = (config.baseUrl || defaultBaseUrl).replace(/\/+$/, "");
    this.userId = config.userId;
    this.authToken = config.authToken;
    this.tokenStorage = config.tokenStorage || defaultTokenStorage;
    this.fetchFn =
      config.fetchFn ||
      (typeof window !== "undefined"
        ? window.fetch.bind(window)
        : typeof globalThis.fetch !== "undefined"
        ? globalThis.fetch.bind(globalThis)
        : ((async () => new Response()) as typeof fetch));
  }

  setAuthSession(accessToken?: string, userId?: string): void {
    this.authToken = accessToken;
    if (userId !== undefined) {
      this.userId = userId;
    }
  }

  getAuthToken(): string | undefined {
    return this.authToken;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  async get<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  async post<T>(
    path: string,
    body?: unknown,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(
    path: string,
    body?: unknown,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  private getEffectiveToken(): string | undefined {
    return this.authToken || this.tokenStorage.getAccessToken();
  }

  private getEffectiveUserId(): string | undefined {
    return this.userId || this.tokenStorage.getUser()?.id;
  }

  private async request<T>(
    path: string,
    options: HttpRequestOptions & { _isRetry?: boolean } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    const effectiveUserId = this.getEffectiveUserId();
    const effectiveToken = this.getEffectiveToken();

    if (effectiveUserId) {
      headers.set("X-User-Id", effectiveUserId);
    }

    if (effectiveToken) {
      headers.set("Authorization", `Bearer ${effectiveToken}`);
    }

    const res = await this.fetchFn(url, {
      ...options,
      headers,
    });

    if (res.status === 401 && !options._isRetry && !path.includes("/auth/")) {
      const storedRefresh = this.tokenStorage.getRefreshToken();
      if (storedRefresh) {
        try {
          const refreshRes = await this.post<RefreshResponse>(
            "/api/v1/auth/refresh",
            { refreshToken: storedRefresh },
            { _isRetry: true } as HttpRequestOptions
          );

          if (refreshRes?.accessToken) {
            this.authToken = refreshRes.accessToken;
            this.tokenStorage.setAccessToken(refreshRes.accessToken);
            if (refreshRes.refreshToken) {
              this.tokenStorage.setRefreshToken(refreshRes.refreshToken);
            }
            if (refreshRes.user) {
              this.userId = refreshRes.user.id;
              this.tokenStorage.setUser(refreshRes.user);
            }

            const retryHeaders = new Headers(options.headers || {});
            retryHeaders.set("Content-Type", "application/json");
            retryHeaders.set("Authorization", `Bearer ${refreshRes.accessToken}`);
            if (effectiveUserId) retryHeaders.set("X-User-Id", effectiveUserId);

            return this.request<T>(path, {
              ...options,
              headers: retryHeaders,
              _isRetry: true,
            });
          }
        } catch {
          this.tokenStorage.clearSession();
        }
      }
    }

    if (!res.ok) {
      let problem: ApiProblemDetails = {};
      try {
        problem = await res.json();
      } catch {
        // Fallback if response is not JSON
      }
      throw new Error(
        problem.detail || problem.title || `API error: ${res.statusText}`
      );
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }
}
