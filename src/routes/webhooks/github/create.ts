import { db } from '$lib/server/db';
import { branches } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';

export const CreateEvent = type({
	ref_type: '"tag" | "branch"',
	ref: {
		ref: 'string'
	},
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

	if (!data.ref.ref.startsWith('refs/heads/')) {
		error(400, 'Invalid create payload: ref is not a branch');
	}

	const name = data.ref.ref.replace('refs/heads/', '');

	const existing = await db.query.branches.findFirst({
		where: and(eq(branches.repositoryId, data.repository.id), eq(branches.name, name))
	});

	if (!existing) {
		await db.insert(branches).values({
			repositoryId: data.repository.id,
			name
		});
	}

	return json({ ok: 'created' });
}
