import { query } from '$app/server';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, desc, eq, inArray } from 'drizzle-orm';

const FILENAME_REGEX = /^(.*?)\.(spec|test).(jsx?|tsx?)$/;

export const testInRepo = query(type({ repoId: 'number', test: 'string' }), async (params) => {
	// The logic to find what part of [...test] is the filepath vs path+title:
	// we consider segments from the start, and up until (including) the first segment that
	// matches FILENAME_REGEX to be part of the filepath. The remaining segments are path+title,
	// with the last segment being the title, and the rest being the path.
	let filepath = [] as string[];
	let pathAndTitle = [] as string[];
	let accumulatingFilepath = true;

	for (const segment of params.test.split('/')) {
		if (segment.match(FILENAME_REGEX)) {
			filepath.push(segment);
			accumulatingFilepath = false;
			continue;
		}

		if (accumulatingFilepath) {
			filepath.push(segment);
		} else {
			pathAndTitle.push(segment);
		}
	}

	const title = pathAndTitle.pop()!;
	const path = pathAndTitle;

	const test = await db.query.tests.findFirst({
		where: and(
			eq(tables.tests.repositoryId, params.repoId),
			eq(tables.tests.filePath, '/' + filepath.join('/')),
			eq(tables.tests.path, path),
			eq(tables.tests.title, title)
		)
	});

	if (!test) error(404, 'Test not found');

	return test;
});

export const runsOfTest = query(type('number'), async (id) => {
	const testruns = await db.query.testruns.findMany({
		where: eq(tables.testruns.testId, id),
		orderBy: [desc(tables.testruns.startedAt)]
	});

	const ciRuns = await db.query.runs.findMany({
		where: inArray(
			tables.runs.id,
			testruns.map((tr) => tr.runId)
		)
	});

	const completedSteps = await db.query.steps.findMany({
		where: inArray(
			tables.steps.testrunId,
			testruns.map((tr) => tr.id)
		),
		columns: { title: true, category: true, testrunId: true, duration: true }
	});

	return testruns.map((run) => ({
		...run,
		completedSteps: completedSteps.filter((step) => step.testrunId === run.id),
		ciRun: ciRuns.find((r) => r.id === run.runId)
	}));
});
