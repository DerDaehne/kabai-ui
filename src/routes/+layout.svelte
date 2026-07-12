<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';
	import Toast from '$components/ui/Toast.svelte';
	import SideNav from '$components/ui/SideNav.svelte';
	import ActivityRail from '$components/ui/ActivityRail.svelte';
	import { Activity } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { railOpen } from '$lib/stores/ui';
	import { aiEvents, unseenActivityCount, markActivitySeen } from '$lib/stores/aiActivity';

	export let data: LayoutData;

	// Toast-Nachrichten aus dem Server
	let toasts: any[] = [];
	$: toasts = data.toasts || [];

	function toggleRail() {
		$railOpen = !$railOpen;
	}

	// Solange die Rail sichtbar ist, gelten eintreffende Events als gesehen —
	// das Unseen-Badge zählt nur Aktivität bei geschlossener Rail.
	$: if ($railOpen && $aiEvents.length > 0) {
		markActivitySeen($aiEvents[0].id);
	}

	// Beim ERSTEN AI-Event der Session öffnet die Rail einmalig automatisch,
	// damit das Feature entdeckbar ist; danach zählt nur noch die Nutzerwahl.
	const AUTO_OPEN_KEY = 'kabai:railAutoOpened';
	$: if (browser && $aiEvents.length > 0 && !$railOpen && sessionStorage.getItem(AUTO_OPEN_KEY) !== '1') {
		sessionStorage.setItem(AUTO_OPEN_KEY, '1');
		$railOpen = true;
	}
</script>

<svelte:head>
	<title>Kabai UI - {data.title || 'Kanban Client'}</title>
</svelte:head>

<div class="flex h-screen" style="background: var(--color-bg);">
	<SideNav session={data.session} />

	<main class="flex-1 min-w-0 overflow-y-auto" style="padding: var(--space-6);">
		<div class="flex justify-end mb-2">
			<button
				onclick={toggleRail}
				title="AI-Aktivität ein-/ausblenden"
				aria-label="AI-Aktivität ein-/ausblenden"
				aria-expanded={$railOpen}
				class="btn-ghost relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm focus-visible:outline focus-visible:outline-2"
				style="outline-color: var(--color-primary); color: {$railOpen ? 'var(--color-text)' : 'var(--color-text-secondary)'};"
			>
				<span class="relative inline-flex">
					<Activity class="w-4 h-4" />
					{#if $unseenActivityCount > 0}
						<span class="live-dot absolute -top-1 -right-1 w-2 h-2 rounded-full" style="background: var(--color-primary);"></span>
					{/if}
				</span>
				<span class="hidden md:inline">AI-Aktivität</span>
				{#if $unseenActivityCount > 0}
					<span class="text-caption px-1.5 py-0.5 rounded-full font-semibold"
						style="background: color-mix(in srgb, var(--color-primary) 18%, transparent); color: var(--color-primary);">
						{$unseenActivityCount}
					</span>
				{/if}
			</button>
		</div>
		<slot />
	</main>

	{#if $railOpen}
		<aside
			aria-label="AI-Aktivität"
			class="shrink-0 overflow-y-auto"
			style="width: 300px; background: var(--surface-translucent); -webkit-backdrop-filter: blur(var(--blur-panel)); backdrop-filter: blur(var(--blur-panel)); box-shadow: -8px 0 32px rgba(0,0,0,0.35), var(--elevation-2); padding: var(--space-6);"
		>
			<ActivityRail />
		</aside>
	{/if}

	{#if toasts.length > 0}
		<div class="fixed bottom-4 right-4 space-y-2 z-50">
			{#each toasts as toast}
				<Toast type={toast.type} message={toast.message} title={toast.title} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.live-dot {
		animation: live-pulse 2s ease-in-out infinite;
	}

	@keyframes live-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.35; }
	}

	@media (prefers-reduced-motion: reduce) {
		.live-dot {
			animation: none;
		}
	}
</style>
