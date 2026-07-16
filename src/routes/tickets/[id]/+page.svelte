<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { renderMarkdown } from '$lib/markdown';
	import { fly, slide } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { ArrowLeft, MessageSquare, User, Clock, Trash2, Pencil, X, Check, Bot, Cpu, BookOpen, Compass, AlertTriangle, Archive, Plus } from 'lucide-svelte';
	import OrbitHighlight from '$components/ui/OrbitHighlight.svelte';
	import { pushAiEvent } from '$lib/stores/aiActivity';
	import type { TicketDetailed, BoardStatus, TicketTask } from '$lib/types';
	import Spinner from '$components/ui/Spinner.svelte';
	import ErrorBanner from '$components/ui/ErrorBanner.svelte';
	import BannerConfirm from '$components/ui/BannerConfirm.svelte';
	import { formatDate, initials } from '$lib/utils/format';

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
	// Treibt die einmalige Orbit-Highlight-Animation auf der Haupt-Karte, wenn ein
	// Live-Refresh eintrifft (siehe OrbitHighlight.svelte).
	let orbitSignal = 0;

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
					relations: result.data.relations,
					linked_notes: result.data.linked_notes ?? []
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

	// Ticket #508: window.confirm ersetzt durch das Band-Popup (BannerConfirm).
	let pendingDeleteTicket = false;

	function handleDelete() {
		if (!ticket) return;
		pendingDeleteTicket = true;
	}

	function cancelDeleteTicket() {
		pendingDeleteTicket = false;
	}

	async function confirmDeleteTicket() {
		if (!ticket || isDeleting) return;
		pendingDeleteTicket = false;
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
				pushAiEvent(payload.ticket_id, payload.op);
				if (payload.ticket_id !== Number(id) || isEditing) return;
				fetch(`/api/tickets/${id}`)
					.then(r => r.json())
					.then(res => {
						if (!res.ok) return;
						ticket = { ...res.data.ticket, status: res.data.status, tasks: res.data.tasks, comments: res.data.comments, relations: res.data.relations, linked_notes: res.data.linked_notes ?? [] };
						orbitSignal += 1;
					})
					.catch(() => {});
			} catch { /* ignore */ }
		};
	}

	onDestroy(() => eventSource?.close());

	async function toggleTask(task: TicketTask) {
		try {
			const res = await fetch(`/api/tickets/${id}/tasks/${task.id}`, {
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

	let newTaskTitle = '';
	let isAddingTask = false;
	let deletingTaskId: number | null = null;

	async function addTask() {
		if (!newTaskTitle.trim() || !ticket) return;
		isAddingTask = true;
		try {
			const res = await fetch(`/api/tickets/${id}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: newTaskTitle.trim() })
			});
			const result = await res.json();
			if (result.ok) {
				ticket.tasks = [...ticket.tasks, result.data];
				newTaskTitle = '';
			} else error = result.error || 'Fehler beim Anlegen der Task';
		} catch { error = 'Netzwerkfehler'; }
		finally { isAddingTask = false; }
	}

	async function deleteTask(taskId: number) {
		deletingTaskId = taskId;
		try {
			const res = await fetch(`/api/tickets/${id}/tasks/${taskId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok && ticket) {
				ticket.tasks = ticket.tasks.filter(t => t.id !== taskId);
			}
		} catch {}
		finally { deletingTaskId = null; }
	}

	const noteRelationLabels: Record<string, string> = {
		documents: 'dokumentiert',
		created_by: 'erstellt durch',
		verified_by: 'verifiziert durch',
		references: 'referenziert'
	};

	$: assigneeInitials = ticket?.assignee ? initials(ticket.assignee) : null;

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
		<div class="mb-4">
			<ErrorBanner message={error} />
		</div>
	{/if}

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-24 gap-4">
			<Spinner />
		</div>

	{:else if ticket}
		<div class="space-y-4" in:fly={{ y: 20, duration: 400, easing: quintOut }}>
			<!-- Live-Update wird über eine einmalige Orbit-Animation entlang der Karten-Kontur
			     visualisiert (kein einschiebender Hinweistext, der das Layout verschiebt, #309). -->

			<!-- Main Card -->
			<div class="relative rounded-2xl overflow-hidden"
				style="background: var(--card-bg); border: 1px solid var(--edge);">
				<OrbitHighlight signal={orbitSignal || null} radius="1rem" />

				<!-- Header Bar -->
				<div class="px-6 py-4 flex items-start justify-between gap-4">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-3 flex-wrap mb-1">
							<span class="text-xs font-mono" style="color: var(--text-muted);">#{ticket.id}</span>
							{#if ticket.status}
								<span class="status-chip" style="--chip-color: var(--color-primary);">{ticket.status.display_name}</span>
							{/if}
							{#if ticket.docs_required}
								<span class="flex items-center gap-1 text-xs font-medium"
									title="Dieses Ticket erfordert eine verlinkte Knowledge-Base-Note, bevor es geschlossen werden kann"
									style="color: var(--text-muted);">
									<BookOpen class="w-3 h-3" /> Doku-Pflicht
								</span>
							{/if}
						</div>
						<h1 class="text-xl font-bold mt-2 leading-tight" style="color: var(--text);">{ticket.title}</h1>
					</div>

					<div class="flex items-center gap-2 shrink-0">
						{#if !isEditing}
							<button
								onclick={startEdit}
								class="btn-subtle flex items-center gap-2 px-3 py-1.5 text-sm font-medium"
							>
								<Pencil class="w-3.5 h-3.5" />
								Bearbeiten
							</button>
						{/if}
						<button
							onclick={handleDelete}
							disabled={isDeleting}
							class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
							style="color: var(--danger); background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);"
						>
							{#if isDeleting}
								<Spinner size={3.5} color="currentColor" thickness="border" />
							{:else}
								<Trash2 class="w-3.5 h-3.5" />
							{/if}
							Löschen
						</button>
					</div>
				</div>
				<div class="hairline"></div>

				<!-- Inline Edit Form -->
				{#if isEditing}
					<div transition:slide={{ duration: 300, easing: cubicOut }} class="px-6 py-5 space-y-4" style="background: color-mix(in srgb, var(--color-primary) 3%, transparent);">
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
							<textarea bind:value={editDescription} class="input resize-y" rows="6" placeholder="Details…"></textarea>
						</div>

						{#if error}
							<ErrorBanner message={error} compact />
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
								style="background: var(--primary); color: #000; opacity: {isSaving || !editTitle.trim() ? 0.5 : 1};"
							>
								{#if isSaving}
									<Spinner size={3.5} color="black" thickness="border-2" />
									Speichern…
								{:else}
									<Check class="w-3.5 h-3.5" />
									Speichern
								{/if}
							</button>
						</div>
					</div>
					<div class="hairline"></div>
				{/if}

				<!-- Metadata Row -->
				<div class="px-6 py-4 flex flex-wrap items-center gap-6">
					<div class="flex items-center gap-2">
						<User class="w-4 h-4 shrink-0" style="color: var(--text-muted);" />
						<span class="text-sm" style="color: {ticket.assignee ? 'var(--text)' : 'var(--text-muted)'};">
							{ticket.assignee || 'Nicht zugewiesen'}
						</span>
					</div>
					{#if ticket.model}
						<div class="flex items-center gap-2">
							<Cpu class="w-4 h-4 shrink-0" style="color: var(--accent);" />
							<span class="font-mono text-xs px-1.5 py-0.5 rounded" style="background: var(--color-surface-hover); color: var(--color-text-secondary);">{ticket.model}</span>
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<Clock class="w-4 h-4 shrink-0" style="color: var(--text-muted);" />
						<span class="text-xs font-mono" style="color: var(--text-muted);">
							{formatDate(ticket.created_at)}
						</span>
					</div>
					<div class="flex items-center gap-2">
						<Clock class="w-4 h-4 shrink-0" style="color: var(--text-muted);" />
						<span class="text-xs font-mono" style="color: var(--text-muted);">
							Zuletzt: {formatDate(ticket.updated_at)}
						</span>
					</div>
				</div>

				<!-- Description -->
				{#if ticket.description}
					<div class="hairline"></div>
					<div class="px-6 py-5">
						<div class="markdown-body text-sm leading-relaxed" style="color: var(--text);">{@html renderMarkdown(ticket.description)}</div>
					</div>
				{/if}
			</div>

			<!-- Tasks -->
			<section>
				<div class="pb-2 flex items-center justify-between">
					<h3 class="section-heading">Tasks</h3>
					<span class="text-xs font-mono" style="color: var(--text-muted);">{tasksCompleted}/{tasksTotal}</span>
				</div>
				<div class="hairline"></div>

				{#if tasksTotal > 0}
					<!-- Progress bar -->
					<div class="pt-4 pb-2">
						<div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.06);">
							<div
								class="h-full rounded-full transition-all duration-500"
								style="width: {taskProgress}%; background: {taskProgress === 100 ? 'var(--success)' : 'var(--primary)'};"
							></div>
						</div>
					</div>
				{/if}

				<div class="pb-2 space-y-1 mt-2">
					{#each ticket.tasks as task (task.id)}
						<div class="group flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-150 hover:bg-[var(--color-surface-hover)]"
							style="color: {task.is_completed ? 'var(--text-muted)' : 'var(--text)'};"
						>
							<label class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
								<input
									type="checkbox"
									checked={task.is_completed}
									onchange={() => toggleTask(task)}
									class="w-4 h-4 rounded shrink-0"
									style="accent-color: var(--primary);"
								/>
								<span class="text-sm {task.is_completed ? 'line-through' : ''}">{task.title}</span>
							</label>
							<button onclick={() => deleteTask(task.id)} disabled={deletingTaskId === task.id}
								class="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
								style="color: var(--danger);" title="Task löschen">
								<X class="w-3.5 h-3.5" />
							</button>
						</div>
					{/each}

					{#if ticket.tasks.length === 0}
						<p class="text-sm text-center py-4" style="color: var(--text-muted);">Keine Tasks definiert.</p>
					{/if}
				</div>

				<div class="pt-2 flex gap-2">
					<input type="text" bind:value={newTaskTitle} placeholder="Neue Task…"
						class="input text-sm flex-1"
						onkeydown={(e) => e.key === 'Enter' && addTask()} />
					<button onclick={addTask} disabled={!newTaskTitle.trim() || isAddingTask}
						class="btn-subtle flex items-center gap-1.5 px-4 py-2 text-sm font-medium shrink-0">
						{#if isAddingTask}<Spinner size={3.5} color="currentColor" thickness="border-2" />{:else}<Plus class="w-4 h-4" />{/if}
						Hinzufügen
					</button>
				</div>
			</section>

			<!-- Knowledge-Base-Notes -->
			{#if ticket.docs_required || ticket.linked_notes.length > 0}
				<section>
					<div class="pb-2">
						<h3 class="section-heading flex items-center gap-2">
							Knowledge Base
							{#if ticket.linked_notes.length > 0}<span class="text-xs font-mono normal-case tracking-normal" style="color: var(--text-muted);">{ticket.linked_notes.length}</span>{/if}
						</h3>
					</div>
					<div class="hairline"></div>
					{#if ticket.docs_required && ticket.linked_notes.length === 0}
						<div class="my-4 flex items-start gap-2.5 p-3 rounded-lg text-sm"
							style="background: color-mix(in srgb, var(--color-warning) 7%, transparent); border-left: 2px solid var(--color-warning); color: var(--color-warning);">
							<AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
							<span>Dieses Ticket hat <strong>Doku-Pflicht</strong>, aber noch keine verlinkte Note — es kann erst geschlossen werden, wenn eine Knowledge-Base-Note verlinkt ist (via <code>kabai_docs_link_ticket</code>) oder die Pflicht mit Begründung entfernt wird.</span>
						</div>
					{/if}
					{#if ticket.linked_notes.length > 0}
						<div class="py-3 space-y-1">
							{#each ticket.linked_notes as ln (`${ln.note_id}-${ln.relation}`)}
								<a href="/notes/{ln.slug}"
									class="flex items-center gap-2.5 py-2 px-3 rounded-lg text-sm transition-all hover:bg-[var(--color-surface-hover)]"
									style="{ln.archived ? 'opacity: 0.55;' : ''}">
									{#if ln.kind === 'hub'}
										<Compass class="w-4 h-4 shrink-0" style="color: var(--color-warning);" />
									{:else}
										<BookOpen class="w-4 h-4 shrink-0" style="color: {ln.kind === 'adr' ? 'var(--color-secondary)' : 'var(--primary)'};" />
									{/if}
									<span class="text-xs font-medium px-1.5 py-0.5 rounded shrink-0" style="background: var(--color-surface-hover); color: var(--color-text-secondary);">{noteRelationLabels[ln.relation] ?? ln.relation}</span>
									<span class="truncate" style="color: var(--text);">{ln.title}</span>
									{#if ln.archived}<Archive class="w-3.5 h-3.5 shrink-0" style="color: var(--text-muted);" />{/if}
									<code class="text-xs ml-auto shrink-0 hidden sm:inline" style="color: var(--text-muted);">{ln.slug}</code>
								</a>
							{/each}
						</div>
					{/if}
				</section>
			{/if}

			<!-- Comments -->
			<section>
				<div class="pb-2">
					<h3 class="section-heading flex items-center gap-2">
						Kommentare
						<span class="text-xs font-mono normal-case tracking-normal" style="color: var(--text-muted);">{ticket.comments.length}</span>
					</h3>
				</div>
				<div class="hairline"></div>

				<div class="py-4 space-y-4">
					{#each ticket.comments as comment (comment.id)}
						{@const commentInitials = initials(comment.author)}
						<div class="flex gap-3">
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
								style="background: var(--color-surface-hover); color: var(--color-text-secondary);"
							>
								{commentInitials}
							</div>
							<div class="flex-1 min-w-0">
								<div class="rounded-lg px-4 py-3" style="background: rgba(255,255,255,0.03);">
									<div class="flex items-center gap-2 mb-1.5">
										<span class="text-sm font-medium" style="color: var(--text);">{comment.author}</span>
										<span class="text-xs font-mono" style="color: var(--text-muted);">
											{formatDate(comment.created_at, true)}
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

				<div class="pt-2 space-y-2">
					<textarea bind:value={newCommentText} class="input resize-none text-sm" rows="2" placeholder="Kommentar hinzufügen…"></textarea>
					<div class="flex justify-end">
						<button onclick={addComment} disabled={!newCommentText.trim() || isAddingComment}
							class="btn-subtle flex items-center gap-1.5 px-4 py-2 text-sm font-medium">
							{#if isAddingComment}<Spinner size={3.5} color="currentColor" thickness="border-2" />{:else}<MessageSquare class="w-3.5 h-3.5" />{/if}
							Kommentieren
						</button>
					</div>
				</div>
			</section>
		</div>
	{/if}
</div>

<BannerConfirm
	open={pendingDeleteTicket}
	text={ticket ? `Ticket #${ticket.id} „${ticket.title}" wirklich löschen?` : ''}
	tone="danger"
	onConfirm={confirmDeleteTicket}
	onCancel={cancelDeleteTicket}
/>
