import { query } from '$app/server';
import { parseDuration } from '$lib/durations';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { uniqueById } from '$lib/utils';
import { type } from 'arktype';
import { compareDesc as compareDatesDesc } from 'date-fns';
import { createSelectSchema } from 'drizzle-arktype';
import { and, avg, desc, eq, inArray, isNotNull } from 'drizzle-orm';

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
			.leftJoin(tables.branches, eq(tables.branches.id, tables.runs.branchId))
			.leftJoin(tables.results, eq(tables.results.testrunId, tables.testruns.id))
			.where(
				and(
					eq(tables.runs.repositoryId, params.repoId),
					eq(tables.branches.name, params.branch),
					// TODO find a way to keep runs that are part of the same workflow run but have statuses
					// other than the requested one, as long as at least one run matches the status.
					// eq(tables.runs.status, params.status),
					// Maybe we should group by in SQL land
					isNotNull(tables.runs.id),
					isNotNull(tables.testruns.id),
					isNotNull(tables.tests.id)
				)
			);

		const rows = await query;

		const richRuns = uniqueById(
			rows.map((row) => ({
				...row.runs,
				testruns: uniqueById(
					rows
						.filter((r) => r.runs.id === row.runs.id)
						.map((r) => ({
							...r.testruns!,
							test: r.tests!,
							results: rows
								.filter((resultRow) => resultRow.testruns?.id === r.testruns!.id)
								.map((resultRow) => resultRow.results!)
						}))
				)
			}))
		);

		const byWorkflow = Map.groupBy(richRuns, (run) => run.githubRunId);

		for (const [githubRunId, runs] of byWorkflow) {
			if (!runs.some((r) => r.status === params.status)) {
				byWorkflow.delete(githubRunId);
			}
		}

		return [...byWorkflow.entries()].sort(([, a], [, b]) => {
			const startedAt = (i: typeof a | typeof b) =>
				new Date(Math.min(...i.map((r) => r.startedAt.getTime())));

			return compareDatesDesc(startedAt(a), startedAt(b));
		});
	}
);

export const expectedTestrunDuration = query.batch(
	type({ testId: 'number', projectId: 'number', branch: 'string' }),
	async (params) => {
		// Get average of all testrun durations for the given testrun's test and project, considering only passing testruns that have their run on the main branch or on this branch

		const results = await db
			.select({
				testId: tables.testruns.testId,
				projectId: tables.testruns.projectId,
				averageDuration: avg(tables.testruns.duration)
			})
			.from(tables.testruns)
			.leftJoin(tables.runs, eq(tables.runs.id, tables.testruns.runId))
			.leftJoin(tables.tests, eq(tables.tests.id, tables.testruns.testId))
			.leftJoin(tables.branches, eq(tables.branches.id, tables.runs.branchId))
			.where(
				and(
					inArray(tables.branches.name, ['main', ...params.map((tr) => tr.branch)]),
					isNotNull(tables.testruns.duration),
					eq(tables.testruns.outcome, 'expected'),
					inArray(
						tables.testruns.testId,
						params.map((tr) => tr.testId)
					),
					inArray(
						tables.testruns.projectId,
						params.map((tr) => tr.projectId)
					)
				)
			)
			.groupBy(({ testId, projectId }) => [testId, projectId]);

		return ({ testId, projectId }) =>
			parseDuration(
				results.find((r) => r.testId === testId && r.projectId === projectId)?.averageDuration ??
					'00:00:00'
			);
	}
);

export const testsWithLatestTestrunOnBranch = query(
	type({ repoId: 'number', branch: 'string' }),
	async (params) => {
		const tests = await db.query.tests.findMany({
			where: eq(tables.tests.repositoryId, params.repoId)
		});

		const latestTestruns = await Promise.all(
			tests.map(async (test) =>
				db
					.select()
					.from(tables.testruns)
					.leftJoin(tables.runs, eq(tables.runs.id, tables.testruns.runId))
					.leftJoin(tables.branches, eq(tables.branches.id, tables.runs.branchId))
					.where(and(eq(tables.testruns.testId, test.id), eq(tables.branches.name, params.branch)))
					.orderBy(desc(tables.testruns.startedAt))
					.limit(1)
					.then((rows) => rows[0]?.testruns)
			)
		);

		return tests.map((test) => ({
			...test,
			testrun: latestTestruns.find((tr) => tr?.testId === test.id)
		}));
	}
);
