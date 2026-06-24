<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Plus, ArrowLeft, Trash2, Edit2, GripVertical } from 'lucide-svelte';
	import type { BoardStatus } from '$lib/types';

	let statuses: BoardStatus[] = [];
	let projectId: number | null = null;
	let isLoading = true;
	let error = '';

	$: id = $page.params.id;
	
	// Statuses abrufen
	async function fetchStatuses() {
		try {
			isLoading = true;
			const response = await fetch(`/api/projects/${id}/statuses`);
			const result = await response.json();
			
			if (result.ok) {
				statuses = result.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
				projectId = parseInt(id);
			} else {
				error = result.error || 'Fehler beim Laden der Statuses';
			}
		} catch (err) {
			error = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
			console.error('Fetch statuses error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	// Status löschen
	async function handleDelete(statusId: number) {
		if (!confirm('Sind Sie sicher, dass Sie diesen Status löschen möchten? Alle Tickets in diesem Status müssen zuerst verschoben werden.')) {
			return;
		}
		
		try {
			const response = await fetch(`/api/projects/${id}/statuses/${statusId}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			
			if (result.ok) {
				// Status aus der Liste entfernen
				statuses = statuses.filter(s => s.id !== statusId);
			} else {
				alert(result.error || 'Fehler beim Löschen des Status');
			}
		} catch (err) {
			alert('Netzwerkfehler. Bitte versuchen Sie es erneut.');
			console.error('Delete status error:', err);
		}
	}
	
	onMount(() => {
		fetchStatuses();
	});
</script>

<div class="max-w-3xl">
	<!-- Header -->
	<div class="mb-6">
		<button 
			onclick={() => goto(`/projects/${id}`)}
			class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4"
		>
			<ArrowLeft class="w-4 h-4" />
			Zurück zum Board
		</button>
		
		<h1 class="text-2xl font-bold text-[var(--text)]">Board-Statuses</h1>
		<p class="text-[var(--text-muted)] mt-1">Verwalte die Spalten deines Kanban-Boards</p>
	</div>
	
	<!-- Error -->
	{#if error}
		<div class="p-4 bg-[var(--danger)/10] border border-[var(--danger)] rounded-lg mb-6">
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
	{:else}
		<!-- Statuses List -->
		<div class="card p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-lg font-semibold text-[var(--text)]">Status-Liste</h2>
				<button 
					onclick={() => goto(`/projects/${id}/statuses/new`)}
					class="btn btn-primary flex items-center gap-2"
				>
					<Plus class="w-4 h-4" />
					Neuer Status
				</button>
			</div>
			
			{#if statuses.length === 0}
				<div class="text-center py-8">
					<p class="text-[var(--text-muted)] mb-4">Keine Statuses gefunden</p>
					<button 
						onclick={() => goto(`/projects/${id}/statuses/new`)}
						class="btn btn-primary"
					>
						Ersten Status erstellen
					</button>
				</div>
			{:else}
				<div class="space-y-3">
					{#each statuses as status}
						<div class="flex items-center justify-between p-3 bg-[var(--border)] rounded-lg">
							<div class="flex items-center gap-3">
								<GripVertical class="w-4 h-4 text-[var(--text-muted)] cursor-grab" />
								<div>
									<div class="font-medium text-[var(--text)]">{status.display_name}</div>
									<div class="text-sm text-[var(--text-muted)]">
										code: {status.name}
										<span class="mx-2 text-[var(--border)]">|</span>
										Position: {status.position}
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<button 
									onclick={() => goto(`/projects/${id}/statuses/${status.id}`)}
									class="btn btn-ghost p-2"
									title="Bearbeiten"
								>
									<Edit2 class="w-4 h-4" />
								</button>
								<button 
									onclick={() => handleDelete(status.id)}
									class="btn btn-ghost p-2 text-[var(--danger)] hover:bg-[var(--danger)/10]"
									title="Löschen"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
			
			<p class="text-xs text-[var(--text-muted)] mt-4 pt-4 border-t border-[var(--border)]">
				Hinweis: Drag & Drop zum Neuordnen wird in einer zukünftigen Version implementiert.
			</p>
		</div>
	{/if}
</div>
