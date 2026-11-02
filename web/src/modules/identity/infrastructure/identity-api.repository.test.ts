import { describe, expect, it, vi } from "vitest";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { IdentityApiRepository } from "./identity-api.repository";

describe("IdentityApiRepository financial reset", () => {
  it("requests deletion of financial data without using account deletion", async () => {
    const deleteRequest = vi.fn(async () => undefined);
    const http = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: deleteRequest,
      setAuthSession: vi.fn(),
      getAuthToken: vi.fn(),
      getUserId: vi.fn(),
    } as unknown as IHttpClient;
    const repository = new IdentityApiRepository(http);

    await repository.resetFinancialData();

    expect(deleteRequest).toHaveBeenCalledExactlyOnceWith("/api/v1/auth/financial-data");
  });
});
