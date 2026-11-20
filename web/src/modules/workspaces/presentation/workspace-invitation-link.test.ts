import { describe, expect, it } from "vitest";
import { buildWorkspaceInvitationLinkUrl } from "./workspace-invitation-link";

describe("buildWorkspaceInvitationLinkUrl", () => {
  it("places the token in the URL fragment, never the query string", () => {
    const url = buildWorkspaceInvitationLinkUrl("https://app.billefy.test", "abc-123_XYZ");
    expect(url).toBe("https://app.billefy.test/join-workspace#token=abc-123_XYZ");
  });

  it("encodes characters that are not already link-safe", () => {
    const url = buildWorkspaceInvitationLinkUrl("https://app.billefy.test", "a b+c");
    expect(url).toBe("https://app.billefy.test/join-workspace#token=a%20b%2Bc");
  });
});
