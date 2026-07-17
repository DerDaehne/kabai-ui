<script lang="ts">
	// Ticket #506: Deep-Link-Wrapper — rendert das Board nicht doppelt, sondern
	// zeigt nur das BottomSheet offen über einer leeren Trägerfläche. Schließen
	// (Submit oder Abbrechen) spielt zuerst die Exit-Animation ab und navigiert
	// erst danach zurück zum Board.
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import BottomSheet from '$components/ui/BottomSheet.svelte';
	import NewTicketSheet from '$components/tickets/NewTicketSheet.svelte';

	// SHEET_CLOSE_MS muss zur Exit-Transition in BottomSheet.svelte passen
	// (320ms quintOut) — sonst wird während der Animation weggenavigiert.
	const SHEET_CLOSE_MS = 320;

	$: id = $page.params.id;
	$: initialStatusId = (() => {
		const raw = $page.url.searchParams.get('status_id');
		return raw ? parseInt(raw) : null;
	})();

	let open = true;

	function closeThenGoto(target: string) {
		open = false;
		setTimeout(() => goto(target), SHEET_CLOSE_MS);
	}

	function handleCreated(ticket: { id: number }) {
		closeThenGoto(`/projects/${id}?success=Ticket+erstellt`);
	}

	function handleCancel() {
		closeThenGoto(`/projects/${id}`);
	}
</script>

<div class="w-full"></div>

<BottomSheet {open} title="Neues Ticket" onClose={handleCancel}>
	<NewTicketSheet projectId={id ?? ''} {initialStatusId} onCreated={handleCreated} onCancel={handleCancel} />
</BottomSheet>
