export function keys<T extends {}>(obj: T): (keyof T)[] {
	return Object.keys(obj) as (keyof T)[];
}

export function basename(path: string): string {
	const parts = path.split(/[/\\]/);

	return parts.at(-1) ?? '';
}
