import { db } from '$lib/server/db';
import { repositories, runs, testruns, tests } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

export async function findRepository(params: { repository: string }) {
	const repository = await db.query.repositories.findFirst({
		where: eq(repositories.githubId, Number(params.repository))
	});

	if (!repository) {
		error(404, `Repository with GitHub ID ${params.repository} not found.`);
	}

	return repository;
}

export async function findTestRun(
	params: { repository: string },
	githubJobId: number,
	{ title, path }: { title: string; path: string[] }
) {
	const repository = await findRepository(params);
	const run = await findRun(params, githubJobId, repository.id);
	const test = await findTest(params, { title, path }, repository.id);

	const testrun = await db.query.testruns.findFirst({
		where: and(eq(testruns.testId, test.id), eq(testruns.runId, run.id))
	});

	if (!testrun) {
		error(404, `Testrun for test ${test.id} in run ${run.id} not found.`);
	}

	return testrun;
}

export async function findRun(
	params: { repository: string },
	githubJobId: number,
	/** The **Database** ID, useful if we've already fetched it */
	repositoryId?: number
) {
	repositoryId ??= await findRepository(params).then((r) => r.id);

	if (!repositoryId) {
		error(500, 'Repository ID could not be determined.');
	}

	const run = await db.query.runs.findFirst({
		where: and(eq(runs.githubJobId, githubJobId), eq(runs.repositoryId, repositoryId))
	});

	if (!run) {
		error(404, `Run with GitHub Job ID ${githubJobId} not found for repository ${repositoryId}.`);
	}

	return run;
}

export async function findTest(
	params: { repository: string },
	{ title, path }: { title: string; path: string[] },
	repositoryId?: number
) {
	repositoryId ??= await findRepository(params).then((r) => r.id);

	if (!repositoryId) {
		error(500, 'Repository ID could not be determined.');
	}

	const test = await db.query.tests.findFirst({
		where: and(eq(tests.repositoryId, repositoryId), eq(tests.id, testId({ title, path })))
	});

	if (!test) {
		error(404, `Test ${testId({ title, path })} not found in repository ${params.repository}.`);
	}

	return test;
}

export function testId({ title, path }: { title: string; path: string[] }): string {
	return [...path, title].join('›');
}
