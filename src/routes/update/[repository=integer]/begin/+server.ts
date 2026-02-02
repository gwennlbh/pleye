import { db } from '$lib/server/db/index.js';
import { branches, projects, runs } from '$lib/server/db/schema';
import { type } from 'arktype';
import { json } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-arktype';
import { findRepository, parsePayload } from '../common.js';
import { and, eq } from 'drizzle-orm';
import { push } from '$lib/server/realtime.js';

export const _Body = type({
	run: createInsertSchema(runs).omit('id', 'repositoryId', 'completedAt', 'result', 'status'),
	projects: createInsertSchema(projects).omit('id', 'repositoryId').array()
});

export async function POST({ request, params }) {
	const data = await parsePayload(request, _Body);

	const repository = await findRepository(params);

	let branch = await db.query.branches.findFirst({
		where: and(eq(branches.repositoryId, repository.id), eq(branches.name, data.run.branch))
	});

	if (!branch && data.run.branch) {
		[branch] = await db
			.insert(branches)
			.values({
				repositoryId: repository.id,
				name: data.run.branch,
				pullRequestNumber: data.run.pullRequestNumber ?? null,
				pullRequestTitle: data.run.pullRequestTitle ?? null
			})
			.returning();
	}

	for (const projectData of data.projects) {
		const projectValues = {
			repositoryId: repository.id,
			branchId: branch?.id ?? null,
			...projectData
		};

		let project = await db.query.projects.findFirst({
			where: and(eq(projects.repositoryId, repository.id), eq(projects.name, projectData.name))
		});

		if (project) {
			[project] = await db
				.update(projects)
				.set(projectValues)
				.where(eq(projects.name, project.name))
				.returning();
		} else {
			[project] = await db.insert(projects).values(projectValues).returning();
		}
	}

	const [run] = await db
		.insert(runs)
		.values({
			repositoryId: repository.id,
			branchId: branch?.id ?? null,
			status: 'in_progress',
			...data.run
		})
		.returning();

	push('begin', repository.githubId, run.githubJobId);

	return json({ run });
}
