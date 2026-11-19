import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Landmark } from "lucide-react";
import { IconTile } from "./IconTile";

describe("IconTile", () => {
  it("renders the default md emerald tile with the shared tile classes", () => {
    const html = renderToStaticMarkup(<IconTile icon={Landmark} variant="emerald" />);

    expect(html).toContain("w-9");
    expect(html).toContain("h-9");
    expect(html).toContain("rounded-xl");
    expect(html).toContain("bg-emerald-500/15");
    expect(html).toContain("border-emerald-500/30");
    expect(html).toContain("text-emerald-400");
    expect(html).toContain("<svg");
    expect(html).toContain("w-4");
  });

  it("supports the sm size", () => {
    const html = renderToStaticMarkup(<IconTile icon={Landmark} variant="rose" size="sm" />);

    expect(html).toContain("w-8");
    expect(html).toContain("h-8");
    expect(html).toContain("bg-rose-500/15");
    expect(html).not.toContain("w-9");
  });

  it("supports the primary xl variant used by the onboarding banner", () => {
    const html = renderToStaticMarkup(<IconTile icon={Landmark} variant="primary" size="xl" />);

    expect(html).toContain("w-12");
    expect(html).toContain("h-12");
    expect(html).toContain("bg-primary");
    expect(html).toContain("w-6");
  });

  it("lets callers extend or override classes", () => {
    const html = renderToStaticMarkup(
      <IconTile icon={Landmark} variant="purple" className="bg-purple-500/20 custom-x" />
    );

    expect(html).toContain("custom-x");
    expect(html).toContain("bg-purple-500/20");
    expect(html).not.toContain("bg-purple-500/15");
  });
});
