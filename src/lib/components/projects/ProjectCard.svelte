<script lang="ts">
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { ChevronUp, X, Trash2, Archive, AlertCircle, Zap, Hourglass, BookOpen } from 'lucide-svelte';
	import StatusPie from '$components/projects/StatusPie.svelte';
	import type { ProjectOverview } from '$lib/types';

	// Ticket #495: Hover-Tropfen + Milchglas-Kontextmenü auf der Projekt-Card.
	// Extrahiert aus src/routes/+page.svelte (Ticket #494 Refactoring).
	export let project: ProjectOverview;
	export let onOpen: (id: number) => void = () => {};
	export let onDelete: (id: number) => void = () => {};
	export let onArchive: (id: number) => void = () => {};
	// Exklusiv-Zustand: nur eine Card zeigt ihr Kontextmenü gleichzeitig.
	// Die Seite hält die offene Projekt-ID und reicht sie als Prop rein/raus.
	export let isMenuOpen = false;
	export let onRequestOpen: (id: number) => void = () => {};
	export let onRequestClose: () => void = () => {};

	let dropButtonEl: HTMLButtonElement;
	let firstMenuButtonEl: HTMLButtonElement;
	let cardEl: HTMLDivElement;

	function relativeTime(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const mins = Math.round(diffMs / 60000);
		if (mins < 1) return 'gerade eben';
		if (mins < 60) return `vor ${mins} Min.`;
		const hours = Math.round(mins / 60);
		if (hours < 24) return `vor ${hours} Std.`;
		const days = Math.round(hours / 24);
		return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
	}

	function ageInDays(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const days = Math.floor(diffMs / 86400000);
		if (days < 1) return '<1 Tag';
		return `${days} Tag${days !== 1 ? 'en' : ''}`;
	}

	function openMenu() {
		onRequestOpen(project.id);
	}

	function closeMenu() {
		onRequestClose();
		dropButtonEl?.focus();
	}

	function handleCardClick() {
		if (isMenuOpen) return;
		onOpen(project.id);
	}

	function handleCardKeydown(e: KeyboardEvent) {
		if (isMenuOpen) {
			if (e.key === 'Escape') {
				e.preventDefault();
				closeMenu();
			}
			return;
		}
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onOpen(project.id);
		}
	}

	// Fokus springt beim Öffnen auf den ersten Menü-Button.
	$: if (isMenuOpen && firstMenuButtonEl) {
		firstMenuButtonEl.focus();
	}

	function prefersReducedMotion() {
		return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	}

	// Einblende-Transition der Milchglas-Scheibe: Fade + dezentes translateY,
	// analog zum Overlay-Stil aus BannerConfirm.svelte (#496). Bei
	// reduced-motion nur ein reiner Fade ohne Bewegung.
	function menuIn(node: HTMLElement) {
		if (prefersReducedMotion()) return fade(node, { duration: 120 });
		return {
			duration: 200,
			easing: quintOut,
			css: (t: number) => `opacity: ${t}; transform: translateY(${(1 - t) * 6}px);`
		};
	}
</script>

<div
	bind:this={cardEl}
	class="project-card card relative py-5 px-6 flex items-center gap-6"
	class:menu-open={isMenuOpen}
	class:cursor-pointer={!isMenuOpen}
	role="button"
	tabindex="0"
	onclick={handleCardClick}
	onkeydown={handleCardKeydown}
