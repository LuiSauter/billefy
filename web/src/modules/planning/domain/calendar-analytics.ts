import Decimal from "decimal.js";
import { RecurringCalendarOccurrenceDto, RecurringPaymentDto } from "./planning.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { TransactionDto } from "@/modules/ledger/domain/ledger.types";

export type CalendarEventType =
  | "income"
  | "expense"
  | "recurring"
  | "debt"
  | "lent"
  | "investment";

export type CalendarEventStatus = "scheduled" | "due_soon" | "overdue" | "completed";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  currency: string;
  amountInSelectedCurrency: number;
  type: CalendarEventType;
  categoryName?: string;
  accountId?: string;
  source: "recurring" | "loan" | "transaction";
  sourceId: string;
  status: CalendarEventStatus;
  description?: string;
  isExpense: boolean;
}

export interface CalendarMonthCell {
  dateString: string;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  totalIncome: number;
  totalExpense: number;
}

export interface CalendarKpis {
  ingresosPrevistos: {
    amount: number;
    count: number;
    trendPercentage: number;
  };
  gastosPrevistos: {
    amount: number;
    count: number;
    trendPercentage: number;
  };
  pagosRecurrentes: {
    amount: number;
    count: number;
    trendPercentage: number;
  };
  cobrosPrevistos: {
    amount: number;
    count: number;
    trendPercentage: number;
  };
  ahorroMes: {
    amount: number;
    percentage: number;
  };
}

export interface CalendarAnalyticsInput {
  recurringPayments?: RecurringPaymentDto[];
  recurringOccurrences?: RecurringCalendarOccurrenceDto[];
  loans?: LoanSummaryDto[];
  transactions?: TransactionDto[];
  year: number;
  month: number; // 0-indexed (0 = Jan, 9 = Oct)
  selectedCurrency?: "BOB" | "USD";
  p2pRate?: number;
  filters?: CalendarFilters;
}

export interface CalendarFilters {
  accountId?: string;
  type?: string;
  categoryId?: string;
  search?: string;
}

export interface CalendarAnalyticsResult {
  events: CalendarEvent[];
  filteredEvents: CalendarEvent[];
  kpis: CalendarKpis;
  periodSummary: {
    ingresos: number;
    gastos: number;
    ahorro: number;
    savingsRate: number;
  };
  upcomingEvents: CalendarEvent[];
}

function convertCurrency(
  amount: number | Decimal,
  fromCurrency: string,
  toCurrency: string,
  p2pRate: number
): number {
  const decAmount = new Decimal(amount.toString());
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return decAmount.toNumber();

  const rate = new Decimal(p2pRate > 0 ? p2pRate : 10);
  if (from === "USD" && to === "BOB") {
    return decAmount.mul(rate).toNumber();
  }
  if (from === "BOB" && to === "USD") {
    return decAmount.div(rate).toNumber();
  }

  return decAmount.toNumber();
}

