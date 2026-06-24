<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ArrowLeft, Network, Plus, X, Check } from 'lucide-svelte';
	import type { BoardStatus, StatusTransition } from '$lib/types';

	let statuses: BoardStatus[] = [];
	let transitions: StatusTransition[] = [];
	let isLoading = true;
	let error = '';

	$: id = $page.params.id;
	
	// Daten abrufen
	async function fetchWorkflowData() {
		try {
			isLoading = true;
			
			// Statuses abrufen
			const statusesResponse = await fetch(`/api/projects/${id}/statuses`);
			const statusesResult = await statusesResponse.json();
			
			if (statusesResult.ok) {
				statuses = statusesResult.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
			} else {
				error = statusesResult.error || 'Fehler beim Laden der Statuses';
				return;
			}
			
			// Transitions abrufen
			const transitionsResponse = await fetch(`/api/projects/${id}/transitions`);
			const transitionsResult = await transitionsResponse.json();
			
			if (transitionsResult.ok) {
				transitions = transitionsResult.data;
			} else {
				console.error('Fehler beim Laden der Transitions:', transitionsResult.error);
			}
		} catch (err) {
			error = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
			console.error('Fetch workflow data error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	// Transition hinzufügen
	async function addTransition(fromId: number, toId: number) {
		// Selbst-Referenz prüfen
		if (fromId === toId) {
			alert('Ein Status kann nicht zu sich selbst verschoben werden.');
			return;
		}
		
		try {
			const response = await fetch(`/api/projects/${id}/transitions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ from_status_id: fromId, to_status_id: toId })
			});
			
			const result = await response.json();
			
			if (result.ok) {
				// Transition zur Liste hinzufügen
				transitions = [...transitions, { project_id: parseInt(id), from_status_id: fromId, to_status_id: toId }];
			} else {
				alert(result.error || 'Fehler beim Hinzufügen der Transition');
			}
		} catch (err) {
			alert('Netzwerkfehler. Bitte versuchen Sie es erneut.');
			console.error('Add transition error:', err);
		}
	}
	
	// Transition entfernen
	async function removeTransition(fromId: number, toId: number) {
		try {
			const response = await fetch(`/api/projects/${id}/transitions/${fromId}/${toId}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			
			if (result.ok) {
				// Transition aus der Liste entfernen
				transitions = transitions.filter(t => !(t.from_status_id === fromId && t.to_status_id === toId));
			} else {
				alert(result.error || 'Fehler beim Entfernen der Transition');
			}
		} catch (err) {
			alert('Netzwerkfehler. Bitte versuchen Sie es erneut.');
			console.error('Remove transition error:', err);
		}
	}
	
	// Prüfen ob Transition existiert
	function hasTransition(fromId: number, toId: number): boolean {
		return transitions.some(t => t.from_status_id === fromId && t.to_status_id === toId);
	}
	
	// Mögliche Ziele für einen Status
	function possibleTargets(fromId: number): BoardStatus[] {
		return statuses.filter(s => s.id !== fromId);
	}
	
	onMount(() => {
		fetchWorkflowData();
	});
</script>

<div class="max-w-4xl">
	<!-- Header -->
	<div class="mb-6">
		<button 
			onclick={() => goto(`/projects/${id}`)}
			class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4"
		>
			<ArrowLeft class="w-4 h-4" />
			Zurück zum Board
		</button>
		
		<h1 class="text-2xl font-bold text-[var(--text)]">Workflow-Editor</h1>
		<p class="text-[var(--text-muted)] mt-1">Definieren Sie erlaubte Status-Transitions</p>
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
	{:else if statuses.length === 0}
		<div class="text-center py-12">
			<div class="w-16 h-16 bg-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
				<Network class="w-8 h-8 text-[var(--text-muted)]" />
			</div>
			<h3 class="text-lg font-medium text-[var(--text)] mb-2">Keine Statuses gefunden</h3>
			<p class="text-[var(--text-muted)] mb-4">
				Erstellen Sie Statuses, um Transitions zu definieren.
			</p>
			<button 
				onclick={() => goto(`/projects/${id}/statuses`)} 
				class="btn btn-primary"
			>
				Statuses erstellen
			</button>
		</div>
	{:else}
		<!-- Workflow Matrix -->
		<div class="card p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-lg font-semibold text-[var(--text)]">Transition-Matrix</h2>
			</div>
			
			<!-- Matrix Header -->
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr>
							<th class="px-4 py-3 bg-[var(--border)] text-left text-sm font-medium text-[var(--text)]">Von \ Zu</th>
							{#each statuses as status}
								<th class="px-4 py-3 bg-[var(--border)] text-center text-sm font-medium text-[var(--text)]">
									{status.display_name}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each statuses as fromStatus}
							<tr>
								<th class="px-4 py-3 bg-[var(--border)] text-left text-sm font-medium text-[var(--text)]">
									{fromStatus.display_name}
								</th>
								{#each statuses as toStatus}
									<td class="px-4 py-3 border border-[var(--border)] text-center">
										{#if fromStatus.id === toStatus.id}
											<span class="text-xs text-[var(--text-muted)]">—</span>
										{:else if hasTransition(fromStatus.id, toStatus.id)}
											<button 
												onclick={() => removeTransition(fromStatus.id, toStatus.id)}
												class="w-6 h-6 bg-[var(--success)] rounded-full flex items-center justify-center"
												title="Transition entfernen"
											>
												<Check class="w-4 h-4 text-white" />
											</button>
										{:else}
											<button 
												onclick={() => addTransition(fromStatus.id, toStatus.id)}
												class="w-6 h-6 bg-[var(--border)] rounded-full flex items-center justify-center hover:bg-[var(--primary)/10)]"
												title="Transition hinzufügen"
											>
												<Plus class="w-4 h-4 text-[var(--text-muted)]" />
											</button>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<!-- Summary -->
			<div class="mt-6 pt-4 border-t border-[var(--border)]">
				<h3 class="font-medium text-[var(--text)] mb-2">Zusammenfassung</h3>
				<p class="text-sm text-[var(--text-muted)]">
					Gesamtzahl der Transitions: <strong>{transitions.length}</strong>
				</p>
				
				<!-- Grafische Darstellung (einfach) -->
				<div class="mt-4 p-4 bg-[var(--border)] rounded-lg">
					<h4 class="font-medium text-[var(--text)] mb-3">Aktuelle Transitions:</h4>
					<div class="flex flex-wrap gap-2">
						{#each transitions as transition}
							<div class="flex items-center gap-2 px-3 py-1 bg-[var(--card-bg)] rounded-md">
								<span class="text-sm font-medium text-[var(--text)]">
									{statuses.find(s => s.id === transition.from_status_id)?.display_name || '?'}
								</span>
								<span class="text-[var(--text-muted)]">→</span>
								<span class="text-sm font-medium text-[var(--text)]">
									{statuses.find(s => s.id === transition.to_status_id)?.display_name || '?'}
								</span>
								<button 
									onclick={() => removeTransition(transition.from_status_id, transition.to_status_id)}
									class="text-[var(--danger)] hover:bg-[var(--danger)/10] rounded-full p-0.5"
									title="Entfernen"
								>
									<X class="w-3 h-3" />
								</button>
							</div>
						{/each}
						
						{#if transitions.length === 0}
							<p class="text-sm text-[var(--text-muted)]">Keine Transitions definiert.</p>
						{/if}
					</div>
				</div>
			</div>
			
			<p class="text-xs text-[var(--text-muted)] mt-4 pt-4 border-t border-[var(--border)]">
				Hinweis: Der visuelle Graph-Editor wird in einer zukünftigen Version mit @xyflow/svelte implementiert.
			</p>
		</div>
	{/if}
</div>
