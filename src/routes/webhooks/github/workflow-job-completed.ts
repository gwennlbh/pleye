import { db } from '$lib/server/db';
import { repositories, runs } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';

export const WorkflowJobCompletedEvent = type({
	repository: { id: 'number' },
	action: "string",
	workflow_job: {
		id: 'number',
		// XXX: not official, see https://github.com/github/rest-api-description/issues/1634
		// TODO: add a catch-all for other values
		conclusion: type.enumerated(
			'success',
			'failure',
			'neutral',
			'cancelled',
			'timed_out',
			'action_required',
			'stale'
		),
		completed_at: 'string.date.iso.parse',
		started_at: 'string.date.iso.parse'
	}
});

export async function onWorkflowJobCompleted(payload: unknown) {
	const data = WorkflowJobCompletedEvent.assert(payload);

	if (data.action !== "completed") return json({ ok: "ignored" })

	// Get repository
	const repository = await db.query.repositories.findFirst({
		where: eq(repositories.githubId, data.repository.id)
	});

	if (!repository) {
		error(
			404,
			`Repository with GitHub ID ${data.repository.id} not found. Send a ping event (by re-adding the webhook) first to register it.`
		);
	}

	// Search for a run that matches the given job ID and update its status to completed
	const run = await db.query.runs.findFirst({
		where: and(eq(runs.githubJobId, data.workflow_job.id), eq(runs.repositoryId, repository.id))
	});

	if (!run) {
		error(
			404,
			`Run with GitHub Job ID ${data.workflow_job.id} not found for repository ${repository.githubOwner}/${repository.githubRepo}.`
		);
	}

	return await db
		.update(runs)
		.set({
			status: 'completed',
			completedAt: data.workflow_job.completed_at,
			startedAt: data.workflow_job.started_at,
			// Translate GitHub workflow_job conclusion to PlaywrightFullResult status
			result: (
				{
					action_required: 'interrupted',
					cancelled: 'interrupted',
					failure: 'failed',
					neutral: 'passed',
					success: 'passed',
					stale: 'timedout',
					timed_out: 'timedout'
				} as const
			)[data.workflow_job.conclusion]
		})
		.where(eq(runs.id, run.id))
		.returning()
		.then(([run]) => json(run));
}
