import { customType } from 'drizzle-orm/pg-core';

/**
 * json() type is not indexable, so we create this
 */
export const stringArray = customType<{ data: string[] }>({
	dataType() {
		return 'text';
	},
	fromDriver(value) {
		if (Array.isArray(value)) {
			return value;
		}

		if (typeof value !== 'string') {
			console.error(value);
			throw new Error(`Invalid data type for titleAndPath: ${typeof value} ${value}`);
		}

		return JSON.parse(value);
	},
	toDriver(value) {
		return JSON.stringify(value);
	}
});

export const url = customType<{ data: URL }>({
	dataType() {
		return 'text';
	},
	fromDriver(value) {
		if (typeof value !== 'string') {
			console.error(value);
			throw new Error(`Invalid data type for URL: ${typeof value} ${value}`);
		}

		return new URL(value);
	},
	toDriver(value) {
		return value.toString();
	}
});
