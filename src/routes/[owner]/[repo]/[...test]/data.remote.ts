import { query } from '$app/server';
import { parseTestPathParam } from '$lib/params';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, desc, eq, inArray } from 'drizzle-orm';

export const testInRepo = query(type({ repoId: 'number', test: 'string' }), async (params) => {
	const { filePath, path, title } = parseTestPathParam(params.test);

	const test = await db.query.tests.findFirst({
		where: and(
			eq(tables.tests.repositoryId, params.repoId),
			eq(tables.tests.filePath, filePath),
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
		ciRun: ciRuns.find((r) => r.id === run.runId)!
	}));
});
