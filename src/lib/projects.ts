import { abbreviate } from './text';

/**
 * A 2-letter abbreviation for a project name
 */
export function projectNameAbbreviation(name: string): string {
	return abbreviate(2, name);
}
