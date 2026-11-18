import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestWebPushSubscriptionOnce: vi.fn(async () => undefined),
  registerServiceWorker: vi.fn(async () => undefined),
  loginWithPassword: vi.fn(),
  getCurrentUser: vi.fn(),
  storedToken: null as string | null,
}));

vi.mock("./webPushSubscription", () => ({
  requestWebPushSubscriptionOnce: mocks.requestWebPushSubscriptionOnce,
  registerServiceWorker: mocks.registerServiceWorker,
}));
vi.mock("../infrastructure/identity-api.repository", () => ({
  IdentityApiRepository: class {
    loginWithPassword = mocks.loginWithPassword;
    getCurrentUser = mocks.getCurrentUser;
  },
}));
vi.mock("@/shared/infrastructure/fetch-http.client", () => ({
  FetchHttpClient: class {
    constructor(public config: unknown = {}) {}
  },
}));
vi.mock("@/shared/infrastructure/local-storage-token.adapter", () => ({
  defaultTokenStorage: {
    getAccessToken: () => mocks.storedToken,
    getRefreshToken: () => null,
    getUser: () => null,
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    setUser: vi.fn(),
    clearSession: vi.fn(),
  },
}));

// The Vitest harness is node-only (no DOM renderer): model hook renders and
// effect commits explicitly, same approach as usePatrimonio.test.tsx.
let slots: unknown[] = [];
let cursor = 0;
let pendingEffects: (() => void)[] = [];
vi.mock("react", () => {
  const createElement = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) =>
    ({ type, props: { ...props, children } });
  return {
  default: { createElement },
  createElement,
  createContext: () => ({ Provider: "Provider" }),
  useContext: () => undefined,
  useState: (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [slots[index], (value: unknown) => {
      slots[index] = typeof value === "function" ? value(slots[index]) : value;
    }];
  },
  useRef: (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  },
  useEffect: (callback: () => void, dependencies: unknown[]) => {
    const index = cursor++;
    const previous = slots[index] as unknown[] | undefined;
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) {
      pendingEffects.push(callback);
    }
    slots[index] = dependencies;
  },
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
  };
});

import { AuthProvider } from "./AuthContext";

interface AuthValue {
  isAuthenticated: boolean;
  error: string | null;
  loginWithPassword: (email: string, password: string) => Promise<unknown>;
  clearError: () => void;
}

function render(): AuthValue {
  cursor = 0;
  const element = AuthProvider({ children: null }) as unknown as { props: { value: AuthValue } };
  return element.props.value;
}
async function commit() {
  const effects = pendingEffects;
  pendingEffects = [];
  effects.forEach(effect => effect());
  await Promise.resolve();
  await Promise.resolve();
}

const user = { id: "user-1", email: "a@b.c", fullName: "A", preferredCurrency: "BOB", createdAt: "" };

beforeEach(() => {
  slots = [];
  cursor = 0;
  pendingEffects = [];
  mocks.storedToken = null;
  vi.clearAllMocks();
});

describe("AuthProvider web push wiring", () => {
  it("registers the service worker on mount, unauthenticated, without requesting push", async () => {
    render();
    await commit();
    render();
    await commit();
    expect(mocks.registerServiceWorker).toHaveBeenCalledTimes(1);
    expect(mocks.requestWebPushSubscriptionOnce).not.toHaveBeenCalled();
  });

  it("requests the subscription once after loginWithPassword and not on later unrelated updates", async () => {
    mocks.loginWithPassword.mockResolvedValue({ accessToken: "t", refreshToken: "r", user });
    render();
    await commit();
    expect(mocks.requestWebPushSubscriptionOnce).not.toHaveBeenCalled();

    await render().loginWithPassword("a@b.c", "pw");
    render();
    await commit();
    expect(mocks.requestWebPushSubscriptionOnce).toHaveBeenCalledTimes(1);
    expect(mocks.requestWebPushSubscriptionOnce.mock.calls[0]).toEqual([expect.anything(), "user-1"]);

    // Unrelated state updates (error cleared / re-render) must not trigger it again.
    render().clearError();
    render();
    await commit();
    render();
    await commit();
    expect(mocks.requestWebPushSubscriptionOnce).toHaveBeenCalledTimes(1);
  });

  it("does not request the subscription when login fails", async () => {
    mocks.loginWithPassword.mockRejectedValue(new Error("bad credentials"));
    render();
    await commit();
    await expect(render().loginWithPassword("a@b.c", "bad")).rejects.toThrow("bad credentials");
    render();
    await commit();
    expect(mocks.requestWebPushSubscriptionOnce).not.toHaveBeenCalled();
  });

  it("requests the subscription after a successful session restore on mount", async () => {
    mocks.storedToken = "stored";
    mocks.getCurrentUser.mockResolvedValue(user);
    render();
    await commit();
    await new Promise(resolve => setTimeout(resolve, 0));
    render();
    await commit();
    expect(mocks.requestWebPushSubscriptionOnce).toHaveBeenCalledTimes(1);
    expect(mocks.requestWebPushSubscriptionOnce.mock.calls[0]).toEqual([expect.anything(), "user-1"]);
  });
});
