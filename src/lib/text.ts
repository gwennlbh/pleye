
// TODO make this configurable
const HARDCODED_ABBREVIATIONS: Record<string, { 2: string }> = {
	chromium: { 2: 'cr' },
	safari: { 2: 'sf' }
};

const CONSONANTS = Array.from('bcdfghjklmnpqrstvwxyz');

function isConsonant(c: string): boolean {
	return CONSONANTS.includes(c.toLowerCase());
}

export function abbreviate(size: 2, name: string): string {
	if (name in HARDCODED_ABBREVIATIONS) return HARDCODED_ABBREVIATIONS[name][size];

	// Slice into halves with the second half starting at halfpoint, then
	// take the first consonnants (if any, otherswise letter) of each half
    // The first half always takes the first letter, as it's really important
	function abbreviateHalves(halfpoint: number): string {
		const chars = Array.from(name);

		return [chars.slice(0, halfpoint), chars.slice(halfpoint)]
			.map((half, i) => (i === 0 ? half[0] : (half.find(isConsonant) ?? half[0])))
			.join('');
	}

	// If name has a even size, slice in half
	if (name.length % 2 === 0) {
		return abbreviateHalves(name.length / 2);
	}

	// Otherwise, try putting the extra character in the first half first.
	// Check if the other half has a consonant.
	// If it does, use these halves.
	// Otherwise, put the extra character in the second half.

	let halfpoint = Math.ceil(name.length / 2);
	if (Array.from(name.slice(halfpoint)).find(isConsonant)) {
		return abbreviateHalves(halfpoint);
	}

	return abbreviateHalves(halfpoint - 1);
}
