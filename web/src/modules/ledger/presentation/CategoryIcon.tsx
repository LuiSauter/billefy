"use client";

import React from "react";
import {
  Utensils,
  Coffee,
  Pizza,
  Beer,
  Wine,
  IceCreamCone,
  Apple,
  Croissant,
  Soup,
  Car,
  Bus,
  TrainFront,
  Plane,
  Bike,
  Fuel,
  Compass,
  Hotel,
  MapPin,
  Home,
  Zap,
  Wifi,
  Droplets,
  Flame,
  Tv,
  Sofa,
  Key,
  Wrench,
  Hammer,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Watch,
  Glasses,
  Scissors,
  Gift,
  Package,
  Tag,
  HeartPulse,
  Pill,
  Stethoscope,
  Dumbbell,
  Activity,
  Smile,
  Baby,
  PawPrint,
  Gamepad2,
  Music,
  Film,
  Camera,
  BookOpen,
  GraduationCap,
  Smartphone,
  Laptop,
  Headphones,
  Ticket,
  Briefcase,
  Wallet,
  Landmark,
  PiggyBank,
  TrendingUp,
  Banknote,
  CreditCard,
  Coins,
  Receipt,
  Calculator,
  Award,
  Building2,
  Handshake,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import {
  CATEGORY_COLOR_THEMES,
  CategoryColorKey,
  CategoryIconGroupKey,
  CategoryIconKey,
} from "../domain/category.types";

export interface CategoryIconDefinition {
  key: CategoryIconKey;
  label: string;
  group: CategoryIconGroupKey;
  icon: LucideIcon;
}

export interface CategoryIconGroup {
  key: CategoryIconGroupKey;
  label: string;
  icons: CategoryIconDefinition[];
}

export const CATEGORY_ICON_GROUPS: CategoryIconGroup[] = [
  {
    key: "food",
    label: "Alimentación & Bebidas",
    icons: [
      { key: "utensils", label: "Restaurante", group: "food", icon: Utensils },
      { key: "coffee", label: "Café", group: "food", icon: Coffee },
      { key: "pizza", label: "Comida Rápida", group: "food", icon: Pizza },
      { key: "soup", label: "Almuerzo", group: "food", icon: Soup },
      { key: "croissant", label: "Panadería", group: "food", icon: Croissant },
      { key: "apple", label: "Mercado & Frutas", group: "food", icon: Apple },
      { key: "ice-cream", label: "Postres", group: "food", icon: IceCreamCone },
      { key: "beer", label: "Bar & Cerveza", group: "food", icon: Beer },
      { key: "wine", label: "Vinos & Licores", group: "food", icon: Wine },
    ],
  },
  {
    key: "transport",
    label: "Transporte & Viajes",
    icons: [
      { key: "car", label: "Auto / Taxi", group: "transport", icon: Car },
      { key: "bus", label: "Transporte Público", group: "transport", icon: Bus },
      { key: "fuel", label: "Gasolina", group: "transport", icon: Fuel },
      { key: "bike", label: "Bicicleta / Moto", group: "transport", icon: Bike },
      { key: "train", label: "Tren / Teleférico", group: "transport", icon: TrainFront },
      { key: "plane", label: "Vuelos", group: "transport", icon: Plane },
      { key: "hotel", label: "Hospedaje", group: "transport", icon: Hotel },
      { key: "compass", label: "Turismo", group: "transport", icon: Compass },
      { key: "map-pin", label: "Peajes / Parking", group: "transport", icon: MapPin },
    ],
  },
  {
    key: "home",
    label: "Hogar & Servicios",
    icons: [
      { key: "home", label: "Alquiler / Casa", group: "home", icon: Home },
      { key: "zap", label: "Electricidad", group: "home", icon: Zap },
      { key: "wifi", label: "Internet", group: "home", icon: Wifi },
      { key: "droplets", label: "Agua", group: "home", icon: Droplets },
      { key: "flame", label: "Gas", group: "home", icon: Flame },
      { key: "tv", label: "TV / Streaming", group: "home", icon: Tv },
      { key: "sofa", label: "Muebles", group: "home", icon: Sofa },
      { key: "key", label: "Expensas", group: "home", icon: Key },
      { key: "wrench", label: "Reparaciones", group: "home", icon: Wrench },
      { key: "hammer", label: "Ferretería", group: "home", icon: Hammer },
      { key: "shield", label: "Seguros", group: "home", icon: Shield },
    ],
  },
  {
    key: "shopping",
    label: "Compras & Estilo de Vida",
    icons: [
      { key: "shopping-bag", label: "Tienda", group: "shopping", icon: ShoppingBag },
      { key: "shopping-cart", label: "Supermercado", group: "shopping", icon: ShoppingCart },
      { key: "shirt", label: "Ropa", group: "shopping", icon: Shirt },
      { key: "watch", label: "Accesorios", group: "shopping", icon: Watch },
      { key: "glasses", label: "Óptica", group: "shopping", icon: Glasses },
      { key: "scissors", label: "Barbería / Salón", group: "shopping", icon: Scissors },
      { key: "gift", label: "Regalos", group: "shopping", icon: Gift },
      { key: "package", label: "Envíos / Encomienda", group: "shopping", icon: Package },
      { key: "tag", label: "Ofertas", group: "shopping", icon: Tag },
    ],
  },
  {
    key: "health",
    label: "Salud, Deporte & Familia",
    icons: [
      { key: "heart-pulse", label: "Salud", group: "health", icon: HeartPulse },
      { key: "pill", label: "Farmacia", group: "health", icon: Pill },
      { key: "stethoscope", label: "Consulta Médica", group: "health", icon: Stethoscope },
      { key: "dumbbell", label: "Gimnasio", group: "health", icon: Dumbbell },
      { key: "activity", label: "Deporte", group: "health", icon: Activity },
      { key: "smile", label: "Cuidado Personal", group: "health", icon: Smile },
      { key: "baby", label: "Hijos / Familia", group: "health", icon: Baby },
      { key: "paw-print", label: "Mascotas", group: "health", icon: PawPrint },
    ],
  },
  {
    key: "leisure",
    label: "Ocio, Educación & Tecnología",
    icons: [
      { key: "gamepad", label: "Videojuegos", group: "leisure", icon: Gamepad2 },
      { key: "music", label: "Música / Conciertos", group: "leisure", icon: Music },
      { key: "film", label: "Cine", group: "leisure", icon: Film },
      { key: "ticket", label: "Eventos", group: "leisure", icon: Ticket },
      { key: "camera", label: "Fotografía", group: "leisure", icon: Camera },
      { key: "book-open", label: "Libros / Cursos", group: "leisure", icon: BookOpen },
      { key: "graduation-cap", label: "Universidad / Colegio", group: "leisure", icon: GraduationCap },
      { key: "smartphone", label: "Celular / Plan", group: "leisure", icon: Smartphone },
      { key: "laptop", label: "Software / Equipos", group: "leisure", icon: Laptop },
      { key: "headphones", label: "Suscripciones", group: "leisure", icon: Headphones },
    ],
  },
  {
    key: "finance",
    label: "Trabajo, Finanzas & Ingresos",
    icons: [
      { key: "briefcase", label: "Sueldo / Trabajo", group: "finance", icon: Briefcase },
      { key: "banknote", label: "Efectivo / Bono", group: "finance", icon: Banknote },
      { key: "trending-up", label: "Rendimientos", group: "finance", icon: TrendingUp },
      { key: "piggy-bank", label: "Ahorro", group: "finance", icon: PiggyBank },
      { key: "wallet", label: "Billetera", group: "finance", icon: Wallet },
      { key: "landmark", label: "Banco", group: "finance", icon: Landmark },
      { key: "credit-card", label: "Tarjeta", group: "finance", icon: CreditCard },
      { key: "coins", label: "Comisiones / P2P", group: "finance", icon: Coins },
      { key: "receipt", label: "Impuestos / Facturas", group: "finance", icon: Receipt },
      { key: "calculator", label: "Contabilidad", group: "finance", icon: Calculator },
      { key: "handshake", label: "Ventas / Clientes", group: "finance", icon: Handshake },
      { key: "building", label: "Empresa / Negocio", group: "finance", icon: Building2 },
      { key: "award", label: "Premios / Becas", group: "finance", icon: Award },
      { key: "sparkles", label: "Otros", group: "finance", icon: Sparkles },
    ],
  },
];

export const CATEGORY_ICON_LIBRARY: CategoryIconDefinition[] =
  CATEGORY_ICON_GROUPS.flatMap((group) => group.icons);

const ICON_MAP: Record<CategoryIconKey, LucideIcon> = CATEGORY_ICON_LIBRARY.reduce(
  (acc, item) => {
    acc[item.key] = item.icon;
    return acc;
  },
  {} as Record<CategoryIconKey, LucideIcon>
);

export function CategoryIcon({
  iconKey,
  className = "w-4 h-4",
}: {
  iconKey: CategoryIconKey | string;
  className?: string;
}) {
  const IconComponent = ICON_MAP[iconKey as CategoryIconKey] || Sparkles;
  return <IconComponent className={className} />;
}

export function CategoryIconBadge({
  iconKey,
  colorKey,
  size = "md",
}: {
  iconKey: CategoryIconKey | string;
  colorKey: CategoryColorKey | string;
  size?: "sm" | "md" | "lg";
}) {
  const theme =
    CATEGORY_COLOR_THEMES[colorKey as CategoryColorKey] ||
    CATEGORY_COLOR_THEMES.blue;
  const sizeClasses =
    size === "sm"
      ? "w-7 h-7 rounded-lg"
      : size === "lg"
      ? "w-11 h-11 rounded-xl"
      : "w-9 h-9 rounded-xl";
  const iconSize =
    size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4";

  return (
    <div
      className={`${sizeClasses} ${theme.bgClass} ${theme.textClass} flex items-center justify-center shrink-0`}
    >
      <CategoryIcon iconKey={iconKey} className={iconSize} />
    </div>
  );
}
