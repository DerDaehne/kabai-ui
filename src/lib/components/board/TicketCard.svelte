<script lang="ts">
	import { goto } from '$app/navigation';
	import { User, CheckSquare, MessageSquare } from 'lucide-svelte';
	import type { BoardStatus, Ticket } from '$lib/types';
	
	interface Props {
		ticket: Ticket;
		projectId: number;
		status: BoardStatus;
	}
	
	export let ticket: Ticket;
	export let projectId: number;
	export let status: BoardStatus;
	
	// Avatars: Initialien aus Assignee extrahieren
	let assigneeInitials = '?';
	$: assigneeInitials = ticket.assignee ? 
		ticket.assignee.split(' ')
			.map(part => part.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('')
		: '?';
	
	// Avatars Hintergrundfarbe basierend auf ID
	const avatarColors = [
		'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
		'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
	];
	let avatarColor = avatarColors[0];
	$: avatarColor = avatarColors[ticket.id % avatarColors.length];
</script>

<div 
	class="bg-white p-3 rounded-lg border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow cursor-pointer"
	onclick={() => goto(`/tickets/${ticket.id}`)}
>
	<!-- Card Header -->
	<div class="flex items-start justify-between gap-2 mb-2">
		<div class="flex-1 min-w-0">
			<h3 class="font-medium text-[var(--text)] truncate text-sm">{ticket.title}</h3>
			<p class="text-xs text-[var(--text-muted)] mt-0.5">
				#{ticket.id}
			</p>
		</div>
	</div>
	
	<!-- Card Footer -->
	<div class="flex items-center justify-between gap-2">
		<!-- Assignee -->
		<div class="flex items-center gap-1">
			{#if ticket.assignee}
				<div 
					class="w-6 h-6 rounded-full {avatarColor} flex items-center justify-center text-white text-xs font-medium"
					title="{ticket.assignee}"
				>
					{assigneeInitials}
				</div>
			{/if}
		</div>
		
		<!-- Status Badge -->
		<div class="flex-1 min-w-0">
			<span 
				class="badge badge-primary truncate"
				title="{status.display_name}"
			>
				{status.name}
			</span>
		</div>
	</div>
</div>
