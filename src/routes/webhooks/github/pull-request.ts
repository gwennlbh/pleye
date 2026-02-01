import { db } from '$lib/server/db';
import { branches, repositories } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';

const actionsToListenTo = ['closed', 'converted_to_draft', 'read_for_review', 'opened', 'reopened'];

export const PullRequestEvent = type({
	action: 'string',
	repository: {
		id: 'number'
	},
	pull_request: {
		number: 'number',
		merged: 'boolean',
		draft: 'boolean',
		state: type.enumerated('open', 'closed'),
		title: 'string',
		head: {
			ref: 'string'
		}
	}
});

export async function onPullRequest(payload: unknown) {
	if (typeof payload !== 'object' || payload === null) {
		error(400, 'Invalid payload');
	}

	if (!('action' in payload)) {
		error(400, 'Invalid pull_request payload: missing action');
	}

	const data = PullRequestEvent.assert(payload);

	if (!actionsToListenTo.includes(data.action)) {
		return json({ ok: 'ignored' });
	}

	const repository = await db.query.repositories.findFirst({
		where: eq(repositories.githubId, data.repository.id)
	});

	if (!repository) {
		error(400, 'Repository not found. Launch a workflow_job or ping event first to create it.');
	}

	let branch = await db.query.branches.findFirst({
		where: and(
			eq(branches.repositoryId, repository.id),
			eq(branches.name, data.pull_request.head.ref)
		)
	});

	const values = {
		name: data.pull_request.head.ref,
		pullRequestNumber: data.pull_request.number,
		pullRequestTitle: data.pull_request.title,
		pullRequestState:
			data.pull_request.state === 'open'
				? data.pull_request.draft
					? 'draft'
					: 'open'
				: data.pull_request.merged
					? 'merged'
					: 'closed'
	} as const;

	if (!branch) {
		[branch] = await db
			.insert(branches)
			.values({
				repositoryId: repository.id,
				...values
			})
			.returning();
	} else {
		[branch] = await db.update(branches).set(values).where(eq(branches.id, branch.id));
	}

	return json({ branch });
}
