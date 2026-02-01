import { query } from '$app/server';
import { parseTestPathParam } from '$lib/params';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { uniqueById } from '$lib/utils';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { compareDesc as compareDatesDesc } from 'date-fns';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';

export const testInRepo = query(type({ repoId: 'number', test: 'string' }), async (params) => {
	const { filePath, path, title } = parseTestPathParam(params.test);

	const test = await db.query.tests.findFirst({
		where: and(
			eq(tables.tests.repositoryId, params.repoId),
			inArray(tables.tests.filePath, [filePath, '/' + filePath]),
			eq(tables.tests.path, path),
			eq(tables.tests.title, title)
		)
	});

	// FIXME: this makes the server crash for some reason. We use a load function instead.
	if (!test) error(404, 'Test not found');

	return test;
});

export const runsOfTest = query(
	type({
		testId: 'number',
		branches: 'string[] | null = null',
		openPRs: ['number[]', '=', () => []]
	}),
	async ({ testId: id, branches, openPRs }) => {
		const rows = await db
			.select()
			.from(tables.testruns)
			.leftJoin(tables.runs, eq(tables.runs.id, tables.testruns.runId))
			.leftJoin(tables.results, eq(tables.results.testrunId, tables.testruns.id))
			.leftJoin(tables.errors, eq(tables.errors.resultId, tables.results.id))
			.where(
				and(
					eq(tables.testruns.testId, id),
					branches ? inArray(tables.runs.branch, branches) : undefined,
					// Don't request runs from closed PRs if we know which PRs are still open
					openPRs
						? or(
								isNull(tables.runs.pullRequestNumber),
								inArray(tables.runs.pullRequestNumber, openPRs)
							)
						: undefined
				)
			)
			.orderBy(desc(tables.testruns.startedAt));

		const testruns = uniqueById(
			rows.map((row) => ({
				...row.testruns,
				run: row.runs!,
				results: uniqueById(
					rows
						.filter((r) => r.testruns.id === row.testruns.id)
						.map((r) => r.results)
						.filter((res) => res !== null)
						.map((result) => ({
							...result,
							errors: rows.filter((r) => r.errors?.resultId === result.id).map((r) => r.errors!)
						}))
				)
			}))
		).sort((a, b) => compareDatesDesc(a.startedAt, b.startedAt));

		return Map.groupBy(testruns, (tr) => tr.run.pullRequestNumber || tr.run.branch);
	}
);
