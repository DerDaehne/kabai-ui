<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Search } from 'lucide-svelte';
	import { portal } from '$lib/utils/portal';
	import { overlayStackDepth } from '$lib/stores/ui';
	import { commandPaletteOpen, paletteActions, globalPaletteActions, type CommandPaletteAction } from '$lib/stores/commandPalette';

	// Ticket #537: Cmd-K-artige Command Palette — anders als BottomSheet/
	// SidePanel bewusst KEIN Slide-in, sondern ein zentriertes Overlay nahe der
	// Viewport-Oberkante (Design-Entscheidung 4). Fokus-Trap/Restore-Focus/
	// Escape/Portal-Konventionen sind von BottomSheet/SidePanel übernommen,
	// das visuelle Layout ist eigenständig.

	let query = '';
	let paletteEl: HTMLDivElement | null = null;
	let inputEl: HTMLInputElement | null = null;
	let previouslyFocused: HTMLElement | null = null;
	let activeIndex = 0;

	// Ticket #535: globale Aktionen (z.B. "Hilfe öffnen") stehen auf jeder
	// Seite VOR den seiten-spezifischen Aktionen.
	$: actions = [...$globalPaletteActions, ...$paletteActions];
	$: filtered = (() => {
		const q = query.trim().toLowerCase();
		if (!q) return actions;
		return actions.filter((a) => a.label.toLowerCase().includes(q));
	})();
	// Aktiver Index nachziehen, falls die gefilterte Liste kürzer wird.
	$: if (activeIndex >= filtered.length) activeIndex = Math.max(0, filtered.length - 1);

	function prefersReducedMotion() {
		return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	}

	function close() {
		commandPaletteOpen.set(false);
	}

	function runAction(action: CommandPaletteAction) {
		close();
		action.run();
	}

	function handleKey(e: KeyboardEvent) {
		if (!$commandPaletteOpen) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (filtered.length > 0) activeIndex = (activeIndex + 1) % filtered.length;
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (filtered.length > 0) activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			const action = filtered[activeIndex];
			if (action) runAction(action);
			return;
		}
		if (e.key === 'Tab') {
			// Palette hat nur ein fokussierbares Element (das Suchfeld) —
			// Tab bleibt bewusst darin gefangen statt den Fokus zu verlassen.
			e.preventDefault();
			inputEl?.focus();
		}
	}

	async function focusInput() {
		await tick();
		inputEl?.focus();
	}

	// Ticket #537: overlayStackDepth zählt offene Overlays global (gleiches
	// Muster wie BottomSheet/SidePanel/BannerConfirm). WICHTIG: Diese
	// Komponente wird einmalig und dauerhaft im Root-Layout gerendert (nicht
	// per {#if} instanziiert) — inkrementieren darf daher NICHT in onMount
	// passieren (das würde den Zähler beim App-Start einmalig und für immer
	// erhöhen), sondern nur beim tatsächlichen Öffnen/Schließen der Palette.
	let wasOpen = false;

	$: if (typeof document !== 'undefined') {
		if ($commandPaletteOpen) {
			previouslyFocused = document.activeElement as HTMLElement | null;
			query = '';
			activeIndex = 0;
			focusInput();
			if (!wasOpen) overlayStackDepth.update((n) => n + 1);
			wasOpen = true;
		} else {
			if (previouslyFocused) {
				previouslyFocused.focus();
				previouslyFocused = null;
			}
			if (wasOpen) overlayStackDepth.update((n) => Math.max(0, n - 1));
			wasOpen = false;
		}
	}

	onDestroy(() => {
		if (wasOpen) overlayStackDepth.update((n) => Math.max(0, n - 1));
	});
</script>

<svelte:window on:keydown={handleKey} />

{#if $commandPaletteOpen}
	<!-- use:portal: ans body heben, gleiches Motiv wie BottomSheet/BannerConfirm
	     (backdrop-filter macht sonst den Panel-Host zum Containing Block). -->
	<div
		use:portal
		class="fixed inset-0 z-[100] flex items-start justify-center overlay"
		transition:fade={{ duration: prefersReducedMotion() ? 120 : 200 }}
		onclick={close}
		role="presentation"
	>
		<div
			bind:this={paletteEl}
			class="palette flex flex-col outline-none"
			role="dialog"
			aria-modal="true"
			aria-label="Befehle"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			transition:fade={{ duration: prefersReducedMotion() ? 120 : 160 }}
		>
			<div class="palette__search">
				<Search class="w-4 h-4 shrink-0" style="color: var(--color-text-secondary);" />
				<input
					bind:this={inputEl}
					bind:value={query}
					type="text"
					placeholder="Befehl suchen…"
					class="palette__input"
					aria-label="Befehle durchsuchen"
				/>
			</div>
			<div class="palette__list">
				{#if filtered.length === 0}
					<p class="palette__empty">Keine Befehle verfügbar.</p>
				{:else}
					{#each filtered as action, i (action.id)}
						<button
							type="button"
							class="palette__item"
							class:is-active={i === activeIndex}
							onmouseenter={() => (activeIndex = i)}
							onclick={() => runAction(action)}
						>
							{action.label}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		background: rgba(0, 0, 0, 0.5);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
		padding-top: 12vh;
	}

	.palette {
		width: 100%;
		max-width: 560px;
		max-height: 60vh;
		background: var(--color-surface);
		border: 1px solid var(--edge-strong);
		border-radius: var(--radius-panel);
		box-shadow: var(--elevation-2);
		overflow: hidden;
	}

	.palette__search {
		display: flex;
		align-items: center;
		gap: var(--space-2, 8px);
		padding: 14px 16px;
		border-bottom: 1px solid var(--edge-strong);
		flex-shrink: 0;
	}

	.palette__input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		outline: none;
		color: var(--color-text);
		font-size: 15px;
	}

	.palette__input::placeholder {
		color: var(--color-text-secondary);
	}

	.palette__list {
		overflow-y: auto;
		padding: 6px;
	}

	.palette__empty {
		padding: 16px 10px;
		font-size: 14px;
		color: var(--color-text-secondary);
		text-align: center;
	}

	.palette__item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 10px 12px;
		border-radius: 8px;
		background: transparent;
		border: none;
		color: var(--color-text);
		font-size: 14px;
		cursor: pointer;
	}

	.palette__item.is-active {
		background: var(--color-surface-hover);
	}
</style>
