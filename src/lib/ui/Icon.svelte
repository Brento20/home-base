<script lang="ts" module>
	export type IconName =
		| 'today'
		| 'plans'
		| 'lists'
		| 'money'
		| 'home'
		| 'lightbulb'
		| 'snowflake'
		| 'check'
		| 'plus'
		| 'chevron'
		| 'back'
		| 'repeat'
		| 'close'
		| 'compose'
		| 'more'
		| 'photo'
		| 'reply'
		| 'refresh';
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		size?: number;
		filled?: boolean;
	}

	let { name, size = 22, filled = false }: Props = $props();
</script>

<!-- Pale etched icons: one stroke weight, round ends, no fills unless a state needs one. -->
<svg
	class="icon"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'today'}
		<circle cx="12" cy="12" r="4" />
		<path
			d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
		/>
	{:else if name === 'plans'}
		<rect x="3.5" y="5" width="17" height="15" rx="3" />
		<path d="M3.5 10h17M8 3v4M16 3v4" />
	{:else if name === 'lists'}
		<path d="M4 6.5l1.8 1.8L9 5M4 15.5l1.8 1.8L9 14M12.5 7h7.5M12.5 16h7.5" />
	{:else if name === 'money'}
		<rect x="3" y="6" width="18" height="13" rx="3" />
		<path d="M3 10h18M15 15h3" />
	{:else if name === 'home'}
		<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-5v6h-4A1.5 1.5 0 0 1 4 19z" />
	{:else if name === 'lightbulb'}
		<path
			fill={filled ? 'currentColor' : 'none'}
			d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2v.5h5v-.5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"
		/>
		<path d="M9.5 18.5h5M10.5 21h3" />
	{:else if name === 'snowflake'}
		<path d="M12 2v20M4.2 7l15.6 10M4.2 17L19.8 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" />
	{:else if name === 'check'}
		<path d="M5 12.5l4.5 4.5L19 7.5" />
	{:else if name === 'plus'}
		<path d="M12 5v14M5 12h14" />
	{:else if name === 'chevron'}
		<path d="M9.5 6l6 6-6 6" />
	{:else if name === 'back'}
		<path d="M14.5 6l-6 6 6 6" />
	{:else if name === 'repeat'}
		<path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" />
	{:else if name === 'close'}
		<path d="M6 6l12 12M18 6L6 18" />
	{:else if name === 'compose'}
		<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.3A7.5 7.5 0 1 1 20 11.5z" />
		<path d="M9 11.5h6M12 8.5v6" />
	{:else if name === 'more'}
		<circle cx="6" cy="12" r="1.2" fill="currentColor" />
		<circle cx="12" cy="12" r="1.2" fill="currentColor" />
		<circle cx="18" cy="12" r="1.2" fill="currentColor" />
	{:else if name === 'photo'}
		<rect x="3.5" y="5" width="17" height="14" rx="3" />
		<circle cx="9" cy="10" r="1.6" />
		<path d="M4 17l4.5-4.5 3.5 3.5 3-3 5 5" />
	{:else if name === 'refresh'}
		<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
		<path d="M19.5 4.5v4h-4" />
	{:else if name === 'reply'}
		<path d="M10 7L5 12l5 5" />
		<path d="M5.5 12H14a5 5 0 0 1 5 5v1" />
	{/if}
</svg>

<style>
	.icon {
		flex: none;
		display: block;
	}
</style>
