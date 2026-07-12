<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { X } from 'lucide-svelte';

	export let open = false;
	export let onClose: () => void = () => {};
	export let size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'lg';

	const widths: Record<string, string> = {
		sm: 'max-w-md',
		md: 'max-w-xl',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl',
		full: 'max-w-[95vw] w-full'
	};

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) onClose();
	}

	$: if (typeof document !== 'undefined') {
		document.body.style.overflow = open ? 'hidden' : '';
	}

	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.style.overflow = '';
	});
</script>

<svelte:window on:keydown={handleKey} />

{#if open}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		style="background: rgba(2,2,12,0.88); backdrop-filter: blur(6px);"
		transition:fade={{ duration: 180 }}
		onclick={onClose}
	>
		<div class="flex min-h-full items-start justify-center p-4 pt-10 pb-16">
			<div
				class="relative w-full {widths[size]} rounded-2xl"
				style="background: var(--card-bg); border: 1px solid var(--border-bright); box-shadow: 0 30px 60px rgba(0,0,0,0.6);"
				onclick={(e) => e.stopPropagation()}
				in:fly={{ y: 28, duration: 280, easing: quintOut }}
			>
				<!-- Close -->
				<button
					onclick={onClose}
					class="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
					style="color: var(--text-muted); background: var(--border);"
					onmouseenter={(e) => { e.currentTarget.style.background = 'rgba(255,34,85,0.15)'; e.currentTarget.style.color = 'var(--danger)'; }}
					onmouseleave={(e) => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
				>
					<X class="w-4 h-4" />
				</button>

				<slot />
			</div>
		</div>
	</div>
{/if}
