<script lang="ts">
	// Ticket #506: Die Route bleibt als Deep-Link erhalten, rendert die
	// Projekte-Ansicht aber nicht mehr doppelt — sie ist nur noch ein dünner
	// Träger für das BottomSheet, das offen über einer leeren Fläche schwebt.
	// Schließen (Submit oder Abbrechen) spielt zuerst die Exit-Animation des
	// Sheets ab und navigiert erst danach zurück zu "/".
	import { goto } from '$app/navigation';
	import BottomSheet from '$components/ui/BottomSheet.svelte';
	import NewProjectSheet from '$components/projects/NewProjectSheet.svelte';

	// SHEET_CLOSE_MS muss zur Exit-Transition in BottomSheet.svelte passen
	// (320ms quintOut) — sonst wird während der Animation weggenavigiert.
	const SHEET_CLOSE_MS = 320;

	let open = true;

	function closeThenGoto(target: string) {
		open = false;
		setTimeout(() => goto(target), SHEET_CLOSE_MS);
	}

	function handleCreated(project: { id: number }) {
		closeThenGoto('/?success=Projekt+erstellt');
	}

	function handleCancel() {
		closeThenGoto('/');
	}
</script>

<div class="w-full"></div>

<BottomSheet {open} title="Neues Projekt" onClose={handleCancel}>
	<NewProjectSheet onCreated={handleCreated} onCancel={handleCancel} />
</BottomSheet>
