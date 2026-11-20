import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InvestmentNotesCard } from "./InvestmentNotesCard";

describe("InvestmentNotesCard", () => {
  it("is honest when nothing can persist notes: no edit pencil, no Guardar, explicit notice", () => {
    const html = renderToStaticMarkup(<InvestmentNotesCard />);
    expect(html).not.toContain("Guardar");
    expect(html).not.toContain("Editar notas");
    expect(html).toContain("Las notas todavía no se guardan");
  });

  it("offers editing only when a real save handler exists", () => {
    const html = renderToStaticMarkup(<InvestmentNotesCard notes="Tesis" onSaveNotes={vi.fn()} />);
    expect(html).toContain("Editar notas");
    expect(html).toContain("Tesis");
    expect(html).not.toContain("Las notas todavía no se guardan");
  });
});
