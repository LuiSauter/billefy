import type React from "react";
import { Banknote, Car, CreditCard, Home, Laptop, MoreHorizontal, Sparkles, TrendingUp, User } from "lucide-react";

/** Icon keys produced by the domain's asset and liability category metadata. */
export const PATRIMONIO_CATEGORY_ICONS: Record<string, React.ElementType> = {
  home: Home,
  "trending-up": TrendingUp,
  laptop: Laptop,
  car: Car,
  banknote: Banknote,
  sparkles: Sparkles,
  user: User,
  "credit-card": CreditCard,
  "more-horizontal": MoreHorizontal,
};
