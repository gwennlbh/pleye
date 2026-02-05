<script lang="ts">
	import { formatDistanceToNowStrict } from 'date-fns';

	interface Props {
		date: Date;
		suffix: boolean;
	}

	const { date, suffix }: Props = $props();

	const formatter = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "medium"
    });
</script>

<time datetime={date.toISOString()} title={formatter.format(date)}>
	{formatDistanceToNowStrict(date, { addSuffix: suffix })}
</time>
