<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { SvelteFlow, Background, Controls, addEdge, MarkerType } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { Network, Trash2, ArrowRight } from 'lucide-svelte';
	import type { BoardStatus, StatusTransition } from '$lib/types';
	import type { Node, Edge, Connection } from '@xyflow/svelte';

	export let projectId: number;
	export let onClose: () => void = () => {};

	let isLoading = true;
	let error = '';
	let statuses: BoardStatus[] = [];
	let transitionMeta: Array<{ fromId: number; toId: number; fromName: string; toName: string }> = [];
	let deletingKey = '';

	const nodes = writable<Node[]>([]);
	const edges = writable<Edge[]>([]);

	function statusName(id: number) {
		return statuses.find(s => s.id === id)?.display_name || String(id);
	}

	function buildNodes(ss: BoardStatus[]): Node[] {
		const cols = Math.max(1, Math.ceil(Math.sqrt(ss.length)));
		return ss.map((s, i) => ({
			id: String(s.id),
			data: { label: s.display_name },
			position: { x: 200 * (i % cols), y: 120 * Math.floor(i / cols) },
			type: 'default',
			style: 'background: #0d0d1a; border: 1px solid #00d9ff40; color: #e2e8ff; border-radius: 8px; font-weight: 600; font-size: 13px;'
		}));
	}

	function buildEdge(fromId: number, toId: number): Edge {
		return {
			id: `${fromId}-${toId}`,
			source: String(fromId),
			target: String(toId),
			markerEnd: { type: MarkerType.ArrowClosed, color: '#00d9ff' },
			style: 'stroke: #00d9ff; stroke-width: 2;'
		};
	}

	async function fetchData() {
		try {
			isLoading = true;
			const [sr, tr] = await Promise.all([
				fetch(`/api/projects/${projectId}/statuses`).then(r => r.json()),
				fetch(`/api/projects/${projectId}/transitions`).then(r => r.json())
			]);
			if (!sr.ok) { error = sr.error || 'Fehler beim Laden'; return; }
			statuses = sr.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
			nodes.set(buildNodes(statuses));
			const trans: StatusTransition[] = tr.ok ? tr.data : [];
			edges.set(trans.map(t => buildEdge(t.from_status_id, t.to_status_id)));
			transitionMeta = trans.map(t => ({ fromId: t.from_status_id, toId: t.to_status_id, fromName: statusName(t.from_status_id), toName: statusName(t.to_status_id) }));
		} catch { error = 'Netzwerkfehler'; }
		finally { isLoading = false; }
	}

	async function onconnect(connection: Connection) {
		const fromId = parseInt(connection.source);
		const toId = parseInt(connection.target);
		if (fromId === toId) return;
		if (transitionMeta.some(t => t.fromId === fromId && t.toId === toId)) return;
		try {
			const res = await fetch(`/api/projects/${projectId}/transitions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ from_status_id: fromId, to_status_id: toId })
			});
			const result = await res.json();
			if (result.ok) {
				edges.update(eds => addEdge({ ...connection, ...buildEdge(fromId, toId) }, eds));
				transitionMeta = [...transitionMeta, { fromId, toId, fromName: statusName(fromId), toName: statusName(toId) }];
			}
		} catch {}
	}

	async function deleteTransition(fromId: number, toId: number) {
		const key = `${fromId}-${toId}`;
		deletingKey = key;
		try {
			const res = await fetch(`/api/projects/${projectId}/transitions/${fromId}/${toId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) {
				edges.update(eds => eds.filter(e => e.id !== key));
				transitionMeta = transitionMeta.filter(t => !(t.fromId === fromId && t.toId === toId));
			} else error = result.error || 'Fehler beim Löschen';
		} catch { error = 'Netzwerkfehler'; }
		finally { deletingKey = ''; }
	}

	async function ondelete({ edges: deleted }: { edges: Edge[]; nodes: Node[] }) {
		for (const edge of deleted) {
			const parts = edge.id.split('-');
			if (parts.length === 2) {
				const fromId = parseInt(parts[0]);
				const toId = parseInt(parts[1]);
				if (!isNaN(fromId) && !isNaN(toId)) {
					await fetch(`/api/projects/${projectId}/transitions/${fromId}/${toId}`, { method: 'DELETE' });
					transitionMeta = transitionMeta.filter(t => !(t.fromId === fromId && t.toId === toId));
				}
			}
		}
	}

	onMount(fetchData);
</script>

<div class="p-6 pr-14">
	<!-- Header -->
	<div class="flex items-center gap-3 mb-5">
		<div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.3);">
			<Network class="w-5 h-5" style="color: var(--accent);" />
		</div>
		<div>
			<h2 class="text-lg font-bold" style="color: var(--text);">Workflow-Editor</h2>
			<p class="text-xs" style="color: var(--text-muted);">Nodes verbinden = Transition anlegen · Kante wählen + Entf = löschen</p>
		</div>
	</div>

	{#if error}
		<div class="mb-4 p-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); color: var(--danger);">{error}</div>
	{/if}

	{#if isLoading}
		<div class="flex justify-center py-16">
			<div class="relative w-8 h-8">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style="border-top-color: var(--accent);"></div>
			</div>
		</div>
	{:else if statuses.length === 0}
		<p class="text-center py-12 text-sm" style="color: var(--text-muted);">Keine Statuses gefunden.</p>
	{:else}
		<!-- Graph -->
		<div class="rounded-xl overflow-hidden mb-5" style="height: 360px; border: 1px solid var(--border);">
			<SvelteFlow
				{nodes}
				{edges}
				{onconnect}
				{ondelete}
				deleteKey={['Delete', 'Backspace']}
				fitView
				style="background: #03030c;"
			>
				<Background style="color: #1a1a30;" />
				<Controls style="background: #0d0d1a; border-color: #2e2e5a;" />
			</SvelteFlow>
		</div>

		<!-- Transition list with explicit delete buttons -->
		<div>
			<h3 class="text-xs font-semibold uppercase tracking-wider mb-3" style="color: var(--text-muted);">
				Definierte Transitions ({transitionMeta.length})
			</h3>
			{#if transitionMeta.length === 0}
				<p class="text-sm text-center py-4" style="color: var(--text-muted);">Noch keine Transitions. Verbinden Sie Nodes im Graph.</p>
			{:else}
				<div class="space-y-1.5 max-h-48 overflow-y-auto">
					{#each transitionMeta as t, i (t.fromId + '-' + t.toId)}
						{@const key = `${t.fromId}-${t.toId}`}
						<div in:fly={{ x: -12, duration: 200, delay: i * 30, easing: quintOut }}
							class="flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150"
							style="background: var(--border);"
							onmouseenter={(e) => e.currentTarget.style.background = 'var(--border-bright)'}
							onmouseleave={(e) => e.currentTarget.style.background = 'var(--border)'}>
							<div class="flex items-center gap-2 text-sm">
								<span class="font-medium" style="color: var(--primary);">{t.fromName}</span>
								<ArrowRight class="w-3.5 h-3.5 shrink-0" style="color: var(--text-muted);" />
								<span class="font-medium" style="color: var(--accent);">{t.toName}</span>
							</div>
							<button
								onclick={() => deleteTransition(t.fromId, t.toId)}
								disabled={deletingKey === key}
								class="w-6 h-6 rounded-md flex items-center justify-center transition-all"
								style="color: var(--text-muted);"
								onmouseenter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
								onmouseleave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
								title="Transition löschen">
								{#if deletingKey === key}
									<div class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
								{:else}<Trash2 class="w-3.5 h-3.5" />{/if}
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
