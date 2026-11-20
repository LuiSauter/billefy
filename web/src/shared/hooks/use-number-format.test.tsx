import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useNumberFormat } from "./use-number-format";
import { setNumberFormatPreferences } from "@/shared/lib/number-format";

function Sample() { const format = useNumberFormat(); return <span>{format(1234.5)}</span>; }
describe("useNumberFormat", () => {
  it("uses the current external-store preferences on render", () => {
    setNumberFormatPreferences("es-BO", 2);
    expect(renderToStaticMarkup(<Sample />)).toContain("1.234,50");
    setNumberFormatPreferences("en-US", 4);
    // SSR always uses the stable defaults; client subscribers receive the updated snapshot.
    expect(renderToStaticMarkup(<Sample />)).toContain("1.234,50");
  });
});
