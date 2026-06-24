<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus, Settings, Trash2, Edit2, Eye } from 'lucide-svelte';
	import type { Project } from '$lib/types';
	
	let projects: Project[] = [];
	let isLoading = true;
	let error = '';
	
	// Projekte abrufen
	async function fetchProjects() {
		try {
			isLoading = true;
			error = '';
			
			const response = await fetch('/api/projects');
			const result = await response.json();
			
			if (result.ok) {
				projects = result.data;
			} else {
				error = result.error || 'Fehler beim Laden der Projekte';
			}
		} catch (err) {
			error = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
			console.error('Fetch projects error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	// Projekt löschen
	async function handleDelete(projectId: number) {
		if (!confirm('Sind Sie sicher, dass Sie dieses Projekt löschen möchten? Alle zugehörigen Daten werden ebenfalls gelöscht.')) {
			return;
		}
		
		try {
			const response = await fetch(`/api/projects/${projectId}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			
			if (result.ok) {
				// Projekt aus der Liste entfernen
				projects = projects.filter(p => p.id !== projectId);
			} else {
				alert(result.error || 'Fehler beim Löschen des Projekts');
			}
		} catch (err) {
			alert('Netzwerkfehler. Bitte versuchen Sie es erneut.');
			console.error('Delete project error:', err);
		}
	}
	
	// bei Mount Projekte laden
	onMount(() => {
		fetchProjects();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--text)]">Projekte</h1>
			<p class="text-[var(--text-muted)] mt-1">Verwalte deine Kanban-Boards</p>
		</div>
		
		<button 
			onclick={() => goto('/projects/new')} 
			class="btn btn-primary flex items-center gap-2"
		>
			<Plus class="w-4 h-4" />
			Neues Projekt
		</button>
	</div>
	
	<!-- Error -->
	{#if error}
		<div class="p-4 bg-[var(--danger)/10] border border-[var(--danger)] rounded-lg">
			<p class="text-[var(--danger)]">{error}</p>
		</div>
	{/if}
	
	<!-- Loading -->
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<svg class="animate-spin h-8 w-8 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		</div>
	{:else if projects.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12">
			<div class="w-16 h-16 bg-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
				</svg>
			</div>
			<h3 class="text-lg font-medium text-[var(--text)] mb-2">Keine Projekte gefunden</h3>
			<p class="text-[var(--text-muted)] mb-4">Erstellen Sie Ihr erstes Projekt, um loszulegen.</p>
			<button 
				onclick={() => goto('/projects/new')} 
				class="btn btn-primary"
			>
				<Plus class="w-4 h-4 mr-2" />
				Neues Projekt erstellen
			</button>
		</div>
	{:else}
		<!-- Projects Table -->
		<div class="overflow-x-auto bg-[var(--card-bg)] rounded-lg border border-[var(--border)]">
			<table class="w-full">
				<thead>
					<tr class="border-b border-[var(--border)]">
						<th class="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Name</th>
						<th class="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Slug</th>
						<th class="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Beschreibung</th>
						<th class="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Erstellt</th>
						<th class="px-6 py-4 text-right text-sm font-medium text-[var(--text-muted)]">Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#each projects as project}
						<tr class="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)] transition-colors">
							<td class="px-6 py-4">
								<div class="font-medium text-[var(--text)]">{project.name}</div>
							</td>
							<td class="px-6 py-4">
								<code class="text-sm text-[var(--primary)]">{project.slug}</code>
							</td>
							<td class="px-6 py-4">
								<p class="text-sm text-[var(--text-muted)] truncate-2 max-w-xs">{project.description || '—'}</p>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm text-[var(--text-muted)]">{new Date(project.created_at).toLocaleDateString('de-DE')}</span>
							</td>
							<td class="px-6 py-4">
								<div class="flex items-center justify-end gap-2">
									<button 
										onclick={() => goto(`/projects/${project.id}`)}
										class="p-2 rounded-md hover:bg-[var(--border)] transition-colors text-[var(--text-muted)] hover:text-[var(--text)]"
										title="Board anzeigen"
									>
										<Eye class="w-4 h-4" />
									</button>
									<button 
										onclick={() => goto(`/projects/${project.id}/settings`)}
										class="p-2 rounded-md hover:bg-[var(--border)] transition-colors text-[var(--text-muted)] hover:text-[var(--text)]"
										title="Einstellungen"
									>
										<Settings class="w-4 h-4" />
									</button>
									<button 
										onclick={() => handleDelete(project.id)}
										class="p-2 rounded-md hover:bg-[var(--danger)/10] transition-colors text-[var(--danger)]"
										title="Projekt löschen"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
