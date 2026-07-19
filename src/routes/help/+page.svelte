<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { HelpCircle, Kanban, PenTool, BookOpen } from 'lucide-svelte';

	// Ticket #535: globale, statische Hilfe-Seite für menschliche Nutzer.
	// Bewusst NUR Text + kurze animierte GIFs (bzw. dokumentierter
	// Screenshot-Fallback) — kein interaktives Tour-Overlay, keine Videos.
	// Jede Sektion folgt dem gleichen Muster: Icon + Überschrift, 2-4 Sätze
	// Erklärung, ein Bild, das die Kerninteraktion zeigt.
	interface HelpSection {
		id: string;
		icon: typeof Kanban;
		title: string;
		paragraphs: string[];
		mediaSrc: string;
		mediaAlt: string;
	}

	const sections: HelpSection[] = [
		{
			id: 'board',
			icon: Kanban,
			title: 'Board',
			paragraphs: [
				'Das Board zeigt alle Tickets eines Projekts als Karten in Spalten, die den Arbeitsfortschritt abbilden — z. B. Backlog, To Do, In Bearbeitung und Fertig.',
				'Ein Ticket per Drag-and-drop in eine andere Spalte ziehen, verschiebt es dort in den entsprechenden Workflow-Status. Welche Übergänge erlaubt sind, legt das Projekt selbst fest.',
				'Über „Neues Ticket" lassen sich weitere Karten anlegen; ein Klick auf eine Karte öffnet die Detailansicht mit Beschreibung, Aufgaben und Kommentaren.'
			],
			mediaSrc: '/help/board-drag.gif',
			mediaAlt: 'Animation: eine Ticket-Karte wird per Drag-and-drop von der Spalte „To Do" in die Spalte „In Bearbeitung" gezogen.'
		},
		{
			id: 'canvas',
			icon: PenTool,
			title: 'Canvas',
			paragraphs: [
				'Der Canvas ist eine freie Zeichenfläche zum Planen und Skizzieren — projektübergreifend, unabhängig vom Board.',
				'Text-Blöcke, Rahmen (Frames) und Freihand-Skizzen lassen sich frei platzieren; Referenz-Karten verknüpfen Tickets, Epics oder Notes direkt auf der Fläche.',
				'Damit eignet sich der Canvas besonders für grobe Vorplanung, bevor daraus konkrete, geschätzte Tickets werden.'
			],
			mediaSrc: '/help/canvas-draw.gif',
			mediaAlt: 'Animation: auf dem Canvas wird ein neuer Text-Block platziert und beschriftet.'
		},
		{
			id: 'knowledge-base',
			icon: BookOpen,
			title: 'Knowledge Base',
			paragraphs: [
				'Die Knowledge Base sammelt Notes — kurze, in sich geschlossene Wissensbausteine wie Architekturentscheidungen oder Konzepte, projektübergreifend durchsuchbar.',
				'Ein Suchbegriff im Suchfeld filtert die Liste live nach Titel, Tags und Inhalt; Filter nach Art (Hub/ADR/Note), Tag oder Projekt lassen sich zusätzlich kombinieren.',
				'Hubs markieren Einstiegspunkte in ein Themengebiet und verlinken auf die dazugehörigen Detail-Notes.'
			],
			mediaSrc: '/help/kb-search.gif',
			mediaAlt: 'Animation: im Suchfeld der Knowledge Base wird ein Suchbegriff eingegeben, die Notes-Liste filtert sich währenddessen live.'
		}
	];
</script>

<svelte:head>
	<title>Hilfe - Kabai UI</title>
</svelte:head>

<div class="w-full max-w-3xl mx-auto space-y-10">
	<!-- Header -->
	<div class="flex items-end gap-4" in:fly={{ y: -16, duration: 400, easing: quintOut }}>
		<div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background: color-mix(in srgb, var(--color-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);">
			<HelpCircle class="w-5 h-5" style="color: var(--color-primary);" />
		</div>
		<div>
			<h1 class="text-2xl font-semibold tracking-tight" style="color: var(--color-text);">Hilfe</h1>
			<p class="text-sm" style="color: var(--color-text-secondary);">
				Kurzer Überblick über die zentralen Bereiche von Kabai UI
				<span class="font-mono" title="Kabai UI Version">· {__APP_VERSION__}</span>
			</p>
		</div>
	</div>

	<!-- Sektionen -->
	<div class="space-y-8">
		{#each sections as section, i (section.id)}
			<section
				class="help-card rounded-xl p-6"
				style="background: var(--color-surface); border: 1px solid var(--edge-strong); border-radius: var(--radius-panel);"
				in:fly={{ y: 16, duration: 350, delay: Math.min(i * 80, 300), easing: quintOut }}
			>
				<div class="flex items-center gap-3 mb-3">
					<div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background: color-mix(in srgb, var(--color-primary) 12%, transparent);">
						<svelte:component this={section.icon} class="w-4 h-4" style="color: var(--color-primary);" />
					</div>
					<h2 class="text-lg font-semibold" style="color: var(--color-text);">{section.title}</h2>
				</div>

				<div class="space-y-2 mb-4">
					{#each section.paragraphs as p}
						<p class="text-sm leading-relaxed" style="color: var(--color-text-secondary);">{p}</p>
					{/each}
				</div>

				<div class="help-media-frame rounded-lg overflow-hidden" style="border: 1px solid var(--edge-strong); background: var(--color-bg);">
					<img src={section.mediaSrc} alt={section.mediaAlt} loading="lazy" class="block w-full h-auto" />
				</div>
			</section>
		{/each}
	</div>
</div>

<style>
	.help-media-frame img {
		max-width: 100%;
	}
</style>
