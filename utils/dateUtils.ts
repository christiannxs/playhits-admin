import { Task, Advance } from '../types';
import { REJECTED_TASK_PAYMENT_MULTIPLIER } from '../constants';

/**
 * Retorna o valor a ser pago pela demanda.
 * Se approval_status === 'rejected', retorna 30% do value; caso contrário, o value integral.
 */
export const getTaskPayableValue = (task: Task): number => {
  if (task.approval_status === 'rejected') {
    return Math.round((task.value * REJECTED_TASK_PAYMENT_MULTIPLIER) * 100) / 100;
  }
  return task.value;
};

const TIMEZONE = 'America/Fortaleza';

/** Fallback YYYY-MM-DD sem usar Intl (para quando Intl lança RangeError). */
function fallbackDateString(): string {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Returns a date string in YYYY-MM-DD format for the given date in the application's target timezone.
 * If the date is invalid or Intl throws, returns a fallback string so the app never crashes.
 */
export const toLocalDateString = (date: Date): string => {
    if (!(date instanceof Date)) return fallbackDateString();
    const t = date.getTime();
    if (typeof t !== 'number' || Number.isNaN(t) || !Number.isFinite(t)) return fallbackDateString();
    try {
        const s = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(date);
        return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallbackDateString();
    } catch {
        return fallbackDateString();
    }
};

// Semana considerada no app: Sábado a Sexta-feira (pagamento freelancers, filtros, relatórios).
const SATURDAY = 6;

/** Soma dias a uma string YYYY-MM-DD e retorna YYYY-MM-DD. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00.000-03:00');
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  try {
    const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TIMEZONE }).format(d);
    const dayIndex = WEEKDAY_INDEX[dayName] ?? 0;

    const todayStr = toLocalDateString(d);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(todayStr)) return getWeekRangeFallback();

    // Na semana Sáb–Sex: quantos dias atrás está o Sábado que inicia esta semana?
    const daysSinceSaturday = (dayIndex - SATURDAY + 7) % 7;
    const startStr = addDays(todayStr, -daysSinceSaturday);
    const endStr = addDays(startStr, 6);
    const start = new Date(`${startStr}T00:00:00.000-03:00`);
    const end = new Date(`${endStr}T23:59:59.999-03:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return getWeekRangeFallback();

    return { start, end };
  } catch {
    return getWeekRangeFallback();
  }
};

function getWeekRangeFallback(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const daysSinceSaturday = (day - SATURDAY + 7) % 7;
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const start = new Date(y, m, d - daysSinceSaturday, 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Retorna a chave da semana (sábado em YYYY-MM-DD) para uma data. */
export const getWeekKey = (date: Date): string => {
  const { start } = getWeekRange(date);
  return toLocalDateString(start);
};

/** Dada uma chave de semana (YYYY-MM-DD do sábado), retorna a chave da semana anterior (7 dias antes). */
export const getPreviousWeekKey = (weekKey: string): string => {
  const d = new Date(`${weekKey}T12:00:00.000-03:00`);
  d.setUTCDate(d.getUTCDate() - 7);
  return toLocalDateString(d);
};

/** Dada uma chave de semana (YYYY-MM-DD do sábado), retorna a chave da semana seguinte (7 dias depois). */
export const getNextWeekKey = (weekKey: string): string => {
  const d = new Date(`${weekKey}T12:00:00.000-03:00`);
  d.setUTCDate(d.getUTCDate() + 7);
  return toLocalDateString(d);
};

export const getMonthRange = (date: Date): { start: Date; end: Date } => {
    const yearStr = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: TIMEZONE }).format(date);
    const monthStr = new Intl.DateTimeFormat('en-US', { month: '2-digit', timeZone: TIMEZONE }).format(date);
    
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000-03:00`);
    
    // To get the end of the month, we go to the start of the next month and subtract one millisecond.
    const nextMonthDate = new Date(start);
    nextMonthDate.setUTCMonth(start.getUTCMonth() + 1);
    
    const end = new Date(nextMonthDate.getTime() - 1);
    
    return { start, end };
};

export const getYearRange = (date: Date): { start: Date; end: Date } => {
    const yearStr = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: TIMEZONE }).format(date);
    const year = parseInt(yearStr);

    const start = new Date(`${year}-01-01T00:00:00.000-03:00`);
    
    // To get the end of the year, we go to the start of the next year and subtract one millisecond.
    const nextYearDate = new Date(start);
    nextYearDate.setUTCFullYear(start.getUTCFullYear() + 1);
    
    const end = new Date(nextYearDate.getTime() - 1);
    
    return { start, end };
};

export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (dateString: string) => {
    try {
        if (dateString == null || String(dateString).trim() === '') return '—';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch {
        return '—';
    }
};

/**
 * Converte due_date da demanda (YYYY-MM-DD) para Date em Fortaleza (-03).
 * Usa meio-dia para evitar que UTC meia-noite vire dia anterior no fuso.
 * Usado para decidir em qual semana/período a demanda entra no cálculo.
 */
export const getTaskDueDateAsDate = (dueDate: string | null | undefined): Date | null => {
  if (dueDate == null || typeof dueDate !== 'string') return null;
  const trimmed = dueDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T12:00:00.000-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Verifica se a demanda cai dentro do período [start, end] pela data de entrega (due_date). */
export const isTaskInPeriod = (task: Task, start: Date, end: Date): boolean => {
  const d = getTaskDueDateAsDate(task.due_date);
  if (!d) return false;
  return d >= start && d <= end;
};

export const calculateWeeklyPaymentHistory = (designerId: string, allTasks: Task[], allAdvances: Advance[]) => {
  const designerTasks = allTasks.filter(t => t.designer_id === designerId && t.value > 0);
  const designerAdvances = allAdvances.filter(a => a.designer_id === designerId);

  if (designerTasks.length === 0 && designerAdvances.length === 0) return [];

  const weeklyTotals: Record<string, { range: { start: Date; end: Date }; total: number }> = {};

  designerTasks.forEach(task => {
    const refDate = getTaskDueDateAsDate(task.due_date);
    if (!refDate) return;
    const weekRange = getWeekRange(refDate);
    const weekKey = toLocalDateString(weekRange.start);
    if (!weeklyTotals[weekKey]) {
      weeklyTotals[weekKey] = { range: weekRange, total: 0 };
    }
    weeklyTotals[weekKey].total += getTaskPayableValue(task);
  });
  designerAdvances.forEach(adv => {
    const weekRange = getWeekRange(new Date(adv.date));
    const weekKey = toLocalDateString(weekRange.start);
    if (!weeklyTotals[weekKey]) {
      weeklyTotals[weekKey] = { range: weekRange, total: 0 };
    }
    weeklyTotals[weekKey].total -= adv.amount;
  });

  return Object.values(weeklyTotals)
    .sort((a, b) => b.range.start.getTime() - a.range.start.getTime());
};