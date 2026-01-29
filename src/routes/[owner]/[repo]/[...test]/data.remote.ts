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

	const runs = await db.query.runs.findMany({
		where: inArray(
			tables.runs.id,
			testruns.map((tr) => tr.runId)
		)
	});

	const steps = await db.query.steps.findMany({
		where: inArray(
			tables.steps.testrunId,
			testruns.map((tr) => tr.id)
		)
	});

	const results = await db.query.results.findMany({
		where: inArray(
			tables.results.testrunId,
			testruns.map((tr) => tr.id)
		)
	});

	const errors = await db.query.errors.findMany({
		where: inArray(
			tables.errors.resultId,
			results.map((res) => res.id)
		)
	});

	const richTestruns = testruns.map((testrun) => ({
		...testrun,
		steps: steps
			.filter((step) => step.testrunId === testrun.id)
			.map((step) => ({
				...step,
				errors: errors.filter((err) => err.stepId === step.id)
			})),
		run: runs.find((r) => r.id === testrun.runId)!,
		result: results.find((res) => res.testrunId === testrun.id) || null,
		errors: errors.filter((err) => {
			const result = results.find((res) => res.testrunId === testrun.id);
			return result ? err.resultId === result.id : false;
		})
	}));

	return Map.groupBy(richTestruns, (tr) => tr.run.pullRequestNumber || tr.run.branch);
});
