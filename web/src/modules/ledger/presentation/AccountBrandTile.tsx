import * as React from "react";
import { Banknote, Coins, TrendingUp, Wallet } from "lucide-react";
import { AccountDto } from "../domain/ledger.types";
import { getAccountVisualProfile } from "../domain/accounts-overview";
import { resolveAccountVisualMeta } from "../domain/account-meta";
import { CategoryIconBadge } from "./CategoryIcon";
import { IconTile } from "@/modules/dashboard/presentation/home/IconTile";
import { cn } from "@/shared/lib/utils";

export type AccountBrandTileSize = "md" | "lg";

const SIZE_CLASSES = {
  md: { tile: "w-10 h-10 rounded-xl", icon: "w-5 h-5", inner: "rounded-[10px]" },
  lg: { tile: "w-12 h-12 rounded-2xl", icon: "w-6 h-6", inner: "rounded-[14px]" },
} as const;

/** IconTile size + overrides that reproduce the brand-tile footprint for each size. */
const ICON_TILE_PROPS = {
  md: { size: "md", className: "size-10 rounded-xl" },
  lg: { size: "xl", className: "rounded-2xl" },
} as const;

/**
 * Brand identity tile for an account (single implementation for the card grid and the detail hero).
 * Brand hex colors are intentional: they are third-party brand identities, not theme colors.
 */
export function AccountBrandTile({
  account,
  size = "md",
}: {
  account: AccountDto;
  size?: AccountBrandTileSize;
}) {
  const profile = getAccountVisualProfile(account);
  const sizing = SIZE_CLASSES[size];
  const base = cn(sizing.tile, "flex items-center justify-center shrink-0");

  switch (profile.brandKey) {
    case "bcp":
      return (
        <div className={cn(base, "bg-[#002a8f] text-white font-extrabold text-xs tracking-tighter shadow-sm border border-blue-400/30")}>
          <span className="text-[#ff7800]">&gt;</span>BCP<span className="text-[#ff7800]">&gt;</span>
        </div>
      );
    case "mercadopago":
      return (
        <div className={cn(base, "bg-[#009ee3] text-white shadow-sm border border-cyan-400/30")}>
          <Wallet className={cn(sizing.icon, "text-white")} />
        </div>
      );
    case "binance":
      return (
        <div className={cn(base, "bg-[#1e2026] text-[#f0b90b] shadow-sm border border-amber-400/30")}>
          <Coins className={cn(sizing.icon, "text-[#f0b90b]")} />
        </div>
      );
    case "payoneer":
      return (
        <div className={cn(sizing.tile, "bg-gradient-to-tr from-[#ff4800] via-[#ff0070] to-[#7928ca] p-[2px] shrink-0")}>
          <div className={cn("w-full h-full bg-[#121626] flex items-center justify-center", sizing.inner)}>
            <div className="w-4 h-4 rounded-full border-2 border-orange-400" />
          </div>
        </div>
      );
    case "bisa":
      return (
        <div className={cn(base, "bg-[#ffd100] text-[#1e293b] font-extrabold text-xs shadow-sm")}>
          bisa
        </div>
      );
    case "cash":
      return <IconTile icon={Banknote} variant="emerald" {...ICON_TILE_PROPS[size]} />;
    case "broker":
      return <IconTile icon={TrendingUp} variant="purple" {...ICON_TILE_PROPS[size]} />;
    default: {
      const meta = resolveAccountVisualMeta(account);
      return <CategoryIconBadge iconKey={meta.iconKey} colorKey={meta.colorKey} size={size} />;
    }
  }
}
