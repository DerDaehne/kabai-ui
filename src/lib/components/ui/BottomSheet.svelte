<script lang="ts">
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { portal } from '$lib/utils/portal';

	// Ticket #506: Basis-Komponente für alle "Neu anlegen"-Flows. Statt eines
	// zentrierten Dialogs schiebt sich von unten ein Blatt Papier ins Bild —
	// als hätte einem jemand ein neues Blatt auf den Tisch gelegt. Der Scrim
	// (Overlay-Rezept aus BannerConfirm) dunkelt den Hintergrund ab und
	// verwischt ihn; das Blatt selbst reicht weit nach oben, lässt aber oben
	// Luft, damit der "von unten hereingeschoben"-Charakter erhalten bleibt.
	export let open = false;
	export let title: string | undefined = undefined;
	export let onClose: () => void = () => {};

	let sheetEl: HTMLDivElement | null = null;
	let previouslyFocused: HTMLElement | null = null;

	function prefersReducedMotion() {
		return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	}

	// Eigene fly-Variante: fährt von unten (translateY 100% -> 0) statt seitlich
	// wie das SidePanel. Bei reduced-motion nur ein Fade, keine Bewegung.
	function slideUp(node: HTMLElement) {
		if (prefersReducedMotion()) return fade(node, { duration: 150 });
		return {
			duration: 320,
			easing: quintOut,
			css: (t: number) => `transform: translateY(${(1 - t) * 100}%);`
		};
	}

	function handleKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return;
		}
		if (e.key === 'Tab') {
			trapFocus(e);
		}
	}

	function getFocusable(): HTMLElement[] {
		if (!sheetEl) return [];
		const selector =
			'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
		return Array.from(sheetEl.querySelectorAll<HTMLElement>(selector)).filter(
			(el) => el.offsetParent !== null
		);
	}

	function trapFocus(e: KeyboardEvent) {
		const focusable = getFocusable();
		if (focusable.length === 0) {
			e.preventDefault();
			sheetEl?.focus();
			return;
		}
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;

		if (e.shiftKey) {
			if (active === first || !sheetEl?.contains(active)) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (active === last || !sheetEl?.contains(active)) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	async function focusFirst() {
		await tick();
		const focusable = getFocusable();
		(focusable[0] ?? sheetEl)?.focus();
	}

	$: if (typeof document !== 'undefined') {
		if (open) {
			previouslyFocused = document.activeElement as HTMLElement | null;
			document.body.style.overflow = 'hidden';
			focusFirst();
		} else {
			document.body.style.overflow = '';
			if (previouslyFocused) {
				previouslyFocused.focus();
				previouslyFocused = null;
			}
		}
	}
</script>

<svelte:window on:keydown={handleKey} />

{#if open}
	<!-- Scrim-Klick schließt; Tastatur-Äquivalent ist Escape (svelte:window).
	     use:portal: Overlay ans body heben, damit fixed sich auf den Viewport
	     bezieht, auch wenn das Sheet in einem SidePanel gehostet wird. -->
	<div
		use:portal
		class="fixed inset-0 z-[100] flex items-end justify-center overlay"
		transition:fade={{ duration: prefersReducedMotion() ? 120 : 200 }}
		onclick={onClose}
		role="presentation"
	>
		<div
			bind:this={sheetEl}
			class="sheet w-full flex flex-col outline-none"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			transition:slideUp
		>
			{#if title}
				<div class="sheet__header shrink-0">
					<h2 class="text-lg font-semibold tracking-tight" style="color: var(--text);">{title}</h2>
				</div>
			{/if}
			<div class="sheet__body flex-1 overflow-y-auto">
				<slot />
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		background: rgba(0, 0, 0, 0.5);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
	}

	.sheet {
		/* Review #506: 75% der Viewport-Breite, fährt bis fast an die obere
		   Bildschirmkante hoch. Das frühere top: 12vh (position: relative)
		   schob das unten angedockte Blatt über die Viewport-Unterkante
		   hinaus — die Buttons waren abgeschnitten. */
		width: 75vw;
		min-width: min(640px, 92vw);
		height: 96vh;
		background: var(--color-surface);
		border: 1px solid var(--edge-strong);
		border-bottom: none;
		border-top-left-radius: var(--radius-panel);
		border-top-right-radius: var(--radius-panel);
		box-shadow: var(--elevation-2);
	}

	.sheet__header {
		padding: 24px 28px 0 28px;
	}

	.sheet__body {
		padding: 24px 28px 28px 28px;
	}
</style>
