import { db } from '$lib/server/db';
import { branches, repositories } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';

export const CreateEvent = type({
	ref_type: '"tag" | "branch"',
	ref: 'string',
	repository: {
		id: 'number'
	}
});

export async function onCreate(payload: unknown) {
	if (typeof payload !== 'object' || payload === null) {
		error(400, 'Invalid payload');
	}

	if (!('ref_type' in payload)) {
		error(400, 'Invalid create payload: missing ref_type');
	}

	const data = CreateEvent.assert(payload);

	if (data.ref_type !== 'branch') {
		return json({ ok: 'ignored' });
	}

	const existing = await db.query.branches.findFirst({
		where: and(eq(branches.repositoryId, data.repository.id), eq(branches.name, data.ref))
	});

	const repository = await db.query.repositories.findFirst({
		where: eq(repositories.githubId, data.repository.id),
		columns: { id: true }
	});

	if (!repository) {
		error(400, 'Invalid create payload: unknown repository');
	}

	if (!existing) {
		await db.insert(branches).values({
			repositoryId: repository.id,
			name: data.ref
		});
	}

	return json({ ok: 'created' });
}
