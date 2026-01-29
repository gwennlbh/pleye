import { query } from '$app/server';
import { type } from 'arktype';
import * as tables from '$lib/server/db/schema';
import { repository } from '../../../data.remote';
import { db } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';

export const getTest = query(
	type({ owner: 'string', repo: 'string', filepath: 'string', test: 'string' }),
	async (params) => {
		const repo = await repository(params);

		const pathAndTitle = params.test.split('/');
		const title = pathAndTitle.pop()!;
		const path = pathAndTitle;

		return db.query.tests.findFirst({
			where: and(
				eq(tables.tests.repositoryId, repo.id),
				eq(tables.tests.filePath, '/' + params.filepath),
				eq(tables.tests.path, path),
				eq(tables.tests.title, title)
			)
		});
	}
);
