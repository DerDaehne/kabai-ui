<script lang="ts">
	import { goto } from '$app/navigation';
	import { z } from 'zod';
	
	// Form State
	let name = '';
	let slug = '';
	let description = '';
	let error = '';
	let isLoading = false;
	
	// Validierung
	const createProjectSchema = z.object({
		name: z.string().min(1, 'Name ist erforderlich'),
		slug: z.string()
			.min(1, 'Slug ist erforderlich')
			.regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
		description: z.string().optional()
	});
	
	// Slug automatisch aus Name generieren
	$: if (name && !slug) {
		slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
	}
	
	async function handleSubmit(event: Event) {
		event.preventDefault();
		try {
			// Validierung
			const validation = createProjectSchema.safeParse({
				name,
				slug,
				description
			});
			
			if (!validation.success) {
				error = validation.error.errors[0].message;
				return;
			}
			
			error = '';
			isLoading = true;
			
			const response = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, slug, description })
			});
			
			const result = await response.json();
			
			if (!result.ok) {
				error = result.error || 'Fehler beim Erstellen des Projekts';
				isLoading = false;
				return;
			}
			
			// Erfolgreich - zu Projekten weiterleiten
			goto('/projects?success=Projekt+erfolgreich+erstellt');
		} catch (err) {
			error = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
			console.error('Create project error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	function handleCancel() {
		goto('/projects');
	}
</script>

<div class="max-w-2xl">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-[var(--text)]">Neues Projekt</h1>
		<p class="text-[var(--text-muted)] mt-1">Erstellen Sie ein neues Kanban-Board</p>
	</div>
	
	<!-- Form -->
	<div class="card p-6">
		<form onsubmit={handleSubmit} class="space-y-4">
			<!-- Name -->
			<div>
				<label class="label" for="name">Name *</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					class="input"
					placeholder="z.B. Website-Relaunch, Produktentwicklung"
					required
				/>
			</div>
			
			<!-- Slug -->
			<div>
				<label class="label" for="slug">Slug *</label>
				<div class="flex gap-2">
					<input
						id="slug"
						type="text"
						bind:value={slug}
						class="input flex-1"
						placeholder="z.B. website-relaunch, produktentwicklung"
						required
					/>
				</div>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Nur Kleinbuchstaben, Zahlen und Bindestriche. Wird automatisch aus dem Namen generiert.
				</p>
			</div>
			
			<!-- Description -->
			<div>
				<label class="label" for="description">Beschreibung</label>
				<textarea
					id="description"
					bind:value={description}
					class="input min-h-[100px] resize-vertical"
					placeholder="Beschreiben Sie das Projekt..."
				></textarea>
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
					onclick={handleCancel}
					class="btn btn-ghost"
				>
					Abbrechen
				</button>
				<button
					type="submit"
					class="btn btn-primary flex-1"
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="flex items-center justify-center gap-2">
							<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Projekt erstellen...
						</span>
					{:else}
						Projekt erstellen
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
