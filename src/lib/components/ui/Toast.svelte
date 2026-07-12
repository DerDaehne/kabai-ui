<script lang="ts">
	import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-svelte';
	
	interface Props {
		type: 'success' | 'error' | 'warning' | 'info';
		message: string;
		title?: string;
		duration?: number;
	}
	
	export let type: 'success' | 'error' | 'warning' | 'info';
	export let message: string;
	export let title: string | undefined;
	export let duration: number = 5000;
	
	// Automatisches Schließen
	let visible = true;
	
	$:
		if (duration > 0) {
			setTimeout(() => visible = false, duration);
		}
</script>

{#if visible}
	<div
		class="bg-[var(--card-bg)] rounded-lg p-4 max-w-sm animate-in fade-in slide-in-from-bottom-2"
		style="box-shadow: var(--elevation-2), var(--highlight-top);"
		class:toast-success={type === 'success'}
		class:toast-error={type === 'error'}
		class:toast-warning={type === 'warning'}
		class:toast-info={type === 'info'}
	>
		<div class="flex items-start gap-3">
			<!-- Icon -->
			<div class="flex-shrink-0">
				{#if type === 'success'}
					<CheckCircle class="w-5 h-5 text-[var(--success)]" />
				{:else if type === 'error'}
					<XCircle class="w-5 h-5 text-[var(--danger)]" />
				{:else if type === 'warning'}
					<AlertTriangle class="w-5 h-5 text-[var(--warning)]" />
				{:else}
					<Info class="w-5 h-5 text-[var(--primary)]" />
				{/if}
			</div>
			
			<!-- Content -->
			<div class="flex-1 min-w-0">
				{#if title}
					<p class="font-medium text-[var(--text)] truncate">{title}</p>
				{/if}
				<p class="text-sm text-[var(--text-muted)] truncate-2">{message}</p>
			</div>
			
			<!-- Close Button -->
			<button
				onclick={() => visible = false}
				class="flex-shrink-0 p-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
				style="transition-duration: var(--duration-fast); transition-timing-function: var(--ease-soft);"
				aria-label="Schließen"
			>
				<svg class="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
{/if}
