<script lang="ts">
	// Ticket #497: Floating-Suchfeld mit Expand-Animation + Aktiv/Archiviert-
	// Umschalt-Tropfen über der Projektliste. Formsprache (halbrunde Lasche,
	// aus der Kante herauswachsend) übernommen aus ProjectCard.svelte.
	import { Search, FolderOpen, Archive } from 'lucide-svelte';

	export let query = '';
	export let view: 'active' | 'archived' = 'active';
</script>

<div class="search-wrap">
	<div class="search-pill" class:has-query={query.length > 0}>
		<Search class="w-4 h-4 shrink-0" style="color: var(--color-text-secondary);" />
		<input
			type="text"
			bind:value={query}
			placeholder="Suchen…"
			class="search-input"
			aria-label="Projekte durchsuchen"
		/>

		<!-- Umschalt-Tropfen: hängt mittig unten aus der Pille heraus. -->
		<div class="view-drop" role="group" aria-label="Sicht wählen">
			<button
				type="button"
				class="view-drop__half view-drop__half--left"
				class:is-active={view === 'active'}
				aria-pressed={view === 'active'}
				title="Aktive Projekte anzeigen"
				onclick={() => (view = 'active')}
			>
				{#if view === 'active'}
					<span class="view-drop__label">Aktiv</span>
				{:else}
					<FolderOpen class="w-3 h-3" />
				{/if}
			</button>
			<button
				type="button"
				class="view-drop__half view-drop__half--right"
				class:is-active={view === 'archived'}
				aria-pressed={view === 'archived'}
				title="Archivierte Projekte anzeigen"
				onclick={() => (view = 'archived')}
			>
				{#if view === 'archived'}
					<span class="view-drop__label">Archiv</span>
				{:else}
					<Archive class="w-3 h-3" />
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.search-wrap {
		display: flex;
		justify-content: center;
		/* Abstände regelt die Kopfzeile der Seite (Rework #497). */
		margin: 0;
	}

	.search-pill {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		/* Rework #497 (2. Runde): die Pille ist DAS zentrale Element der
		   Seite — deutlich breiter in Ruhe, raumgreifend im Fokus, und die
		   Verbreiterung nimmt sich Zeit (gemächlicher als --duration-fast). */
		width: 480px;
		max-width: 60%;
		padding: 8px 14px;
		border-radius: 999px;
		background: var(--color-surface);
		border: 1px solid var(--edge);
		transition: width 350ms var(--ease-soft), max-width 350ms var(--ease-soft), border-color var(--duration-fast) var(--ease-soft);
	}

	.search-pill:focus-within {
		width: 760px;
		max-width: 75%;
		border-color: var(--color-primary);
	}

	/* Solange Text eingegeben ist, bleibt die Pille breit — auch ohne Fokus. */
	.search-pill.has-query {
		width: 760px;
		max-width: 75%;
	}

	.search-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		outline: none;
		color: var(--color-text);
		font-size: 14px;
		/* Suchtext mittig in der Pille (Review-Finding #497, 2. Runde) */
		text-align: center;
	}

	.search-input::placeholder {
		color: var(--color-text-secondary);
	}

	@media (prefers-reduced-motion: reduce) {
		.search-pill {
			transition: border-color var(--duration-fast) var(--ease-soft);
			width: 760px;
			max-width: 75%;
		}
	}

	/* Umschalt-Tropfen: gleiche Formsprache wie .drop in ProjectCard.svelte —
	   halbrunde Lasche, oben mit der Pillen-Kante verschmolzen.
	   Rework #497 (2. Runde): visuell hinter die Pille zurückgestuft —
	   kleiner, dunklere (zurückgesetzte) Fläche mit Innenschatten, schwächere
	   Kante und gedämpftere Aktiv-Farben, damit die Suchpille die Hierarchie
	   klar anführt. */
	.view-drop {
		position: absolute;
		left: 50%;
		bottom: -19px;
		transform: translateX(-50%);
		width: 104px;
		height: 20px;
		display: flex;
		border: 1px solid var(--edge);
		border-top-color: transparent;
		border-radius: 0 0 999px 999px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-surface) 65%, var(--color-bg));
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.28);
	}

	.view-drop__half {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 11.5px;
		font-weight: 600;
		letter-spacing: 0.02em;
		transition: background-color var(--duration-fast) var(--ease-soft), color var(--duration-fast) var(--ease-soft);
	}

	.view-drop__half--left {
		border-right: 1px solid var(--edge);
	}

	.view-drop__half.is-active {
		color: var(--color-text);
	}

	.view-drop__half--left.is-active {
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	.view-drop__half--right.is-active {
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
	}

	.view-drop__half:hover {
		color: var(--color-text);
	}

	.view-drop__label {
		line-height: 1;
	}
</style>
