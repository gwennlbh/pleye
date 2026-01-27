import { db } from '$lib/server/db';
import { projects, testruns, tests } from '$lib/server/db/schema';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';
import { and, eq } from 'drizzle-orm';
import { findRepository, findRun, parsePayload, testId } from '../common';
import { error, json } from '@sveltejs/kit';

export const _Body = type({
	githubJobId: 'number',
	projectName: 'string',
	test: createInsertSchema(tests).omit('id', 'repositoryId', 'stepsCount'),
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
		where: and(eq(tests.repositoryId, repository.id), eq(tests.id, testId(data.test)))
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
				id: testId(data.test),
				repositoryId: repository.id,
				stepsCount: 0,
				...data.test
			})
			.returning();
	}

	// Create the testrun

	return await db
		.insert(testruns)
		.values({
			testId: test.id,
			runId: run.id,
			projectId: project.id,
			...data.testrun
		})
		.then(([testrun]) => json({ testrun }));
}
