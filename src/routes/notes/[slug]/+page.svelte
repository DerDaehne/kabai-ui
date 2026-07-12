<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import {
		BookOpen, ArrowLeft, Archive, Compass, Link2, ListTree, AlertTriangle,
		Zap, ShieldCheck, ShieldAlert, ShieldQuestion, Ticket as TicketIcon, Tag as TagIcon
	} from 'lucide-svelte';
	import type { NoteDetail, NoteLinkRef } from '$lib/types';
	import { renderMarkdown } from '$lib/markdown';

	let note: NoteDetail | null = null;
	let isLoading = true;
	let error = '';

	const VERIFY_STALE_DAYS = 30;

	const kindStyles: Record<string, { color: string; bg: string; label: string }> = {
		hub: { color: 'hsl(45, 90%, 60%)', bg: 'hsla(45, 90%, 60%, 0.12)', label: 'Hub' },
		adr: { color: 'hsl(270, 70%, 70%)', bg: 'hsla(270, 70%, 60%, 0.12)', label: 'ADR' },
		note: { color: 'hsl(195, 80%, 60%)', bg: 'hsla(195, 80%, 60%, 0.12)', label: 'Note' }
	};

	const relationLabels: Record<string, string> = {
		documents: 'dokumentiert',
		created_by: 'erstellt durch',
		verified_by: 'verifiziert durch',
		references: 'referenziert'
	};

	async function fetchNote(slug: string) {
		try {
			isLoading = true;
			note = null;
			const res = await fetch(`/api/notes/${encodeURIComponent(slug)}`);
			const result = await res.json();
			if (result.ok) {
				note = result.data;
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

	function formatDate(d: string): string {
		return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function verifiedDaysAgo(n: NoteDetail): number {
		return Math.floor((Date.now() - new Date(n.last_verified_at!).getTime()) / 86400000);
	}

	// Link-Gruppen für die Nachbarschafts-Sektion
	$: supersededBy = note?.links.filter((l) => l.link_type === 'supersedes' && l.direction === 'incoming') ?? [];
	$: supersedes = note?.links.filter((l) => l.link_type === 'supersedes' && l.direction === 'outgoing') ?? [];
	$: contradictions = note?.links.filter((l) => l.link_type === 'contradicts') ?? [];
	$: containsOut = note?.links.filter((l) => l.link_type === 'contains' && l.direction === 'outgoing') ?? [];
	$: containedIn = note?.links.filter((l) => l.link_type === 'contains' && l.direction === 'incoming') ?? [];
	$: referencesOut = note?.links.filter((l) => l.link_type === 'references' && l.direction === 'outgoing') ?? [];
	$: referencedBy = note?.links.filter((l) => l.link_type === 'references' && l.direction === 'incoming') ?? [];

	// Initial und bei Slug-Wechsel (Note→Note-Navigation) laden; nur im
	// Browser — Ticket-/Notes-Inhalte werden generell client-seitig gefetcht.
	$: if (browser && $page.params.slug) fetchNote($page.params.slug);
</script>

{#snippet noteLink(l: NoteLinkRef)}
	{@const ks = kindStyles[l.kind] ?? kindStyles.note}
	<button
		onclick={() => goto(`/notes/${l.slug}`)}
		class="flex items-center gap-2 px-3 py-2 rounded-lg border text-left w-full transition-all duration-150"
		style="background: var(--card-bg); border-color: var(--border); {l.archived ? 'opacity: 0.55;' : ''}"
		onmouseenter={(e) => { e.currentTarget.style.borderColor = ks.color; }}
		onmouseleave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
	>
		{#if l.kind === 'hub'}
			<Compass class="w-3.5 h-3.5 shrink-0" style="color: {ks.color};" />
		{:else}
			<BookOpen class="w-3.5 h-3.5 shrink-0" style="color: {ks.color};" />
		{/if}
		<span class="text-sm truncate" style="color: var(--text);">{l.title}</span>
		{#if l.archived}
			<Archive class="w-3 h-3 shrink-0" style="color: var(--text-muted);" />
		{/if}
		<code class="text-xs ml-auto shrink-0 hidden sm:inline" style="color: var(--text-muted);">{l.slug}</code>
	</button>
{/snippet}

<div class="w-full max-w-4xl mx-auto space-y-6">
	<!-- Zurück zur Übersicht -->
	<button
		onclick={() => goto('/notes')}
		class="flex items-center gap-2 text-sm transition-colors"
		style="color: var(--text-muted);"
		onmouseenter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
		onmouseleave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
	>
		<ArrowLeft class="w-4 h-4" />
		Knowledge Base
	</button>

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<div class="relative w-10 h-10">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary);"></div>
			</div>
		</div>

	{:else if error}
		<div class="p-4 rounded-xl border text-sm" style="background: rgba(255,34,85,0.08); border-color: rgba(255,34,85,0.4); color: var(--danger);" in:fly={{ y: 8, duration: 200 }}>
			{error}
		</div>

	{:else if note}
		{@const ks = kindStyles[note.kind] ?? kindStyles.note}

		<!-- Warnbanner: archiviert / abgelöst -->
		{#if note.archived}
			<div class="flex items-center gap-3 p-4 rounded-xl border" style="background: rgba(120,120,140,0.1); border-color: var(--border-bright, var(--border)); color: var(--text-muted);" in:fade={{ duration: 200 }}>
				<Archive class="w-5 h-5 shrink-0" />
				<span class="text-sm">Diese Note ist <strong>archiviert</strong> und taucht in der Übersicht nur mit aktiviertem Archiv-Toggle auf.</span>
			</div>
		{/if}
		{#if supersededBy.length > 0}
			<div class="p-4 rounded-xl border" style="background: rgba(255,150,50,0.08); border-color: rgba(255,150,50,0.45);" in:fade={{ duration: 200 }}>
				<div class="flex items-center gap-2 mb-2" style="color: hsl(30, 90%, 60%);">
					<AlertTriangle class="w-5 h-5 shrink-0" />
					<span class="text-sm font-semibold">Veraltet — abgelöst durch:</span>
				</div>
				<div class="space-y-2">
					{#each supersededBy as l (l.note_id)}
						{@render noteLink(l)}
					{/each}
				</div>
			</div>
		{/if}

		<!-- Kopf -->
		<div in:fly={{ y: -12, duration: 350, easing: quintOut }}>
			<div class="flex items-center gap-2 flex-wrap mb-2">
				<span class="text-xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide" style="background: {ks.bg}; color: {ks.color}; border: 1px solid {ks.bg};">{ks.label}</span>
				<h1 class="text-2xl font-bold tracking-tight" style="color: var(--text);">{note.title}</h1>
			</div>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style="color: var(--text-muted);">
				<code>{note.slug}</code>
				<span>erstellt {formatDate(note.created_at)}</span>
				<span>aktualisiert {formatDate(note.updated_at)}</span>
				{#each note.projects as p}
					<button class="px-1.5 py-0.5 rounded-md border transition-colors" style="border-color: var(--border); color: var(--text-muted);" onclick={() => goto(`/projects/${p.id}`)}>{p.name}</button>
				{/each}
				{#if note.projects.length === 0}
					<span class="italic">global (kein Projekt)</span>
				{/if}
			</div>
			{#if note.tags.length > 0}
				<div class="flex items-center gap-1.5 mt-2 flex-wrap">
					<TagIcon class="w-3 h-3" style="color: var(--text-muted);" />
					{#each note.tags as t}
						<span class="text-xs px-1.5 py-0.5 rounded" style="background: var(--border); color: var(--text-muted);">{t}</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Verifikations-Status -->
		{#if note.last_verified_at}
			{@const days = verifiedDaysAgo(note)}
			{@const stale = days > VERIFY_STALE_DAYS}
			<div class="flex items-center gap-2 p-3 rounded-xl border text-sm" style="background: {stale ? 'rgba(255,180,50,0.06)' : 'rgba(50,220,130,0.06)'}; border-color: {stale ? 'rgba(255,180,50,0.35)' : 'rgba(50,220,130,0.3)'}; color: {stale ? 'hsl(35, 90%, 60%)' : 'hsl(150, 70%, 55%)'};">
				{#if stale}
					<ShieldAlert class="w-4 h-4 shrink-0" />
				{:else}
					<ShieldCheck class="w-4 h-4 shrink-0" />
				{/if}
				<span>
					Zuletzt geprüft vor {days} Tag{days !== 1 ? 'en' : ''} ({formatDate(note.last_verified_at)})
					{#if note.last_verified_ticket_id}
						— <button class="underline underline-offset-2" onclick={() => goto(`/tickets/${note?.last_verified_ticket_id}`)}>Ticket #{note.last_verified_ticket_id}</button>
					{/if}
					{#if stale}· Inhalt könnte veraltet sein{/if}
				</span>
			</div>
		{:else}
			<div class="flex items-center gap-2 p-3 rounded-xl border text-sm" style="background: var(--card-bg); border-color: var(--border); color: var(--text-muted);">
				<ShieldQuestion class="w-4 h-4 shrink-0" />
				<span>Diese Note wurde <strong>nie geprüft</strong> — Inhalt ohne Verifikation.</span>
			</div>
		{/if}

		<!-- Hub: Inhaltsverzeichnis -->
		{#if note.kind === 'hub' && containsOut.length > 0}
			<div class="rounded-xl p-5 border" style="background: linear-gradient(135deg, hsla(45, 90%, 60%, 0.06), var(--card-bg)); border-color: hsla(45, 90%, 60%, 0.35);" in:fly={{ y: 12, duration: 300, easing: quintOut }}>
				<div class="flex items-center gap-2 mb-3">
					<ListTree class="w-4 h-4" style="color: hsl(45, 90%, 60%);" />
					<h2 class="text-sm font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Inhaltsverzeichnis</h2>
				</div>
				<div class="space-y-2">
					{#each containsOut as l (l.note_id)}
						{@render noteLink(l)}
					{/each}
				</div>
			</div>
		{/if}

		<!-- Body -->
		<div class="rounded-xl p-6 border" style="background: var(--card-bg); border-color: var(--border);" in:fly={{ y: 12, duration: 300, delay: 60, easing: quintOut }}>
			{#if note.body.trim()}
				<div class="markdown-body text-sm leading-relaxed" style="color: var(--text);">{@html renderMarkdown(note.body)}</div>
			{:else}
				<p class="text-sm italic" style="color: var(--text-muted);">Kein Inhalt.</p>
			{/if}
		</div>

		<!-- Konflikte -->
		{#if contradictions.length > 0}
			<div class="p-4 rounded-xl border" style="background: rgba(255,34,85,0.06); border-color: rgba(255,34,85,0.35);">
				<div class="flex items-center gap-2 mb-2" style="color: var(--danger);">
					<Zap class="w-4 h-4 shrink-0" />
					<span class="text-sm font-semibold">Widersprüche</span>
				</div>
				<div class="space-y-2">
					{#each contradictions as l (`${l.direction}-${l.note_id}`)}
						<div class="flex items-center gap-2">
							<span class="text-xs shrink-0 w-24" style="color: var(--text-muted);">{l.direction === 'outgoing' ? 'widerspricht' : 'im Widerspruch zu dieser Note'}</span>
							{@render noteLink(l)}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Link-Nachbarschaft -->
		{#if supersedes.length > 0 || (note.kind !== 'hub' && containsOut.length > 0) || containedIn.length > 0 || referencesOut.length > 0 || referencedBy.length > 0}
			<div class="rounded-xl p-5 border space-y-4" style="background: var(--card-bg); border-color: var(--border);" in:fly={{ y: 12, duration: 300, delay: 120, easing: quintOut }}>
				<div class="flex items-center gap-2">
					<Link2 class="w-4 h-4" style="color: var(--primary);" />
					<h2 class="text-sm font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Verknüpfte Notes</h2>
				</div>

				{#each [
					{ label: 'Löst ab (dieses ersetzt):', items: supersedes },
					{ label: 'Enthält:', items: note.kind !== 'hub' ? containsOut : [] },
					{ label: 'Teil von:', items: containedIn },
					{ label: 'Referenziert:', items: referencesOut },
					{ label: 'Referenziert von:', items: referencedBy }
				] as group}
					{#if group.items.length > 0}
						<div>
							<div class="text-xs mb-1.5" style="color: var(--text-muted);">{group.label}</div>
							<div class="space-y-2">
								{#each group.items as l (`${l.direction}-${l.link_type}-${l.note_id}`)}
									{@render noteLink(l)}
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Ticket-Links -->
		{#if note.ticket_links.length > 0}
			<div class="rounded-xl p-5 border space-y-2" style="background: var(--card-bg); border-color: var(--border);" in:fly={{ y: 12, duration: 300, delay: 160, easing: quintOut }}>
				<div class="flex items-center gap-2 mb-2">
					<TicketIcon class="w-4 h-4" style="color: var(--primary);" />
					<h2 class="text-sm font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Verknüpfte Tickets</h2>
				</div>
				{#each note.ticket_links as tl (`${tl.ticket_id}-${tl.relation}`)}
					<button
						onclick={() => goto(`/tickets/${tl.ticket_id}`)}
						class="flex items-center gap-2 px-3 py-2 rounded-lg border text-left w-full transition-all duration-150"
						style="background: var(--card-bg); border-color: var(--border);"
						onmouseenter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
						onmouseleave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
					>
						<span class="text-xs font-semibold px-2 py-0.5 rounded-md shrink-0" style="background: rgba(0,212,255,0.1); color: var(--primary); border: 1px solid rgba(0,212,255,0.25);">{relationLabels[tl.relation] ?? tl.relation}</span>
						<span class="text-sm truncate" style="color: var(--text);">#{tl.ticket_id} {tl.ticket_title}</span>
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>
