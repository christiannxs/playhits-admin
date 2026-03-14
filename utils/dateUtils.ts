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

// A semana de pagamento para freelancers é de Sábado a Sexta-feira.
export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  try {
    const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TIMEZONE }).format(d);
    const dayIndex = WEEKDAY_INDEX[dayName] ?? 0;

    const todayStr = toLocalDateString(d);
    const today = new Date(`${todayStr}T00:00:00.000-03:00`);
    if (Number.isNaN(today.getTime())) return getWeekRangeFallback();

    const daysUntilFriday = (5 - dayIndex + 7) % 7;
    const end = new Date(today);
    end.setUTCDate(today.getUTCDate() + daysUntilFriday);
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 6);
    end.setUTCHours(23, 59, 59, 999);

    return { start, end };
  } catch {
    return getWeekRangeFallback();
  }
};

function getWeekRangeFallback(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToFri = (5 - day + 7) % 7;
  const end = new Date(now);
  end.setDate(now.getDate() + diffToFri);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

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

export const calculateWeeklyPaymentHistory = (designerId: string, allTasks: Task[], allAdvances: Advance[]) => {
  const designerTasks = allTasks.filter(t => t.designer_id === designerId && t.value > 0);
  const designerAdvances = allAdvances.filter(a => a.designer_id === designerId);

  if (designerTasks.length === 0 && designerAdvances.length === 0) return [];

  const weeklyTotals: Record<string, { range: { start: Date; end: Date }; total: number }> = {};

  [...designerTasks, ...designerAdvances].forEach(item => {
    const date = 'created_at' in item ? item.created_at : item.date;
    const value = 'value' in item ? getTaskPayableValue(item as Task) : -item.amount;
    const weekRange = getWeekRange(new Date(date));
    const weekKey = toLocalDateString(weekRange.start); // Use timezone-aware date string as key

    if (!weeklyTotals[weekKey]) {
      weeklyTotals[weekKey] = { range: weekRange, total: 0 };
    }
    weeklyTotals[weekKey].total += value;
  });

  return Object.values(weeklyTotals)
    .sort((a, b) => b.range.start.getTime() - a.range.start.getTime());
};