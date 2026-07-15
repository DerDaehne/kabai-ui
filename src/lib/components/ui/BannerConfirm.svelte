<script lang="ts">
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	// Ticket #496: UI-weites "Band-Popup" für zerstörerische Aktionen (Löschen,
	// später #498 Archivieren). Anders als ein zentriertes Klick-durch-Dialogfeld
	// liegt hier ein volles Band über die Breite der UI — bewusst großflächig
	// und schwer zu übersehen, damit man nicht versehentlich "durchklickt".
	export let open = false;
	export let text = '';
	export let tone: 'danger' | 'warning' = 'danger';
	export let confirmLabel = 'Ja';
	export let cancelLabel = 'Abbruch';
	export let onConfirm: () => void = () => {};
	export let onCancel: () => void = () => {};

	let bannerEl: HTMLDivElement | null = null;
	let cancelBtnEl: HTMLButtonElement | null = null;
	let confirmBtnEl: HTMLButtonElement | null = null;
	let previouslyFocused: HTMLElement | null = null;

	function prefersReducedMotion() {
		return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	}

	// Design-Intention: "Ja" sitzt weit links, "Abbruch" weit rechts — die
	// bewusste räumliche Trennung der beiden Antworten verhindert gedankenloses
	// Durchklicken bei einer zerstörerischen Aktion. Initialer Fokus liegt auf
	// "Abbruch" (dem sicheren Default), nicht auf "Ja".
	function bannerIn(node: HTMLElement) {
		if (prefersReducedMotion()) return fade(node, { duration: 120 });
		return {
			duration: 200,
			easing: quintOut,
			css: (t: number) => `opacity: ${t}; transform: scale(${0.98 + t * 0.02}) translateY(${(1 - t) * -8}px);`
		};
	}

	function handleKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			onCancel();
			return;
		}
		if (e.key === 'Tab') {
			trapFocus(e);
		}
	}

	function trapFocus(e: KeyboardEvent) {
		const focusable = [confirmBtnEl, cancelBtnEl].filter(Boolean) as HTMLElement[];
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;

		if (e.shiftKey) {
			if (active === first || !bannerEl?.contains(active)) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (active === last || !bannerEl?.contains(active)) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	async function focusCancel() {
		await tick();
		cancelBtnEl?.focus();
	}

	$: if (typeof document !== 'undefined') {
		if (open) {
			previouslyFocused = document.activeElement as HTMLElement | null;
			focusCancel();
		} else if (previouslyFocused) {
			previouslyFocused.focus();
			previouslyFocused = null;
		}
	}
</script>

<svelte:window on:keydown={handleKey} />

{#if open}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center overlay"
		transition:fade={{ duration: prefersReducedMotion() ? 120 : 200 }}
	>
		<div
			bind:this={bannerEl}
			class="banner banner--{tone} w-full flex flex-col items-center gap-5 px-6 py-10"
			role="alertdialog"
			aria-modal="true"
			aria-label={text}
			transition:bannerIn
		>
			<p class="banner__text text-base sm:text-lg text-center font-medium" style="color: var(--color-text);">
				{text}
			</p>
			<div class="banner__actions w-full flex items-center justify-between">
				<button
					bind:this={confirmBtnEl}
					type="button"
					class="btn-subtle px-5 py-2"
					style="color: var(--color-{tone});"
					onclick={onConfirm}
				>
					{confirmLabel}
				</button>
				<button
					bind:this={cancelBtnEl}
					type="button"
					class="btn-subtle px-5 py-2"
					onclick={onCancel}
				>
					{cancelLabel}
				</button>
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

	.banner {
		outline: none;
		border-left: none;
		border-right: none;
	}

	.banner--danger {
		background: color-mix(in srgb, var(--color-danger) 22%, var(--color-surface));
		border-top: 1px solid color-mix(in srgb, var(--color-danger) 45%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--color-danger) 45%, transparent);
	}

	.banner--warning {
		background: color-mix(in srgb, var(--color-warning) 22%, var(--color-surface));
		border-top: 1px solid color-mix(in srgb, var(--color-warning) 45%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 45%, transparent);
	}

	.banner__actions {
		max-width: 900px;
	}
</style>
