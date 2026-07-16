<script lang="ts">
	import { fly } from 'svelte/transition';

	// Ticket #510: Das repo-weit duplizierte Fehler-Banner (rgba(239,68,68,0.08) +
	// roter Border-Left) als Komponente.
	// Entscheidung: Die in:fly-Transition wandert MIT in die Komponente (statt am
	// Wrapper der aufrufenden Datei zu bleiben) — an fast allen Fundstellen war es
	// exakt dieselbe Transition ({ y: 8, duration: 200 }), daher hier als Default
	// verdrahtet statt an jedem Call-Site wiederholt zu werden. Abweichende Stellen
	// können y/duration weiterhin per Prop überschreiben.
	export let message: string | undefined = undefined;
	export let y: number = 8;
	export let duration: number = 200;
	// Manche Fundstellen (z.B. große Seiten-Banner) nutzen p-4/rounded-xl, andere
	// (z.B. innerhalb von Formularen) das etwas kompaktere p-3/rounded-lg.
	export let compact: boolean = false;
</script>

<div
	class="{compact ? 'p-3 rounded-lg' : 'p-4 rounded-xl'} text-sm"
	style="background: rgba(239,68,68,0.08); border-left: 2px solid var(--color-danger); color: var(--danger);"
	in:fly={{ y, duration }}
>
	{#if message !== undefined}
		{message}
	{:else}
		<slot />
	{/if}
</div>
