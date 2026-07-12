<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { ArrowLeft, Check, Layers, Bot } from 'lucide-svelte';
	import type { BoardStatus } from '$lib/types';

	$: id = $page.params.id;
	$: sid = $page.params.sid;

	let status: BoardStatus | null = null;
	let isLoading = true;
	let isSaving = false;
	let error = '';

	let display_name = '';
	let position = 0;
	let agent_role_instruction = '';

	async function fetchStatus() {
		try {
			isLoading = true;
			const res = await fetch(`/api/projects/${id}/statuses/${sid}`);
			const result = await res.json();
			if (result.ok) {
				status = result.data;
				display_name = status!.display_name;
				position = status!.position;
				agent_role_instruction = status!.agent_role_instruction || '';
			} else {
				error = result.error || 'Status nicht gefunden';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!display_name.trim()) { error = 'Anzeigename ist erforderlich'; return; }
		isSaving = true;
		error = '';
		try {
			const res = await fetch(`/api/projects/${id}/statuses/${sid}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					display_name: display_name.trim(),
					position,
					agent_role_instruction: agent_role_instruction || null
				})
			});
			const result = await res.json();
			if (result.ok) {
				goto(`/projects/${id}/statuses?success=Status+gespeichert`);
			} else {
				error = result.error || 'Fehler beim Speichern';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isSaving = false;
		}
	}

	onMount(fetchStatus);
</script>

<div class="w-full max-w-2xl">
	<!-- Back -->
	<button
		onclick={() => goto(`/projects/${id}/statuses`)}
		class="inline-flex items-center gap-2 mb-6 text-sm transition-all duration-200 group"
		style="color: var(--text-muted);"
		in:fly={{ y: -12, duration: 300, easing: quintOut }}
	>
		<ArrowLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
		Zurück zu Statuses
	</button>

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<div class="relative w-10 h-10">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary);"></div>
			</div>
		</div>

	{:else if !status}
		<div class="p-6 rounded-xl border text-center" style="border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.06);">
			<p style="color: var(--danger);">{error || 'Status nicht gefunden'}</p>
			<button onclick={() => goto(`/projects/${id}/statuses`)} class="btn btn-ghost mt-4">Zurück</button>
		</div>

	{:else}
		<div in:fly={{ y: 20, duration: 400, easing: quintOut }}>
			<!-- Header -->
			<div class="flex items-center gap-3 mb-8">
				<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
					style="background: rgba(0,217,255,0.12); border: 1px solid rgba(0,217,255,0.3);">
					<Layers class="w-5 h-5" style="color: var(--primary);" />
				</div>
				<div>
					<h1 class="text-2xl font-bold tracking-tight" style="color: var(--text);">Status bearbeiten</h1>
					<code class="text-sm font-mono" style="color: var(--text-muted);">{status.name}</code>
				</div>
			</div>

			<!-- Form Card -->
			<div class="rounded-2xl p-6 space-y-5" style="background: var(--card-bg); border: 1px solid var(--border); box-shadow: 0 0 40px rgba(0,0,0,0.3);">
				<form onsubmit={handleSubmit} class="space-y-5">
					<!-- Display Name -->
					<div>
						<label class="block text-sm font-medium mb-2" style="color: var(--text);">
							Anzeigename <span style="color: var(--danger);">*</span>
						</label>
						<input
							type="text"
							bind:value={display_name}
							class="input"
							placeholder="z.B. In Bearbeitung"
							required
							autofocus
						/>
					</div>

					<!-- Code Name (readonly) -->
					<div>
						<label class="block text-sm font-medium mb-2" style="color: var(--text-muted);">
							Code-Name <span class="text-xs opacity-60">(nicht änderbar)</span>
						</label>
						<input
							type="text"
							value={status.name}
							class="input font-mono opacity-50 cursor-not-allowed"
							disabled
						/>
					</div>

					<!-- Position -->
					<div>
						<label class="block text-sm font-medium mb-2" style="color: var(--text);">
							Position
						</label>
						<input
							type="number"
							bind:value={position}
							class="input"
							min="0"
						/>
						<p class="mt-1 text-xs" style="color: var(--text-muted);">Bestimmt die Reihenfolge der Spalten im Board.</p>
					</div>

					<!-- Agent Instruction -->
					<div>
						<label class="block text-sm font-medium mb-2 flex items-center gap-2" style="color: var(--text);">
							<Bot class="w-4 h-4" style="color: var(--accent);" />
							Agent-Instruktion
							<span class="text-xs" style="color: var(--text-muted);">(optional)</span>
						</label>
						<textarea
							bind:value={agent_role_instruction}
							class="input resize-none"
							rows="4"
							placeholder="Beschreiben Sie, welche Rolle der Agent in diesem Status hat…"
						></textarea>
					</div>

					<!-- Error -->
					{#if error}
						<div class="p-3 rounded-lg border text-sm" style="background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.4); color: var(--danger);" in:fly={{ y: 6, duration: 200 }}>
							{error}
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex gap-3 pt-2">
						<button
							type="button"
							onclick={() => goto(`/projects/${id}/statuses`)}
							class="btn btn-ghost"
						>
							Abbrechen
						</button>
						<button
							type="submit"
							disabled={isSaving || !display_name.trim()}
							class="btn btn-primary flex items-center gap-2 flex-1 justify-center"
						>
							{#if isSaving}
								<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
								Speichern…
							{:else}
								<Check class="w-4 h-4" />
								Änderungen speichern
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
