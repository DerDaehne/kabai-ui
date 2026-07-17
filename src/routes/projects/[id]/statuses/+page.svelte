<script lang="ts">
	// Ticket #509: Dünner Wrapper um StatusesModal (SidePanel-Version ist die eine
	// Quelle der Wahrheit, siehe StatusesModal.svelte — Liste, Inline-Edit, Anlegen
	// über den BottomSheet-Trigger aus #506, BannerConfirm-Löschflow). Diese Route
	// liefert nur noch die Projekt-ID aus den Params und das Vollseiten-Layout.
	// Referenz-Muster: src/routes/projects/[id]/workflow/+page.svelte (WorkflowModal).
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { ArrowLeft } from 'lucide-svelte';
	import StatusesModal from '$components/statuses/StatusesModal.svelte';

	$: id = $page.params.id;

	function goBack() {
		goto(`/projects/${id}`);
	}
</script>

<div class="w-full">
	<button
		onclick={goBack}
		class="inline-flex items-center gap-2 mb-6 text-sm transition-all duration-200 group"
		style="color: var(--text-muted);"
		in:fly={{ y: -12, duration: 300, easing: quintOut }}
	>
		<ArrowLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
		Zurück zum Board
	</button>

	<div class="rounded-2xl overflow-hidden card">
		<StatusesModal projectId={Number(id)} standalone onClose={goBack} />
	</div>
</div>
