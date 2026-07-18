<script lang="ts">
	// Ticket #526: Formular für ein neues Canvas, läuft im BottomSheet — nach
	// dem Muster von NewProjectSheet.svelte (#506). Anders als Projects hat
	// Canvas keinen Slug (V12__Canvas_Schema.sql kennt nur name), dafür eine
	// Checkbox-Liste bestehender Projekte zum optionalen Sofort-Verknüpfen.
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { Plus } from 'lucide-svelte';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import FormField from '$components/ui/FormField.svelte';
	import type { Project } from '$lib/types';

	export let onCreated: (canvas: { id: number }) => void = () => {};
	export let onCancel: () => void = () => {};

	let name = '';
	let error = '';
	let isLoading = false;

	let projects: Project[] = [];
	let projectsLoading = true;
	let selectedProjectIds = new Set<number>();

	const schema = z.object({
		name: z.string().min(1, 'Name ist erforderlich')
	});

	async function loadProjects() {
		try {
			projectsLoading = true;
			const res = await fetch('/api/projects');
			const result = await res.json();
			if (result.ok) projects = result.data;
		} catch {
			// Projekt-Checkbox-Liste ist optional — ein Fehler hier blockiert
			// das Anlegen des Canvas selbst nicht.
		} finally {
			projectsLoading = false;
		}
	}

	onMount(loadProjects);

	function toggleProject(id: number) {
		if (selectedProjectIds.has(id)) selectedProjectIds.delete(id);
		else selectedProjectIds.add(id);
		selectedProjectIds = selectedProjectIds;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		const v = schema.safeParse({ name });
		if (!v.success) {
			error = v.error.errors[0].message;
			return;
		}
		error = '';
		isLoading = true;
		try {
			const res = await fetch('/api/canvases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, project_ids: [...selectedProjectIds] })
			});
			const result = await res.json();
			if (!result.ok) {
				error = result.error || 'Fehler beim Erstellen';
				return;
			}
			onCreated(result.data);
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-5">
	<FormField label="Name" required>
		<input type="text" bind:value={name} class="input" placeholder="z.B. Roadmap Q3" autofocus required />
	</FormField>

	<div>
		<label class="block text-sm font-medium mb-2" style="color: var(--text);">
			Projekte verknüpfen <span class="text-xs" style="color: var(--text-muted);">(optional)</span>
		</label>
		{#if projectsLoading}
			<div class="flex items-center gap-2 py-2">
				<Spinner size={4} />
			</div>
		{:else if projects.length === 0}
			<p class="text-sm" style="color: var(--text-muted);">Keine Projekte vorhanden.</p>
		{:else}
			<div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
				{#each projects as project (project.id)}
					<label class="flex items-center gap-3 py-1 px-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface-hover)]">
						<input
							type="checkbox"
							checked={selectedProjectIds.has(project.id)}
							onchange={() => toggleProject(project.id)}
							class="w-4 h-4 rounded shrink-0"
							style="accent-color: var(--primary);"
						/>
						<span class="text-sm truncate" style="color: var(--text);">{project.name}</span>
					</label>
				{/each}
			</div>
		{/if}
	</div>

	{#if error}
		<ErrorBanner message={error} compact />
	{/if}

	<div class="flex gap-3 pt-2">
		<button type="button" onclick={onCancel} class="btn btn-ghost">Abbrechen</button>
		<button type="submit" disabled={isLoading || !name} class="btn btn-primary flex items-center gap-2 flex-1 justify-center">
			{#if isLoading}
				<Spinner size={4} color="black" thickness="border-2" />
				Erstellen…
			{:else}
				<Plus class="w-4 h-4" /> Canvas erstellen
			{/if}
		</button>
	</div>
</form>
