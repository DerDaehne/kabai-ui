<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';
	import Toast from '$components/ui/Toast.svelte';
	import Navbar from '$components/ui/Navbar.svelte';

	export let data: LayoutData;
	
	// Toast-Nachrichten aus dem Server
	let toasts: any[] = [];
	$: toasts = data.toasts || [];
</script>

<svelte:head>
	<title>Kabai UI - {data.title || 'Kanban Client'}</title>
</svelte:head>

<div class="min-h-screen bg-[var(--bg)]">
	<Navbar session={data.session} />
	
	<main class="pt-16 pb-8 px-4 md:px-6 lg:px-8 w-full">
		<slot />
	</main>
	
	{#if toasts.length > 0}
		<div class="fixed bottom-4 right-4 space-y-2 z-50">
			{#each toasts as toast}
				<Toast type={toast.type} message={toast.message} title={toast.title} />
			{/each}
		</div>
	{/if}
</div>
