import { Task, Advance } from '../types';

const TIMEZONE = 'America/Fortaleza';

/**
 * Returns a date string in YYYY-MM-DD format for the given date in the application's target timezone.
 * @param date The date object to format.
 * @returns A string in YYYY-MM-DD format.
 */
export const toLocalDateString = (date: Date): string => {
    // en-CA locale gives the desired YYYY-MM-DD format.
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(date);
};

// A semana de pagamento para freelancers é de Sábado a Sexta-feira.
export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  // Get the day of the week in the target timezone. (0=Sun, 6=Sat)
  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TIMEZONE }).format(date);
  const dayIndex = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as const)[dayName as 'Sun'];

  // Get the date string for "today" in the target timezone to establish a non-ambiguous starting point.
  const todayStr = toLocalDateString(date);
  // Create a Date object representing midnight in the target timezone. Fortaleza is UTC-3.
  const today = new Date(`${todayStr}T00:00:00.000-03:00`);

  // Find the most recent Friday.
  const daysUntilFriday = (5 - dayIndex + 7) % 7;
  const end = new Date(today);
  end.setUTCDate(today.getUTCDate() + daysUntilFriday);

  // The week starts on the Saturday before that Friday.
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);

  // Set the time on the end date to the very end of the day.
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
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
    // The date string is YYYY-MM-DD. Parsing it with new Date() creates a date at UTC midnight.
    // To prevent the local timezone from shifting the displayed date to the previous day,
    // we explicitly format the date in the UTC timezone.
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export const calculateWeeklyPaymentHistory = (designerId: string, allTasks: Task[], allAdvances: Advance[]) => {
  const designerTasks = allTasks.filter(t => t.designer_id === designerId && t.value > 0);
  const designerAdvances = allAdvances.filter(a => a.designer_id === designerId);

  if (designerTasks.length === 0 && designerAdvances.length === 0) return [];

  const weeklyTotals: Record<string, { range: { start: Date; end: Date }; total: number }> = {};

  [...designerTasks, ...designerAdvances].forEach(item => {
    const date = 'created_at' in item ? item.created_at : item.date;
    const value = 'value' in item ? item.value : -item.amount;
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