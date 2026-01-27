import { env } from '$lib/server/env.js';
import { keys } from '$lib/utils';
import { Webhooks } from '@octokit/webhooks';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { onPing, PingEvent } from './ping.js';
import { onWorkflowJobCompleted, WorkflowJobCompletedEvent } from './workflow-job-completed.js';

const Webhook = new Webhooks({
	secret: env.MASTER_KEY
});

const Events = {
	ping: PingEvent,
	workflow_job: WorkflowJobCompletedEvent
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
			return onWorkflowJobCompleted(payload);
		}
	}
}
