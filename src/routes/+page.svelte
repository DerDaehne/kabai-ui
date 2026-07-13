<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Home, Folder, Ticket, CheckCircle2, Inbox, Clock, ArrowRight } from 'lucide-svelte';
	import type { DashboardData } from '$lib/types';

	let data: DashboardData | null = null;
	let isLoading = true;
	let error = '';

	async function fetchDashboard() {
		try {
			isLoading = true;
			const res = await fetch('/api/dashboard');
			const result = await res.json();
			if (result.ok) data = result.data;
			else error = result.error || 'Fehler beim Laden';
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	function relativeTime(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const mins = Math.round(diffMs / 60000);
		if (mins < 1) return 'gerade eben';
		if (mins < 60) return `vor ${mins} Min.`;
		const hours = Math.round(mins / 60);
		if (hours < 24) return `vor ${hours} Std.`;
		const days = Math.round(hours / 24);
		return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
	}

	onMount(fetchDashboard);
</script>

<div class="w-full space-y-8">
	<!-- Header -->
	<div class="flex items-center gap-3" in:fly={{ y: -16, duration: 400, easing: quintOut }}>
		<div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);">
			<Home class="w-5 h-5" style="color: var(--primary);" />
		</div>
		<h1 class="text-2xl font-semibold tracking-tight" style="color: var(--text);">Dashboard</h1>
	</div>

	{#if error}
		<div class="p-4 rounded-xl text-sm" style="background: rgba(239,68,68,0.08); border-left: 2px solid var(--color-danger); color: var(--danger);" in:fly={{ y: 8, duration: 200 }}>
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<div class="relative w-10 h-10">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary);"></div>
			</div>
		</div>

	{:else if data && data.projects.length === 0}
		<div class="flex flex-col items-center justify-center py-24 rounded-2xl card" in:fade={{ duration: 300 }}>
			<div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background: color-mix(in srgb, var(--color-primary) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);">
				<Folder class="w-8 h-8" style="color: var(--text-muted);" />
			</div>
			<h3 class="text-lg font-semibold mb-2" style="color: var(--text);">Noch keine Projekte</h3>
			<p class="mb-6 text-sm" style="color: var(--text-muted);">Erstellen Sie Ihr erstes Projekt, um loszulegen.</p>
			<button onclick={() => goto('/projects/new')} class="btn btn-primary">Erstes Projekt erstellen</button>
		</div>

	{:else if data}
		<!-- Totals -->
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-4" in:fly={{ y: 16, duration: 350, easing: quintOut }}>
			<div class="rounded-xl p-4 card">
				<div class="flex items-center gap-2 mb-1" style="color: var(--primary);">
					<Folder class="w-4 h-4" /><span class="text-xs font-medium">Projekte</span>
				</div>
				<p class="text-2xl font-semibold font-mono" style="color: var(--text);">{data.totals.projects}</p>
			</div>
			<div class="rounded-xl p-4 card">
				<div class="flex items-center gap-2 mb-1" style="color: var(--accent);">
					<Ticket class="w-4 h-4" /><span class="text-xs font-medium">Tickets</span>
				</div>
				<p class="text-2xl font-semibold font-mono" style="color: var(--text);">{data.totals.tickets}</p>
			</div>
			<div class="rounded-xl p-4 card">
				<div class="flex items-center gap-2 mb-1" style="color: var(--success);">
					<CheckCircle2 class="w-4 h-4" /><span class="text-xs font-medium">Erledigt</span>
				</div>
				<p class="text-2xl font-semibold font-mono" style="color: var(--text);">{data.totals.done}</p>
			</div>
			<div class="rounded-xl p-4 card">
				<div class="flex items-center gap-2 mb-1" style="color: var(--primary);">
					<Inbox class="w-4 h-4" /><span class="text-xs font-medium">Wartet auf dich</span>
				</div>
				<p class="text-2xl font-semibold font-mono" style="color: var(--text);">{data.totals.inbox}</p>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Project stats -->
			<div class="lg:col-span-2 space-y-3" in:fly={{ y: 16, duration: 350, delay: 80, easing: quintOut }}>
				<h2 class="text-sm font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Projekte</h2>
				{#each data.projects as project, i (project.id)}
					{@const progress = project.ticket_count > 0 ? (project.done_count / project.ticket_count) * 100 : 0}
					<button
						onclick={() => goto(`/projects/${project.id}`)}
						in:fly={{ y: 12, duration: 300, delay: i * 40, easing: quintOut }}
						class="w-full text-left rounded-xl p-4 card"
					>
						<div class="flex items-center justify-between gap-3 mb-2">
							<div class="min-w-0">
								<p class="font-semibold truncate" style="color: var(--text);">{project.name}</p>
								<p class="text-xs" style="color: var(--text-muted);">{project.ticket_count} Ticket{project.ticket_count !== 1 ? 's' : ''} · {project.done_count} erledigt</p>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								{#if project.inbox_count > 0}
									<span class="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
										style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--primary); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);">
										<Inbox class="w-3 h-3" />{project.inbox_count}
									</span>
								{/if}
								<ArrowRight class="w-4 h-4" style="color: var(--text-muted);" />
							</div>
						</div>
						<div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.06);">
							<div class="h-full rounded-full transition-all duration-500"
								style="width: {progress}%; background: var(--success);"></div>
						</div>
					</button>
				{/each}
			</div>

			<!-- Recent activity -->
			<div class="space-y-3" in:fly={{ y: 16, duration: 350, delay: 120, easing: quintOut }}>
				<h2 class="text-sm font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Zuletzt aktualisiert</h2>
				{#if data.recentTickets.length === 0}
					<p class="text-sm" style="color: var(--text-muted);">Noch keine Aktivität.</p>
				{:else}
					<div class="rounded-xl overflow-hidden card">
						{#each data.recentTickets as ticket, i (ticket.id)}
							{#if i > 0}<div class="hairline"></div>{/if}
							<button
								onclick={() => goto(`/tickets/${ticket.id}`)}
								class="w-full text-left px-4 py-3 flex items-start gap-2 transition-colors hover:bg-[var(--color-surface-hover)]"
							>
								<Clock class="w-3.5 h-3.5 shrink-0 mt-0.5" style="color: var(--text-muted);" />
								<div class="min-w-0 flex-1">
									<p class="text-sm truncate" style="color: var(--text);">{ticket.title}</p>
									<p class="text-xs truncate" style="color: var(--text-muted);">
										{ticket.project_name}{#if ticket.status_name} · {ticket.status_name}{/if} · {relativeTime(ticket.updated_at)}
									</p>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
