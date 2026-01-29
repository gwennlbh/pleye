import type { Type } from 'arktype';

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
