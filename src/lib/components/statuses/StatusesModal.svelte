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
	import BottomSheet from '$components/ui/BottomSheet.svelte';
	import NewStatusSheet from '$components/statuses/NewStatusSheet.svelte';

	export let projectId: number;
	export let onClose: () => void = () => {};
	// Ticket #509: host-agnostisch — im SidePanel begrenzt/scrollt der Host das Panel;
	// als Vollseiten-Deep-Link (src/routes/projects/[id]/statuses/+page.svelte) braucht
	// es keine feste max-Höhe/Scroll-Kapselung und keinen Platz für den Panel-Close-Button.
	export let standalone = false;

	let statuses: BoardStatus[] = [];
	let isLoading = true;
	let error = '';
	let savingId: number | null = null;
	let deletingId: number | null = null;
	let editingId: number | null = null;
	let editValues = { display_name: '', position: 0, agent_role_instruction: '' };

	// Ticket #509: "Neuer Status" nutzt jetzt einheitlich das BottomSheet aus #506
	// (vormals hatte diese Komponente ein eigenes, einfacheres Inline-Formular;
	// die Vollseiten-Route src/routes/projects/[id]/statuses/+page.svelte hatte
	// bereits den BottomSheet-Trigger). Damit hat auch das SidePanel den Trigger.
	let showNewStatus = false;

	function openNewStatusSheet() {
		showNewStatus = true;
	}

	function closeNewStatusSheet() {
		showNewStatus = false;
	}

	async function handleStatusCreated(_status: { id: number }) {
		closeNewStatusSheet();
		await fetchStatuses();
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

	onMount(fetchStatuses);
</script>

<div class={standalone ? '' : 'p-6 pr-14 max-h-[80vh] overflow-y-auto'}>
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
		<button onclick={openNewStatusSheet}
			class="btn btn-primary flex items-center gap-2 px-3 py-1.5 text-sm">
			<Plus class="w-4 h-4" /> Neu
		</button>
	</div>

	{#if error}
		<div class="mb-4">
			<ErrorBanner message={error} compact />
		</div>
	{/if}

	{#if isLoading}
		<div class="flex justify-center py-12">
			<Spinner size={8} />
		</div>
	{:else if statuses.length === 0}
		<div class="text-center py-12" style="color: var(--text-muted);">
			<p class="mb-3">Noch keine Statuses.</p>
			<button onclick={openNewStatusSheet} class="btn btn-primary">Ersten Status erstellen</button>
		</div>
	{:else}
		<div class="space-y-2">
			{#each statuses as status, i (status.id)}
				{@const ac = accent(i)}
				<div in:fly={{ y: 16, duration: 300, delay: i * 40, easing: quintOut }}
					class="rounded-xl overflow-hidden"
					style="background: var(--card-bg); border: 1px solid {editingId === status.id ? `color-mix(in srgb, ${ac.border} 40%, transparent)` : 'var(--edge)'}; transition: border-color var(--duration-base) var(--ease-soft);">
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
									class="btn-subtle px-2.5 py-1 text-xs font-medium">Bearbeiten</button>
							{:else}
								<button onclick={cancelEdit}
									class="btn-ghost px-2.5 py-1 text-xs">Abbrechen</button>
							{/if}
							<button onclick={() => handleDelete(status.id, status.display_name)} disabled={deletingId === status.id}
								class="status-delete-btn w-7 h-7 rounded-lg flex items-center justify-center transition-all">
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
									class="btn-subtle flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold"
									style="color: {ac.border};">
									{#if savingId === status.id}<Spinner size={3} color="currentColor" thickness="border-2" />{:else}<Check class="w-3.5 h-3.5" />{/if}
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

<!-- Ticket #509: BottomSheet-Trigger aus #506 (vormals nur in der Vollseiten-Route)
     wandert mit ins Modal, damit auch der SidePanel-Weg ihn hat. -->
<BottomSheet open={showNewStatus} title="Neuer Status" onClose={closeNewStatusSheet}>
	<NewStatusSheet projectId={String(projectId)} onCreated={handleStatusCreated} onCancel={closeNewStatusSheet} />
</BottomSheet>

<style>
	/* Ticket #511: JS onmouseenter/onmouseleave durch CSS-:hover ersetzt. */
	.status-delete-btn {
		color: var(--text-muted);
		background: transparent;
	}

	.status-delete-btn:hover:not(:disabled) {
		color: var(--danger);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
	}
</style>
