<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import WorkflowModal from '$components/workflow/WorkflowModal.svelte';
	import { ArrowLeft, Network } from 'lucide-svelte';

	$: id = $page.params.id;
</script>

<div class="w-full">
	<button
		onclick={() => goto(`/projects/${id}`)}
		class="inline-flex items-center gap-2 mb-6 text-sm transition-all duration-200 group"
		style="color: var(--text-muted);"
		in:fly={{ y: -12, duration: 300, easing: quintOut }}
	>
		<ArrowLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
		Zurück zum Board
	</button>

	<div class="rounded-2xl overflow-hidden card">
		<WorkflowModal projectId={parseInt(id)} />
	</div>
</div>
