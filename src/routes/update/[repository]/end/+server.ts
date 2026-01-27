import { db } from '$lib/server/db';
import { runs } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-arktype';
import { and, eq } from 'drizzle-orm';
import { findRepository } from '../common';

export const _Body = createInsertSchema(runs).pick(
	'githubJobId',
	'completedAt',
	'result',
	'status'
);

export async function POST({ request, params }) {
	const payload = await request.json();
	const data = _Body.assert(payload);

	const repository = await findRepository(params);

	return await db
		.update(runs)
		.set({
			completedAt: data.completedAt,
			result: data.result,
			status: data.status
		})
		.where(and(eq(runs.repositoryId, repository.id), eq(runs.githubJobId, data.githubJobId)))
		.returning()
		.then(([run]) => json({ run }));
}
