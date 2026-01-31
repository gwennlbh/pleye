import type { Type } from 'arktype';
import type * as DateFns from 'date-fns';
import { hoursToMilliseconds, minutesToMilliseconds, secondsToMilliseconds } from 'date-fns';

export function keys<T extends {}>(obj: T): (keyof T)[] {
	return Object.keys(obj) as (keyof T)[];
}

export function basename(path: string): string {
	const parts = path.split(/[/\\]/);

	return parts.at(-1) ?? '';
}

export function objectsEqual<T extends {}>(a: T, b: T): boolean {
	// TODO optimize
	return JSON.stringify(a) === JSON.stringify(b);
}

// Replace actual slash characters with a close lookalike to avoid issues in URLs
export function escapeSlashes(str: string): string {
	return str.replace(/\//g, '∕');
}

export type MapValues<T extends Map<any, any>> = NonNullable<ReturnType<T['get']>>;

/**
 * Parse a PostgreSQL duration string, as returned by Drizzle, into a date-fn's Duration object
 * @param durationString a HH:MM:SS.mmm... formatted duration string
 */
export function parseDuration(durationString: string): DateFns.Duration {
	const [hours, minutes, seconds] = durationString.split(':').map(parseFloat);

	return {
		hours,
		minutes,
		seconds
	};
}

export function roundDuration({ seconds, ...rest }: DateFns.Duration): DateFns.Duration {
	return {
		...rest,
		seconds: Math.round(seconds ?? 0)
	};
}

/**
 * Kinda like date-fns's formatDuration, but uses short units (h, m, s) instead
 * @param duration either a date-fns Duration object or a duration string as returned by Drizzle
 */
export function formatDurationShort(duration: string | DateFns.Duration): string {
	const {
		days,
		hours,
		minutes,
		seconds = 0
	} = typeof duration === 'string' ? parseDuration(duration) : duration;

	if (days) return `${days}d`;
	if (hours) return `${hours}h`;
	if (minutes) return `${minutes}m`;
	if (seconds < 0) return '0s';
	if (Math.round(seconds) >= 1) return `${Math.round(seconds)}s`;
	return `${Math.round(seconds * 1000)}ms`;
}

/**
 * Removes duplicates from an array based on a key function
 * Preserves order
 * @param array
 * @param fn
 * @returns
 */
export function uniqueBy<T>(array: T[], fn: (item: T) => string | number): T[] {
	const seen = new Set<string | number>();
	const result: T[] = [];

	for (const item of array) {
		const key = fn(item);
		if (!seen.has(key)) {
			seen.add(key);
			result.push(item);
		}
	}

	return result;
}

/**
 *
 * @param strings
 * @param fillString left-pad strings that are smaller than the biggest trimmed string with this
 * @returns
 */
export function commonPrefixAndSuffixTrimmer(
	strings: string[],
	fillString = ''
): (s: string) => string {
	if (strings.length === 0) return (s) => s;

	let start = 0;
	let end = 0;
	const first = strings[0];
	const last = strings[strings.length - 1];
	const minLength = Math.min(...strings.map((s) => s.length));

	// Find common prefix
	while (start < minLength) {
		const char = first[start];
		if (strings.every((s) => s[start] === char)) {
			start++;
		} else {
			break;
		}
	}

	// Find common suffix
	while (end < minLength - start) {
		const char = last[last.length - 1 - end];
		if (strings.every((s) => s[s.length - 1 - end] === char)) {
			end++;
		} else {
			break;
		}
	}

	// Length of longest trimmed string
	const trimmedLength = Math.max(...strings.map((s) => s.length - start - end));

	return (s) => {
		const trimmed = s.slice(start, s.length - end);
		if (fillString) return trimmed.padStart(trimmedLength, fillString);
		return trimmed;
	};
}

export function smartStringCompare(a: string, b: string): number {
	a = a.trim();
	b = b.trim();

	const aNum = parseFloat(a);
	const bNum = parseFloat(b);

	const aIsNum = !isNaN(aNum);
	const bIsNum = !isNaN(bNum);

	if (aIsNum && bIsNum) {
		return aNum - bNum;
	}

	return a.localeCompare(b);
}

export function durationToMilliseconds({
	days = 0,
	hours = 0,
	minutes = 0,
	seconds = 0
}: DateFns.Duration): number {
	return (
		hoursToMilliseconds(days * 24 + hours) +
		minutesToMilliseconds(minutes) +
		secondsToMilliseconds(seconds)
	);
}

/**
 * Returns a < b
 */
export function durationIsShorter(a: DateFns.Duration, b: DateFns.Duration): boolean {
	return durationToMilliseconds(a) < durationToMilliseconds(b);
}
