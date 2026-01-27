import { db } from '$lib/server/db';
import { repositories } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';

export const PingEvent = type({
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
});

export async function onPing(payload: unknown, requiredEvents: string[]) {
	const data = PingEvent.assert(payload);

	// First, check if we're listening the necessary events

	const hookEvents = [
		...new Set(requiredEvents.filter((e) => e !== 'ping').map((e) => e.split('.')[0]))
	];

	if (!hookEvents.every((e) => data.hook.events.includes(e))) {
		error(400, `Webhook is not configured to listen to required events: ${hookEvents.join(', ')}`);
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
