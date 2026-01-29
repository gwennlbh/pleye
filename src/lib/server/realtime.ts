import { setMinutesWithOptions } from 'date-fns/fp';
import { nanoid } from 'nanoid';
import type {
	StepIdentifierParams,
	TestIdentifierParams
} from '../../routes/update/[repository=integer]/common';
import { objectsEqual } from '$lib/utils';

/**
 * Real-time data updates are implemented using ReadableStreams, that are sent in Responses to clients, which creates a Server-Sent Events connection.
 *
 * we keep a "warehouse", a list of updates that have happened recently, in memory.
 *
 * There is a setInterval loop in the underlying source of the created ReadableStreams that periodically checks for data in the warehouse, and pops any data off of it.
 * If it matches the given argument (i.e. the event is related to the thing we are subscribing to), it sends it down the stream.
 *
 * The data in the records is pushed there by the various update endpoints in src/routes/update/[repository=integer]/*.ts, via the push() function
 */

export const warehouse: Event[] = [];

/**
 * Arguments are:
 * [event UUID, repository id, github job id, ...additional params for test/step events]
 *
 * Note that there is NO step-end event, sending both -begin and -end events would be too much noise without much benefit, since steps are very fast to run.
 */
export type EventData = {
	begin: [string, number, number];
	'test-begin': [string, number, number, TestIdentifierParams];
	'step-begin': [string, number, number, StepIdentifierParams];
	'test-end': [string, number, number, TestIdentifierParams];
	end: [string, number, number];
};

export type EventKind = keyof EventData;
export type Event = { [E in EventKind]: [E, ...EventData[E]] }[EventKind];

export type EventOfKind<E extends EventKind> = EventData[E] extends [string, ...infer Args]
	? [E, ...Args]
	: never;

/** How often to check for new data to send down the stream */
const POLL_RATE_MS = 200;
/** How many elements to keep in the warehouse before dropping old ones */
const WAREHOUSE_MAX_SIZE = 10_000;

export function push<E extends EventKind>(
	key: E,
	...data: { [E in EventKind]: EventData[E] extends [string, ...infer Args] ? Args : never }[E]
): void {
	console.log(`Pushing event ${key} with`, data);

	warehouse.push([
		key,
		nanoid(10),
		// @ts-expect-error TODO: fix typing here
		...data
	] as const);
}

export type EventFilter<E extends EventKind> = {
	repositoryId: number;
	githubJobId?: number[] | undefined;
	test?: E extends `${'step' | 'test'}-${string}` ? TestIdentifierParams[] | undefined : undefined;
};

export function subscribe<Filters extends { [E in EventKind]?: EventFilter<E> }>(
	filters: Filters
): ReadableStream<EventOfKind<Extract<keyof Filters, EventKind>>> {
	let interval: NodeJS.Timeout;

	console.log(`Subscribing to ${Object.keys(filters).join(', ')} with`, filters);

	return new ReadableStream<EventOfKind<Extract<keyof Filters, EventKind>>>({
		start(controller) {
			/** UUIDs of updates we've already seen */
			// Initialize to all warehouse UUIDs to avoid sending old data on initial subscription
			const seen = new Set(warehouse.filter(([key]) => key in filters).map(([_, uuid]) => uuid));

			console.log(`Marking ${seen.size} existing events as seen`);

			interval = setInterval(() => {
				/** Indices in warehouse[key] of what to pop */
				for (const update of warehouse) {
					const [key, uuid, repository, job, extra] = update;

					const filter = filters[key as EventKind];
					if (!filter) continue;

					if (seen.has(uuid)) continue;

					if (repository !== filter.repositoryId) continue;
					if (filter.githubJobId && !filter.githubJobId.includes(job)) continue;
					if (filter.test && !(!extra || filter.test.some((test) => objectsEqual(test, extra))))
						continue;

					console.log(`Sending update`, update);

					seen.add(uuid);
					// @ts-expect-error TODO: fix typing here
					controller.enqueue(update);
				}

				if (warehouse.length > WAREHOUSE_MAX_SIZE) {
					console.info(
						`Trimming warehouse from ${warehouse.length} to ${WAREHOUSE_MAX_SIZE} entries`
					);
					const removed = warehouse.splice(0, warehouse.length - WAREHOUSE_MAX_SIZE);
					removed.forEach(([_, uuid]) => seen.delete(uuid));
				}
			}, POLL_RATE_MS);
		},
		cancel() {
			clearInterval(interval);
		}
	});
}
