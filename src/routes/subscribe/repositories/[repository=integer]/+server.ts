import { subscribe } from '$lib/server/realtime.js';

/**
 * Subscribe to Runs of a given repository
 */
export async function GET({ params }) {
	return new Response(
		subscribe({
			begin: { repositoryId: Number(params.repository) },
			end: { repositoryId: Number(params.repository) }
		})
	);
}
