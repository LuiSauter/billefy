"use client";

import React, { useMemo } from "react";
import { PieChart, Pie } from "recharts";
import { Tag } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DashboardCard,
  dashboardCardContentClassName,
  dashboardCardHeaderClassName,
  dashboardCardTitleClassName,
} from "./dashboard-card";
import { Amount } from "@/shared/ui/amount";
import { IconTile } from "./IconTile";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import type { CategoryExpenseItem } from "../../domain/dashboard-home-analytics";
import { createAmountTooltipFormatter } from "./dashboard-chart-utils";

// Slice colors are user-category colors carried in the data (`fill`), not theme series.
const CATEGORY_CHART_CONFIG = {
  amount: { label: "Gastos" },
} satisfies ChartConfig;

const CATEGORY_INITIAL_DIMENSION = { width: 150, height: 150 };

interface DashboardCategoryExpensesCardProps {
  categories: CategoryExpenseItem[];
  totalExpenses: number;
  selectedCurrency: string;
}

export function DashboardCategoryExpensesCard({
  categories,
  totalExpenses,
  selectedCurrency,
}: DashboardCategoryExpensesCardProps) {
  const numberPreferences = useNumberPreferences();

  const pieData = useMemo(
    () => categories.map((cat) => ({ ...cat, fill: cat.color })),
    [categories]
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(selectedCurrency, numberPreferences),
    [selectedCurrency, numberPreferences]
  );

  return (
    <DashboardCard className="@container overflow-hidden h-full">
      <CardHeader className={dashboardCardHeaderClassName}>
        <CardTitle className={dashboardCardTitleClassName}>
          Gastos por categoría
        </CardTitle>
      </CardHeader>

      <CardContent className={dashboardCardContentClassName}>
        {categories.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <IconTile icon={Tag} variant="muted" />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-xs">Sin gastos este mes</span>
              <span className="text-xs text-muted-foreground">
                Tus consumos clasificados aparecerán aquí automáticamente.
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 @lg:grid-cols-[1.1fr_1.3fr] gap-4 items-center">
            {/* Left Side: Donut Chart with Center Text */}
            <div className="relative w-full h-[150px] flex items-center justify-center">
              <ChartContainer
                config={CATEGORY_CHART_CONFIG}
                initialDimension={CATEGORY_INITIAL_DIMENSION}
                className="aspect-auto h-full w-full min-w-0"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={tooltipFormatter}
                      />
                    }
                  />
                  <Pie
                    data={pieData}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  />
                </PieChart>
              </ChartContainer>

              {/* Center Label inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <Amount value={totalExpenses} currency={selectedCurrency} size="sm" />
                <span className="text-xs text-muted-foreground font-medium">
                  Gastos del mes
                </span>
              </div>
            </div>

            {/* Right Side: Category Breakdown List */}
            <div className="flex flex-col gap-1.5 justify-center">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-muted-foreground font-medium truncate text-xs">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground font-semibold tabular-nums">
                      {formatPercent(cat.percentage, numberPreferences)}
                    </span>
                    <Amount value={cat.amount} currency={selectedCurrency} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </DashboardCard>
  );
}
