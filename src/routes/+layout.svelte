<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';
	import Toast from '$components/ui/Toast.svelte';
	import SideNav from '$components/ui/SideNav.svelte';
	import { PanelRight } from 'lucide-svelte';
	import { railOpen } from '$lib/stores/ui';

	export let data: LayoutData;

	// Toast-Nachrichten aus dem Server
	let toasts: any[] = [];
	$: toasts = data.toasts || [];

	function toggleRail() {
		$railOpen = !$railOpen;
	}
</script>

<svelte:head>
	<title>Kabai UI - {data.title || 'Kanban Client'}</title>
</svelte:head>

<div class="flex h-screen" style="background: var(--color-bg);">
	<SideNav session={data.session} />

	<main class="flex-1 min-w-0 overflow-y-auto" style="padding: var(--space-6);">
		<div class="flex justify-end mb-2">
			<button
				onclick={toggleRail}
				title="AI-Aktivität umschalten"
				aria-label="AI-Aktivität umschalten"
				class="btn-ghost flex items-center justify-center w-9 h-9 rounded-md focus-visible:outline focus-visible:outline-2"
				style="outline-color: var(--color-primary);"
			>
				<PanelRight class="w-4 h-4" />
			</button>
		</div>
		<slot />
	</main>

	{#if $railOpen}
		<aside
			aria-label="AI-Aktivität"
			class="shrink-0 overflow-y-auto"
			style="width: 300px; border-left: 1px solid var(--color-border); background: var(--color-surface); padding: var(--space-6);"
		>
			<h2 class="h3 mb-2">AI-Aktivität</h2>
			<p class="text-small" style="color: var(--color-text-secondary);">
				Noch keine Aktivität — kommt mit einem späteren Update.
			</p>
		</aside>
	{/if}

	{#if toasts.length > 0}
		<div class="fixed bottom-4 right-4 space-y-2 z-50">
			{#each toasts as toast}
				<Toast type={toast.type} message={toast.message} title={toast.title} />
			{/each}
		</div>
	{/if}
</div>
