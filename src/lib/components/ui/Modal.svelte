<script lang="ts">
	import { onDestroy } from 'svelte';
	
	interface Props {
		isOpen: boolean;
		onClose: () => void;
		title?: string;
		children?: any;
	}
	
	export let isOpen: boolean;
	export let onClose: () => void;
	export let title: string = '';
	
	// Escape Key Handler
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
	
	// Click outside handler
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
	
	// Body scroll lock
	$: if (isOpen) {
		document.body.style.overflow = 'hidden';
	} else {
		document.body.style.overflow = '';
	}
	
	// Cleanup
	onDestroy(() => {
		document.body.style.overflow = '';
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
		onclick={handleBackdropClick}
	>
		<div class="bg-[var(--card-bg)] rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-[var(--border)]">
				<h2 class="text-lg font-semibold text-[var(--text)]">{title}</h2>
				<button 
					onclick={onClose}
					class="p-1 rounded-md hover:bg-[var(--border)] transition-colors"
					aria-label="Schließen"
				>
					<svg class="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			
			<!-- Content -->
			<div class="p-6">
				<slot />
			</div>
		</div>
	</div>
{/if}
