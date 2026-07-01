<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { renderMarkdown } from '$lib/markdown';
	import { fly, slide, fade } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { ArrowLeft, CheckSquare, MessageSquare, User, Clock, Trash2, Pencil, X, Check, Bot, Cpu } from 'lucide-svelte';
	import type { TicketDetailed, BoardStatus, TicketTask } from '$lib/types';

	$: id = $page.params.id;

	let ticket: TicketDetailed | null = null;
	let statuses: BoardStatus[] = [];
	let isLoading = true;
	let error = '';
	let isEditing = false;
	let isSaving = false;
	let isDeleting = false;

	// Comments
	let newCommentText = '';
	let isAddingComment = false;

	// Edit state
	let editTitle = '';
	let editDescription = '';
	let editAssignee = '';
	let editModel = '';
	let editStatusId: number | null = null;

	let eventSource: EventSource | null = null;
	let justUpdatedLive = false;

	async function fetchTicket() {
		try {
			isLoading = true;
			const res = await fetch(`/api/tickets/${id}`);
			const result = await res.json();
			if (result.ok) {
				ticket = {
					...result.data.ticket,
					status: result.data.status,
					tasks: result.data.tasks,
					comments: result.data.comments,
					relations: result.data.relations
				};
				connectLiveUpdates(ticket.project_id);
			} else {
				error = result.error || 'Ticket nicht gefunden';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isLoading = false;
		}
	}

	async function fetchStatuses() {
		if (!ticket) return;
		try {
			const res = await fetch(`/api/projects/${ticket.project_id}/statuses`);
			const result = await res.json();
			if (result.ok) statuses = result.data.sort((a: BoardStatus, b: BoardStatus) => a.position - b.position);
		} catch {}
	}

	function startEdit() {
		if (!ticket) return;
		editTitle = ticket.title;
		editDescription = ticket.description || '';
		editAssignee = ticket.assignee || '';
		editModel = ticket.model || '';
		editStatusId = ticket.status_id;
		if (statuses.length === 0) fetchStatuses();
		isEditing = true;
	}

	function cancelEdit() {
		isEditing = false;
		error = '';
	}

	async function saveEdit() {
		if (!ticket || !editTitle.trim()) return;
		isSaving = true;
		error = '';
		try {
			const res = await fetch(`/api/tickets/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: editTitle.trim(),
					description: editDescription.trim() || null,
					assignee: editAssignee.trim() || null,
					model: editModel.trim() || null,
					status_id: editStatusId ?? ticket.status_id
				})
			});
			const result = await res.json();
			if (result.ok) {
				// Re-fetch to get updated status object
				await fetchTicket();
				isEditing = false;
			} else {
				error = result.error || 'Fehler beim Speichern';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete() {
		if (!ticket || !confirm(`Ticket "${ticket.title}" wirklich löschen?`)) return;
		isDeleting = true;
		try {
			const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) {
				goto(`/projects/${ticket.project_id}?success=Ticket+gelöscht`);
			} else {
				error = result.error || 'Fehler beim Löschen';
			}
		} catch {
			error = 'Netzwerkfehler';
		} finally {
			isDeleting = false;
		}
	}

	async function addComment() {
		if (!newCommentText.trim()) return;
		isAddingComment = true;
		const author = $page.data.session?.username || 'Unbekannt';
		try {
			const res = await fetch(`/api/tickets/${id}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ author, comment_text: newCommentText.trim() })
			});
			const result = await res.json();
			if (result.ok) { newCommentText = ''; await fetchTicket(); }
			else error = result.error || 'Fehler beim Kommentieren';
		} catch { error = 'Netzwerkfehler'; }
		finally { isAddingComment = false; }
	}

	// Manuelles Umschalten IN Human-Intervention/-Answered ist nicht vorgesehen —
	// das läuft ausschließlich über die Inbox im Board. Der aktuelle Status bleibt
	// in der Liste, damit das Dropdown ihn korrekt anzeigt.
	$: editableStatuses = statuses.filter(s => !s.special_type || s.id === ticket?.status_id);

	function connectLiveUpdates(projectId: number) {
		if (eventSource) return;
		eventSource = new EventSource(`/api/projects/${projectId}/events`);
		eventSource.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data) as { op: string; ticket_id: number };
				if (payload.ticket_id !== Number(id) || isEditing) return;
				fetch(`/api/tickets/${id}`)
					.then(r => r.json())
					.then(res => {
						if (!res.ok) return;
						ticket = { ...res.data.ticket, status: res.data.status, tasks: res.data.tasks, comments: res.data.comments, relations: res.data.relations };
						justUpdatedLive = true;
						setTimeout(() => justUpdatedLive = false, 2000);
					})
					.catch(() => {});
			} catch { /* ignore */ }
		};
	}

	onDestroy(() => eventSource?.close());

	async function toggleTask(task: TicketTask) {
		try {
			const res = await fetch(`/api/tasks/${task.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_completed: !task.is_completed })
			});
			const result = await res.json();
			if (result.ok && ticket) {
				ticket.tasks = ticket.tasks.map(t => t.id === task.id ? result.data : t);
				ticket = ticket; // trigger reactivity
			}
		} catch {}
	}

	$: assigneeInitials = ticket?.assignee
		? ticket.assignee.split(' ').map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('')
		: null;

	$: tasksCompleted = ticket?.tasks.filter(t => t.is_completed).length ?? 0;
	$: tasksTotal = ticket?.tasks.length ?? 0;
	$: taskProgress = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

	onMount(fetchTicket);
</script>

<div class="w-full max-w-3xl">
	<!-- Back -->
	<button
		onclick={() => ticket ? goto(`/projects/${ticket.project_id}`) : history.back()}
		class="inline-flex items-center gap-2 mb-6 text-sm transition-all duration-200 group"
		style="color: var(--text-muted);"
		in:fly={{ y: -12, duration: 300, easing: quintOut }}
	>
		<ArrowLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
		Zurück zum Board
	</button>

	{#if error && !isEditing}
		<div class="mb-4 p-4 rounded-xl border text-sm" style="background: rgba(255,34,85,0.08); border-color: rgba(255,34,85,0.4); color: var(--danger);" in:fly={{ y: 8, duration: 200 }}>
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<div class="relative w-10 h-10">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary); box-shadow: 0 0 16px var(--primary-glow);"></div>
			</div>
		</div>

	{:else if ticket}
		<div class="space-y-4" in:fly={{ y: 20, duration: 400, easing: quintOut }}>
			{#if justUpdatedLive}
				<div class="flex items-center gap-1.5 text-xs" style="color: var(--primary);" in:fade={{ duration: 150 }}>
					<span class="w-1.5 h-1.5 rounded-full" style="background: var(--primary); box-shadow: 0 0 6px var(--primary-glow);"></span>
					Gerade aktualisiert
				</div>
			{/if}

			<!-- Main Card -->
			<div class="rounded-2xl overflow-hidden transition-shadow duration-500"
				style="background: var(--card-bg); border: 1px solid var(--border); box-shadow: {justUpdatedLive ? '0 0 0 1px var(--primary), 0 0 20px rgba(0,212,255,0.25)' : '0 0 40px rgba(0,0,0,0.3)'};">

				<!-- Header Bar -->
				<div class="px-6 py-4 flex items-start justify-between gap-4" style="border-bottom: 1px solid var(--border);">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-3 flex-wrap mb-1">
							<span class="text-xs font-mono px-2 py-0.5 rounded" style="background: rgba(0,212,255,0.1); color: var(--primary);">#{ticket.id}</span>
							{#if ticket.status}
								<span class="badge badge-primary">{ticket.status.display_name}</span>
							{/if}
						</div>
						<h1 class="text-xl font-bold mt-2 leading-tight" style="color: var(--text);">{ticket.title}</h1>
					</div>

					<div class="flex items-center gap-2 shrink-0">
						{#if !isEditing}
							<button
								onclick={startEdit}
								class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
								style="color: var(--primary); background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3);"
							>
								<Pencil class="w-3.5 h-3.5" />
								Bearbeiten
							</button>
						{/if}
						<button
							onclick={handleDelete}
							disabled={isDeleting}
							class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
							style="color: var(--danger); background: rgba(255,34,85,0.1); border: 1px solid rgba(255,34,85,0.3);"
						>
							{#if isDeleting}
								<div class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin"></div>
							{:else}
								<Trash2 class="w-3.5 h-3.5" />
							{/if}
							Löschen
						</button>
					</div>
				</div>

				<!-- Inline Edit Form -->
				{#if isEditing}
					<div transition:slide={{ duration: 300, easing: cubicOut }} class="px-6 py-5 space-y-4" style="border-bottom: 1px solid rgba(0,212,255,0.2); background: rgba(0,212,255,0.03);">
						<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--primary);">Ticket bearbeiten</p>

						<!-- Title -->
						<div>
							<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Titel *</label>
							<input type="text" bind:value={editTitle} class="input" placeholder="Titel" autofocus />
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<!-- Status -->
							<div>
								<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Status</label>
								<select bind:value={editStatusId} class="input">
									{#each editableStatuses as s}
										<option value={s.id}>{s.display_name}</option>
									{/each}
								</select>
							</div>

							<!-- Assignee -->
							<div>
								<label class="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style="color: var(--text-muted);">
									<User class="w-3.5 h-3.5" />
									Zugewiesen an
								</label>
								<input type="text" bind:value={editAssignee} class="input" placeholder="Name (optional)" />
							</div>
						</div>

						<!-- Model -->
						<div>
							<label class="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style="color: var(--text-muted);">
								<Cpu class="w-3.5 h-3.5" /> KI-Modell <span class="opacity-50">(optional)</span>
							</label>
							<input type="text" bind:value={editModel} class="input font-mono" placeholder="z.B. claude-sonnet-4-6" />
						</div>

						<!-- Description -->
						<div>
							<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Beschreibung</label>
							<textarea bind:value={editDescription} class="input resize-none" rows="3" placeholder="Details…"></textarea>
						</div>

						{#if error}
							<div class="p-3 rounded-lg border text-sm" style="background: rgba(255,34,85,0.08); border-color: rgba(255,34,85,0.4); color: var(--danger);">{error}</div>
						{/if}

						<div class="flex justify-end gap-2 pt-1">
							<button onclick={cancelEdit} class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all" style="color: var(--text-muted); background: var(--border);">
								<X class="w-3.5 h-3.5" />
								Abbrechen
							</button>
							<button
								onclick={saveEdit}
								disabled={isSaving || !editTitle.trim()}
								class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
								style="background: var(--primary); color: #000; box-shadow: 0 0 12px var(--primary-glow); opacity: {isSaving || !editTitle.trim() ? 0.5 : 1};"
							>
								{#if isSaving}
									<div class="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
									Speichern…
								{:else}
									<Check class="w-3.5 h-3.5" />
									Speichern
								{/if}
							</button>
						</div>
					</div>
				{/if}

				<!-- Metadata Row -->
				<div class="px-6 py-4 flex flex-wrap items-center gap-6" style="border-bottom: 1px solid var(--border);">
					<div class="flex items-center gap-2">
						<User class="w-4 h-4 shrink-0" style="color: var(--text-muted);" />
						<span class="text-sm" style="color: {ticket.assignee ? 'var(--text)' : 'var(--text-muted)'};">
							{ticket.assignee || 'Nicht zugewiesen'}
						</span>
					</div>
					{#if ticket.model}
						<div class="flex items-center gap-2">
							<Cpu class="w-4 h-4 shrink-0" style="color: var(--accent);" />
							<span class="font-mono text-xs px-2 py-0.5 rounded" style="background: rgba(139,92,246,0.12); color: var(--accent); border: 1px solid rgba(139,92,246,0.25);">{ticket.model}</span>
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<Clock class="w-4 h-4 shrink-0" style="color: var(--text-muted);" />
						<span class="text-sm" style="color: var(--text-muted);">
							{new Date(ticket.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
						</span>
					</div>
					<div class="flex items-center gap-2">
						<Clock class="w-4 h-4 shrink-0" style="color: var(--text-muted);" />
						<span class="text-sm" style="color: var(--text-muted);">
							Zuletzt: {new Date(ticket.updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
						</span>
					</div>
				</div>

				<!-- Description -->
				{#if ticket.description}
					<div class="px-6 py-5">
						<div class="markdown-body text-sm leading-relaxed" style="color: var(--text);">{@html renderMarkdown(ticket.description)}</div>
					</div>
				{/if}
			</div>

			<!-- Tasks -->
			<div class="rounded-2xl overflow-hidden" style="background: var(--card-bg); border: 1px solid var(--border);">
				<div class="px-6 py-4 flex items-center justify-between" style="border-bottom: 1px solid var(--border);">
					<h3 class="flex items-center gap-2 font-semibold" style="color: var(--text);">
						<CheckSquare class="w-4 h-4" style="color: var(--accent);" />
						Tasks
					</h3>
					<span class="text-sm" style="color: var(--text-muted);">{tasksCompleted}/{tasksTotal}</span>
				</div>

				{#if tasksTotal > 0}
					<!-- Progress bar -->
					<div class="px-6 pt-4 pb-2">
						<div class="h-1.5 rounded-full overflow-hidden" style="background: var(--border);">
							<div
								class="h-full rounded-full transition-all duration-500"
								style="width: {taskProgress}%; background: {taskProgress === 100 ? 'var(--success)' : 'var(--primary)'}; box-shadow: 0 0 8px {taskProgress === 100 ? 'var(--success-glow)' : 'var(--primary-glow)'};"
							></div>
						</div>
					</div>
				{/if}

				<div class="px-6 pb-4 space-y-1 mt-2">
					{#each ticket.tasks as task (task.id)}
						<label class="flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-150"
							style="color: {task.is_completed ? 'var(--text-muted)' : 'var(--text)'};"
							onmouseenter={(e) => e.currentTarget.style.background = 'var(--border)'}
							onmouseleave={(e) => e.currentTarget.style.background = 'transparent'}
						>
							<input
								type="checkbox"
								checked={task.is_completed}
								onchange={() => toggleTask(task)}
								class="w-4 h-4 rounded shrink-0"
								style="accent-color: var(--primary);"
							/>
							<span class="text-sm {task.is_completed ? 'line-through' : ''}">{task.title}</span>
						</label>
					{/each}

					{#if ticket.tasks.length === 0}
						<p class="text-sm text-center py-4" style="color: var(--text-muted);">Keine Tasks definiert.</p>
					{/if}
				</div>
			</div>

			<!-- Comments -->
			<div class="rounded-2xl overflow-hidden" style="background: var(--card-bg); border: 1px solid var(--border);">
				<div class="px-6 py-4" style="border-bottom: 1px solid var(--border);">
					<h3 class="flex items-center gap-2 font-semibold" style="color: var(--text);">
						<MessageSquare class="w-4 h-4" style="color: var(--accent);" />
						Kommentare
						<span class="text-sm font-normal" style="color: var(--text-muted);">({ticket.comments.length})</span>
					</h3>
				</div>

				<div class="px-6 py-4 space-y-4">
					{#each ticket.comments as comment (comment.id)}
						{@const initials = comment.author.split(' ').map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('')}
						{@const hue = [195, 270, 150, 45][comment.id % 4]}
						<div class="flex gap-3">
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
								style="background: hsl({hue}, 70%, 20%); color: hsl({hue}, 80%, 70%); border: 1px solid hsl({hue}, 60%, 35%);"
							>
								{initials}
							</div>
							<div class="flex-1 min-w-0">
								<div class="rounded-xl px-4 py-3" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border);">
									<div class="flex items-center gap-2 mb-1.5">
										<span class="text-sm font-medium" style="color: var(--text);">{comment.author}</span>
										<span class="text-xs" style="color: var(--text-muted);">
											{new Date(comment.created_at).toLocaleDateString('de-DE')}
										</span>
									</div>
									<p class="text-sm whitespace-pre-wrap leading-relaxed" style="color: var(--text);">{comment.comment_text}</p>
								</div>
							</div>
						</div>
					{/each}

					{#if ticket.comments.length === 0}
						<p class="text-sm text-center py-6" style="color: var(--text-muted);">Keine Kommentare.</p>
					{/if}
				</div>

				<div class="px-6 py-4 space-y-2" style="border-top: 1px solid var(--border); background: rgba(255,255,255,0.02);">
					<textarea bind:value={newCommentText} class="input resize-none text-sm" rows="2" placeholder="Kommentar hinzufügen…"></textarea>
					<div class="flex justify-end">
						<button onclick={addComment} disabled={!newCommentText.trim() || isAddingComment}
							class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
							style="background: var(--accent); color: #fff; opacity: {!newCommentText.trim() || isAddingComment ? 0.5 : 1};">
							{#if isAddingComment}<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{:else}<MessageSquare class="w-3.5 h-3.5" />{/if}
							Kommentieren
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
