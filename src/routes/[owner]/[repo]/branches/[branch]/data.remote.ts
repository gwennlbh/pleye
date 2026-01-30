import { query } from '$app/server';
import { db } from '$lib/server/db';
import * as tables from '$lib/server/db/schema';
import { type } from 'arktype';
import { and, desc, eq, inArray } from 'drizzle-orm';

export const runsOfBranch = query(type({ repoId: 'number', branch: 'string' }), async (params) => {
	const runs = await db.query.runs.findMany({
		where: and(eq(tables.runs.repositoryId, params.repoId), eq(tables.runs.branch, params.branch)),
		orderBy: [desc(tables.runs.startedAt)]
	});

	const testruns = await db.query.testruns.findMany({
		where: inArray(
			tables.testruns.runId,
			runs.map((run) => run.id)
		)
	});

	const tests = await db.query.tests.findMany({
		where: inArray(
			tables.tests.id,
			testruns.map((tr) => tr.testId)
		)
	});

    const steps = await db.query.steps.findMany({
        where: inArray(
            tables.steps.testrunId,
            testruns.map((tr) => tr.id)
        )
    });

	const richRuns = runs.map((run) => ({
		...run,
		testruns: testruns
			.filter((tr) => tr.runId === run.id)
			.map((tr) => ({
				...tr,
                steps: steps.filter((step) => step.testrunId === tr.id),
				test: tests.find((test) => test.id === tr.testId)!
			}))
	}));

	const byWorkflowRun = Map.groupBy(richRuns, (run) => run.githubRunId);

	const ongoing: typeof byWorkflowRun = new Map();
	const completed: typeof byWorkflowRun = new Map();

	for (const [key, runs] of byWorkflowRun) {
		if (runs.some((run) => run.status !== 'completed')) {
			ongoing.set(key, runs);
		} else {
			completed.set(key, runs);
		}
	}

	return { ongoing, completed };
});
