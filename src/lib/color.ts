/**
 * Returns a LAB color-mix placing the value on the color scale made from the given color stops
 * Basically, it's like making a linear gradient and picking a color on it, where the 1 is the end of the gradient and 0 is the beginning
 * @param min minimum value (mapped to first color stop)
 * @param max maximum value (mapped to last color stop)
 * @param value between min and max
 * @param stops CSS color variable names (without the -- in front) representing the color gradient scale
 */
export function gradientedColor(min: number, max: number, value: number, ...stops: string[]) {
	const normalized = (value - min) / (max - min);

	if (normalized >= 1) return `var(--${stops.at(-1)})`;
	if (normalized <= 0) return `var(--${stops[0]})`;

	const scale = stops.length - 1;
	const stop = Math.floor(normalized * scale);

	return `color-mix(
		in lab,
		var(--${stops[stop + 1]})
		${(normalized * scale - stop) * 100}%,
		var(--${stops[stop]})
	)`
		.replaceAll('\n', '')
		.replaceAll(/\s+/g, ' ')
		.replaceAll('( ', '(')
		.replaceAll(' )', ')');
}
