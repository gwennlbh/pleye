import { customType } from 'drizzle-orm/pg-core';

/**
 * json() type is not indexable, so we create this
 */
export const stringArray = customType<{ data: string[] }>({
	dataType() {
		return 'text';
	},
	fromDriver(value) {
		if (typeof value !== 'string') {
			throw new Error('Invalid data type for titleAndPath');
		}

		return JSON.parse(value);
	}
});
