import { query } from '$app/server';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { type } from 'arktype';
import { and, eq, inArray } from 'drizzle-orm';

export const repository = query(type({ owner: 'string', repo: 'string' }), async (params) => {
	const repo = await db.query.repositories.findFirst({
		where: and(
			eq(tables.repositories.githubOwner, params.owner),
			eq(tables.repositories.githubRepo, params.repo)
		)
	});

	if (!repo) {
		throw new Error(`Repository at https://github.com/${params.owner}/${params.repo} not found.`);
	}

	return repo;
});

export const projectsOfRepo = query(type('number'), async (repo) => {
	const projects = await db.query.projects.findMany({
		where: eq(tables.projects.repositoryId, repo)
	});

	return new Map(projects.map((p) => [p.id, p]));
});

export const testsOfRepoByFilename = query(type('number'), async (repo) => {
	const tests = await db.query.tests.findMany({
		where: eq(tables.tests.repositoryId, repo)
	});

	const testruns = await db.query.testruns.findMany({
		where: inArray(
			tables.testruns.testId,
			tests.map((t) => t.id)
		),
		columns: { testId: true, outcome: true, expectedStatus: true, startedAt: true }
	});

	const testWithRuns = tests.map((t) => ({
		...t,
		runs: testruns.filter((tr) => tr.testId === t.id)
	}));

	return Map.groupBy(testWithRuns, (t) => t.filePath);
});
