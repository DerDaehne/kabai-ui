<script lang="ts">
	// Ticket #510: Wiederverwendbarer Formular-Baustein (Label + Eingabeelement per
	// Slot + optionaler Hilfe-/Fehlertext). Label-Stil 1:1 aus den bestehenden
	// Formularen übernommen (z.B. src/routes/projects/new/+page.svelte): Pflichtfelder
	// bekommen ein angehängtes " *" im Label, kein separates required-Symbol.
	//
	// Nur die Komponente — bestehende Formulare werden hier NICHT umgestellt,
	// das übernehmen die Folge-Tickets #506/#511.
	export let label: string;
	export let required: boolean = false;
	export let hint: string | undefined = undefined;
	export let error: string | undefined = undefined;
</script>

<div>
	<label class="block text-sm font-medium mb-2" style="color: var(--text);">
		{label}{required ? ' *' : ''}
		<slot name="label-suffix" />
	</label>
	<slot />
	{#if hint}
		<p class="mt-1 text-xs" style="color: var(--text-muted);">{hint}</p>
	{/if}
	{#if error}
		<p class="mt-1 text-xs" style="color: var(--danger);">{error}</p>
	{/if}
</div>
