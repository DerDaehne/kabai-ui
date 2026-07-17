<script lang="ts">
	// Ticket #509: Diese Route war vormals eine eigene Edit-Vollseite mit Formular
	// (Anzeigename, Position, Agent-Instruktion) — exakt die Felder, die
	// StatusesModal.svelte bereits über sein Inline-Edit auf der Statusliste
	// abdeckt (siehe startEdit/saveEdit dort). Ein eigenständiges Wrapper-Layout
	// für eine EINZELNE Zeile wäre hier reiner Mehraufwand ohne Mehrwert, da
	// Inline-Edit kein eigenständiges "offenes" UI-Element ist, das sich von
	// außen gezielt anspringen ließe (anders als TicketModal/StatusesModal
	// selbst, die als Ganzes eine Route/ein Panel füllen). Deshalb: Redirect auf
	// die Statusliste (jetzt selbst ein Wrapper um StatusesModal), wo der
	// gewünschte Status inline bearbeitet werden kann.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	$: id = $page.params.id;

	onMount(() => {
		goto(`/projects/${id}/statuses`, { replaceState: true });
	});
</script>
