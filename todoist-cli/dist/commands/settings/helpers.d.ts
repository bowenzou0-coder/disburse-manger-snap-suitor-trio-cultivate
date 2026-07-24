import type { DateFormat, DayOfWeek, TimeFormat } from '@doist/todoist-sdk';
import { Option } from 'commander';
import type { UserSettings } from '../../lib/api/user-settings.js';
export declare const THEMES: {
    id: number;
    name: string;
    label: string;
    isPro: boolean;
}[];
export declare const TIME_FORMAT_CHOICES: string[];
export declare const DATE_FORMAT_CHOICES: string[];
export declare const DAY_CHOICES: string[];
export declare const THEME_CHOICES: string[];
export declare function parseTheme(value: string): number;
export declare function parseTimeFormat(value: string): TimeFormat;
export declare function parseDateFormat(value: string): DateFormat;
export declare function parseDay(value: string): DayOfWeek;
export declare function formatTheme(themeId: number): string;
export declare function formatThemeList(): string;
export declare function getThemeName(themeId: number): string;
export declare function formatSettingsView(settings: UserSettings, startPageName: string | null): string;
export declare function formatSettingsForJson(settings: UserSettings, startPageName: string | null): Record<string, unknown>;
export declare function parseBoolean(value: string): boolean;
export declare function parseStartPageRef(startPage: string): {
    type: 'project' | 'filter' | 'label';
    id: string;
} | null;
export declare function boolOption(flags: string, description: string): Option;
//# sourceMappingURL=helpers.d.ts.map