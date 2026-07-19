<script lang="ts">
	// Ticket #497: Floating-Suchfeld mit Expand-Animation; der Aktiv/Archiviert-
	// Umschalter sitzt als eigene kleine Pille darunter (Review-Entscheid,
	// 3. Runde — der angehängte Tropfen wirkte zu dominant am Suchfeld).
	import { Search, FolderOpen, Archive } from 'lucide-svelte';

	export let query = '';
	export let view: 'active' | 'archived' = 'active';

	// Ticket #537: Ref + exportierte focus()-Methode, damit die Root-Seite
	// dieses Suchfeld beim globalen "/"-Shortcut fokussieren kann (das Feld
	// sitzt in dieser Kind-Komponente, nicht direkt auf der Seite).
	let inputEl: HTMLInputElement | null = null;

	export function focus() {
		inputEl?.focus();
		inputEl?.select();
	}
</script>

<div class="search-wrap">
	<div class="search-pill" class:has-query={query.length > 0}>
		<Search class="w-4 h-4 shrink-0" style="color: var(--color-text-secondary);" />
		<input
			bind:this={inputEl}
			type="text"
			bind:value={query}
			placeholder="Suchen…"
			class="search-input"
			aria-label="Projekte durchsuchen"
			onkeydown={(e) => {
				// Review-Finding #497 (3. Runde): ESC gibt den Fokus wieder frei.
				if (e.key === 'Escape') (e.currentTarget as HTMLInputElement).blur();
			}}
		/>
	</div>

	<!-- Sicht-Wähler: eigene kleine Pille unterhalb der Suchpille
	     (Review-Finding #497, 3. Runde — nicht mehr als angehängter Tropfen). -->
	<div class="view-pill" role="group" aria-label="Sicht wählen">
		<button
			type="button"
			class="view-pill__half view-pill__half--left"
			class:is-active={view === 'active'}
			aria-pressed={view === 'active'}
			title="Aktive Projekte anzeigen"
			onclick={() => (view = 'active')}
		>
			{#if view === 'active'}
				<span class="view-pill__label">Aktiv</span>
			{:else}
				<FolderOpen class="w-3 h-3" />
			{/if}
		</button>
		<button
			type="button"
			class="view-pill__half view-pill__half--right"
			class:is-active={view === 'archived'}
			aria-pressed={view === 'archived'}
			title="Archivierte Projekte anzeigen"
			onclick={() => (view = 'archived')}
		>
			{#if view === 'archived'}
				<span class="view-pill__label">Archiv</span>
			{:else}
				<Archive class="w-3 h-3" />
			{/if}
		</button>
	</div>
</div>

<style>
	.search-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		/* Abstände regelt die Kopfzeile der Seite (Rework #497). */
		margin: 0;
		width: 100%;
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

	/* Sicht-Wähler (Rework #497, 3. Runde): eigene kleine, freistehende Pille
	   unterhalb der Suchpille — bewusst klein, dunkel (zurückgesetzt) und mit
	   Innenschatten, damit die Suchpille die Hierarchie klar anführt. */
	.view-pill {
		width: 112px;
		height: 22px;
		display: flex;
		border: 1px solid var(--edge);
		border-radius: 999px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-surface) 65%, var(--color-bg));
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.28);
	}

	.view-pill__half {
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

	.view-pill__half--left {
		border-right: 1px solid var(--edge);
	}

	.view-pill__half.is-active {
		color: var(--color-text);
	}

	.view-pill__half--left.is-active {
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	.view-pill__half--right.is-active {
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
	}

	.view-pill__half:hover {
		color: var(--color-text);
	}

	.view-pill__label {
		line-height: 1;
	}
</style>
