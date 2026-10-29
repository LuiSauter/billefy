export interface ApiProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export interface HttpRequestOptions extends RequestInit {
  headers?: HeadersInit;
}

export interface IHttpClient {
  get<T>(path: string, options?: HttpRequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<T>;
  delete<T>(path: string, options?: HttpRequestOptions): Promise<T>;
  setAuthSession(accessToken?: string, userId?: string): void;
  getAuthToken(): string | undefined;
  getUserId(): string | undefined;
}
