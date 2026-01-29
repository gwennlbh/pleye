import { workflowJobURL } from '$lib/github.js';
import { db } from '$lib/server/db/index.js';
import { errors, repositories, runs, steps } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { type } from 'arktype';
import { createInsertSchema } from 'drizzle-arktype';
import { and, eq } from 'drizzle-orm';
import { findTestRun, parsePayload, StepIdentifier } from '../common';

export const _Body = type({
	githubJobId: 'number',
	step: StepIdentifier,
	duration: createInsertSchema(steps).get('duration').extract('string'),
	'error?': createInsertSchema(errors).omit('id', 'resultId')
});

export async function POST({ request, params }) {
	const data = await parsePayload(request, _Body);

	const testrun = await findTestRun(params, data.githubJobId, data.step.test);

	const [step] = await db
		.update(steps)
		.set({
			duration: data.duration
		})
		.where(and(eq(steps.testrunId, testrun.id), eq(steps.index, data.step.index)))
		.returning();

	if (!step) {
		const run = await db.query.runs.findFirst({
			where: eq(runs.id, testrun.runId)
		});
		const repo = await db.query.repositories.findFirst({
			where: eq(repositories.githubId, Number(params.repository))
		});

		return error(
			404,
			`Could not find a step with index ${data.step.index} for test run ${testrun.id}. See ${workflowJobURL(repo!, run!)}`
		);
	}

	if (data.error) {
		await db.insert(errors).values({
			...data.error,
			stepId: step.id
		});
	}

	return json({ step });
}
