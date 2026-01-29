import { query } from '$app/server';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
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
		error(404, `Repository at https://github.com/${params.owner}/${params.repo} not found.`);
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
	const runs = await db.query.runs.findMany({
		where: and(eq(tables.runs.repositoryId, repoId), eq(tables.runs.branch, 'main'))
	});

	const testruns = await db.query.testruns.findMany({
		where: and(
			inArray(
				tables.testruns.runId,
				runs.map((r) => r.id)
			),
			inArray(tables.testruns.outcome, ['flaky', 'unexpected'])
		)
	});

	const tests = await db.query.tests.findMany({
		where: inArray(
			tables.tests.id,
			testruns.map((tr) => tr.testId)
		)
	});

	return tests
		.map((test) => ({
			...test,
			testruns: testruns.filter((tr) => tr.testId === test.id)
		}))
		.toSorted((a, b) => b.testruns.length - a.testruns.length);
});
