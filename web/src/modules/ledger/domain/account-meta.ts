import { CategoryColorKey, CategoryIconKey } from "./category.types";
import { AccountType } from "./ledger.types";

export interface AccountVisualMeta {
  iconKey: CategoryIconKey;
  colorKey: CategoryColorKey;
}

export const ACCOUNT_TYPE_OPTIONS: {
  value: AccountType;
  label: string;
  description: string;
  defaultIcon: CategoryIconKey;
  defaultColor: CategoryColorKey;
}[] = [
  {
    value: "Savings",
    label: "Ahorros",
    description: "Caja de ahorro y fondos de reserva",
    defaultIcon: "piggy-bank",
    defaultColor: "emerald",
  },
  {
    value: "Checking",
    label: "Cuenta corriente",
    description: "Operaciones bancarias diarias y débito",
    defaultIcon: "landmark",
    defaultColor: "blue",
  },
  {
    value: "CryptoWallet",
    label: "Wallet Crypto",
    description: "USDT, BTC, Binance o billetera Web3",
    defaultIcon: "coins",
    defaultColor: "amber",
  },
  {
    value: "International",
    label: "Cuenta internacional",
    description: "Cuentas en el exterior (USD/EUR, Wise, etc.)",
    defaultIcon: "plane",
    defaultColor: "violet",
  },
  {
    value: "Wallet",
    label: "Billetera",
    description: "Efectivo, billetera móvil o uso rápido",
    defaultIcon: "wallet",
    defaultColor: "cyan",
  },
];

export const ACCOUNT_ICON_CHOICES: {
  key: CategoryIconKey;
  label: string;
}[] = [
  { key: "piggy-bank", label: "Ahorros" },
  { key: "landmark", label: "Banco" },
  { key: "coins", label: "Crypto / P2P" },
  { key: "wallet", label: "Billetera" },
  { key: "credit-card", label: "Tarjeta" },
  { key: "banknote", label: "Efectivo" },
  { key: "plane", label: "Internacional" },
  { key: "trending-up", label: "Inversión" },
  { key: "shield", label: "Bóveda / Reserva" },
  { key: "building", label: "Corporativa" },
  { key: "smartphone", label: "App Móvil" },
  { key: "briefcase", label: "Negocio" },
];

export function getAccountTypeLabel(type?: string): string {
  switch (type) {
    case "Savings":
      return "Ahorros";
    case "Checking":
      return "Cuenta corriente";
    case "CryptoWallet":
    case "Exchange":
      return "Wallet Crypto";
    case "International":
      return "Cuenta internacional";
    case "Wallet":
    case "Cash":
      return "Billetera";
    case "Bank":
      return "Cuenta bancaria";
    default:
      return type || "Cuenta";
  }
}

export function getDefaultAccountVisualMeta(type?: string): AccountVisualMeta {
  switch (type) {
    case "Savings":
      return { iconKey: "piggy-bank", colorKey: "emerald" };
    case "Checking":
    case "Bank":
      return { iconKey: "landmark", colorKey: "blue" };
    case "CryptoWallet":
    case "Exchange":
      return { iconKey: "coins", colorKey: "amber" };
    case "International":
      return { iconKey: "plane", colorKey: "violet" };
    case "Wallet":
    case "Cash":
    default:
      return { iconKey: "wallet", colorKey: "cyan" };
  }
}

export function resolveAccountVisualMeta(account: {
  type?: string;
  iconKey?: string | null;
  colorKey?: string | null;
}): AccountVisualMeta {
  const defaults = getDefaultAccountVisualMeta(account.type);
  return {
    iconKey: (account.iconKey as CategoryIconKey) || defaults.iconKey,
    colorKey: (account.colorKey as CategoryColorKey) || defaults.colorKey,
  };
}
