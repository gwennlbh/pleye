import { query } from '$app/server';
import { projectNameAbbreviation } from '$lib/projects';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { uniqueBy } from '$lib/utils';
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

export const projectsOfRepo = query(type('number'), async (repo) => {
	const projects = await db.query.projects.findMany({
		where: eq(tables.projects.repositoryId, repo)
	});

	return new Map(
		projects.map((p) => [p.id, { ...p, abbreviation: projectNameAbbreviation(p.name) }])
	);
});

export const testsWithLatestTestrun = query(
	type({ repoId: 'number', branch: 'string' }),
	async (params) => {
		const testruns = await db
			.select()
			.from(tables.testruns)
			.leftJoin(tables.runs, eq(tables.runs.id, tables.testruns.runId))
			.leftJoin(tables.tests, eq(tables.tests.id, tables.testruns.testId))
			.where(
				and(
					eq(tables.tests.repositoryId, params.repoId),
					eq(tables.runs.branch, params.branch),
					isNotNull(tables.tests.id),
					isNotNull(tables.runs.id)
				)
			);

		const testrunsPerProject = Map.groupBy(testruns, ({ testruns }) => testruns.projectId);

		const tests = uniqueBy(
			testruns.map(({ tests }) => tests).filter((t) => t !== null),
			(t) => t.id
		);

		return tests.map((t) => ({
			...t,
			latestTestruns: testrunsPerProject
				.values()
				.toArray()
				.map((packets) =>
					packets
						.filter(({ testruns }) => testruns.testId === t.id)
						.filter((p) => p.runs !== null)
						.map(({ testruns, runs }) => ({
							...testruns,
							run: runs!
						}))
						.filter((tr) => tr.run !== undefined)
						.toSorted((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
						.at(-1)
				)
				.filter((tr) => tr !== undefined)
		}));
	}
);

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
		.selectDistinctOn([tables.runs.branch], {
			pullRequestNumber: tables.runs.pullRequestNumber,
			pullRequestTitle: tables.runs.pullRequestTitle,
			branch: tables.runs.branch
		})
		.from(tables.runs)
		.where(eq(tables.runs.repositoryId, repoId));

	type PullRequest = { state: 'open' | 'closed' | 'merged'; number: number };
	let github: PullRequest[] = await fetch(
		`https://api.github.com/repositories/${repoId}/pulls`
	).then((res) => res.json());

	if (!Array.isArray(github)) github = [];

	return branches
		.map((branch) => ({
			...branch,
			pullRequestState: github.find((pr) => pr.number === branch.pullRequestNumber)?.state ?? null
		}))
		.filter((branch) => branch.pullRequestState === null || branch.pullRequestState === 'open')
		.toSorted((a, b) => {
			if (a.branch === 'main') return -1;
			if (b.branch === 'main') return 1;

			if (a.pullRequestNumber !== null && b.pullRequestNumber !== null) {
				return b.pullRequestNumber - a.pullRequestNumber;
			}

			return a.branch.localeCompare(b.branch);
		});
});
