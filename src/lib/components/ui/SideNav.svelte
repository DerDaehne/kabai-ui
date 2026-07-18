<script lang="ts">
	import type { SessionInfo } from '$lib/types';
	import { User, LogOut, Folder, BookOpen, Activity, PanelLeftClose, PanelLeftOpen, Layers } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { navCollapsed, railOpen } from '$lib/stores/ui';
	import { unseenActivityCount } from '$lib/stores/aiActivity';

	interface Props {
		session: SessionInfo | null;
	}

	export let session: SessionInfo | null;

	// Ticket #494: Dashboard + Projekte zu einer Ansicht zusammengelegt
	const navItems = [
		{ href: '/', label: 'Projekte', icon: Folder },
		{ href: '/notes', label: 'Knowledge Base', icon: BookOpen },
		// Ticket #526: Canvas-Verwaltungsseite — kein Sub-Routing nötig, isActive()
		// greift per Prefix-Match (siehe Kommentar dort).
		{ href: '/canvases', label: 'Canvases', icon: Layers }
	];

	function navigate(href: string) {
		goto(href);
	}

	// Der Pfad muss als reaktive Variable im Template auftauchen — steckt er
	// nur im Funktionsrumpf, rendert der {@const}-Ausdruck bei Client-Side-
	// Navigation nicht neu (Review-Finding #500: „springt erst bei Reload um").
	$: currentPath = $page.url.pathname;

	function isActive(href: string, path: string): boolean {
		// „Projekte" umfasst auch die Detail-/Board-Ansichten unter /projects/…
		// (Review-Finding #500: das Herauswachsen bleibt dort aktiv).
		if (href === '/') return path === '/' || path === '/projects' || path.startsWith('/projects/');
		return path === href || path.startsWith(href + '/');
	}

	// Manuell kollabiert (56px-Icon-Rail): Labels ganz ausblenden; sonst wie
	// gehabt responsive (Labels erst ab md sichtbar).
	$: labelClass = $navCollapsed ? 'hidden' : 'hidden md:inline';
	$: infoClass = $navCollapsed ? 'hidden' : 'hidden md:flex';
</script>

<nav
	aria-label="Hauptnavigation"
	class="flex flex-col h-full shrink-0 {$navCollapsed ? 'w-14' : 'w-14 md:w-[232px]'}"
	style="background: var(--color-surface); box-shadow: 1px 0 0 rgba(255,255,255,0.03), 4px 0 24px rgba(0,0,0,0.3);"
