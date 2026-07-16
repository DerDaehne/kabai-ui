<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, slide } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { Plus, Trash2, Check, X, Bot, Layers } from 'lucide-svelte';
	import type { BoardStatus } from '$lib/types';
	import { accentFor as accent } from '$lib/colors';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import BannerConfirm from '$components/ui/BannerConfirm.svelte';

	export let projectId: number;
	export let onClose: () => void = () => {};

	let statuses: BoardStatus[] = [];
	let isLoading = true;
	let error = '';
	let savingId: number | null = null;
	let deletingId: number | null = null;
	let editingId: number | null = null;
	let editValues = { display_name: '', position: 0, agent_role_instruction: '' };

	// New status form
	let showNewForm = false;
	let newName = '';
	let newDisplayName = '';
	let newPosition = 0;
	let newInstruction = '';
	let newNameManual = false;
	let isCreating = false;

	$: if (newDisplayName && !newNameManual) {
		newName = newDisplayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
	}

	async function fetchStatuses() {
		try {
			isLoading = true;
			const res = await fetch(`/api/projects/${projectId}/statuses`);
			const result = await res.json();
			if (result.ok) statuses = result.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
			else error = result.error || 'Fehler beim Laden';
		} catch { error = 'Netzwerkfehler'; }
		finally { isLoading = false; }
	}

	function startEdit(s: BoardStatus) {
		editingId = s.id;
		editValues = { display_name: s.display_name, position: s.position, agent_role_instruction: s.agent_role_instruction || '' };
	}
	function cancelEdit() { editingId = null; }

	async function saveEdit(id: number) {
		savingId = id;
		try {
			const res = await fetch(`/api/projects/${projectId}/statuses/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ display_name: editValues.display_name, position: editValues.position, agent_role_instruction: editValues.agent_role_instruction || null })
			});
			const result = await res.json();
			if (result.ok) {
				statuses = statuses.map(s => s.id === id ? result.data : s).sort((a, b) => a.position - b.position);
				editingId = null;
			} else error = result.error || 'Fehler';
		} catch { error = 'Netzwerkfehler'; }
		finally { savingId = null; }
	}

	// Ticket #508: window.confirm ersetzt durch das Band-Popup (BannerConfirm).
	let pendingDeleteId: number | null = null;
	let pendingDeleteName = '';

	function handleDelete(id: number, name: string) {
		pendingDeleteId = id;
		pendingDeleteName = name;
	}

	function cancelDeleteStatus() {
		pendingDeleteId = null;
		pendingDeleteName = '';
	}

	async function confirmDeleteStatus() {
		if (pendingDeleteId === null || deletingId !== null) return;
		const id = pendingDeleteId;
		pendingDeleteId = null;
		pendingDeleteName = '';
		deletingId = id;
		try {
			const res = await fetch(`/api/projects/${projectId}/statuses/${id}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) { statuses = statuses.filter(s => s.id !== id); if (editingId === id) editingId = null; }
			else error = result.error || 'Fehler beim Löschen';
		} catch { error = 'Netzwerkfehler'; }
		finally { deletingId = null; }
	}

	async function createStatus() {
		if (!newDisplayName || !newName) return;
		isCreating = true;
		try {
			const res = await fetch(`/api/projects/${projectId}/statuses`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName, display_name: newDisplayName, position: newPosition, agent_role_instruction: newInstruction || null })
			});
			const result = await res.json();
			if (result.ok) {
				statuses = [...statuses, result.data].sort((a, b) => a.position - b.position);
				newName = ''; newDisplayName = ''; newPosition = statuses.length; newInstruction = ''; newNameManual = false;
				showNewForm = false;
			} else error = result.error || 'Fehler beim Erstellen';
		} catch { error = 'Netzwerkfehler'; }
		finally { isCreating = false; }
	}

	onMount(fetchStatuses);
</script>

