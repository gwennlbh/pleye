import { db } from '$lib/server/db';
import { repositories } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function findRepository(params: { repository: string }) {
	const repository = await db.query.repositories.findFirst({
		where: eq(repositories.githubId, Number(params.repository))
	});

	if (!repository) {
		error(404, `Repository with GitHub ID ${params.repository} not found.`);
	}

	return repository;
}

export function testId({ title, path }: { title: string; path: string[] }): string {
	return [title, ...path].join('›');
}
