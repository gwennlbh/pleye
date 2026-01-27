export function keys<T extends {}>(obj: T): (keyof T)[] {
	return Object.keys(obj) as (keyof T)[];
}
