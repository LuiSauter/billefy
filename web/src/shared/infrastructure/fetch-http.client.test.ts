import { describe, it, expect, vi } from "vitest";
import Decimal from "decimal.js";
import { FetchHttpClient } from "./fetch-http.client";
import { LedgerApiRepository } from "@/modules/ledger/infrastructure/ledger-api.repository";
import { IdentityApiRepository } from "@/modules/identity/infrastructure/identity-api.repository";
import { NotificationsApiRepository } from "@/modules/notifications/infrastructure/notifications-api.repository";

describe("FetchHttpClient & Module Repositories", () => {
  const userId = "11111111-1111-1111-1111-111111111111";

  it("should inject X-User-Id and parse Decimal balances on LedgerApiRepository.getAccounts", async () => {
    const mockAccounts = [
      {
        id: "acc-1",
        name: "Banco Sol",
        type: "Bank",
        currency: "BOB",
        balance: 1500.5,
        createdAt: "2026-10-26T12:00:00Z",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAccounts,
    });

    const http = new FetchHttpClient({ userId, fetchFn: mockFetch });
    const ledgerRepo = new LedgerApiRepository(http);
    const accounts = await ledgerRepo.getAccounts();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:5267/v1/accounts",
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("Banco Sol");
    expect(accounts[0].balance).toBeInstanceOf(Decimal);
    expect(accounts[0].balance.toString()).toBe("1500.5");
  });

  it("should throw ApiError with problem details on 400 Bad Request", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        title: "Transaction.InvalidAmount",
        detail: "Amount must be strictly greater than zero.",
      }),
    });

    const http = new FetchHttpClient({ userId, fetchFn: mockFetch });
    const ledgerRepo = new LedgerApiRepository(http);

    await expect(
      ledgerRepo.registerTransaction({
        accountId: "acc-1",
        amount: -10,
        direction: "Expense",
      })
    ).rejects.toThrow("Amount must be strictly greater than zero.");
  });

  it("should handle IdentityApiRepository.loginWithGoogle and store authToken and userId", async () => {
    const mockAuthResponse = {
      accessToken: "mock_jwt_token_12345",
      refreshToken: "mock_refresh_token_67890",
      expiresIn: 3600,
      tokenType: "Bearer",
      user: {
        id: "22222222-2222-2222-2222-222222222222",
        email: "usuario.google@billefy.app",
        fullName: "Usuario Google",
        preferredCurrency: "BOB",
        createdAt: "2025-01-01T00:00:00Z",
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAuthResponse,
    });

    const http = new FetchHttpClient({ fetchFn: mockFetch });
    const identityRepo = new IdentityApiRepository(http);
    const auth = await identityRepo.loginWithGoogle("google_id_token_xyz", "BOB");

    expect(auth.accessToken).toBe("mock_jwt_token_12345");
    expect(http.getAuthToken()).toBe("mock_jwt_token_12345");
    expect(http.getUserId()).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("should handle NotificationsApiRepository.registerDeviceToken", async () => {
    const mockDevice = {
      id: "dev-1",
      platform: "Android",
      createdAt: "2025-01-01T00:00:00Z",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockDevice,
    });

    const http = new FetchHttpClient({ userId, fetchFn: mockFetch });
    const notificationsRepo = new NotificationsApiRepository(http);
    const dev = await notificationsRepo.registerDeviceToken({
      token: "fcm_token_123",
      platform: "Android",
    });

    expect(dev.platform).toBe("Android");
    expect(dev.id).toBe("dev-1");
  });

  it("resolves to an empty object instead of throwing on a 200 with an empty body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    });

    const http = new FetchHttpClient({ userId, fetchFn: mockFetch });
    await expect(http.get("/v1/workspaces/w1/budget")).resolves.toEqual({});
  });
});
