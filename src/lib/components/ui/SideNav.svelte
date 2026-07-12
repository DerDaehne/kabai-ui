<script lang="ts">
	import type { SessionInfo } from '$lib/types';
	import { User, LogOut, Home, Folder, KanbanSquare, BookOpen } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	interface Props {
		session: SessionInfo | null;
	}

	export let session: SessionInfo | null;

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: Home },
		{ href: '/projects', label: 'Projekte', icon: Folder },
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
</script>

<nav
	aria-label="Hauptnavigation"
	class="flex flex-col h-full w-14 md:w-[232px] shrink-0"
	style="background: var(--color-surface); border-right: 1px solid var(--color-border);"
>
	<!-- Logo -->
	<button
		onclick={() => navigate('/')}
		class="flex items-center gap-2 px-3 md:px-4 h-16 shrink-0 bg-transparent border-none cursor-pointer focus-visible:outline focus-visible:outline-2"
		style="outline-color: var(--color-primary);"
		title="Kabai UI"
	>
		<div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background: var(--color-primary);">
			<KanbanSquare class="w-5 h-5" style="color: #000;" />
		</div>
		<span class="hidden md:inline font-bold text-xl truncate" style="color: var(--color-text);">Kabai UI</span>
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
				<span class="hidden md:inline truncate">{item.label}</span>
			</button>
		{/each}
	</div>

	<!-- Session Info und Logout -->
	<div class="mt-auto px-2 pb-4 pt-2 flex flex-col gap-2" style="border-top: 1px solid var(--color-border);">
		{#if session}
			<div class="hidden md:flex items-center gap-2 px-2 text-small truncate" style="color: var(--color-text-secondary);">
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
				<span class="hidden md:inline">Logout</span>
			</button>
		{:else}
			<button
				onclick={() => navigate('/login')}
				title="Login"
				class="flex items-center gap-2 px-2 md:px-3 py-2 rounded-md justify-start focus-visible:outline focus-visible:outline-2"
				style="color: var(--color-primary); outline-color: var(--color-primary);"
			>
				<User class="w-4 h-4 shrink-0" />
				<span class="hidden md:inline">Login</span>
			</button>
		{/if}
	</div>
</nav>
