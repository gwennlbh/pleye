import type * as DateFns from 'date-fns';
import { hoursToMilliseconds, minutesToMilliseconds, secondsToMilliseconds } from 'date-fns';

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
 * Returns a + tolerance < b
 */
export function durationIsShorter(
	a: DateFns.Duration,
	b: DateFns.Duration,
	tolerance: DateFns.Duration = { seconds: 0 }
): boolean {
	return durationToMilliseconds(a) + durationToMilliseconds(tolerance) < durationToMilliseconds(b);
}


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
