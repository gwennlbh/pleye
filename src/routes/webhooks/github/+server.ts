import { env } from '$lib/server/env.js';
import { keys } from '$lib/utils';
import { Webhooks } from '@octokit/webhooks';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { PingEvent, onPing } from './ping.js';
import { WorkflowJobEvent, onWorkflowJob } from './workflow-job.js';
import { CreateEvent, onCreate } from './create.js';
import { PullRequestEvent, onPullRequest } from './pull-request.js';
import { RepositoryEvent, onRepository } from './repository.js';

const Webhook = new Webhooks({
	secret: env.MASTER_KEY
});

const Events = {
	ping: PingEvent,
	workflow_job: WorkflowJobEvent,
	pull_request: PullRequestEvent,
	repository: RepositoryEvent,
	create: CreateEvent
};

const EventName = type.enumerated(...keys(Events));

export async function POST({ request }) {
	const raw = await request.text();

	// Validate webhook signature
	const valid = await Webhook.verify(raw, request.headers.get('X-Hub-Signature-256') || '');

	if (!valid) {
		error(400, 'Invalid signature');
	}

	const payload = JSON.parse(raw);

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
			return onPing(payload, keys(Events));
		}

		// If a job completed, find the matching testrun and force-mark it as completed
		// (in case the reporter couldnt do so (job was cancelled, etc))
		case 'workflow_job': {
			return onWorkflowJob(payload);
		}

		case 'pull_request': {
			return onPullRequest(payload);
		}

		case 'repository': {
			return onRepository(payload);
		}

		case 'create': {
			return onCreate(payload);
		}
	}
}
