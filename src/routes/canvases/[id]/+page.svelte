<script lang="ts">
	// Ticket #527: Editor-Vollansicht für ein Canvas (kein Modal/Dialog, siehe
	// Design-Entscheidung 1). Lädt Canvas-Metadaten + Elemente + Kanten per
	// Client-Fetch (gleiches Muster wie src/routes/projects/[id]/+page.svelte
	// und .../workflow/+page.svelte — kein +page.server.ts in dieser
	// Routen-Nachbarschaft, also bewusst konsistent auch hier keins).
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { ArrowLeft, Layers } from 'lucide-svelte';
	import CanvasEditor from '$components/canvases/CanvasEditor.svelte';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import type { Canvas, CanvasElement, CanvasEdge } from '$lib/types';

	$: id = $page.params.id;
	$: canvasId = parseInt(id);

	let canvas: Canvas | null = null;
	let elements: CanvasElement[] = [];
	let edges: CanvasEdge[] = [];
	let isLoading = true;
	let error = '';

	async function loadCanvas() {
		isLoading = true;
		error = '';
		try {
			const [canvasRes, elementsRes, edgesRes] = await Promise.all([
				fetch(`/api/canvases/${canvasId}`).then((r) => r.json()),
				fetch(`/api/canvases/${canvasId}/elements`).then((r) => r.json()),
				fetch(`/api/canvases/${canvasId}/edges`).then((r) => r.json())
			]);

			if (!canvasRes.ok) {
				error = canvasRes.error || 'Canvas konnte nicht geladen werden';
				return;
			}
			canvas = canvasRes.data;
			elements = elementsRes.ok ? elementsRes.data : [];
			edges = edgesRes.ok ? edgesRes.data : [];
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadCanvas);
</script>

<svelte:head>
	<title>{canvas?.name || 'Canvas'} - Kabai UI</title>
</svelte:head>

<div class="w-full flex flex-col" style="height: calc(100vh - 120px);">
	<button
		onclick={() => goto('/canvases')}
		class="inline-flex items-center gap-2 mb-4 text-sm transition-all duration-200 group shrink-0"
		style="color: var(--text-muted);"
		in:fly={{ y: -12, duration: 300, easing: quintOut }}
	>
		<ArrowLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
		Zurück zu Canvases
	</button>

	{#if error}
		<div class="mb-4 shrink-0">
			<ErrorBanner message={error} />
		</div>
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center flex-1 gap-4">
			<Spinner />
		</div>
	{:else if canvas}
		<div class="flex items-center gap-2 mb-4 shrink-0">
			<Layers class="w-4 h-4" style="color: var(--primary);" />
			<h1 class="text-base font-semibold tracking-tight" style="color: var(--text);">{canvas.name}</h1>
		</div>

		<div class="rounded-2xl overflow-hidden card flex-1 min-h-0">
			<CanvasEditor {canvasId} {elements} {edges} bind:error />
		</div>
	{/if}
</div>
