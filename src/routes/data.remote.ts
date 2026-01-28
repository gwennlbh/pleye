import { query } from '$app/server';
import { db } from '$lib/server/db';

export const repositories = query(async () => {
	return db.query.repositories.findMany();
});
