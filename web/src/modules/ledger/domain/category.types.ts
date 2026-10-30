import { TransactionDirection } from "./ledger.types";

export type CategoryIconGroupKey =
  | "food"
  | "transport"
  | "home"
  | "shopping"
  | "health"
  | "leisure"
  | "finance";

export type CategoryIconKey =
  // Food & Drinks
  | "utensils"
  | "coffee"
  | "pizza"
  | "beer"
  | "wine"
  | "ice-cream"
  | "apple"
  | "croissant"
  | "soup"
  // Transport & Travel
  | "car"
  | "bus"
  | "train"
  | "plane"
  | "bike"
  | "fuel"
  | "compass"
  | "hotel"
  | "map-pin"
  // Home & Utilities
  | "home"
  | "zap"
  | "wifi"
  | "droplets"
  | "flame"
  | "tv"
  | "sofa"
  | "key"
  | "wrench"
  | "hammer"
  | "shield"
  // Shopping & Lifestyle
  | "shopping-bag"
  | "shopping-cart"
  | "shirt"
  | "watch"
  | "glasses"
  | "scissors"
  | "gift"
  | "package"
  | "tag"
  // Health, Sports & Family
  | "heart-pulse"
  | "pill"
  | "stethoscope"
  | "dumbbell"
  | "activity"
  | "smile"
  | "baby"
  | "paw-print"
  // Leisure, Education & Tech
  | "gamepad"
  | "music"
  | "film"
  | "camera"
  | "book-open"
  | "graduation-cap"
  | "smartphone"
  | "laptop"
  | "headphones"
  | "ticket"
  // Work, Finance & Income
  | "briefcase"
  | "wallet"
  | "landmark"
  | "piggy-bank"
  | "trending-up"
  | "banknote"
  | "credit-card"
  | "coins"
  | "receipt"
  | "calculator"
  | "award"
  | "building"
  | "handshake"
  | "sparkles";

export type CategoryColorKey =
  | "blue"
  | "emerald"
  | "rose"
  | "amber"
  | "violet"
  | "cyan"
  | "indigo"
  | "pink"
  | "orange"
  | "teal";

export interface UserCategory {
  id: string;
  name: string;
  direction: TransactionDirection;
  iconKey: CategoryIconKey;
  colorKey: CategoryColorKey;
  createdAt: string;
}

export interface CreateUserCategoryInput {
  name: string;
  direction: TransactionDirection;
  iconKey: CategoryIconKey;
  colorKey: CategoryColorKey;
}

export interface CategoryColorTheme {
  key: CategoryColorKey;
  label: string;
  bgClass: string;
  textClass: string;
  ringClass: string;
  swatchHex: string;
}

export const CATEGORY_COLOR_THEMES: Record<CategoryColorKey, CategoryColorTheme> = {
  blue: {
    key: "blue",
    label: "Azul",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-500",
    ringClass: "ring-blue-500/40",
    swatchHex: "#3b82f6",
  },
  emerald: {
    key: "emerald",
    label: "Esmeralda",
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-500",
    ringClass: "ring-emerald-500/40",
    swatchHex: "#10b981",
  },
  rose: {
    key: "rose",
    label: "Rosa",
    bgClass: "bg-rose-500/15",
    textClass: "text-rose-500",
    ringClass: "ring-rose-500/40",
    swatchHex: "#f43f5e",
  },
  amber: {
    key: "amber",
    label: "Ámbar",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-500",
    ringClass: "ring-amber-500/40",
    swatchHex: "#f59e0b",
  },
  violet: {
    key: "violet",
    label: "Violeta",
    bgClass: "bg-violet-500/15",
    textClass: "text-violet-500",
    ringClass: "ring-violet-500/40",
    swatchHex: "#8b5cf6",
  },
  cyan: {
    key: "cyan",
    label: "Cian",
    bgClass: "bg-cyan-500/15",
    textClass: "text-cyan-500",
    ringClass: "ring-cyan-500/40",
    swatchHex: "#06b6d4",
  },
  indigo: {
    key: "indigo",
    label: "Índigo",
    bgClass: "bg-indigo-500/15",
    textClass: "text-indigo-500",
    ringClass: "ring-indigo-500/40",
    swatchHex: "#6366f1",
  },
  pink: {
    key: "pink",
    label: "Fucsia",
    bgClass: "bg-pink-500/15",
    textClass: "text-pink-500",
    ringClass: "ring-pink-500/40",
    swatchHex: "#ec4899",
  },
  orange: {
    key: "orange",
    label: "Naranja",
    bgClass: "bg-orange-500/15",
    textClass: "text-orange-500",
    ringClass: "ring-orange-500/40",
    swatchHex: "#f97316",
  },
  teal: {
    key: "teal",
    label: "Turquesa",
    bgClass: "bg-teal-500/15",
    textClass: "text-teal-500",
    ringClass: "ring-teal-500/40",
    swatchHex: "#14b8a6",
  },
};

export const CATEGORY_COLOR_LIST: CategoryColorTheme[] = Object.values(
  CATEGORY_COLOR_THEMES
);
