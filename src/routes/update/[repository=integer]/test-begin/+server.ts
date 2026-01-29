import { db } from '$lib/server/db';
import { projects, steps, testruns, tests } from '$lib/server/db/schema';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';
import { and, eq } from 'drizzle-orm';
import { findRepository, findRun, parsePayload } from '../common';
import { error, json } from '@sveltejs/kit';
import { push } from '$lib/server/realtime.js';
import { escapeSlashes } from '$lib/utils.js';

export const _Body = type({
	githubJobId: 'number',
	projectName: 'string',
	test: createInsertSchema(tests)
		.omit('id', 'repositoryId', 'stepsCount')
		.omit('title', 'path')
		.and({
			title: ['string', '=>', escapeSlashes],
			path: ['string[]', '=>', (p) => p.map(escapeSlashes)]
		}),
	testrun: createInsertSchema(testruns).omit('id', 'testId', 'outcome', 'runId', 'projectId')
});

export async function POST({ params, request }) {
	const data = await parsePayload(request, _Body);

	const repository = await findRepository(params);
	const run = await findRun(params, data.githubJobId, repository.id);

	// Find the project

	const project = await db.query.projects.findFirst({
		where: and(eq(projects.repositoryId, repository.id), eq(projects.name, data.projectName))
	});

	if (!project) {
		error(
			404,
			`Project ${data.projectName} not found in repository ${repository.githubOwner}/${repository.githubRepo}.`
		);
	}

	// Create the test definition

	let test = await db.query.tests.findFirst({
		where: and(
			eq(tests.repositoryId, repository.id),
			eq(tests.filePath, data.test.filePath),
			eq(tests.path, data.test.path),
			eq(tests.title, data.test.title)
		)
	});

	if (test) {
		[test] = await db
			.update(tests)
			.set({
				...data.test
			})
			.where(eq(tests.id, test.id))
			.returning();
	} else {
		[test] = await db
			.insert(tests)
			.values({
				repositoryId: repository.id,
				stepsCount: 0,
				...data.test
			})
			.returning();
	}

	let testrun = await db.query.testruns.findFirst({
		where: and(
			eq(testruns.testId, test.id),
			eq(testruns.runId, run.id),
			eq(testruns.projectId, project.id)
		)
	});

	if (testrun) {
		// Wipe all steps for this testrun, as we're starting it again
		await db.delete(steps).where(eq(steps.testrunId, testrun.id));

		[testrun] = await db
			.update(testruns)
			.set({
				...data.testrun
			})
			.where(eq(testruns.id, testrun.id))
			.returning();
	} else {
		[testrun] = await db
			.insert(testruns)
			.values({
				testId: test.id,
				runId: run.id,
				projectId: project.id,
				...data.testrun
			})
			.returning();
	}

	push('test-begin', repository.githubId, run.githubJobId, {
		title: test.title,
		path: test.path,
		filePath: test.filePath
	});

	return json({ testrun, test, project, run, repository });
}
