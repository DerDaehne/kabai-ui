<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Settings, List, Network } from 'lucide-svelte';
	import { page } from '$app/stores';
	import KanbanBoard from '$components/board/KanbanBoard.svelte';
	import type { Project, BoardStatus, Ticket } from '$lib/types';

	let project: Project | null = null;
	let statuses: BoardStatus[] = [];
	let tickets: Ticket[] = [];
	let isLoading = true;
	let error = '';

	$: id = $page.params.id;
	
	// Daten abrufen
	async function fetchBoardData() {
		try {
			isLoading = true;
			
			// Projekt abrufen
			const projectResponse = await fetch(`/api/projects/${id}`);
			const projectResult = await projectResponse.json();
			
			if (!projectResult.ok) {
				error = projectResult.error || 'Projekt nicht gefunden';
				return;
			}
			
			project = projectResult.data;
			
			// Statuses abrufen
			const statusesResponse = await fetch(`/api/projects/${id}/statuses`);
			const statusesResult = await statusesResponse.json();
			
			if (statusesResult.ok) {
				statuses = statusesResult.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
			} else {
				console.error('Fehler beim Laden der Statuses:', statusesResult.error);
			}
			
			// Tickets abrufen
			const ticketsResponse = await fetch(`/api/projects/${id}/tickets`);
			const ticketsResult = await ticketsResponse.json();
			
			if (ticketsResult.ok) {
				tickets = ticketsResult.data;
			} else {
				console.error('Fehler beim Laden der Tickets:', ticketsResult.error);
			}
		} catch (err) {
			error = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
			console.error('Fetch board data error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	onMount(() => {
		fetchBoardData();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<button 
				onclick={() => goto('/projects')}
				class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
			>
				<ArrowLeft class="w-4 h-4" />
				Zurück
			</button>
			
			{#if project}
				<div>
					<h1 class="text-2xl font-bold text-[var(--text)]">{project.name}</h1>
					<p class="text-[var(--text-muted)]">{project.description || 'Kanban-Board'}</p>
				</div>
			{/if}
		</div>
		
		<!-- Actions -->
		<div class="flex items-center gap-2">
			<button 
				onclick={() => goto(`/projects/${id}/statuses`)} 
				class="btn btn-ghost flex items-center gap-2"
				title="Statuses verwalten"
			>
				<List class="w-4 h-4" />
				<span class="hidden md:inline">Statuses</span>
			</button>
			<button 
				onclick={() => goto(`/projects/${id}/workflow`)} 
				class="btn btn-ghost flex items-center gap-2"
				title="Workflow bearbeiten"
			>
				<Network class="w-4 h-4" />
				<span class="hidden md:inline">Workflow</span>
			</button>
			<button 
				onclick={() => goto(`/projects/${id}/settings`)} 
				class="btn btn-ghost flex items-center gap-2"
				title="Projekt-Einstellungen"
			>
				<Settings class="w-4 h-4" />
				<span class="hidden md:inline">Einstellungen</span>
			</button>
		</div>
	</div>
	
	<!-- Error -->
	{#if error}
		<div class="p-4 bg-[var(--danger)/10] border border-[var(--danger)] rounded-lg">
			<p class="text-[var(--danger)]">{error}</p>
		</div>
	{/if}
	
	<!-- Loading -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<svg class="animate-spin h-10 w-10 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		</div>
	{:else if project && statuses.length > 0}
		<!-- Kanban Board -->
		<KanbanBoard 
			projectId={project.id} 
			statuses={statuses} 
			tickets={tickets}
		/>
	{:else if project}
		<!-- Empty Board -->
		<div class="text-center py-12">
			<div class="w-16 h-16 bg-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
				</svg>
			</div>
			<h3 class="text-lg font-medium text-[var(--text)] mb-2">Keine Board-Statuses gefunden</h3>
			<p class="text-[var(--text-muted)] mb-4">
				Erstellen Sie Statuses, um Ihr Kanban-Board zu konfigurieren.
			</p>
			<button 
				onclick={() => goto(`/projects/${id}/statuses`)} 
				class="btn btn-primary"
			>
				Statuses erstellen
			</button>
		</div>
	{/if}
</div>
