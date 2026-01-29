import reporterScript from '$lib/reporter?raw';
import { text } from '@sveltejs/kit';

export async function GET() {
	const script = [
		'/* eslint-disable */',
		'/* oxlint-disable */',
		'// @ts-nocheck',
		'',
		`// This script is served by Pleye, on /reporter.js of your instance.`,
		`// Pleye version ${process.env.VERSION ?? "(unknown)"}`,
		'',
		'',
		reporterScript
	].join('\n');

	return text(script, {
		headers: {
			'Content-Type': 'application/javascript'
		}
	});
}
