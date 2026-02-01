import { db } from '$lib/server/db';
import { repositories } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';

const listenToActions = ['edited'];

export const RepositoryEvent = type({
	action: 'string',
	repository: {
		id: 'number',
		description: 'string | null'
	}
});

export async function onRepository(payload: unknown) {
	if (typeof payload !== 'object' || payload === null) {
		error(400, 'Invalid payload');
	}

	if (!('action' in payload)) {
		error(400, 'Invalid repository payload: missing action');
	}

	const data = RepositoryEvent.assert(payload);
	if (!listenToActions.includes(data.action)) {
		return json({ ok: 'ignored' });
	}

	const repository = await db.query.repositories.findFirst({
		where: eq(repositories.githubId, data.repository.id)
	});

	if (!repository) {
		error(400, 'Repository not found. Launch a workflow_job or ping event first to create it.');
	}

	// Update description

	await db
		.update(repositories)
		.set({
			description: data.repository.description ?? ''
		})
		.where(eq(repositories.id, repository.id));

	return json({ ok: 'updated' });
}
