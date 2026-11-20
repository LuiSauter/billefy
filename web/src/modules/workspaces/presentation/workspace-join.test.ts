import { describe, expect, it, vi } from "vitest";
import { captureWorkspaceInvitationToken, WORKSPACE_INVITATION_TOKEN_ERROR } from "./workspace-join";

describe("workspace invitation fragment capture", () => {
  function location(hash: string) {
    const replaceState = vi.fn();
    const win = {
      location: { hash, pathname: "/join-workspace", search: "?keep=1" },
      history: { state: { preserved: true }, replaceState },
    } as unknown as Window;
    return { win, replaceState };
  }

  it("captures either supported fragment form and scrubs before returning", () => {
    const token = "a".repeat(43);
    for (const fragment of [`#token=${token}`, `#${token}`]) {
      const { win, replaceState } = location(fragment);
      expect(captureWorkspaceInvitationToken(win)).toEqual({ token, error: null });
      expect(replaceState).toHaveBeenCalledOnce();
      expect(replaceState).toHaveBeenCalledWith({ preserved: true }, "", "/join-workspace?keep=1");
    }
  });

  it("scrubs missing and malformed fragments and returns only a safe error", () => {
    for (const fragment of ["", "#token=short", `#${"a".repeat(42)}`, `#${"a".repeat(42)}+`]) {
      const { win, replaceState } = location(fragment);
      expect(captureWorkspaceInvitationToken(win)).toEqual({ token: null, error: WORKSPACE_INVITATION_TOKEN_ERROR });
      expect(replaceState).toHaveBeenCalledOnce();
    }
  });

  it("fails closed when the fragment cannot be scrubbed", () => {
    const token = "a".repeat(43);
    const { win } = location(`#${token}`);
    vi.spyOn(win.history, "replaceState").mockImplementation(() => { throw new Error("blocked"); });
    expect(captureWorkspaceInvitationToken(win)).toEqual({ token: null, error: WORKSPACE_INVITATION_TOKEN_ERROR });
  });
});
