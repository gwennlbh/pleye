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
 * @see {@link uniqueBy}
 */
export function uniqueById<T extends { id: number | string }>(array: T[]): T[] {
	return uniqueBy(array, (item) => item.id);
}

export function commonPrefixTrimmer(strings: string[]): (s: string) => string {
	if (strings.length === 0) return (s) => s;

	let start = 0;
	const first = strings[0];
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

	return (s) => s.slice(start);
}

export function commonSuffixTrimmer(strings: string[]): (s: string) => string {
	if (strings.length === 0) return (s) => s;

	let end = 0;
	const last = strings[strings.length - 1];
	const minLength = Math.min(...strings.map((s) => s.length));

	// Find common suffix
	while (end < minLength) {
		const char = last[last.length - 1 - end];
		if (strings.every((s) => s[s.length - 1 - end] === char)) {
			end++;
		} else {
			break;
		}
	}

	return (s) => s.slice(0, s.length - end);
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
	const trimmer = (s: string) => commonSuffixTrimmer(strings)(commonPrefixTrimmer(strings)(s));

	// Length of longest trimmed string
	const trimmedLength = Math.max(...strings.map((s) => trimmer(s).length));

	return (s) => {
		const trimmed = trimmer(s);
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

/**
 * Clamp a number between min and max.
 * Also:
 * - Returns min if value is NaN
 */
export function clamp(value: number, min = 0, max = 1): number {
	const clamped = Math.min(Math.max(value, min), max);

	if (Number.isNaN(clamped)) return min;

	return clamped;
}

export function arrayHasPrefix<T>(array: T[], prefix: T[]): boolean {
	if (prefix.length > array.length) return false;

	for (let i = 0; i < prefix.length; i++) {
		if (array[i] !== prefix[i]) return false;
	}

	return true;
}

export function arrayRemovePrefix<T>(array: T[], prefix: T[]): T[] {
	if (!arrayHasPrefix(array, prefix)) return array;

	return array.slice(prefix.length);
}