export function calculateCalendarAnalytics({
  recurringPayments = [],
  recurringOccurrences = [],
  loans = [],
  transactions = [],
  year,
  month,
  selectedCurrency = "BOB",
  p2pRate = 10,
  filters = {},
}: CalendarAnalyticsInput): CalendarAnalyticsResult {
  const events: CalendarEvent[] = [];

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;

  // 1. Process Recurring Payments
  if (recurringOccurrences && recurringOccurrences.length > 0) {
    for (const occ of recurringOccurrences) {
      const dateStr = typeof occ.date === "string" ? occ.date : String(occ.date);
      if (dateStr >= startStr && dateStr <= endStr) {
        const isIncome = occ.flowType === "Income";
        const amtInSel = convertCurrency(occ.amount, occ.currency, selectedCurrency, p2pRate);

        events.push({
          id: `rec-ev-${occ.recurringId}-${dateStr}`,
          title: occ.name,
          date: dateStr,
          amount: Number(occ.amount),
          currency: occ.currency,
          amountInSelectedCurrency: amtInSel,
          type: isIncome ? "income" : "expense",
          categoryName: isIncome ? "Ingresos" : "Servicios",
          accountId: occ.defaultAccountId || undefined,
          source: "recurring",
          sourceId: occ.recurringId,
          status: occ.isOverdue ? "overdue" : occ.isDueSoon ? "due_soon" : "scheduled",
          isExpense: !isIncome,
        });
      }
    }
  } else {
    for (const p of recurringPayments) {
      if (p.status === "Paused" || p.status === "Completed") continue;

      const parts = p.nextDueDate.split("-").map(Number);
      if (parts.length !== 3) continue;
      const [pYear, pMonth, pDay] = parts;
      const nextDate = new Date(pYear, pMonth - 1, pDay);

      let curDate = new Date(nextDate);
      let occurrencesCount = p.completedOccurrences;
      let loops = 0;

      while (curDate < startOfMonth && loops < 200) {
        loops++;
        curDate = advanceDateByFrequency(curDate, p.frequency);
        occurrencesCount++;
      }

      loops = 0;
      while (curDate <= endOfMonth && loops < 60) {
        loops++;
        if (curDate >= startOfMonth) {
          const y = curDate.getFullYear();
          const m = String(curDate.getMonth() + 1).padStart(2, "0");
          const d = String(curDate.getDate()).padStart(2, "0");
          const dateStr = `${y}-${m}-${d}`;

          const isIncome = p.flowType === "Income";
          const amtInSel = convertCurrency(p.amount, p.currency, selectedCurrency, p2pRate);

          events.push({
            id: `rec-ev-${p.id}-${dateStr}`,
            title: p.name,
            date: dateStr,
            amount: Number(p.amount),
            currency: p.currency,
            amountInSelectedCurrency: amtInSel,
            type: isIncome ? "income" : "expense",
            categoryName: p.description || (isIncome ? "Ingresos" : "Servicios"),
            accountId: p.defaultAccountId || undefined,
            source: "recurring",
            sourceId: p.id,
            status: p.isOverdue ? "overdue" : p.isDueSoon ? "due_soon" : "scheduled",
            description: p.description || undefined,
            isExpense: !isIncome,
          });
        }

        occurrencesCount++;
        if (p.endType === "AfterOccurrences" && p.totalOccurrences && occurrencesCount >= p.totalOccurrences) {
          break;
        }
        if (p.endType === "OnDate" && p.endDate && curDate >= new Date(p.endDate)) {
          break;
        }

        curDate = advanceDateByFrequency(curDate, p.frequency);
      }
    }
  }

  // 2. Process Loans (Debts and Lent Money)
  for (const loan of loans) {
    if (loan.status === "Cancelled" || loan.status === "Closed") continue;

    const parts = (loan.firstDueDate || loan.disbursementDate).split("-").map(Number);
    if (parts.length !== 3) continue;
    const [, , dueDay] = parts;

    // Day within month
    const validDay = Math.min(dueDay, endOfMonth.getDate());
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(validDay).padStart(2, "0")}`;

    const totalInstallments = loan.totalInstallments > 0 ? loan.totalInstallments : 1;
    const installmentAmount = new Decimal(loan.principal.toString())
      .div(totalInstallments)
      .toDecimalPlaces(2)
      .toNumber();

    const isBorrowed = loan.type === "Borrowed";
    const amtInSel = convertCurrency(installmentAmount, loan.currency, selectedCurrency, p2pRate);

    events.push({
      id: `loan-ev-${loan.id}-${dateStr}`,
      title: isBorrowed
        ? `Cuota: ${loan.counterpartyName}`
        : `Cobro: ${loan.counterpartyName}`,
      date: dateStr,
      amount: installmentAmount,
      currency: loan.currency,
      amountInSelectedCurrency: amtInSel,
      type: isBorrowed ? "debt" : "lent",
      categoryName: isBorrowed ? "Deudas" : "Cobros",
      source: "loan",
      sourceId: loan.id,
      status: "scheduled",
      description: `${loan.template} - ${loan.counterpartyName}`,
      isExpense: isBorrowed,
    });
  }

  // 3. Process Transactions (Actual Movements in current month)
  for (const tx of transactions) {
    if (!tx.occurredAt) continue;
    const txDate = tx.occurredAt.split("T")[0];
    if (txDate >= startStr && txDate <= endStr) {
      const isExpense = tx.direction === "Expense";
      const isIncome = tx.direction === "Income";
      if (!isExpense && !isIncome) continue;

      const amtInSel = convertCurrency(tx.amount, tx.currency, selectedCurrency, p2pRate);

      events.push({
        id: `tx-ev-${tx.id}`,
        title: tx.description || (isIncome ? "Ingreso registrado" : "Gasto registrado"),
        date: txDate,
        amount: Number(tx.amount.toString()),
        currency: tx.currency,
        amountInSelectedCurrency: amtInSel,
        type: isIncome ? "income" : "expense",
        categoryName: tx.categoryId ? "Categoría" : isIncome ? "Ingresos" : "Gastos",
        accountId: tx.accountId,
        source: "transaction",
        sourceId: tx.id,
        status: "completed",
        description: tx.description || undefined,
        isExpense,
      });
    }
  }

  // Filter events
  const filteredEvents = filterCalendarEvents(events, filters);

  // Compute KPIs
  let totalIncome = new Decimal(0);
  let incomeCount = 0;
  let totalExpense = new Decimal(0);
  let expenseCount = 0;
  let totalRecurringExpense = new Decimal(0);
  let recurringExpenseCount = 0;
  let totalLentCollections = new Decimal(0);
  let lentCount = 0;

  for (const ev of filteredEvents) {
    const amt = new Decimal(ev.amountInSelectedCurrency);
    if (!ev.isExpense) {
      totalIncome = totalIncome.plus(amt);
      incomeCount++;
      if (ev.type === "lent") {
        totalLentCollections = totalLentCollections.plus(amt);
        lentCount++;
      }
    } else {
      totalExpense = totalExpense.plus(amt);
      expenseCount++;
      if (ev.source === "recurring") {
        totalRecurringExpense = totalRecurringExpense.plus(amt);
        recurringExpenseCount++;
      }
    }
  }

  const netSavings = totalIncome.minus(totalExpense);
  const savingsRate = totalIncome.gt(0)
    ? netSavings.div(totalIncome).mul(100).toDecimalPlaces(1).toNumber()
    : 0;

  const kpis: CalendarKpis = {
    ingresosPrevistos: {
      amount: totalIncome.toDecimalPlaces(2).toNumber(),
      count: incomeCount,
      trendPercentage: 12.5,
    },
    gastosPrevistos: {
      amount: totalExpense.toDecimalPlaces(2).toNumber(),
      count: expenseCount,
      trendPercentage: 8.3,
    },
    pagosRecurrentes: {
      amount: totalRecurringExpense.toDecimalPlaces(2).toNumber(),
      count: recurringExpenseCount,
      trendPercentage: 4.2,
    },
    cobrosPrevistos: {
      amount: totalLentCollections.toDecimalPlaces(2).toNumber(),
      count: lentCount,
      trendPercentage: 100,
    },
    ahorroMes: {
      amount: netSavings.toDecimalPlaces(2).toNumber(),
      percentage: savingsRate,
    },
  };

  // Sort upcoming events chronologically
  const upcomingEvents = [...filteredEvents].sort((a, b) => a.date.localeCompare(b.date));

  return {
    events,
    filteredEvents,
    kpis,
    periodSummary: {
      ingresos: totalIncome.toDecimalPlaces(2).toNumber(),
      gastos: totalExpense.toDecimalPlaces(2).toNumber(),
      ahorro: netSavings.toDecimalPlaces(2).toNumber(),
      savingsRate,
    },
    upcomingEvents,
  };
}

function advanceDateByFrequency(date: Date, frequency: string): Date {
  const next = new Date(date);
  switch (frequency) {
    case "Weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "BiWeekly":
      next.setDate(next.getDate() + 14);
      break;
    case "Monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "Quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "SemiAnnual":
      next.setMonth(next.getMonth() + 6);
      break;
    case "Yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  filters: CalendarFilters = {}
): CalendarEvent[] {
  return events.filter((ev) => {
    if (filters.accountId && ev.accountId && ev.accountId !== filters.accountId) {
      return false;
    }

    if (filters.type && filters.type !== "all") {
      if (filters.type === "income" && ev.isExpense) return false;
      if (filters.type === "expense" && !ev.isExpense) return false;
      if (filters.type === "recurring" && ev.source !== "recurring") return false;
      if (filters.type === "loan" && ev.source !== "loan") return false;
    }

    if (filters.categoryId && ev.categoryName !== filters.categoryId) {
      return false;
    }

    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase().trim();
      const match =
        ev.title.toLowerCase().includes(q) ||
        (ev.categoryName || "").toLowerCase().includes(q) ||
        (ev.description || "").toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
}

export function generateMonthGrid(
  year: number,
  month: number,
  events: CalendarEvent[],
  todayStr?: string
): CalendarMonthCell[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // In JS, getDay() returns 0 for Sunday, 1 for Monday... 6 for Saturday.
  // We want Monday = 0, Sunday = 6.
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const cells: CalendarMonthCell[] = [];
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) || [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const effectiveToday = todayStr || new Date().toISOString().split("T")[0];

  // 1. Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, d);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    const dateString = `${y}-${m}-${dStr}`;

    const cellEvents = eventsByDate.get(dateString) || [];
    cells.push({
      dateString,
      day: d,
      month: prevDate.getMonth(),
      year: y,
      isCurrentMonth: false,
      isToday: dateString === effectiveToday,
      events: cellEvents,
      totalIncome: cellEvents.filter((e) => !e.isExpense).reduce((sum, e) => sum + e.amountInSelectedCurrency, 0),
      totalExpense: cellEvents.filter((e) => e.isExpense).reduce((sum, e) => sum + e.amountInSelectedCurrency, 0),
    });
  }

  // 2. Current month days
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const curDate = new Date(year, month, d);
    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    const dateString = `${y}-${m}-${dStr}`;

    const cellEvents = eventsByDate.get(dateString) || [];
    cells.push({
      dateString,
      day: d,
      month,
      year,
      isCurrentMonth: true,
      isToday: dateString === effectiveToday,
      events: cellEvents,
      totalIncome: cellEvents.filter((e) => !e.isExpense).reduce((sum, e) => sum + e.amountInSelectedCurrency, 0),
      totalExpense: cellEvents.filter((e) => e.isExpense).reduce((sum, e) => sum + e.amountInSelectedCurrency, 0),
    });
  }

  // 3. Next month days until 42 total cells
  let nextDay = 1;
  while (cells.length < 42) {
    const nextDate = new Date(year, month + 1, nextDay);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, "0");
    const dStr = String(nextDay).padStart(2, "0");
    const dateString = `${y}-${m}-${dStr}`;

    const cellEvents = eventsByDate.get(dateString) || [];
    cells.push({
      dateString,
      day: nextDay,
      month: nextDate.getMonth(),
      year: y,
      isCurrentMonth: false,
      isToday: dateString === effectiveToday,
      events: cellEvents,
      totalIncome: cellEvents.filter((e) => !e.isExpense).reduce((sum, e) => sum + e.amountInSelectedCurrency, 0),
      totalExpense: cellEvents.filter((e) => e.isExpense).reduce((sum, e) => sum + e.amountInSelectedCurrency, 0),
    });
    nextDay++;
  }

  return cells;
}

export function generateWeekDays(
  referenceDateStr: string,
  events: CalendarEvent[] = []
): CalendarMonthCell[] {
  const parts = referenceDateStr.split("-").map(Number);
  const refDate = new Date(parts[0], parts[1] - 1, parts[2]);

  let dayOfWeek = refDate.getDay() - 1;
  if (dayOfWeek === -1) dayOfWeek = 6;

  const monday = new Date(refDate);
  monday.setDate(monday.getDate() - dayOfWeek);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) || [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const weekCells: CalendarMonthCell[] = [];
  const todayStr = new Date().toISOString().split("T")[0];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dStr = String(d.getDate()).padStart(2, "0");
    const dateString = `${y}-${m}-${dStr}`;

    const cellEvents = eventsByDate.get(dateString) || [];
    weekCells.push({
      dateString,
      day: d.getDate(),
      month: d.getMonth(),
      year: y,
      isCurrentMonth: d.getMonth() === refDate.getMonth(),
      isToday: dateString === todayStr,
      events: cellEvents,
      totalIncome: cellEvents.filter((e) => !e.isExpense).reduce((sum, e) => sum + e.amountInSelectedCurrency, 0),
      totalExpense: cellEvents.filter((e) => e.isExpense).reduce((sum, e) => sum + e.amountInSelectedCurrency, 0),
    });
  }

  return weekCells;
}

export function getRelativeEventDateLabel(
  dateString: string,
  referenceDateString?: string
): string {
  const todayStr = referenceDateString || new Date().toISOString().split("T")[0];
  const parts = dateString.split("-").map(Number);
  const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);

  const monthNames = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const refParts = todayStr.split("-").map(Number);
  const refDate = new Date(refParts[0], refParts[1] - 1, refParts[2]);

  const diffTime = targetDate.getTime() - refDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const dayOfMonth = targetDate.getDate();
  const monthName = monthNames[targetDate.getMonth()];

  if (diffDays === 0) {
    return `Hoy, ${dayOfMonth} ${monthName}`;
  }
  if (diffDays === 1) {
    return `Mañana, ${dayOfMonth} ${monthName}`;
  }
  if (diffDays === -1) {
    return `Ayer, ${dayOfMonth} ${monthName}`;
  }

  const dayName = dayNames[targetDate.getDay()];
  return `${dayName}, ${dayOfMonth} ${monthName}`;
}
