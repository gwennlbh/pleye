import { query } from '$app/server';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, avg, count, desc, eq, gt, inArray, isNotNull, max, sql } from 'drizzle-orm';

export const repository = query(type({ owner: 'string', repo: 'string' }), async (params) => {
	const repo = await db.query.repositories.findFirst({
		where: and(
			eq(tables.repositories.githubOwner, params.owner),
			eq(tables.repositories.githubRepo, params.repo)
		)
	});

	if (!repo) {
		error(404, `Repository at https://github.com/${params.owner}/${params.repo} not found.`);
	}

	return repo;
});

// TODO make this configurable
const PROJECT_ABBREVIATIONS: Record<string, string> = {
	chromium: 'cr',
	firefox: 'ff',
	webkit: 'wk'
};

function projectNameAbbreviation(name: string): string {
	return PROJECT_ABBREVIATIONS[name.toLowerCase()] ?? name.slice(0, 2);
}

export const projectsOfRepo = query(type('number'), async (repo) => {
	const projects = await db.query.projects.findMany({
		where: eq(tables.projects.repositoryId, repo)
	});

	return new Map(
		projects.map((p) => [p.id, { ...p, abbreviation: projectNameAbbreviation(p.name) }])
	);
});

export const testsOfRepoByFilename = query(type('number'), async (repo) => {
	const tests = await db.query.tests.findMany({
		where: eq(tables.tests.repositoryId, repo)
	});

	const testruns = await db.query.testruns.findMany({
		where: inArray(
			tables.testruns.testId,
			tests.map((t) => t.id)
		)
	});

	const runs = await db.query.runs.findMany({
		where: inArray(
			tables.runs.id,
			testruns.map((tr) => tr.runId)
		)
	});

	const testWithRuns = tests.map((t) => ({
		...t,
		testruns: testruns
			.filter((tr) => tr.testId === t.id)
			.map((tr) => ({
				...tr,
				run: runs.find((r) => r.id === tr.runId)!
			}))
	}));

	return Map.groupBy(testWithRuns, (t) => t.filePath);
});

export const flakyTests = query(type('number'), async (repoId) => {
	return await db
		.select({
			test: tables.tests,
			runsAmount: count(tables.testruns.id),
			projectIds: sql<number[]>`array_agg(DISTINCT ${tables.testruns.projectId})`
		})
		.from(tables.testruns)
		.leftJoin(tables.runs, eq(tables.runs.id, tables.testruns.runId))
		.leftJoin(tables.tests, eq(tables.tests.id, tables.testruns.testId))
		.where(
			and(
				eq(tables.runs.branch, 'main'),
				eq(tables.runs.repositoryId, repoId),
				inArray(tables.testruns.outcome, ['flaky', 'unexpected'])
			)
		)
		.groupBy(tables.tests.id)
		.having(({ runsAmount }) => gt(runsAmount, 1))
		.orderBy(({ runsAmount }) => desc(runsAmount));
});

export const longTests = query(type('number'), async (repoId) => {
	// Get tests with the highest average duration (considering only passing runs)
	// where average duration > 10 seconds
	// TODO: make the 10 seconds configurable
	return await db
		.select({
			test: tables.tests,
			averageDuration: avg(tables.testruns.duration),
			projectIds: sql<number[]>`array_agg(DISTINCT ${tables.testruns.projectId})`
		})
		.from(tables.testruns)
		.leftJoin(tables.runs, eq(tables.runs.id, tables.testruns.runId))
		.leftJoin(tables.tests, eq(tables.tests.id, tables.testruns.testId))
		.where(
			and(
				eq(tables.runs.repositoryId, repoId),
				eq(tables.runs.branch, 'main'),
				isNotNull(tables.testruns.duration),
				eq(tables.testruns.outcome, 'expected'),
				gt(tables.testruns.duration, sql`'10 seconds'`)
			)
		)
		.groupBy(tables.tests.id)
		.orderBy(({ averageDuration }) => desc(averageDuration))
		.limit(20);
});

export const branchesOfRepo = query(type('number'), async (repoId) => {
	const branches = await db
		.selectDistinct({ branch: tables.runs.branch })
		.from(tables.runs)
		.where(eq(tables.runs.repositoryId, repoId));

	return branches.map((b) => b.branch);
});
