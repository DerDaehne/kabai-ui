<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { SvelteFlow, Background, Controls, addEdge, MarkerType } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { Network, Trash2, ArrowRight } from 'lucide-svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import ErrorBanner from '$lib/components/ui/ErrorBanner.svelte';
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
			style: 'background: var(--color-surface); border: 1px solid var(--edge-strong); color: var(--color-text); border-radius: 8px; font-weight: 600; font-size: 13px;'
		}));
	}

	function buildEdge(fromId: number, toId: number): Edge {
		return {
			id: `${fromId}-${toId}`,
			source: String(fromId),
			target: String(toId),
			markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-text-secondary)' },
			style: 'stroke: var(--color-text-secondary); stroke-width: 2;'
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
		<div class="mb-4">
			<ErrorBanner message={error} compact />
		</div>
	{/if}

	{#if isLoading}
		<div class="flex justify-center py-16">
			<Spinner size={8} />
		</div>
	{:else if statuses.length === 0}
		<p class="text-center py-12 text-sm" style="color: var(--text-muted);">Keine Statuses gefunden.</p>
	{:else}
		<!-- Graph -->
		<div class="workflow-graph rounded-xl overflow-hidden mb-5" style="height: 360px; box-shadow: inset 0 0 0 1px var(--edge);">
			<SvelteFlow
				{nodes}
				{edges}
				{onconnect}
				{ondelete}
				deleteKey={['Delete', 'Backspace']}
				fitView
				style="background: var(--color-bg);"
			>
				<Background style="color: var(--edge-strong);" />
				<Controls style="background: var(--color-surface); border-color: var(--edge-strong);" />
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
							class="transition-row flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150"
							style="background: var(--color-surface); border: 1px solid var(--edge);">
							<div class="flex items-center gap-2 text-sm">
								<span class="font-medium" style="color: var(--color-primary);">{t.fromName}</span>
								<ArrowRight class="w-3.5 h-3.5 shrink-0" style="color: var(--text-muted);" />
								<span class="font-medium" style="color: var(--color-primary);">{t.toName}</span>
							</div>
							<button
								onclick={() => deleteTransition(t.fromId, t.toId)}
								disabled={deletingKey === key}
								class="transition-row__delete w-6 h-6 rounded-md flex items-center justify-center transition-all"
								title="Transition löschen">
								{#if deletingKey === key}
									<Spinner size={3} thickness="border" color="currentColor" />
								{:else}<Trash2 class="w-3.5 h-3.5" />{/if}
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Ticket #512: Delete-Button der Transition-Liste — Hover war zuvor per
	   onmouseenter/onmouseleave inline gesetzt, jetzt als CSS-:hover-Klasse. */
	.transition-row {
		color: var(--color-text);
	}

	.transition-row:hover {
		border-color: var(--edge-strong);
		background: var(--color-surface-hover);
	}

	.transition-row__delete {
		color: var(--text-muted);
		background: transparent;
	}

	.transition-row__delete:hover:not(:disabled) {
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
	}

	.transition-row__delete:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* SvelteFlow-Theming über --xy-*-Variablen (v0.1.x) statt harter Hex-Werte:
	   Nodes/Edges/Controls/Selection auf das Graphit/Indigo-Tokensystem
	   umgezogen — Cyan-Neon (#00d9ff) entfällt vollständig. */
	.workflow-graph :global(.svelte-flow) {
		--xy-background-color: var(--color-bg);
		--xy-background-color-default: var(--color-bg);

		--xy-node-background-color: var(--color-surface);
		--xy-node-background-color-default: var(--color-surface);
		--xy-node-color: var(--color-text);
		--xy-node-color-default: var(--color-text);
		--xy-node-border: 1px solid var(--edge-strong);
		--xy-node-border-default: 1px solid var(--edge-strong);
		--xy-node-boxshadow-hover: none;
		--xy-node-boxshadow-hover-default: none;
		--xy-node-boxshadow-selected: 0 0 0 1.5px var(--color-primary);
		--xy-node-boxshadow-selected-default: 0 0 0 1.5px var(--color-primary);

		--xy-edge-stroke: var(--color-text-secondary);
		--xy-edge-stroke-default: var(--color-text-secondary);
		--xy-edge-stroke-width: 2;
		--xy-edge-stroke-width-default: 2;
		--xy-edge-stroke-selected: var(--color-primary);
		--xy-edge-stroke-selected-default: var(--color-primary);

		--xy-connectionline-stroke: var(--color-primary);
		--xy-connectionline-stroke-default: var(--color-primary);

		--xy-handle-background-color: var(--color-text-secondary);
		--xy-handle-background-color-default: var(--color-text-secondary);
		--xy-handle-border-color: var(--color-bg);
		--xy-handle-border-color-default: var(--color-bg);

		--xy-selection-background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
		--xy-selection-background-color-default: color-mix(in srgb, var(--color-primary) 8%, transparent);
		--xy-selection-border: 1px dotted var(--color-primary);
		--xy-selection-border-default: 1px dotted var(--color-primary);

		--xy-minimap-background-color: var(--color-surface);
		--xy-minimap-background-color-default: var(--color-surface);

		--xy-controls-button-background-color: var(--color-surface);
		--xy-controls-button-background-color-default: var(--color-surface);
		--xy-controls-button-background-color-hover: var(--color-surface-hover);
		--xy-controls-button-background-color-hover-default: var(--color-surface-hover);
		--xy-controls-button-color: var(--color-text-secondary);
		--xy-controls-button-color-default: var(--color-text-secondary);
		--xy-controls-button-color-hover: var(--color-text);
		--xy-controls-button-color-hover-default: var(--color-text);
		--xy-controls-button-border-color: var(--edge-strong);
		--xy-controls-button-border-color-default: var(--edge-strong);
		--xy-controls-box-shadow: none;
		--xy-controls-box-shadow-default: none;

		--xy-edge-label-background-color: var(--color-surface);
		--xy-edge-label-background-color-default: var(--color-surface);
		--xy-edge-label-color: var(--color-text);
		--xy-edge-label-color-default: var(--color-text);
	}

	/* Node-Hover: xyflow setzt Boxschatten per default-Var, ruhige Flächen
	   bekommen stattdessen nur eine leicht hellere Kante (keine Schatten). */
	.workflow-graph :global(.svelte-flow__node:hover) {
		box-shadow: none !important;
		border-color: var(--edge-strong);
	}

	.workflow-graph :global(.svelte-flow__node.selected) {
		box-shadow: 0 0 0 1.5px var(--color-primary) !important;
	}

	.workflow-graph :global(.svelte-flow__attribution) {
		background: transparent;
		color: var(--text-muted);
	}
</style>
