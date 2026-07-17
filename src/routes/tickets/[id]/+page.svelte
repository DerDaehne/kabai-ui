<script lang="ts">
	// Ticket #509: Dünner Wrapper um TicketModal (SidePanel-Version ist die eine
	// Quelle der Wahrheit, siehe TicketModal.svelte). Diese Route liefert nur noch
	// die Ticket-ID aus den Params und das Vollseiten-Layout (zentrierte
	// max-w-3xl-Spalte statt Panel-Breite); Fetch/Formular/Kommentare/Tasks/
	// Relationen/Löschflow leben ausschließlich im Modal (standalone-Modus:
	// eigene SSE-Verbindung statt Board-Host, siehe TicketModal.svelte).
	// Referenz-Muster: src/routes/projects/[id]/workflow/+page.svelte (WorkflowModal).
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { ArrowLeft } from 'lucide-svelte';
	import TicketModal from '$components/tickets/TicketModal.svelte';

	$: id = $page.params.id;

	// Das Projekt des Tickets ist erst nach dem Laden im Modal bekannt; bis dahin
	// fällt der Zurück-Button auf die Browser-History zurück (vormals identisches
	// Verhalten in der alten Implementierung dieser Route).
	let projectId: number | null = null;

	// TicketModal ruft beim Löschen onDeleted() UND danach onClose() auf (Muster für
	// den SidePanel-Host, der beide zum Schließen des Panels nutzt). Im Standalone-Fall
	// navigieren beide — dieses Flag verhindert, dass das nachfolgende onClose() die
	// Erfolgs-Navigation von onDeleted() überschreibt.
	let hasNavigatedAway = false;

	function goBack() {
		if (hasNavigatedAway) return;
		hasNavigatedAway = true;
		if (projectId !== null) goto(`/projects/${projectId}`);
		else history.back();
	}

	// Vormals in dieser Route: goto(`/projects/${projectId}?success=...`) nach dem
	// Löschen. Gleiches Muster wie tickets/new, statuses/new etc. — bleibt hier
	// erhalten, auch wenn das Modal selbst (im SidePanel-Kontext) keinen Erfolgs-Toast
	// über Query-Param auslöst.
	function goBackAfterDelete() {
		hasNavigatedAway = true;
		if (projectId !== null) goto(`/projects/${projectId}?success=Ticket+gelöscht`);
		else history.back();
	}
</script>

<div class="w-full max-w-3xl mx-auto">
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
		<TicketModal
			ticketId={Number(id)}
			standalone
			onClose={goBack}
			onDeleted={goBackAfterDelete}
			onProjectLoaded={(pid) => (projectId = pid)}
		/>
	</div>
</div>
