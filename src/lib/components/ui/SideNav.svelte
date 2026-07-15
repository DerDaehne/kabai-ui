<script lang="ts">
	import type { SessionInfo } from '$lib/types';
	import { User, LogOut, Folder, BookOpen, Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-svelte';
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
		{ href: '/notes', label: 'Knowledge Base', icon: BookOpen }
	];

	function navigate(href: string) {
		goto(href);
	}

	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		if (href === '/') return path === '/';
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
			{@const active = isActive(item.href)}
			<button
				onclick={() => navigate(item.href)}
				title={item.label}
				aria-current={active ? 'page' : undefined}
				class="relative flex items-center gap-3 px-2 md:px-3 py-2 rounded-md transition-colors focus-visible:outline focus-visible:outline-2"
				style="
					outline-color: var(--color-primary);
					background: {active ? 'var(--color-surface-hover)' : 'transparent'};
					color: {active ? 'var(--color-text)' : 'var(--color-text-secondary)'};
				"
				onmouseenter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)'; }}
				onmouseleave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
			>
				{#if active}
					<span class="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style="background: var(--color-primary);"></span>
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
			class="relative w-full flex items-center gap-3 px-2 md:px-3 py-2 rounded-md transition-colors focus-visible:outline focus-visible:outline-2"
			style="outline-color: var(--color-primary); color: {$unseenActivityCount > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)'};"
			onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)'}
			onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
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
			class="w-full flex items-center gap-3 px-2 md:px-3 py-2 rounded-md transition-colors focus-visible:outline focus-visible:outline-2"
			style="outline-color: var(--color-primary); color: var(--color-text-secondary);"
			onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)'}
			onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
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
				class="btn-ghost flex items-center gap-2 px-2 md:px-3 py-2 rounded-md justify-start focus-visible:outline focus-visible:outline-2"
				style="outline-color: var(--color-primary);"
				onmouseenter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'}
				onmouseleave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'}
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
