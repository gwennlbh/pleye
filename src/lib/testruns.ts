import type { testruns } from './server/db/schema';

export function testrunIsOngoing(testrun: typeof testruns.$inferSelect): boolean {
	return testrun.duration === null && testrun.outcome !== 'skipped';
}

/**
 * @param inProgress changes the interpretation of null outcomes. "in progress" if true, "interrupted" otherwise
 */
export function aggregateTestrunOutcomes(
	inProgress: boolean,
	trs: (typeof testruns.$inferSelect)[]
): (typeof testruns.$inferSelect)['outcome'] {
	const outcomes = new Set(
		trs.map((tr) =>
			tr.outcome === null && tr.expectedStatus === 'skipped' ? 'skipped' : tr.outcome
		)
	);

	if (outcomes.size === 1) {
		return trs[0].outcome;
	}

	if (inProgress && outcomes.has(null)) return null;
	if (outcomes.has('unexpected')) return 'unexpected';
	if (outcomes.has(null)) return null;
	if (outcomes.has('flaky')) return 'flaky';
	if (outcomes.has('expected')) return 'expected';
	return 'skipped';
}
