<script lang="ts">
	import type { SessionInfo } from '$lib/types';
	import { User, LogOut, Home, Folder, KanbanSquare, BookOpen } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	
	interface Props {
		session: SessionInfo | null;
	}
	
	export let session: SessionInfo | null;
	
	const navItems = [
		{ href: '/projects', label: 'Projekte', icon: Folder },
		{ href: '/notes', label: 'Knowledge Base', icon: BookOpen },
		{ href: '/', label: 'Dashboard', icon: Home }
	];
	
	function navigate(href: string) {
		goto(href);
	}
</script>

<nav class="fixed top-0 left-0 right-0 z-40" style="background: var(--card-bg); border-bottom: 1px solid var(--border); box-shadow: 0 1px 20px rgba(0,212,255,0.08);">
	<div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
		<!-- Logo -->
		<button 
			onclick={() => navigate('/')} 
			class="flex items-center gap-2 bg-transparent border-none cursor-pointer"
		>
			<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: var(--primary); box-shadow: 0 0 12px var(--primary-glow);">
				<KanbanSquare class="w-5 h-5" style="color: #000;" />
			</div>
			<span class="font-bold text-xl" style="color: var(--primary); text-shadow: 0 0 10px var(--primary-glow);">kbai-ui</span>
		</button>
		
		<!-- Navigation Links -->
		<div class="hidden md:flex items-center gap-6">
			{#each navItems as item}
				<button 
					onclick={() => navigate(item.href)} 
					class="flex items-center gap-2 px-3 py-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)] transition-colors"
				>
					<svelte:component this={item.icon} class="w-4 h-4" />
					{item.label}
				</button>
			{/each}
		</div>
		
		<!-- Session Info und Logout -->
		<div class="flex items-center gap-4">
			{#if session}
				<div class="hidden md:flex items-center gap-2 text-sm text-[var(--text-muted)]">
					<User class="w-4 h-4" />
					<span>{session.username}</span>
					<span class="text-[var(--border)]">@</span>
					<span>{session.db_host}:{session.db_port}</span>
				</div>
				
				<button 
					onclick={() => navigate('/api/auth/logout')} 
					class="flex items-center gap-2 px-3 py-2 rounded-md text-[var(--danger)] hover:bg-[var(--danger)/10)] transition-colors"
				>
					<LogOut class="w-4 h-4" />
					<span class="hidden md:inline">Logout</span>
				</button>
			{:else}
				<button 
					onclick={() => navigate('/login')} 
					class="flex items-center gap-2 px-3 py-2 rounded-md text-[var(--primary)] hover:bg-[var(--primary)/10)] transition-colors"
				>
					<User class="w-4 h-4" />
					<span>Login</span>
				</button>
			{/if}
		</div>
	</div>
</nav>
