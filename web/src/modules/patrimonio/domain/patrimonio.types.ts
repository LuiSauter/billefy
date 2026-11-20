export type AssetCategory =
  | "realestate"
  | "investments"
  | "digital"
  | "vehicles"
  | "cash"
  | "other";

export type LiabilityCategory =
  | "mortgage"
  | "loan"
  | "creditcard"
  | "other";

export interface PatrimonialAsset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

export interface PatrimonialLiability {
  id: string;
  name: string;
  category: LiabilityCategory;
  amount: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

export interface AssetItemDetail {
  id: string;
  name: string;
  value: number;
  originalValue?: number;
  category: AssetCategory;
  currency: string;
  notes?: string;
  isFromModule?: boolean;
}

export interface LiabilityItemDetail {
  id: string;
  name: string;
  amount: number;
  originalAmount?: number;
  category: LiabilityCategory;
  currency: string;
  notes?: string;
  isFromModule?: boolean;
}

export interface AssetCategorySummary {
  category: AssetCategory;
  label: string;
  description: string;
  totalValue: number;
  percentage: number;
  color: string;
  icon: string;
  itemsCount: number;
  items: AssetItemDetail[];
}

export interface LiabilityCategorySummary {
  category: LiabilityCategory;
  label: string;
  totalAmount: number;
  percentage: number;
  color: string;
  icon: string;
  itemsCount: number;
  items: LiabilityItemDetail[];
}

export interface PatrimonioEvolutionPoint {
  date: string;
  month: string;
  value: number;
  formattedValue: string;
}

export interface PatrimonioInsight {
  id: string;
  text: string;
  type: "positive" | "info" | "warning";
}

export interface PatrimonioOverviewMetrics {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  debtRatioPct: number;
  debtHealth: "Saludable" | "Moderado" | "Comprometido";
  previousNetWorthChangePct: number | null;
  assetsChangePct: number | null;
  liabilitiesChangePct: number | null;
  assetsByCategory: AssetCategorySummary[];
  liabilitiesByCategory: LiabilityCategorySummary[];
  composition: {
    assetsPct: number;
    liabilitiesPct: number;
  };
  evolutionPoints: PatrimonioEvolutionPoint[];
  insights: PatrimonioInsight[];
}