<div class="p-6 pr-14 max-h-[80vh] overflow-y-auto">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div class="flex items-center gap-3">
			<div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);">
				<Layers class="w-5 h-5" style="color: var(--primary);" />
			</div>
			<div>
				<h2 class="text-lg font-bold" style="color: var(--text);">Board-Statuses</h2>
				<p class="text-xs" style="color: var(--text-muted);">{statuses.length} Status{statuses.length !== 1 ? 'e' : ''}</p>
			</div>
		</div>
		<button onclick={() => { showNewForm = !showNewForm; }}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
			style="background: {showNewForm ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'var(--border)'}; color: {showNewForm ? 'var(--primary)' : 'var(--text-muted)'}; border: 1px solid {showNewForm ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)' : 'transparent'};">
			<Plus class="w-4 h-4" /> Neu
		</button>
	</div>

	{#if error}
		<div class="mb-4">
			<ErrorBanner message={error} compact />
		</div>
	{/if}

	<!-- New Status Form -->
	{#if showNewForm}
		<div transition:slide={{ duration: 260, easing: cubicOut }}
			class="mb-4 p-4 rounded-xl space-y-3"
			style="background: color-mix(in srgb, var(--color-primary) 4%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 25%, transparent);">
			<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--primary);">Neuer Status</p>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-xs font-medium mb-1" style="color: var(--text-muted);">Anzeigename *</label>
					<input type="text" bind:value={newDisplayName} class="input" placeholder="z.B. In Bearbeitung" autofocus />
				</div>
				<div>
					<label class="block text-xs font-medium mb-1" style="color: var(--text-muted);">Code-Name *</label>
					<input type="text" bind:value={newName} oninput={() => newNameManual = true}
						class="input font-mono" placeholder="in_progress" />
				</div>
				<div>
					<label class="block text-xs font-medium mb-1" style="color: var(--text-muted);">Position</label>
					<input type="number" bind:value={newPosition} class="input" min="0" />
				</div>
				<div>
					<label class="block text-xs font-medium mb-1 flex items-center gap-1" style="color: var(--text-muted);">
						<Bot class="w-3 h-3" /> Agent-Instruktion
					</label>
					<input type="text" bind:value={newInstruction} class="input" placeholder="Optional" />
				</div>
			</div>
			<div class="flex justify-end gap-2 pt-1">
				<button onclick={() => showNewForm = false} class="px-3 py-1.5 rounded-lg text-xs transition-all" style="color: var(--text-muted); background: var(--border);">Abbrechen</button>
				<button onclick={createStatus} disabled={isCreating || !newDisplayName || !newName}
					class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
					style="background: var(--primary); color: #000; opacity: {isCreating || !newDisplayName || !newName ? 0.5 : 1};">
					{#if isCreating}<Spinner size={3} color="black" thickness="border-2" />{:else}<Plus class="w-3.5 h-3.5" />{/if}
					Erstellen
				</button>
			</div>
		</div>
	{/if}

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size={8} />
		</div>
	{:else if statuses.length === 0 && !showNewForm}
		<div class="text-center py-12" style="color: var(--text-muted);">
			<p class="mb-3">Noch keine Statuses.</p>
			<button onclick={() => showNewForm = true} class="btn btn-primary">Ersten Status erstellen</button>
		</div>
	{:else}
		<div class="space-y-2">
			{#each statuses as status, i (status.id)}
				{@const ac = accent(i)}
				<div in:fly={{ y: 16, duration: 300, delay: i * 40, easing: quintOut }}
					class="rounded-xl overflow-hidden"
					style="background: var(--card-bg); box-shadow: {editingId === status.id ? `0 0 0 1px ${ac.border}66` : '0 0 0 1px var(--edge)'}; transition: box-shadow var(--duration-base) var(--ease-soft);">
					<div class="flex items-center gap-3 p-3">
						<div class="w-1 self-stretch rounded-full shrink-0" style="background: {ac.border};"></div>
						<div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
							style="background: {ac.glow}; color: {ac.border}; border: 1px solid {ac.border}40;">{status.position}</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="font-semibold text-sm" style="color: var(--text);">{status.display_name}</span>
								<code class="text-xs px-1.5 py-0.5 rounded font-mono" style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border-bright);">{status.name}</code>
							</div>
							{#if status.agent_role_instruction}
								<div class="mt-0.5 flex items-center gap-1 text-xs truncate max-w-xs" style="color: var(--text-muted);">
									<Bot class="w-3 h-3 shrink-0" />{status.agent_role_instruction}
								</div>
							{/if}
						</div>
						<div class="flex items-center gap-1 shrink-0">
							{#if editingId !== status.id}
								<button onclick={() => startEdit(status)}
									class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
									style="color: {ac.border}; background: {ac.glow}; border: 1px solid {ac.border}40;">Bearbeiten</button>
							{:else}
								<button onclick={cancelEdit}
									class="px-2.5 py-1 rounded-lg text-xs transition-all"
									style="color: var(--text-muted); background: var(--border);">Abbrechen</button>
							{/if}
							<button onclick={() => handleDelete(status.id, status.display_name)} disabled={deletingId === status.id}
								class="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
								style="color: var(--text-muted);"
								onmouseenter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
								onmouseleave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
								{#if deletingId === status.id}
									<Spinner size={3} color="currentColor" thickness="border" />
								{:else}<Trash2 class="w-3.5 h-3.5" />{/if}
							</button>
						</div>
					</div>
					{#if editingId === status.id}
						<div class="hairline"></div>
						<div transition:slide={{ duration: 260, easing: cubicOut }}
							class="px-4 pb-4 pt-4 space-y-3">
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label class="block text-xs font-medium mb-1" style="color: var(--text-muted);">Anzeigename</label>
									<input type="text" bind:value={editValues.display_name} class="input" autofocus />
								</div>
								<div>
									<label class="block text-xs font-medium mb-1" style="color: var(--text-muted);">Position</label>
									<input type="number" bind:value={editValues.position} class="input" min="0" />
								</div>
								<div class="col-span-2">
									<label class="block text-xs font-medium mb-1 flex items-center gap-1" style="color: var(--text-muted);">
										<Bot class="w-3 h-3" /> Agent-Instruktion
									</label>
									<textarea bind:value={editValues.agent_role_instruction} class="input resize-none" rows="2" placeholder="Optional…"></textarea>
								</div>
							</div>
							<div class="flex justify-end">
								<button onclick={() => saveEdit(status.id)} disabled={savingId === status.id || !editValues.display_name}
									class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
									style="background: {ac.border}; color: #000; opacity: {savingId === status.id || !editValues.display_name ? 0.5 : 1};">
									{#if savingId === status.id}<Spinner size={3} color="black" thickness="border-2" />{:else}<Check class="w-3.5 h-3.5" />{/if}
									Speichern
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Ticket #508: BannerConfirm statt window.confirm. StatusesModal läuft wie TicketModal
     innerhalb eines SidePanel (z-50 + backdrop-filter auf der Panelfläche) — BannerConfirm
     bringt bereits z-[100] mit und liegt damit klar darüber, keine Anhebung nötig. -->
<BannerConfirm
	open={pendingDeleteId !== null}
	text={`Status „${pendingDeleteName}" löschen?`}
	tone="danger"
	onConfirm={confirmDeleteStatus}
	onCancel={cancelDeleteStatus}
/>
