import { query } from '$app/server';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { uniqueBy } from '$lib/utils';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { createSelectSchema } from 'drizzle-arktype';
import { and, desc, eq, isNotNull } from 'drizzle-orm';

export const runsOfBranch = query(
	type({
		repoId: 'number',
		branch: 'string',
		status: createSelectSchema(tables.runs).get('status')
	}),
	async (params) => {
		const query = db
			.select()
			.from(tables.runs)
			.leftJoin(tables.testruns, eq(tables.testruns.runId, tables.runs.id))
			.leftJoin(tables.tests, eq(tables.tests.id, tables.testruns.testId))
			.leftJoin(tables.steps, eq(tables.steps.testrunId, tables.testruns.id))
			.where(
				and(
					eq(tables.runs.repositoryId, params.repoId),
					eq(tables.runs.branch, params.branch),
					// TODO find a way to keep runs that are part of the same workflow run but have statuses
					// other than the requested one, as long as at least one run matches the status.
					// eq(tables.runs.status, params.status),
					isNotNull(tables.runs.id),
					isNotNull(tables.testruns.id),
					isNotNull(tables.tests.id),
					isNotNull(tables.steps.id)
				)
			);

		const rows = await query;

		const richRuns = uniqueBy(
			rows.map((row) => ({
				...row.runs,
				testruns: uniqueBy(
					rows
						.filter((r) => r.runs.id === row.runs.id)
						.map((r) => ({
							...r.testruns!,
							test: r.tests!,
							steps: rows.filter((s) => s.testruns?.id === r.testruns!.id).map((s) => s.steps!)
						})),
					(tr) => tr.id
				)
			})),
			(run) => run.id
		);

		const byWorkflow = Map.groupBy(richRuns, (run) => run.githubRunId);

		for (const [githubRunId, runs] of byWorkflow) {
			if (!runs.some((r) => r.status === params.status)) {
				byWorkflow.delete(githubRunId);
			}
		}

		return byWorkflow;
	}
);

export const progressOfTestrun = query(type('number'), async (testrunId) => {
	const testrun = await db.query.testruns.findFirst({
		where: eq(tables.testruns.id, testrunId)
	});
	if (!testrun) {
		throw error(404, 'Testrun not found');
	}

	const test = await db.query.tests.findFirst({
		where: eq(tables.tests.id, testrun.testId),
		columns: {
			stepsCount: true
		}
	});

	if (!test) throw new Error('Test not found');

	const [currentStep] = await db.query.steps.findMany({
		where: and(eq(tables.steps.testrunId, testrun.id), eq(tables.steps.retry, testrun.retries)),
		orderBy: [desc(tables.steps.index)],
		limit: 1
	});

	return [currentStep ? currentStep.index + 1 : 0, test.stepsCount];
});
