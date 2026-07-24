export declare function getLocalDate(daysOffset?: number): string;
/**
 * Parse a due date string (handles both date-only and datetime formats)
 * and return a Date object set to start of day for date comparison
 */
export declare function parseDueDateToDay(dateStr: string): Date;
/**
 * Check if a due date is on a specific day
 */
export declare function isDueOnDate(dueDate: string, targetDate: string): boolean;
/**
 * Check if a due date is before a specific day
 */
export declare function isDueBefore(dueDate: string, targetDate: string): boolean;
export declare function formatDateHeader(dateStr: string, today: string): string;
//# sourceMappingURL=dates.d.ts.map