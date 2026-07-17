<script lang="ts">
	// Ticket #506: Deep-Link-Wrapper — rendert die Statuses-Liste nicht doppelt,
	// sondern zeigt nur das BottomSheet offen über einer leeren Trägerfläche.
	// Schließen (Submit oder Abbrechen) spielt zuerst die Exit-Animation ab und
	// navigiert erst danach zurück zur Statuses-Liste.
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import BottomSheet from '$components/ui/BottomSheet.svelte';
	import NewStatusSheet from '$components/statuses/NewStatusSheet.svelte';

	// SHEET_CLOSE_MS muss zur Exit-Transition in BottomSheet.svelte passen
	// (320ms quintOut) — sonst wird während der Animation weggenavigiert.
	const SHEET_CLOSE_MS = 320;

	$: id = $page.params.id;

	let open = true;

	function closeThenGoto(target: string) {
		open = false;
		setTimeout(() => goto(target), SHEET_CLOSE_MS);
	}

	function handleCreated(status: { id: number }) {
		closeThenGoto(`/projects/${id}/statuses?success=Status+erstellt`);
	}

	function handleCancel() {
		closeThenGoto(`/projects/${id}/statuses`);
	}
</script>

<div class="w-full"></div>

<BottomSheet {open} title="Neuer Status" onClose={handleCancel}>
	<NewStatusSheet projectId={id ?? ''} onCreated={handleCreated} onCancel={handleCancel} />
</BottomSheet>
