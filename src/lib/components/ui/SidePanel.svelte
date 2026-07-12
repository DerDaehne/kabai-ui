<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { X } from 'lucide-svelte';

	export let open = false;
	export let onClose: () => void = () => {};
	// 'md' = 520px (Standardbreite laut Vorgabe 480–560px).
	// 'xl' = 720px — dokumentierte Ausnahme für den Workflow-Editor, der spürbar
	// mehr horizontalen Platz braucht (Graph-Darstellung) als die Vorgabe erlaubt.
	export let size: 'md' | 'xl' = 'md';
	export let ariaLabel = '';

	const widths: Record<string, string> = {
		md: '520px',
		xl: '720px'
	};

	let panelEl: HTMLDivElement | null = null;
	let previouslyFocused: HTMLElement | null = null;

	function prefersReducedMotion() {
		return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	}

	function slideIn(node: HTMLElement) {
		if (prefersReducedMotion()) return fade(node, { duration: 180 });
		return fly(node, { x: 40, duration: 250, easing: quintOut });
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			onClose();
			return;
		}
		if (e.key === 'Tab' && open && panelEl) {
			trapFocus(e);
		}
	}

	function getFocusable(): HTMLElement[] {
		if (!panelEl) return [];
		const selector =
			'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
		return Array.from(panelEl.querySelectorAll<HTMLElement>(selector)).filter(
			(el) => el.offsetParent !== null
		);
	}

	function trapFocus(e: KeyboardEvent) {
		const focusable = getFocusable();
		if (focusable.length === 0) {
			e.preventDefault();
			panelEl?.focus();
			return;
		}
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;

		if (e.shiftKey) {
			if (active === first || !panelEl?.contains(active)) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (active === last || !panelEl?.contains(active)) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	async function focusPanel() {
		await tick();
		panelEl?.focus();
	}

	$: if (typeof document !== 'undefined') {
		if (open) {
			previouslyFocused = document.activeElement as HTMLElement | null;
			document.body.style.overflow = 'hidden';
			focusPanel();
		} else {
			document.body.style.overflow = '';
			if (previouslyFocused) {
				previouslyFocused.focus();
				previouslyFocused = null;
			}
		}
	}

	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.style.overflow = '';
	});
</script>

<svelte:window on:keydown={handleKey} />

{#if open}
	<div
		class="fixed inset-0 z-50"
		style="background: rgba(0,0,0,0.5);"
		transition:fade={{ duration: prefersReducedMotion() ? 120 : 200 }}
		onclick={onClose}
	>
		<div
			bind:this={panelEl}
			class="fixed top-0 right-0 h-screen w-full overflow-y-auto outline-none"
			style="max-width: {widths[size]}; background: var(--color-surface); border-left: 1px solid var(--color-border); border-top-left-radius: var(--radius-panel); border-bottom-left-radius: var(--radius-panel);"
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel}
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			transition:slideIn
		>
			<button
				onclick={onClose}
				aria-label="Schließen"
				class="btn-ghost absolute top-4 right-4 z-10 w-8 h-8 !p-0 rounded-lg flex items-center justify-center"
			>
				<X class="w-4 h-4" />
			</button>

			<slot />
		</div>
	</div>
{/if}

<style>
	@media (max-width: 640px) {
		div[role='dialog'] {
			max-width: 100% !important;
			border-top-left-radius: 0 !important;
			border-bottom-left-radius: 0 !important;
		}
	}
</style>
