import type { testruns } from './server/db/schema';

export function testrunIsOngoing(testrun: typeof testruns.$inferSelect): boolean {
	return testrun.duration === null && testrun.outcome !== 'skipped';
}
