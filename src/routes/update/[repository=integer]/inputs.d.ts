export type Inputs = {
	begin: typeof import('./begin/+server')._Body.inferIn;
	error: typeof import('./error/+server')._Body.inferIn;
	end: typeof import('./end/+server')._Body.inferIn;
	'test-begin': typeof import('./test-begin/+server')._Body.inferIn;
	'test-end': typeof import('./test-end/+server')._Body.inferIn;
	'step-begin': typeof import('./step-begin/+server')._Body.inferIn;
	'step-end': typeof import('./step-end/+server')._Body.inferIn;
};
