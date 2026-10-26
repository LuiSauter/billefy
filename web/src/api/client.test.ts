import { describe, it, expect, vi } from "vitest";
import { BillefyApiClient } from "./client";
import Decimal from "decimal.js";

describe("BillefyApiClient", () => {
  const userId = "11111111-1111-1111-1111-111111111111";

  it("should inject X-User-Id and parse Decimal balances on getAccounts", async () => {
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

    const client = new BillefyApiClient({ userId, fetchFn: mockFetch });
    const accounts = await client.getAccounts();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:5000/v1/accounts",
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

    const client = new BillefyApiClient({ userId, fetchFn: mockFetch });

    await expect(
      client.registerTransaction({
        accountId: "acc-1",
        amount: -10,
        direction: "Expense",
      })
    ).rejects.toThrow("Amount must be strictly greater than zero.");
  });
});