>
	<!-- Logo -->
	<button
		onclick={() => navigate('/')}
		class="flex items-center gap-2 px-3 md:px-4 h-16 shrink-0 bg-transparent border-none cursor-pointer focus-visible:outline focus-visible:outline-2"
		style="outline-color: var(--color-primary);"
		title="Kabai UI"
	>
		<!-- Marke: gleiches Kanban-Zeichen wie static/favicon.svg -->
		<svg class="w-8 h-8 shrink-0" viewBox="0 0 64 64" aria-hidden="true">
			<rect width="64" height="64" rx="14" fill="var(--color-surface-hover)" />
			<rect x="13" y="14" width="10" height="36" rx="5" fill="#6e7bf2" />
			<rect x="27" y="14" width="10" height="25" rx="5" fill="#8791f5" opacity="0.85" />
			<rect x="41" y="14" width="10" height="14" rx="5" fill="#a2aaf8" opacity="0.7" />
		</svg>
		<span class="{labelClass} font-bold text-xl truncate" style="color: var(--color-text);">Kabai UI</span>
	</button>

	<!-- Navigation Links -->
	<div class="flex flex-col gap-1 px-2 mt-2">
		{#each navItems as item}
			{@const active = isActive(item.href, currentPath)}
			<button
				onclick={() => navigate(item.href)}
				title={item.label}
				aria-current={active ? 'page' : undefined}
				class="nav-item relative flex items-center gap-3 pl-2 md:pl-3 py-2 focus-visible:outline focus-visible:outline-2 {active ? 'nav-item-active pr-4 md:pr-5' : 'nav-item-inactive pr-2 md:pr-3 rounded-md transition-colors'}"
				style="
					outline-color: var(--color-primary);
					background: transparent;
					color: {active ? 'var(--color-text)' : 'var(--color-text-secondary)'};
				"
			>
				{#if active}
					<span class="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style="background: var(--color-primary);"></span>
					<span class="nav-item-notch nav-item-notch-top" aria-hidden="true"></span>
					<span class="nav-item-notch nav-item-notch-bottom" aria-hidden="true"></span>
				{/if}
				<svelte:component this={item.icon} class="w-4 h-4 shrink-0" />
				<span class="{labelClass} truncate">{item.label}</span>
			</button>
		{/each}
	</div>

	<!-- Aktivitäts-Indikator: öffnet die AI-Aktivität-Rail rechts -->
	<div class="px-2 pt-2 mt-auto">
		<button
			onclick={() => railOpen.set(true)}
			title="AI-Aktivität anzeigen"
			class="nav-hover-bg relative w-full flex items-center gap-3 px-2 md:px-3 py-2 rounded-md transition-colors focus-visible:outline focus-visible:outline-2"
			style="outline-color: var(--color-primary); color: {$unseenActivityCount > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)'};"
		>
			<span class="relative inline-flex shrink-0">
				<Activity class="w-4 h-4" />
				{#if $unseenActivityCount > 0}
					<span class="absolute -top-1 -right-1 w-2 h-2 rounded-full" style="background: var(--color-primary);"></span>
				{/if}
			</span>
			<span class="{labelClass} truncate">AI-Aktivität</span>
			{#if $unseenActivityCount > 0}
				<span class="{labelClass} ml-auto text-caption px-1.5 py-0.5 rounded-full font-semibold"
					style="background: color-mix(in srgb, var(--color-primary) 18%, transparent); color: var(--color-primary);">
					{$unseenActivityCount}
				</span>
			{/if}
		</button>

		<!-- Nav ein-/ausklappen (für schmale Monitore) -->
		<button
			onclick={() => navCollapsed.update(c => !c)}
			title={$navCollapsed ? 'Navigation ausklappen' : 'Navigation einklappen'}
			aria-expanded={!$navCollapsed}
			class="nav-hover-bg w-full flex items-center gap-3 px-2 md:px-3 py-2 rounded-md transition-colors focus-visible:outline focus-visible:outline-2"
			style="outline-color: var(--color-primary); color: var(--color-text-secondary);"
		>
			{#if $navCollapsed}
				<PanelLeftOpen class="w-4 h-4 shrink-0" />
			{:else}
				<PanelLeftClose class="w-4 h-4 shrink-0" />
			{/if}
			<span class="{labelClass} truncate">Einklappen</span>
		</button>
	</div>

	<!-- Session Info und Logout -->
	<div class="hairline mx-2"></div>
	<div class="px-2 pb-4 pt-2 flex flex-col gap-2">
		{#if session}
			<div class="{infoClass} items-center gap-2 px-2 text-caption font-mono truncate" style="color: var(--color-text-secondary);">
				<User class="w-4 h-4 shrink-0" />
				<span class="truncate">{session.username}@{session.db_host}:{session.db_port}</span>
			</div>

			<button
				onclick={() => navigate('/api/auth/logout')}
				title="Logout"
				class="btn-ghost logout-btn flex items-center gap-2 px-2 md:px-3 py-2 rounded-md justify-start focus-visible:outline focus-visible:outline-2"
				style="outline-color: var(--color-primary); color: var(--color-text-secondary);"
			>
				<LogOut class="w-4 h-4 shrink-0" />
				<span class="{labelClass}">Logout</span>
			</button>
		{:else}
			<button
				onclick={() => navigate('/login')}
				title="Login"
				class="flex items-center gap-2 px-2 md:px-3 py-2 rounded-md justify-start focus-visible:outline focus-visible:outline-2"
				style="color: var(--color-primary); outline-color: var(--color-primary);"
			>
				<User class="w-4 h-4 shrink-0" />
				<span class="{labelClass}">Login</span>
			</button>
		{/if}
	</div>
</nav>

<style>
	/* Ticket #511: JS onmouseenter/onmouseleave-Handler, die nur Styles
	   toggelten, durch CSS-:hover ersetzt. */
	.nav-item-inactive:hover {
		background: var(--color-surface-hover);
	}

	.nav-hover-bg:hover {
		background: var(--color-surface-hover);
	}

	.logout-btn:hover {
		color: var(--color-danger);
	}

	/* Ticket #500: der aktive Nav-Eintrag "verschmilzt" mit der
	   Content-Fläche (.content-panel, gleicher --color-content-panel-
	   Hintergrund) statt als eigene Pille daneben zu schweben — links
	   gerundet wie die anderen Einträge, rechts offen bis zur Nav-Kante,
	   wo er nahtlos in die Content-Fläche übergeht. */
	.nav-item-active {
		--notch-size: 18px;
		border-radius: var(--radius-control) 0 0 var(--radius-control);
		margin-right: -8px; /* kompensiert das px-2 des Elternelements — Fläche reicht bis zur Nav-Kante */
		/* Notch-Quadrate ragen in Nachbar-Einträge hinein (kleiner gap-1)
		   und müssen über deren Hintergrund liegen, unabhängig von der
		   DOM-Reihenfolge. */
		z-index: 1;
	}

	/* Die Panel-Fläche liegt als eigene Schicht unter dem Eintrags-Inhalt und
	   wächst beim Aktivieren geschmeidig aus der rechten Kante heraus — das
	   „Herauswachsen aus der Content-Fläche" wird so als Bewegung erlebbar
	   (Review-Finding #500). z-index -1 hält sie unter Text/Icon, aber im
	   Stacking-Kontext des Eintrags (z-index 1) über der Nav-Fläche. */
	.nav-item-active::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: var(--color-content-panel);
		border-radius: inherit;
		transform-origin: right center;
		animation: nav-merge-in 260ms var(--ease-soft);
	}

	/* Konkave Übergänge (Review-Rework #500): über/unter dem aktiven Eintrag
	   krümmt sich die Nav-Kante sichtbar in die Content-Fläche hinein. Jedes
	   Notch ist ein Quadrat direkt an der Ecke des Eintrags; ein radialer
	   Verlauf zentriert auf der ecke-fernen Seite malt innen die Nav-Farbe
	   (--color-surface) und außen die Panel-Farbe (--color-content-panel) —
	   die Kreisgrenze ist der konkave Viertelbogen. Die erste Fassung stanzte
	   „transparent" aus und zeigte damit Surface auf Surface: unsichtbar. */
	/* Innen „transparent" statt Surface: so scheint beim Hover über den
	   Nachbar-Eintrag dessen Hover-Fläche durch, statt dass das Notch-Quadrat
	   als Fremdkörper darüberliegt (Review-Finding #500). Sichtbar bleibt nur
	   der schmale Panel-Sichel-Bogen an der Nav-Kante — die konkave Ecke. */
	.nav-item-notch {
		position: absolute;
		right: 0;
		width: var(--notch-size);
		height: var(--notch-size);
		pointer-events: none;
		animation: notch-in 260ms var(--ease-soft) 60ms backwards;
	}

	.nav-item-notch-top {
		top: calc(var(--notch-size) * -1);
		background:
			radial-gradient(circle at top left, transparent calc(var(--notch-size) - 0.5px), var(--color-content-panel) calc(var(--notch-size) + 0.5px));
	}

	.nav-item-notch-bottom {
		bottom: calc(var(--notch-size) * -1);
		background:
			radial-gradient(circle at bottom left, transparent calc(var(--notch-size) - 0.5px), var(--color-content-panel) calc(var(--notch-size) + 0.5px));
	}

	@keyframes nav-merge-in {
		from { opacity: 0; transform: scaleX(0.4); }
		to { opacity: 1; transform: scaleX(1); }
	}

	@keyframes notch-in {
		from { opacity: 0; transform: translateX(6px); }
		to { opacity: 1; transform: translateX(0); }
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-item-active::before,
		.nav-item-notch {
			animation: none;
		}
	}
</style>
