import type * as tables from './server/db/schema';

export function testrunIsOngoing(testrun: typeof tables.testruns.$inferSelect): boolean {
	return testrun.duration === null && testrun.outcome !== 'skipped';
}

type ArrayOrArrayIterator<T> = Array<T> | ArrayIterator<T>;

/**
 * @param inProgress changes the interpretation of null outcomes. "in progress" if true, "interrupted" otherwise
 */
export function aggregateTestrunOutcomes(
	inProgress: boolean,
	trs: ArrayOrArrayIterator<typeof tables.testruns.$inferSelect>
): (typeof tables.testruns.$inferSelect)['outcome'] {
	const outcomes = new Set(
		trs.map((tr) =>
			tr.outcome === null && tr.expectedStatus === 'skipped' ? 'skipped' : tr.outcome
		)
	);

	if (outcomes.size === 1) {
		return outcomes.values().next().value!;
	}

	if (inProgress && outcomes.has(null)) return null;
	if (outcomes.has('unexpected')) return 'unexpected';
	if (outcomes.has(null)) return null;
	if (outcomes.has('flaky')) return 'flaky';
	if (outcomes.has('expected')) return 'expected';
	return 'skipped';
}

export function aggregateRunResults(
	runs: ArrayOrArrayIterator<typeof tables.runs.$inferSelect>
): (typeof tables.runs.$inferSelect)['result'] {
	const results = new Set(runs.map((run) => run.result));

	if (results.size === 1) {
		return results.values().next().value!;
	}

	if (results.has(null)) return null;
	if (results.has('failed')) return 'failed';
	if (results.has('interrupted')) return 'interrupted';
	if (results.has('timedout')) return 'timedout';
	return 'passed';
}