>
	<!-- Normaler Inhalt: bleibt sichtbar (scheint durchs Milchglas), wird im
	     Kontextmenü-Zustand nur vor Fokus/Screenreadern geschützt -->
	<div class="project-card__content flex items-center gap-6 w-full" class:content-inert={isMenuOpen} aria-hidden={isMenuOpen}>
		<!-- Titel + Beschreibung -->
		<div class="min-w-0 flex-1">
			<h3 class="text-lg font-semibold truncate" style="color: var(--color-text);" title={project.name}>
				{project.name}
			</h3>
			{#if project.description}
				<p class="text-sm mt-1 truncate-2" style="color: var(--color-text-secondary);" title={project.description}>
					{project.description}
				</p>
			{:else}
				<code class="text-xs" style="color: var(--color-text-secondary);">{project.slug}</code>
			{/if}
		</div>

		<!-- Metriken: gestaffelt nach Breakpoint ausgeblendet.
		     Wegfall-Reihenfolge klein→groß: (a) zuerst weg, (e) zuletzt. -->
		<div class="hidden 2xl:flex flex-col items-end shrink-0 w-28">
			<span class="text-caption" style="color: var(--color-text-secondary);">Letzte Bearbeitung</span>
			<span class="text-sm font-mono" style="color: var(--color-text);">{relativeTime(project.last_activity)}</span>
		</div>

		<div class="hidden xl:flex flex-col items-end shrink-0 w-28">
			<span class="text-caption" style="color: var(--color-text-secondary);">Wartet auf Mensch</span>
			<span class="font-mono text-sm flex items-center gap-1.5"
				style="color: {project.waiting_on_human > 0 ? 'var(--color-warning)' : 'var(--color-text)'};">
				{#if project.waiting_on_human > 0}
					<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: var(--color-warning);"></span>
				{:else}
					<AlertCircle class="w-3 h-3" style="color: var(--color-text-secondary);" />
				{/if}
				{project.waiting_on_human}
			</span>
		</div>

		<div class="hidden lg:flex flex-col items-end shrink-0 w-24">
			<span class="text-caption" style="color: var(--color-text-secondary);">Durchsatz 7T</span>
			<span class="font-mono text-sm flex items-center gap-1" style="color: var(--color-text);">
				<Zap class="w-3 h-3" style="color: var(--color-text-secondary);" />{project.throughput_7d}
			</span>
		</div>

		<div class="hidden md:flex flex-col items-end shrink-0 w-24">
			<span class="text-caption" style="color: var(--color-text-secondary);">Ältestes offen</span>
			<span class="font-mono text-sm flex items-center gap-1" style="color: var(--color-text);">
				<Hourglass class="w-3 h-3" style="color: var(--color-text-secondary);" />
				{project.oldest_open_created_at ? ageInDays(project.oldest_open_created_at) : '–'}
			</span>
		</div>

		<div class="hidden sm:flex flex-col items-end shrink-0 w-24">
			<span class="text-caption" style="color: var(--color-text-secondary);">KB-Notes</span>
			<span class="font-mono text-sm flex items-center gap-1" style="color: var(--color-text);">
				<BookOpen class="w-3 h-3" style="color: var(--color-text-secondary);" />{project.notes_count}
			</span>
		</div>

		<!-- Tortendiagramm -->
		<div class="shrink-0">
			<StatusPie statuses={project.statuses} size={80} />
		</div>
	</div>

	<!-- Kontextmenü-Inhalt: Löschen / Archivieren.
	     Milchglas statt Ausblenden (Review #495): der Card-Inhalt bleibt
	     sichtbar und scheint durch die geblurte Scheibe hindurch, im
	     gleichen Overlay-Stil wie BannerConfirm.svelte (#496). -->
	{#if isMenuOpen}
		<div class="project-card__menu absolute inset-0 flex items-center justify-center gap-3" transition:menuIn>
			<button
				bind:this={firstMenuButtonEl}
				type="button"
				class="btn-subtle flex items-center gap-2 px-4 py-2"
				style="color: var(--color-danger);"
				onclick={(e) => { e.stopPropagation(); onDelete(project.id); }}
			>
				<Trash2 class="w-4 h-4" />
				Löschen
			</button>
			<button
				type="button"
				class="btn-subtle flex items-center gap-2 px-4 py-2"
				style="color: var(--color-warning);"
				onclick={(e) => { e.stopPropagation(); onArchive(project.id); }}
			>
				<Archive class="w-4 h-4" />
				Archivieren
			</button>
		</div>
	{/if}

	<!-- Hover-Tropfen (unten) / Schließen-Tropfen (oben) -->
	{#if !isMenuOpen}
		<button
			bind:this={dropButtonEl}
			type="button"
			class="drop drop--bottom"
			aria-label="Projektaktionen öffnen"
			onclick={(e) => { e.stopPropagation(); openMenu(); }}
		>
			<ChevronUp class="w-4 h-4" />
		</button>
	{:else}
		<button
			type="button"
			class="drop drop--top drop--active"
			aria-label="Aktionen schließen"
			onclick={(e) => { e.stopPropagation(); closeMenu(); }}
		>
			<X class="w-4 h-4" />
		</button>
	{/if}
</div>

<style>
	.project-card {
		overflow: visible;
	}

	.project-card__content.content-inert {
		/* Bleibt sichtbar (scheint durchs Milchglas), aber kein Fokus/Klick mehr möglich */
		pointer-events: none;
	}

	.project-card.menu-open {
		/* Nur noch Border-Betonung, keine opake Füllfarbe mehr — der
		   Milchglas-Effekt kommt jetzt von .project-card__menu selbst */
		border-color: color-mix(in srgb, var(--color-primary) 35%, var(--edge));
		cursor: default;
	}

	/* Milchglas-Scheibe über dem (weiterhin sichtbaren) Karten-Inhalt.
	   Gleicher Overlay-Stil wie BannerConfirm.svelte (#496): halbtransparenter
	   Farbschimmer + backdrop-filter: blur. Die Card selbst hat
	   overflow: visible (wegen der Tropfen-Laschen), daher braucht die
	   Scheibe hier ihren eigenen border-radius passend zu .card (--radius-card
	   aus app.css), statt sich auf geerbtes Card-Clipping zu verlassen. */
	.project-card__menu {
		background: color-mix(in srgb, var(--color-primary) 14%, transparent);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
		border-radius: var(--radius-card);
	}

	.project-card__menu .btn-subtle {
		/* Eigene, deckende Fläche für Lesbarkeit auf dem geblurten Hintergrund —
		   .btn-subtle nutzt sonst --color-surface-hover, das durch den
		   Primary-Schimmer der Scheibe zu wenig Kontrast zum Text hätte */
		background: var(--color-surface);
		border-color: color-mix(in srgb, var(--color-primary) 25%, var(--edge));
	}

	.project-card__menu .btn-subtle:hover {
		background: color-mix(in srgb, var(--color-surface) 90%, white 6%);
	}

	/* Tropfen: halbrunde Lasche, die aus der Kante herauswächst. */
	.drop {
		position: absolute;
		left: 50%;
		width: 52px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border: 1px solid var(--edge-strong);
		color: var(--color-text-secondary);
		cursor: pointer;
		opacity: 0;
		transform: translate(-50%, 4px);
		transition: opacity var(--duration-fast) var(--ease-soft), transform var(--duration-fast) var(--ease-soft), color var(--duration-fast) var(--ease-soft), background-color var(--duration-fast) var(--ease-soft);
	}

	.drop--bottom {
		bottom: -1px;
		border-radius: 999px 999px 0 0;
		border-bottom-color: transparent;
	}

	.drop--top {
		top: -1px;
		border-radius: 0 0 999px 999px;
		border-top-color: transparent;
		background: color-mix(in srgb, var(--color-primary) 25%, var(--color-surface-hover));
		color: var(--color-text);
	}

	.project-card:hover .drop--bottom,
	.project-card:focus-within .drop--bottom {
		opacity: 1;
		transform: translate(-50%, 0);
	}

	.drop--active {
		opacity: 1;
		transform: translate(-50%, 0);
	}

	.drop:hover {
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-surface-hover) 80%, white 4%);
	}

	.drop--top:hover {
		background: color-mix(in srgb, var(--color-primary) 32%, var(--color-surface-hover));
	}

	@media (prefers-reduced-motion: reduce) {
		.drop {
			transition: opacity var(--duration-fast) var(--ease-soft);
			transform: translate(-50%, 0);
		}
	}
</style>
