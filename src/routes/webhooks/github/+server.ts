import { db } from '$lib/server/db/index.js';
import { repositories, runs } from '$lib/server/db/schema.js';
import { env } from '$lib/server/env.js';
import { keys } from '$lib/utils';
import { Webhooks } from '@octokit/webhooks';
import { error, json } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';

const Webhook = new Webhooks({
	secret: env.MASTER_KEY
});

const Events = {
	ping: type({
		zen: 'string',
		hook: {
			events: 'string[]'
		},
		repository: {
			id: 'number',
			name: 'string',
			owner: {
				login: 'string'
			}
		}
	}),
	'workflow_job.completed': type({
		repository: { id: 'number' },
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
	})
};

const EventName = type.enumerated(...keys(Events));

export async function POST({ request }) {
	const payload = await request.json();

	// Validate webhook signature
	const valid = await Webhook.verify(payload, request.headers.get('X-Hub-Signature-256') || '');

	if (!valid) {
		error(400, 'Invalid signature');
	}

	const event = request.headers.get('X-GitHub-Event');

	if (!event) {
		error(400, 'Missing X-GitHub-Event header');
	}

	if (!EventName.allows(event)) {
		error(400, `Unsupported event type: ${event}. The webhook only answers to ${keys(Events)}`);
	}

	switch (event) {
		// If webhook changed/was added, upsert the repository
		case 'ping': {
			const data = Events.ping.assert(payload);

			// First, check if we're listening the necessary events

			const hookEvents = [
				...new Set(
					keys(Events)
						.filter((e) => e !== 'ping')
						.map((e) => e.split('.')[0])
				)
			];

			if (!hookEvents.every((e) => data.hook.events.includes(e))) {
				error(
					400,
					`Webhook is not configured to listen to required events: ${hookEvents.join(', ')}`
				);
			}

			// Then update or insert the repository

			const existing = await db.query.repositories.findFirst({
				where: eq(repositories.githubId, data.repository.id)
			});

			const values = {
				githubId: data.repository.id,
				githubOwner: data.repository.owner.login,
				githubRepo: data.repository.name
			};

			if (existing) {
				return await db
					.update(repositories)
					.set({ id: existing.id, ...values })
					.returning()
					.then(([repository]) => json(repository));
			}

			return await db
				.insert(repositories)
				.values(values)
				.returning()
				.then(([repository]) => json(repository));
		}

		// If a job completed, find the matching testrun and force-mark it as completed
		// (in case the reporter couldnt do so (job was cancelled, etc))
		case 'workflow_job.completed': {
			const data = Events['workflow_job.completed'].assert(payload);

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
					id: run.id,
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
				.returning()
				.then(([run]) => json(run));
		}
	}
}
