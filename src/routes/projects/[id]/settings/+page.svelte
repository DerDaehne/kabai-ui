<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { z } from 'zod';
	import { Trash2, ArrowLeft } from 'lucide-svelte';
	import type { Project } from '$lib/types';

	let project: Project | null = null;
	let name = '';
	let description = '';
	let isLoading = true;
	let error = '';
	let isDeleting = false;

	$: id = $page.params.id;
	
	// Projekt abrufen
	async function fetchProject() {
		try {
			isLoading = true;
			const response = await fetch(`/api/projects/${id}`);
			const result = await response.json();
			
			if (result.ok) {
				project = result.data;
				name = project.name;
				description = project.description || '';
			} else {
				error = result.error || 'Projekt nicht gefunden';
			}
		} catch (err) {
			error = 'Netzwerkfehler';
			console.error('Fetch project error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	// Validierung
	const updateProjectSchema = z.object({
		name: z.string().min(1, 'Name ist erforderlich'),
		description: z.string().nullable().optional()
	});
	
	// Projekt aktualisieren
	async function handleSubmit() {
		try {
			const validation = updateProjectSchema.safeParse({ name, description });
			if (!validation.success) {
				error = validation.error.errors[0].message;
				return;
			}
			
			error = '';
			const response = await fetch(`/api/projects/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description })
			});
			
			const result = await response.json();
			
			if (result.ok) {
				project = result.data;
				goto(`/projects?success=Projekt+erfolgreich+aktualisiert`);
			} else {
				error = result.error || 'Fehler beim Aktualisieren';
			}
		} catch (err) {
			error = 'Netzwerkfehler';
			console.error('Update project error:', err);
		}
	}
	
	// Projekt löschen
	async function handleDelete() {
		if (!confirm('Sind Sie sicher, dass Sie dieses Projekt löschen möchten? Alle zugehörigen Daten (Statuses, Tickets, etc.) werden ebenfalls gelöscht.')) {
			return;
		}
		
		try {
			isDeleting = true;
			const response = await fetch(`/api/projects/${id}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			
			if (result.ok) {
				goto('/projects?success=Projekt+erfolgreich+gelöscht');
			} else {
				error = result.error || 'Fehler beim Löschen';
			}
		} catch (err) {
			error = 'Netzwerkfehler';
			console.error('Delete project error:', err);
		} finally {
			isDeleting = false;
		}
	}
	
	onMount(() => {
		fetchProject();
	});
</script>

<div class="max-w-2xl">
	<!-- Header -->
	<div class="mb-6">
		<button 
			onclick={() => goto('/projects')}
			class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4"
		>
			<ArrowLeft class="w-4 h-4" />
			Zurück zu Projekten
		</button>
		
		<h1 class="text-2xl font-bold text-[var(--text)]">Projekt-Einstellungen</h1>
		{#if project}
			<p class="text-[var(--text-muted)] mt-1">Einstellungen für: <code class="text-[var(--primary)]">{project.slug}</code></p>
		{/if}
	</div>
	
	<!-- Loading -->
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<svg class="animate-spin h-8 w-8 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		</div>
	{:else if project}
		<!-- Form -->
		<div class="card p-6 space-y-6">
			<!-- Basic Info -->
			<div>
				<h2 class="text-lg font-semibold text-[var(--text)] mb-4">Grundinformationen</h2>
				
				<div class="space-y-4">
					<!-- Name -->
					<div>
						<label class="label" for="name">Name *</label>
						<input
							id="name"
							type="text"
							bind:value={name}
							class="input"
						/>
					</div>
					
					<!-- Description -->
					<div>
						<label class="label" for="description">Beschreibung</label>
						<textarea
							id="description"
							bind:value={description}
							class="input min-h-[100px] resize-vertical"
						></textarea>
					</div>
					
					<!-- Slug (Readonly) -->
					<div>
						<label class="label" for="slug">Slug</label>
						<input
							id="slug"
							type="text"
							value={project.slug}
							class="input bg-[var(--border)] cursor-not-allowed"
							disabled
						/>
						<p class="text-xs text-[var(--text-muted)] mt-1">
							Der Slug kann nach dem Erstellen nicht mehr geändert werden.
						</p>
					</div>
				</div>
				
				<!-- Error -->
				{#if error}
					<div class="p-3 bg-[var(--danger)/10] border border-[var(--danger)] rounded-md">
						<p class="text-sm text-[var(--danger)]">{error}</p>
					</div>
				{/if}
				
				<!-- Actions -->
				<div class="flex gap-3 pt-4">
					<button 
						type="button"
						onclick={() => goto('/projects')}
						class="btn btn-ghost"
					>
						Abbrechen
					</button>
					<button 
						type="button"
						onclick={handleSubmit}
						class="btn btn-primary"
					>
						Änderungen speichern
					</button>
				</div>
			</div>
			
			<!-- Danger Zone -->
			<div class="border-t border-[var(--border)] pt-6">
				<h2 class="text-lg font-semibold text-[var(--danger)] mb-4">Gefahrenbereich</h2>
				
				<div class="p-4 bg-[var(--danger)/10] rounded-lg">
					<h3 class="font-medium text-[var(--text)] mb-2">Projekt löschen</h3>
					<p class="text-sm text-[var(--text-muted)] mb-4">
						Dieses Projekt löschen. Alle zugehörigen Daten (Board-Statuses, Tickets, Kommentare, Tasks) werden unwiderruflich gelöscht.
					</p>
					<button 
						type="button"
						onclick={handleDelete}
						disabled={isDeleting}
						class="btn btn-danger flex items-center gap-2"
					>
						{#if isDeleting}
							<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Löschen...
						{:else}
							<Trash2 class="w-4 h-4" />
							Projekt löschen
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
