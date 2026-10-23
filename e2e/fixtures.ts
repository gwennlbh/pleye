import { test as base } from '@playwright/test';

// Captures browser-side console output (console.log/error/warn/...) from the
// page under test and flushes it to the worker's stdout/stderr during fixture
// teardown. Playwright attributes those writes to the running test's result,
// so they flow through the existing reporter -> DB -> UI pipeline unchanged.
export const test = base.extend({
	page: async ({ page }, use) => {
		const stdout: string[] = [];
		const stderr: string[] = [];

		page.on('console', (msg) => {
			const line = `[${msg.type()}] ${msg.text()}`;
			if (msg.type() === 'error' || msg.type() === 'warning') {
				stderr.push(line);
			} else {
				stdout.push(line);
			}
		});

		await use(page);

		if (stdout.length > 0) {
			process.stdout.write(stdout.join('\n') + '\n');
		}
		if (stderr.length > 0) {
			process.stderr.write(stderr.join('\n') + '\n');
		}
	}
});

export { expect } from '@playwright/test';
