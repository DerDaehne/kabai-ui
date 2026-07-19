<script lang="ts">
	// Ticket #528: Suchdialog, um bestehende Tickets/Epics/Notes projekt-
	// übergreifend als 'ref'-Element auf den Canvas zu holen. Läuft im
	// bestehenden SidePanel (size="md", Vorbild: alle anderen Modals des
	// Repos, z.B. StatusesModal). Zwei Reiter statt eines gemeinsamen
	// Suchfeld-Ergebnistyps, weil die Backends unterschiedlich sind
	// (/api/tickets/search vs. /api/notes?project=all) und die Treffer
	// unterschiedliche Badges brauchen (Status vs. Kind).
	import { Search, Flag, BookOpen, Compass } from 'lucide-svelte';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import type { TicketSearchResult, NoteSummary } from '$lib/types';

	export let onSelect: (target: { target_type: 'ticket' | 'note'; target_id: number }) => void;

	type Tab = 'tickets' | 'notes';
	let activeTab: Tab = 'tickets';
	let query = '';

	let ticketResults: TicketSearchResult[] = [];
	let noteResults: NoteSummary[] = [];
	let isLoading = false;
	let error = '';
	let hasSearched = false;

	let searchDebounce: ReturnType<typeof setTimeout> | undefined;

	async function runSearch() {
		const q = query.trim();
		if (!q) {
			ticketResults = [];
			noteResults = [];
			hasSearched = false;
			error = '';
			return;
		}
		isLoading = true;
		error = '';
		hasSearched = true;
		try {
			if (activeTab === 'tickets') {
				const res = await fetch(`/api/tickets/search?q=${encodeURIComponent(q)}`);
				const result = await res.json();
				if (result.ok) ticketResults = result.data;
				else error = result.error || 'Fehler bei der Suche';
			} else {
				const res = await fetch(`/api/notes?q=${encodeURIComponent(q)}&project=all`);
				const result = await res.json();
				if (result.ok) noteResults = result.data.notes;
				else error = result.error || 'Fehler bei der Suche';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	function onQueryInput() {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(runSearch, 250);
	}

	function switchTab(tab: Tab) {
		if (tab === activeTab) return;
		activeTab = tab;
		error = '';
		if (query.trim()) runSearch();
	}

	function pickTicket(t: TicketSearchResult) {
		onSelect({ target_type: 'ticket', target_id: t.id });
	}

	function pickNote(n: NoteSummary) {
		onSelect({ target_type: 'note', target_id: n.id });
	}

	const noteKindLabel: Record<string, string> = { note: 'Note', adr: 'ADR', hub: 'Hub' };
</script>

<div class="ref-picker p-6 pr-14">
	<h2 class="text-lg font-semibold mb-4" style="color: var(--color-text);">Referenz einfügen</h2>

	<div class="ref-picker__tabs" role="tablist">
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'tickets'}
			class="ref-picker__tab"
			class:ref-picker__tab--active={activeTab === 'tickets'}
			onclick={() => switchTab('tickets')}
		>
			<Flag class="w-3.5 h-3.5" /> Tickets &amp; Epics
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'notes'}
			class="ref-picker__tab"
			class:ref-picker__tab--active={activeTab === 'notes'}
			onclick={() => switchTab('notes')}
		>
			<BookOpen class="w-3.5 h-3.5" /> Notes
		</button>
	</div>

	<div class="relative mt-4">
		<Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--color-text-secondary);" />
		<input
			type="text"
			bind:value={query}
			oninput={onQueryInput}
			placeholder={activeTab === 'tickets' ? 'Ticket/Epic-Titel durchsuchen…' : 'Note-Titel/Inhalt durchsuchen…'}
			class="input pl-9"
			autofocus
		/>
	</div>

	{#if error}
		<div class="mt-3"><ErrorBanner message={error} compact /></div>
	{/if}

	<div class="ref-picker__results">
		{#if isLoading}
			<div class="flex justify-center py-10"><Spinner /></div>
		{:else if !hasSearched}
			<p class="py-10 text-center text-sm" style="color: var(--color-text-secondary);">
				Suchbegriff eingeben, um {activeTab === 'tickets' ? 'Tickets und Epics' : 'Notes'} zu finden.
			</p>
		{:else if activeTab === 'tickets'}
			{#if ticketResults.length === 0}
				<p class="py-10 text-center text-sm" style="color: var(--color-text-secondary);">Keine Treffer.</p>
			{:else}
				{#each ticketResults as t (t.id)}
					<button type="button" class="ref-picker__row" onclick={() => pickTicket(t)}>
						{#if t.type === 'epic'}
							<Flag class="w-4 h-4 shrink-0" style="color: var(--color-warning);" />
						{:else}
							<span class="ref-picker__ticket-dot" aria-hidden="true"></span>
						{/if}
						<span class="ref-picker__title truncate">{t.title}</span>
						<span class="badge-primary shrink-0">{t.project_name}</span>
						<span class="status-chip shrink-0" style="--chip-color: var(--color-primary);">{t.status_name}</span>
					</button>
				{/each}
			{/if}
		{:else if noteResults.length === 0}
			<p class="py-10 text-center text-sm" style="color: var(--color-text-secondary);">Keine Treffer.</p>
		{:else}
			{#each noteResults as n (n.id)}
				<button type="button" class="ref-picker__row" onclick={() => pickNote(n)}>
					{#if n.kind === 'hub'}
						<Compass class="w-4 h-4 shrink-0" style="color: var(--color-warning);" />
					{:else}
						<BookOpen class="w-4 h-4 shrink-0" style="color: {n.kind === 'adr' ? 'var(--color-secondary)' : 'var(--color-primary)'};" />
					{/if}
					<span class="ref-picker__title truncate">{n.title}</span>
					{#each n.projects as p}
						<span class="badge-primary shrink-0">{p.name}</span>
					{/each}
					<span class="status-chip shrink-0" style="--chip-color: var(--color-text-secondary);">{noteKindLabel[n.kind] ?? n.kind}</span>
				</button>
			{/each}
		{/if}
	</div>
</div>

<style>
	.ref-picker__tabs {
		display: flex;
		gap: 4px;
		border-bottom: 1px solid var(--edge);
	}

	.ref-picker__tab {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-secondary);
		border-bottom: 2px solid transparent;
	}

	.ref-picker__tab:hover {
		color: var(--color-text);
	}

	.ref-picker__tab--active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}

	.ref-picker__results {
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 60vh;
		overflow-y: auto;
	}

	.ref-picker__row {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px 12px;
		text-align: left;
		border-radius: var(--radius-control, 8px);
		border: 1px solid transparent;
	}

	.ref-picker__row:hover {
		background: var(--color-surface-hover);
		border-color: var(--edge);
	}

	.ref-picker__title {
		flex: 1;
		min-width: 0;
		font-size: 13px;
		color: var(--color-text);
	}

	.ref-picker__ticket-dot {
		width: 6px;
		height: 6px;
		border-radius: 9999px;
		background: var(--color-text-secondary);
		flex-shrink: 0;
		margin: 0 5px;
	}
</style>
