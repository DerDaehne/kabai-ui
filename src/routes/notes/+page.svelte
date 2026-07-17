<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { browser } from '$app/environment';
	import { BookOpen, Search, Compass, Archive, ShieldCheck, ShieldAlert, ShieldQuestion, Tag as TagIcon } from 'lucide-svelte';
	import type { NoteSummary, Project } from '$lib/types';
	import { sanitizeHtml } from '$lib/markdown';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import { formatDate } from '$lib/utils/format';

	const PROJECT_FILTER_STORAGE_KEY = 'kabai:notesProjectFilter';

	let notes: NoteSummary[] = [];
	let allTags: string[] = [];
	let projects: Project[] = [];
	let fuzzyFallback = false;
	let isLoading = true;
	let error = '';

	// Filter-State
	let query = '';
	let kindFilter = '';
	let tagFilter = '';
	let projectFilter = 'all';
	let showArchived = false;

	let searchDebounce: ReturnType<typeof setTimeout> | undefined;

	// Verifikationsalter in Tagen, ab dem eine Note als "alt verifiziert" gilt
	const VERIFY_STALE_DAYS = 30;

	// Hub bleibt goldakzentuiert (semantisch: Einstiegspunkt), aber gedämpft über
	// den Warning-Token statt eines eigenen Hue; ADR/Note laufen neutral/Secondary
	// (Theme v3: Farbe trägt Bedeutung, keine Regenbogen-Codierung mehr).
	const kindStyles: Record<string, { color: string; bg: string; label: string }> = {
		hub: { color: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', label: 'Hub' },
		adr: { color: 'var(--color-secondary)', bg: 'color-mix(in srgb, var(--color-secondary) 12%, transparent)', label: 'ADR' },
		note: { color: 'var(--color-text-secondary)', bg: 'color-mix(in srgb, var(--color-text-secondary) 12%, transparent)', label: 'Note' }
	};

	function verifyState(note: NoteSummary): 'fresh' | 'stale' | 'never' {
		if (!note.last_verified_at) return 'never';
		const ageDays = (Date.now() - new Date(note.last_verified_at).getTime()) / 86400000;
		return ageDays > VERIFY_STALE_DAYS ? 'stale' : 'fresh';
	}

	async function fetchNotes() {
		try {
			isLoading = true;
			const params = new URLSearchParams();
			if (query.trim()) params.set('q', query.trim());
			if (kindFilter) params.set('kind', kindFilter);
			if (tagFilter) params.set('tag', tagFilter);
			if (projectFilter !== 'all') params.set('project', projectFilter);
			if (showArchived) params.set('archived', 'true');

			const res = await fetch(`/api/notes?${params}`);
			const result = await res.json();
			if (result.ok) {
				notes = result.data.notes;
				allTags = result.data.tags;
				fuzzyFallback = result.data.fuzzy_fallback;
				error = '';
			} else {
				error = result.error || 'Fehler beim Laden';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	async function fetchProjects() {
		try {
			const res = await fetch('/api/projects');
			const result = await res.json();
			if (result.ok) projects = result.data;
		} catch {
			// Projekt-Filter bleibt dann leer — Notes laden trotzdem
		}
		restoreProjectFilter();
	}

	// Gemerkten Projektfilter wiederherstellen (#499): fällt still auf
	// "alle Projekte" zurück, falls das gemerkte Projekt nicht mehr existiert.
	function restoreProjectFilter() {
		if (!browser) return;
		const saved = localStorage.getItem(PROJECT_FILTER_STORAGE_KEY);
		if (!saved) return;
		const valid = saved === 'none' || projects.some((p) => String(p.id) === saved);
		if (valid) {
			projectFilter = saved;
			fetchNotes();
		} else {
			localStorage.removeItem(PROJECT_FILTER_STORAGE_KEY);
		}
	}

	function onProjectFilterChange() {
		if (browser) {
			if (projectFilter === 'all') {
				localStorage.removeItem(PROJECT_FILTER_STORAGE_KEY);
			} else {
				localStorage.setItem(PROJECT_FILTER_STORAGE_KEY, projectFilter);
			}
		}
		fetchNotes();
	}

	function onQueryInput() {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(fetchNotes, 300);
	}

	// Hubs prominent zeigen, solange weder gesucht noch nach kind gefiltert wird
	$: hubs = query.trim() || kindFilter ? [] : notes.filter((n) => n.kind === 'hub');
	$: listNotes = query.trim() || kindFilter ? notes : notes.filter((n) => n.kind !== 'hub');

	onMount(() => {
		fetchNotes();
		fetchProjects();
	});
</script>

<div class="w-full space-y-8">
	<!-- Header -->
	<div class="flex items-end justify-between gap-4" in:fly={{ y: -16, duration: 400, easing: quintOut }}>
		<div>
			<div class="flex items-center gap-3 mb-1">
				<div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);">
					<BookOpen class="w-5 h-5" style="color: var(--primary);" />
				</div>
				<h1 class="text-2xl font-semibold tracking-tight" style="color: var(--text);">Knowledge Base</h1>
			</div>
			<p class="ml-12 text-sm" style="color: var(--text-muted);">
				{notes.length} Note{notes.length !== 1 ? 's' : ''} · Zettelkasten aller Projekte
			</p>
		</div>
	</div>

	<!-- Suche + Filter -->
	<div class="flex flex-wrap items-center gap-3" in:fly={{ y: -8, duration: 400, delay: 80, easing: quintOut }}>
		<div class="relative flex-1 min-w-[220px]">
			<Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--text-muted);" />
			<input
				type="text"
				bind:value={query}
				oninput={onQueryInput}
				placeholder="Volltextsuche (Titel, Tags, Inhalt)…"
				class="input pl-9"
			/>
		</div>

		<select bind:value={kindFilter} onchange={fetchNotes} class="input w-auto">
			<option value="">Alle Arten</option>
			<option value="hub">Hub</option>
			<option value="adr">ADR</option>
			<option value="note">Note</option>
		</select>

		<select bind:value={tagFilter} onchange={fetchNotes} class="input w-auto max-w-[180px]">
			<option value="">Alle Tags</option>
			{#each allTags as t}
				<option value={t}>{t}</option>
			{/each}
		</select>

		<select bind:value={projectFilter} onchange={onProjectFilterChange} class="input w-auto max-w-[200px]">
			<option value="all">Alle Projekte</option>
			<option value="none">Ohne Projekt</option>
			{#each projects as p}
				<option value={String(p.id)}>{p.name}</option>
			{/each}
		</select>

		<label class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer select-none" style="background: var(--card-bg); border: 1px solid var(--border); color: {showArchived ? 'var(--text)' : 'var(--text-muted)'};">
			<input type="checkbox" bind:checked={showArchived} onchange={fetchNotes} class="accent-[var(--primary)]" />
			<Archive class="w-3.5 h-3.5" />
			Archivierte
		</label>
	</div>

	{#if error}
		<ErrorBanner message={error} />
	{/if}

	{#if fuzzyFallback && query.trim()}
		<div class="p-3 rounded-xl text-sm" style="background: color-mix(in srgb, var(--color-warning) 6%, transparent); border-left: 2px solid var(--color-warning); color: var(--text-muted);" in:fade={{ duration: 200 }}>
			Keine exakten Treffer — ähnliche Titel gefunden (Tippfehler-Suche).
		</div>
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<Spinner />
		</div>

	{:else if notes.length === 0}
		<div in:fade={{ duration: 300 }}>
			<EmptyState />
		</div>

	{:else}
		<!-- Hubs: Einstiegspunkte / Inhaltsverzeichnisse -->
		{#if hubs.length > 0}
			<div in:fly={{ y: 16, duration: 350, easing: quintOut }}>
				<div class="flex items-center gap-2 mb-3">
					<Compass class="w-4 h-4" style="color: var(--color-warning);" />
					<h2 class="text-sm font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Einstiegspunkte</h2>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each hubs as note (note.id)}
						<button
							onclick={() => goto(`/notes/${note.slug}`)}
							class="hub-card text-left rounded-xl p-5 border cursor-pointer transition-all duration-200"
							style="background: linear-gradient(135deg, color-mix(in srgb, var(--color-warning) 6%, transparent), var(--card-bg));"
						>
							<div class="flex items-center gap-2 mb-2">
								<Compass class="w-4 h-4 shrink-0" style="color: var(--color-warning);" />
								<h3 class="font-semibold truncate" style="color: var(--text);">{note.title}</h3>
							</div>
							<code class="text-xs" style="color: var(--text-muted);">{note.slug}</code>
							{#if note.tags.length > 0}
								<div class="flex flex-wrap gap-1 mt-2">
									{#each note.tags as t}
										<span class="text-xs px-1.5 py-0.5 rounded" style="background: var(--border); color: var(--text-muted);">{t}</span>
									{/each}
								</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Notes-Liste -->
		<div class="space-y-3">
			{#each listNotes as note, i (note.id)}
				{@const ks = kindStyles[note.kind] ?? kindStyles.note}
				{@const vs = verifyState(note)}
				<div
					in:fly={{ y: 16, duration: 300, delay: Math.min(i * 30, 300), easing: quintOut }}
					class="rounded-xl p-4 card cursor-pointer"
					style="{note.archived ? 'opacity: 0.55;' : ''}"
					onclick={() => goto(`/notes/${note.slug}`)}
					onkeydown={(e) => e.key === 'Enter' && goto(`/notes/${note.slug}`)}
					role="link"
					tabindex="0"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="status-chip uppercase tracking-wide" style="--chip-color: {ks.color};">{ks.label}</span>
								<h3 class="font-semibold truncate" style="color: var(--text);">{note.title}</h3>
								{#if note.archived}
									<span class="text-xs px-1.5 py-0.5 rounded flex items-center gap-1" style="background: var(--border); color: var(--text-muted);"><Archive class="w-3 h-3" /> archiviert</span>
								{/if}
							</div>
							<code class="text-xs" style="color: var(--text-muted);">{note.slug}</code>

							{#if note.snippet}
								<p class="text-sm mt-2 snippet" style="color: var(--text-muted);">…{@html sanitizeHtml(note.snippet)}…</p>
							{/if}

							<div class="flex flex-wrap items-center gap-2 mt-2">
								{#if note.tags.length > 0}
									<TagIcon class="w-3 h-3" style="color: var(--text-muted);" />
									{#each note.tags as t}
										<button
											class="text-xs px-1.5 py-0.5 rounded transition-colors"
											style="background: var(--border); color: var(--text-muted);"
											onclick={(e) => { e.stopPropagation(); tagFilter = t; fetchNotes(); }}
										>{t}</button>
									{/each}
								{/if}
								{#each note.projects as p}
									<span class="text-xs px-1.5 py-0.5 rounded-md" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">{p.name}</span>
								{/each}
								{#if note.projects.length === 0}
									<span class="text-xs italic" style="color: var(--text-muted);">global</span>
								{/if}
							</div>
						</div>

						<div class="shrink-0 flex flex-col items-end gap-1.5 text-xs" style="color: var(--text-muted);">
							<span class="font-mono">{formatDate(note.updated_at)}</span>
							{#if vs === 'fresh'}
								<span class="flex items-center gap-1" style="color: var(--color-success);" title="Verifiziert am {formatDate(note.last_verified_at ?? '')}">
									<ShieldCheck class="w-3.5 h-3.5" /> verifiziert
								</span>
							{:else if vs === 'stale'}
								<span class="flex items-center gap-1" style="color: var(--color-warning);" title="Letzte Verifikation: {formatDate(note.last_verified_at ?? '')} — älter als {VERIFY_STALE_DAYS} Tage">
									<ShieldAlert class="w-3.5 h-3.5" /> Verifikation alt
								</span>
							{:else}
								<span class="flex items-center gap-1" style="color: var(--text-muted); opacity: 0.7;" title="Diese Note wurde noch nie verifiziert">
									<ShieldQuestion class="w-3.5 h-3.5" /> nie verifiziert
								</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Ticket #511: JS onmouseenter/onmouseleave durch CSS-:hover ersetzt. */
	.hub-card {
		border-color: color-mix(in srgb, var(--color-warning) 35%, transparent);
	}

	.hub-card:hover {
		border-color: var(--color-warning);
	}

	.snippet :global(mark) {
		background: color-mix(in srgb, var(--color-primary) 20%, transparent);
		color: var(--text);
		border-radius: 2px;
		padding: 0 2px;
	}
</style>
