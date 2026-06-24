<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly, slide, fade } from 'svelte/transition';
	import { cubicOut, quintOut } from 'svelte/easing';
	import { Plus, ArrowLeft, Trash2, Check, X, Layers, Bot } from 'lucide-svelte';
	import type { BoardStatus } from '$lib/types';

	let statuses: BoardStatus[] = [];
	let isLoading = true;
	let error = '';
	let savingId: number | null = null;
	let deletingId: number | null = null;

	// Inline edit state
	let editingId: number | null = null;
	let editValues = { display_name: '', position: 0, agent_role_instruction: '' };

	$: id = $page.params.id;

	const accentColors = [
		{ border: '#00d4ff', glow: 'rgba(0,212,255,0.15)' },
		{ border: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
		{ border: '#00ff87', glow: 'rgba(0,255,135,0.15)' },
		{ border: '#ffd000', glow: 'rgba(255,208,0,0.15)' },
		{ border: '#ff2255', glow: 'rgba(255,34,85,0.15)' },
	];

	function accentFor(i: number) {
		return accentColors[i % accentColors.length];
	}

	async function fetchStatuses() {
		try {
			isLoading = true;
			const res = await fetch(`/api/projects/${id}/statuses`);
			const result = await res.json();
			if (result.ok) {
				statuses = result.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
			} else {
				error = result.error || 'Fehler beim Laden der Statuses';
			}
		} catch {
			error = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
		} finally {
			isLoading = false;
		}
	}

	function startEdit(status: BoardStatus) {
		editingId = status.id;
		editValues = {
			display_name: status.display_name,
			position: status.position,
			agent_role_instruction: status.agent_role_instruction || ''
		};
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit(statusId: number) {
		savingId = statusId;
		try {
			const res = await fetch(`/api/projects/${id}/statuses/${statusId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					display_name: editValues.display_name,
					position: editValues.position,
					agent_role_instruction: editValues.agent_role_instruction || null
				})
			});
			const result = await res.json();
			if (result.ok) {
				statuses = statuses.map(s => s.id === statusId ? result.data : s)
					.sort((a, b) => a.position - b.position);
				editingId = null;
			} else {
				error = result.error || 'Fehler beim Speichern';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			savingId = null;
		}
	}

	async function handleDelete(statusId: number, name: string) {
		if (!confirm(`Status "${name}" wirklich löschen?`)) return;
		deletingId = statusId;
		try {
			const res = await fetch(`/api/projects/${id}/statuses/${statusId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) {
				statuses = statuses.filter(s => s.id !== statusId);
				if (editingId === statusId) editingId = null;
			} else {
				error = result.error || 'Fehler beim Löschen';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			deletingId = null;
		}
	}

	onMount(fetchStatuses);
</script>

<div class="w-full">
	<!-- Header -->
	<div class="mb-8" in:fly={{ y: -16, duration: 400, easing: quintOut }}>
		<button
			onclick={() => goto(`/projects/${id}`)}
			class="inline-flex items-center gap-2 mb-5 text-sm transition-all duration-200 group"
			style="color: var(--text-muted);"
		>
			<ArrowLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
			Zurück zum Board
		</button>

		<div class="flex items-end justify-between gap-4">
			<div>
				<div class="flex items-center gap-3 mb-1">
					<div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: rgba(0,212,255,0.12); border: 1px solid rgba(0,212,255,0.3);">
						<Layers class="w-5 h-5" style="color: var(--primary);" />
					</div>
					<h1 class="text-3xl font-bold tracking-tight" style="color: var(--text);">Board-Statuses</h1>
				</div>
				<p class="ml-12 text-sm" style="color: var(--text-muted);">
					{statuses.length} Status{statuses.length !== 1 ? 'e' : ''} · Klicken zum inline Bearbeiten
				</p>
			</div>

			<button
				onclick={() => goto(`/projects/${id}/statuses/new`)}
				class="btn btn-primary flex items-center gap-2 shrink-0"
			>
				<Plus class="w-4 h-4" />
				Neuer Status
			</button>
		</div>
	</div>

	<!-- Error -->
	{#if error}
		<div
			class="mb-6 p-4 rounded-xl border flex items-start gap-3"
			style="background: rgba(255,34,85,0.08); border-color: rgba(255,34,85,0.4);"
			in:fly={{ y: 8, duration: 300 }}
		>
			<X class="w-5 h-5 shrink-0 mt-0.5" style="color: var(--danger);" />
			<p style="color: var(--danger);">{error}</p>
		</div>
	{/if}

	<!-- Loading -->
	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<div class="relative w-12 h-12">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary); box-shadow: 0 0 16px var(--primary-glow);"></div>
			</div>
			<p class="text-sm" style="color: var(--text-muted);">Lade Statuses…</p>
		</div>

	{:else if statuses.length === 0}
		<div
			class="flex flex-col items-center justify-center py-24 rounded-2xl border"
			style="border-color: var(--border); background: var(--card-bg);"
			in:fade={{ duration: 300 }}
		>
			<div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
				style="background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2);">
				<Layers class="w-8 h-8" style="color: var(--text-muted);" />
			</div>
			<h3 class="text-lg font-semibold mb-2" style="color: var(--text);">Noch keine Statuses</h3>
			<p class="mb-6 text-sm text-center max-w-xs" style="color: var(--text-muted);">
				Erstellen Sie Statuses, um die Spalten Ihres Kanban-Boards zu definieren.
			</p>
			<button onclick={() => goto(`/projects/${id}/statuses/new`)} class="btn btn-primary">
				Ersten Status erstellen
			</button>
		</div>

	{:else}
		<div class="space-y-3">
			{#each statuses as status, i (status.id)}
				{@const accent = accentFor(i)}
				<div
					in:fly={{ y: 24, duration: 400, delay: i * 60, easing: quintOut }}
					class="rounded-xl overflow-hidden transition-all duration-300"
					style="border: 1px solid {editingId === status.id ? accent.border : 'var(--border)'}; background: var(--card-bg); box-shadow: {editingId === status.id ? `0 0 20px ${accent.glow}, 0 4px 24px rgba(0,0,0,0.3)` : '0 2px 12px rgba(0,0,0,0.2)'};"
				>
					<!-- Status Row -->
					<div class="flex items-center gap-4 p-4">
						<!-- Left accent bar -->
						<div class="w-1 self-stretch rounded-full shrink-0" style="background: {accent.border}; box-shadow: 0 0 8px {accent.border};"></div>

						<!-- Position badge -->
						<div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
							style="background: {accent.glow}; color: {accent.border}; border: 1px solid {accent.border}40;">
							{status.position}
						</div>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="font-semibold" style="color: var(--text);">{status.display_name}</span>
								<code class="px-2 py-0.5 rounded-md text-xs font-mono" style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border-bright);">{status.name}</code>
							</div>
							{#if status.agent_role_instruction}
								<div class="mt-1 flex items-center gap-1.5 text-xs" style="color: var(--text-muted);">
									<Bot class="w-3 h-3 shrink-0" />
									<span class="truncate max-w-xs">{status.agent_role_instruction}</span>
								</div>
							{/if}
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-1 shrink-0">
							{#if editingId !== status.id}
								<button
									onclick={() => startEdit(status)}
									class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
									style="color: {accent.border}; background: {accent.glow}; border: 1px solid {accent.border}40;"
								>
									Bearbeiten
								</button>
							{:else}
								<button
									onclick={cancelEdit}
									class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
									style="color: var(--text-muted); background: var(--border); border: 1px solid var(--border-bright);"
								>
									Abbrechen
								</button>
							{/if}
							<button
								onclick={() => handleDelete(status.id, status.display_name)}
								disabled={deletingId === status.id}
								class="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
								style="color: var(--text-muted);"
								onmouseenter={(e) => e.currentTarget.style.cssText += 'color: var(--danger); background: rgba(255,34,85,0.12);'}
								onmouseleave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
								title="Löschen"
							>
								{#if deletingId === status.id}
									<div class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin"></div>
								{:else}
									<Trash2 class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<!-- Inline Edit Form -->
					{#if editingId === status.id}
						<div
							transition:slide={{ duration: 300, easing: cubicOut }}
							class="px-5 pb-5 pt-1"
							style="border-top: 1px solid {accent.border}30;"
						>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
								<!-- Display Name -->
								<div>
									<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">
										Anzeigename
									</label>
									<input
										type="text"
										bind:value={editValues.display_name}
										class="input"
										placeholder="z.B. In Bearbeitung"
										autofocus
									/>
								</div>

								<!-- Position -->
								<div>
									<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">
										Position (Reihenfolge im Board)
									</label>
									<input
										type="number"
										bind:value={editValues.position}
										class="input"
										min="0"
									/>
								</div>

								<!-- Agent Instruction (full width) -->
								<div class="md:col-span-2">
									<label class="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style="color: var(--text-muted);">
										<Bot class="w-3.5 h-3.5" />
										Agent-Instruktion
										<span class="opacity-50">(optional)</span>
									</label>
									<textarea
										bind:value={editValues.agent_role_instruction}
										class="input resize-none"
										rows="3"
										placeholder="Beschreiben Sie, welche Rolle der Agent in diesem Status hat…"
									></textarea>
								</div>
							</div>

							<!-- Save Row -->
							<div class="flex justify-end">
								<button
									onclick={() => saveEdit(status.id)}
									disabled={savingId === status.id || !editValues.display_name}
									class="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
									style="background: {accent.border}; color: #000; box-shadow: 0 0 16px {accent.glow}; opacity: {(savingId === status.id || !editValues.display_name) ? 0.5 : 1}; cursor: {(savingId === status.id || !editValues.display_name) ? 'not-allowed' : 'pointer'};"
								>
									{#if savingId === status.id}
										<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
										Speichern…
									{:else}
										<Check class="w-4 h-4" />
										Speichern
									{/if}
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<p class="mt-6 text-xs text-center" style="color: var(--border-bright);">
			{statuses.length} Status{statuses.length !== 1 ? 'e' : ''} · Drag & Drop-Sortierung folgt in einer späteren Version
		</p>
	{/if}
</div>
