<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ArrowLeft, CheckSquare, MessageSquare, User, Clock, Trash2, Edit2 } from 'lucide-svelte';
	import type { TicketDetailed, BoardStatus, TicketTask, TicketComment } from '$lib/types';

	let ticket: TicketDetailed | null = null;
	let isLoading = true;
	let error = '';

	$: id = $page.params.id;
	
	// Ticket abrufen
	async function fetchTicket() {
		try {
			isLoading = true;
			const response = await fetch(`/api/tickets/${id}`);
			const result = await response.json();
			
			if (result.ok) {
				ticket = {
					...result.data.ticket,
					status: result.data.status,
					tasks: result.data.tasks,
					comments: result.data.comments
				};
			} else {
				error = result.error || 'Ticket nicht gefunden';
			}
		} catch (err) {
			error = 'Netzwerkfehler. Bitte versuchen Sie es erneut.';
			console.error('Fetch ticket error:', err);
		} finally {
			isLoading = false;
		}
	}
	
	// Ticket löschen
	async function handleDelete() {
		if (!confirm('Sind Sie sicher, dass Sie dieses Ticket löschen möchten? Alle Tasks und Kommentare werden ebenfalls gelöscht.')) {
			return;
		}
		
		try {
			const response = await fetch(`/api/tickets/${id}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			
			if (result.ok) {
				goto(`/projects/${ticket?.project_id || ''}?success=Ticket+erfolgreich+gelöscht`);
			} else {
				error = result.error || 'Fehler beim Löschen';
			}
		} catch (err) {
			error = 'Netzwerkfehler';
			console.error('Delete ticket error:', err);
		}
	}
	
	// Task abhaken/nicht abhaken
	async function toggleTaskCompletion(task: TicketTask) {
		try {
			const response = await fetch(`/api/tasks/${task.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_completed: !task.is_completed })
			});
			
			const result = await response.json();
			
			if (result.ok) {
				// Task in der Liste aktualisieren
				if (ticket) {
					ticket.tasks = ticket.tasks.map(t => 
						t.id === task.id ? result.data : t
					);
				}
			}
		} catch (err) {
			console.error('Toggle task error:', err);
		}
	}
	
	// Avatars Hintergrundfarbe basierend auf Ticket-ID
	let avatarColors = ([
		'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
		'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
	]);
	let avatarColor = (ticket ? avatarColors[ticket.id % avatarColors.length] : 'bg-gray-500');
	let assigneeInitials = (ticket?.assignee ? 
		ticket.assignee.split(' ')
			.map(part => part.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('')
		: '?');
	
	onMount(() => {
		fetchTicket();
	});
</script>

<div class="max-w-4xl">
	<!-- Header -->
	<div class="mb-6">
		<button 
			onclick={() => ticket && goto(`/projects/${ticket.project_id}`)}
			class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4"
		>
			<ArrowLeft class="w-4 h-4" />
			Zurück zum Board
		</button>
		
		{#if ticket}
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-3 mb-2">
						<h1 class="text-2xl font-bold text-[var(--text)] truncate">
							{ticket.title}
						</h1>
						<span class="badge badge-primary">
							{ticket.status?.display_name || 'Unbekannt'}
						</span>
					</div>
					<p class="text-[var(--text-muted)]">
						#{ticket.id}
					</p>
				</div>
				
				<div class="flex items-center gap-2">
					<button 
						onclick={() => goto(`/projects/${ticket.project_id}/tickets/new?id=${ticket.id}`)}
						class="btn btn-ghost flex items-center gap-2"
						title="Ticket bearbeiten"
					>
						<Edit2 class="w-4 h-4" />
						Bearbeiten
					</button>
					<button 
						onclick={handleDelete}
						class="btn btn-danger flex items-center gap-2"
						title="Ticket löschen"
					>
						<Trash2 class="w-4 h-4" />
						Löschen
					</button>
				</div>
			</div>
		{/if}
	</div>
	
	<!-- Error -->
	{#if error}
		<div class="p-4 bg-[var(--danger)/10] border border-[var(--danger)] rounded-lg mb-6">
			<p class="text-[var(--danger)]">{error}</p>
		</div>
	{/if}
	
	<!-- Loading -->
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<svg class="animate-spin h-8 w-8 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		</div>
	{:else if ticket}
		<!-- Ticket Content -->
		<div class="space-y-6">
			<!-- Metadata -->
			<div class="flex items-center gap-4 p-4 bg-[var(--border)] rounded-lg">
				<div class="flex items-center gap-2">
					<User class="w-4 h-4 text-[var(--text-muted)]" />
					<span class="text-sm text-[var(--text-muted)]">
						{ticket.assignee || 'Nicht zugewiesen'}
					</span>
				</div>
				<div class="flex items-center gap-2">
					<Clock class="w-4 h-4 text-[var(--text-muted)]" />
					<span class="text-sm text-[var(--text-muted)]">
						Erstellt: {new Date(ticket.created_at).toLocaleDateString('de-DE')}
					</span>
				</div>
				<div class="flex items-center gap-2">
					<Clock class="w-4 h-4 text-[var(--text-muted)]" />
					<span class="text-sm text-[var(--text-muted)]">
						Aktualisiert: {new Date(ticket.updated_at).toLocaleDateString('de-DE')}
					</span>
				</div>
			</div>
			
			<!-- Description -->
			{#if ticket.description}
				<div class="card p-4">
					<h3 class="font-medium text-[var(--text)] mb-2">Beschreibung</h3>
					<p class="text-[var(--text)] whitespace-pre-wrap">{ticket.description}</p>
				</div>
			{/if}
			
			<!-- Tasks -->
			<div class="card p-4">
				<div class="flex items-center justify-between mb-4">
					<h3 class="flex items-center gap-2 font-medium text-[var(--text)]">
						<CheckSquare class="w-4 h-4" />
						Tasks
					</h3>
					<span class="text-sm text-[var(--text-muted)]">
						{ticket.tasks.filter(t => t.is_completed).length}/{ticket.tasks.length} abgeschlossen
					</span>
				</div>
				
				<div class="space-y-2">
					{#each ticket.tasks as task}
						<div class="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--border)] transition-colors">
							<input
								type="checkbox"
								checked={task.is_completed}
								onchange={() => toggleTaskCompletion(task)}
								class="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
							/>
							<span 
								class="flex-1 {task.is_completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text)]'}"
							>
								{task.title}
							</span>
						</div>
					{/each}
				</div>
			</div>
			
			<!-- Comments -->
			<div class="card p-4">
				<h3 class="flex items-center gap-2 font-medium text-[var(--text)] mb-4">
					<MessageSquare class="w-4 h-4" />
					Kommentare ({ticket.comments.length})
				</h3>
				
				<div class="space-y-4">
					{#each ticket.comments as comment}
						<div class="flex gap-3">
							<div class="flex-shrink-0">
								<div 
									class="w-8 h-8 rounded-full {avatarColors[comment.id % avatarColors.length]} flex items-center justify-center text-white text-xs font-medium"
									title="{comment.author}"
								>
									{comment.author.split(' ').map(part => part.charAt(0).toUpperCase()).slice(0, 2).join('')}
								</div>
							</div>
							<div class="flex-1 min-w-0">
								<div class="bg-[var(--border)] rounded-lg p-3">
									<div class="flex items-center gap-2 mb-1">
										<span class="font-medium text-[var(--text)] text-sm">{comment.author}</span>
										<span class="text-xs text-[var(--text-muted)]">
											{new Date(comment.created_at).toLocaleDateString('de-DE')}
										</span>
									</div>
									<p class="text-sm text-[var(--text)] whitespace-pre-wrap">{comment.comment_text}</p>
								</div>
							</div>
						</div>
					{/each}
					
					{#if ticket.comments.length === 0}
						<p class="text-sm text-[var(--text-muted)] text-center py-4">
							Keine Kommentare. Fügen Sie einen hinzu.
						</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
