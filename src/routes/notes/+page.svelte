<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { BookOpen, Search, Compass, Archive, ShieldCheck, ShieldAlert, ShieldQuestion, Tag as TagIcon } from 'lucide-svelte';
	import type { NoteSummary, Project } from '$lib/types';
	import { sanitizeHtml } from '$lib/markdown';

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

	const kindStyles: Record<string, { color: string; bg: string; label: string }> = {
		hub: { color: 'hsl(45, 90%, 60%)', bg: 'hsla(45, 90%, 60%, 0.12)', label: 'Hub' },
		adr: { color: 'hsl(270, 70%, 70%)', bg: 'hsla(270, 70%, 60%, 0.12)', label: 'ADR' },
		note: { color: 'hsl(195, 80%, 60%)', bg: 'hsla(195, 80%, 60%, 0.12)', label: 'Note' }
	};

	function verifyState(note: NoteSummary): 'fresh' | 'stale' | 'never' {
		if (!note.last_verified_at) return 'never';
		const ageDays = (Date.now() - new Date(note.last_verified_at).getTime()) / 86400000;
		return ageDays > VERIFY_STALE_DAYS ? 'stale' : 'fresh';
	}

	function formatDate(d: string): string {
		return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
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
				<div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: rgba(0,212,255,0.12); border: 1px solid rgba(0,212,255,0.3);">
					<BookOpen class="w-5 h-5" style="color: var(--primary);" />
				</div>
				<h1 class="text-2xl font-bold tracking-tight" style="color: var(--text);">Knowledge Base</h1>
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
				class="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
				style="background: var(--card-bg); border: 1px solid var(--border); color: var(--text);"
			/>
		</div>

		<select bind:value={kindFilter} onchange={fetchNotes} class="px-3 py-2 rounded-lg text-sm" style="background: var(--card-bg); border: 1px solid var(--border); color: var(--text);">
			<option value="">Alle Arten</option>
			<option value="hub">Hub</option>
			<option value="adr">ADR</option>
			<option value="note">Note</option>
		</select>

		<select bind:value={tagFilter} onchange={fetchNotes} class="px-3 py-2 rounded-lg text-sm max-w-[180px]" style="background: var(--card-bg); border: 1px solid var(--border); color: var(--text);">
			<option value="">Alle Tags</option>
			{#each allTags as t}
				<option value={t}>{t}</option>
			{/each}
		</select>

		<select bind:value={projectFilter} onchange={fetchNotes} class="px-3 py-2 rounded-lg text-sm max-w-[200px]" style="background: var(--card-bg); border: 1px solid var(--border); color: var(--text);">
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
		<div class="p-4 rounded-xl border text-sm" style="background: rgba(255,34,85,0.08); border-color: rgba(255,34,85,0.4); color: var(--danger);" in:fly={{ y: 8, duration: 200 }}>
			{error}
		</div>
	{/if}

	{#if fuzzyFallback && query.trim()}
		<div class="p-3 rounded-xl border text-sm" style="background: rgba(255,200,50,0.06); border-color: rgba(255,200,50,0.3); color: var(--text-muted);" in:fade={{ duration: 200 }}>
			Keine exakten Treffer — ähnliche Titel gefunden (Tippfehler-Suche).
		</div>
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<div class="relative w-10 h-10">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary);"></div>
			</div>
		</div>

	{:else if notes.length === 0}
		<div class="flex flex-col items-center justify-center py-24 rounded-2xl border" style="border-color: var(--border); background: var(--card-bg);" in:fade={{ duration: 300 }}>
			<div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2);">
				<BookOpen class="w-8 h-8" style="color: var(--text-muted);" />
			</div>
			<h3 class="text-lg font-semibold mb-2" style="color: var(--text);">Keine Notes gefunden</h3>
			<p class="text-sm" style="color: var(--text-muted);">
				{query.trim() ? 'Suche oder Filter anpassen.' : 'Die Knowledge Base ist noch leer — Agenten legen Notes über die kabai_docs-Tools an.'}
			</p>
		</div>

	{:else}
		<!-- Hubs: Einstiegspunkte / Inhaltsverzeichnisse -->
		{#if hubs.length > 0}
			<div in:fly={{ y: 16, duration: 350, easing: quintOut }}>
				<div class="flex items-center gap-2 mb-3">
					<Compass class="w-4 h-4" style="color: hsl(45, 90%, 60%);" />
					<h2 class="text-sm font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Einstiegspunkte</h2>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each hubs as note (note.id)}
						<button
							onclick={() => goto(`/notes/${note.slug}`)}
							class="text-left rounded-xl p-5 border cursor-pointer transition-all duration-200"
							style="background: linear-gradient(135deg, hsla(45, 90%, 60%, 0.06), var(--card-bg)); border-color: hsla(45, 90%, 60%, 0.35);"
							onmouseenter={(e) => { e.currentTarget.style.borderColor = 'hsl(45, 90%, 60%)'; }}
							onmouseleave={(e) => { e.currentTarget.style.borderColor = 'hsla(45, 90%, 60%, 0.35)'; }}
						>
							<div class="flex items-center gap-2 mb-2">
								<Compass class="w-4 h-4 shrink-0" style="color: hsl(45, 90%, 60%);" />
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
					class="rounded-xl p-4 border cursor-pointer transition-all duration-200"
					style="background: var(--card-bg); border-color: var(--border); {note.archived ? 'opacity: 0.55;' : ''}"
					onclick={() => goto(`/notes/${note.slug}`)}
					onkeydown={(e) => e.key === 'Enter' && goto(`/notes/${note.slug}`)}
					role="link"
					tabindex="0"
					onmouseenter={(e) => { e.currentTarget.style.borderColor = ks.color; }}
					onmouseleave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="text-xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide" style="background: {ks.bg}; color: {ks.color}; border: 1px solid {ks.bg};">{ks.label}</span>
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
									<span class="text-xs px-1.5 py-0.5 rounded-md" style="border: 1px solid var(--border-bright, var(--border)); color: var(--text-muted);">{p.name}</span>
								{/each}
								{#if note.projects.length === 0}
									<span class="text-xs italic" style="color: var(--text-muted);">global</span>
								{/if}
							</div>
						</div>

						<div class="shrink-0 flex flex-col items-end gap-1.5 text-xs" style="color: var(--text-muted);">
							<span>{formatDate(note.updated_at)}</span>
							{#if vs === 'fresh'}
								<span class="flex items-center gap-1" style="color: hsl(150, 70%, 55%);" title="Verifiziert am {formatDate(note.last_verified_at ?? '')}">
									<ShieldCheck class="w-3.5 h-3.5" /> verifiziert
								</span>
							{:else if vs === 'stale'}
								<span class="flex items-center gap-1" style="color: hsl(35, 90%, 60%);" title="Letzte Verifikation: {formatDate(note.last_verified_at ?? '')} — älter als {VERIFY_STALE_DAYS} Tage">
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
	.snippet :global(mark) {
		background: rgba(0, 212, 255, 0.2);
		color: var(--text);
		border-radius: 2px;
		padding: 0 2px;
	}
</style>
