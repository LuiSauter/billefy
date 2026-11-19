"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, TrendingUp, Check, X, Loader2 } from "lucide-react";
import {
  StockSearchResult,
  searchStocks,
  CURATED_POPULAR_STOCKS,
} from "../domain/stock-market.service";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

interface StockPickerProps {
  selectedTicker: string;
  onSelectStock: (stock: StockSearchResult) => void;
  kind?: "stocks" | "funds";
  placeholder?: string;
}

export function StockPicker({
  selectedTicker,
  onSelectStock,
  kind,
  placeholder = "Buscar por ticker o nombre (ej. NVDA, Apple, S&P 500)...",
}: StockPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<StockSearchResult[]>(CURATED_POPULAR_STOCKS);
  const [loading, setLoading] = useState(false);

  // Filter default presets based on kind
  const filteredPopular = kind === "funds"
    ? CURATED_POPULAR_STOCKS.filter((s) => s.type === "ETF")
    : kind === "stocks"
    ? CURATED_POPULAR_STOCKS.filter((s) => s.type === "Stock")
    : CURATED_POPULAR_STOCKS;

  // Search execution with debounce
  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await searchStocks(q);
      const filtered = kind === "funds"
        ? data.filter((s) => s.type === "ETF")
        : kind === "stocks"
        ? data.filter((s) => s.type === "Stock")
        : data;
      setResults(filtered.length > 0 ? filtered : data);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const handleSelect = (stock: StockSearchResult) => {
    onSelectStock(stock);
    setQuery("");
    setIsOpen(false);
  };

  const handleCustomTicker = () => {
    const clean = query.trim().toUpperCase();
    if (!clean) return;
    onSelectStock({
      symbol: clean,
      name: clean,
      type: kind === "funds" ? "ETF" : "Stock",
      exchange: null,
      sector: null,
    });
    setQuery("");
    setIsOpen(false);
  };

  return (
    // Dismiss on focus leaving the picker (outside click, Tab away): no document-level listener to manage.
    <div
      className="relative w-full flex flex-col gap-2"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsOpen(false);
      }}
    >
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          aria-label="Buscar ticker o nombre"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results.length > 0) {
                handleSelect(results[0]);
              } else if (query.trim().length > 0) {
                handleCustomTicker();
              }
            } else if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="h-11 pl-10 pr-10 text-xs md:text-xs font-semibold"
        />

        {loading ? (
          <Loader2 className="w-4 h-4 absolute right-3.5 text-muted-foreground animate-spin" />
        ) : query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 text-muted-foreground"
            // Keep focus in the input so clearing does not dismiss the list.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setQuery("")}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {/* Dropdown Menu when Open */}
      {isOpen && (
        <div
          className="absolute top-12 left-0 right-0 z-50 rounded-2xl bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-md overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100"
          // Clicking an option must not blur the input (Safari does not focus buttons), or the list would close before the click lands.
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Quick Filter Chips Header */}
          <div className="p-2 border-b border-border/60 bg-muted/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-bold text-muted-foreground px-1 shrink-0">
              Sugeridos:
            </span>
            {filteredPopular.slice(0, 7).map((stock) => (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => handleSelect(stock)}
                className={cn(
                  "px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold shrink-0 transition cursor-pointer",
                  selectedTicker === stock.symbol
                    ? "bg-purple-600 text-white border-purple-500"
                    : "bg-card border-border hover:bg-muted text-foreground"
                )}
              >
                {stock.symbol}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="overflow-y-auto divide-y divide-border/40 p-1">
            {results.map((stock) => {
              const isSelected = selectedTicker === stock.symbol;
              return (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => handleSelect(stock)}
                  className={cn(
                    "w-full p-2.5 rounded-xl flex items-center justify-between text-left transition cursor-pointer",
                    isSelected
                      ? "bg-purple-500/15 border border-purple-500/30"
                      : "hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-extrabold text-xs text-foreground">
                          {stock.symbol}
                        </span>
                        <Badge
                          variant={stock.type === "ETF" ? "default" : "secondary"}
                          className="text-[9px] px-1.5 py-0 h-4 font-bold"
                        >
                          {stock.type}
                        </Badge>
                        {stock.exchange && (
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {stock.exchange}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate font-medium">
                        {stock.name}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-purple-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}

            {results.length === 0 && !loading && (
              <div className="p-4 text-center flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  No se encontraron resultados para «{query}»
                </span>
                {query.trim().length > 0 && (
                  <Button type="button" size="sm" onClick={handleCustomTicker}>
                    Usar ticker «{query.trim().toUpperCase()}»
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
