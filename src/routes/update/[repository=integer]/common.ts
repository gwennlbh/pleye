import { db } from '$lib/server/db';
import { repositories, runs, testruns, tests } from '$lib/server/db/schema';
import { escapeSlashes } from '$lib/utils';
import { error } from '@sveltejs/kit';
import { type, type Type } from 'arktype';
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

export const TestIdentifier = type({
	title: ['string', '=>', escapeSlashes],
	path: type('string[]').pipe(segs => segs.map(escapeSlashes)),
	filePath: 'string'
});

export const StepIdentifier = type({
	index: 'number.integer > 0',
	retry: 'number.integer >= 0',
	test: TestIdentifier
});

export type TestIdentifierParams = typeof TestIdentifier.infer;

export type StepIdentifierParams = typeof StepIdentifier.infer;

export async function findTestRun(
	params: { repository: string },
	githubJobId: number,
	testParams: TestIdentifierParams
) {
	const repository = await findRepository(params);
	const run = await findRun(params, githubJobId, repository.id);
	const test = await findTest(params, testParams, repository.id);

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
	{ title, path, filePath }: TestIdentifierParams,
	repositoryId?: number
) {
	repositoryId ??= await findRepository(params).then((r) => r.id);

	if (!repositoryId) {
		error(500, 'Repository ID could not be determined.');
	}

	const test = await db.query.tests.findFirst({
		where: and(
			eq(tests.repositoryId, repositoryId),
			eq(tests.filePath, filePath),
			eq(tests.path, path),
			eq(tests.title, title)
		)
	});

	if (!test) {
		error(
			404,
			`Test ${[...path, title].join(' > ')} in ${filePath} not found in repository ${params.repository}.`
		);
	}

	return test;
}

export async function parsePayload<Schema extends Type>(
	request: Request,
	schema: Schema
): Promise<Schema['inferOut']> {
	return await request
		.text()
		.then((raw) =>
			JSON.parse(raw, (key, value) => {
				if (key.endsWith('At') && typeof value === 'string') {
					return new Date(value);
				}

				return value;
			})
		)
		.then((payload) => schema.assert(payload));
}
