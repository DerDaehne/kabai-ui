<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { renderMarkdown } from '$lib/markdown';
	import { fly, slide } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { CheckSquare, MessageSquare, User, Clock, Trash2, Pencil, X, Check, Bot, Cpu, Send, Flag, GitBranch, Plus } from 'lucide-svelte';
	import type { TicketDetailed, BoardStatus, TicketTask, Ticket, RelationType } from '$lib/types';

	export let ticketId: number;
	export let onClose: () => void = () => {};
	export let onDeleted: () => void = () => {};

	let ticket: TicketDetailed | null = null;
	let statuses: BoardStatus[] = [];
	let isLoading = true;
	let error = '';
	let isEditing = false;
	let isSaving = false;
	let isDeleting = false;
	let isReturning = false;

	let editTitle = '';
	let editDescription = '';
	let editAssignee = '';
	let editModel = '';
	let editStatusId: number | null = null;
	let editType: 'ticket' | 'epic' = 'ticket';

	// Relations
	let showAddRelation = false;
	let projectTickets: Ticket[] = [];
	let relationTargetId: number | null = null;
	let relationType: RelationType = 'relates_to';
	let isAddingRelation = false;
	let deletingRelationId: number | null = null;

	// Comments
	let newCommentText = '';
	let isAddingComment = false;

	// Label aus Sicht des aktuell offenen Tickets: "outgoing" = dieses Ticket ist from_ticket
	const relationLabels: Record<RelationType, string> = {
		parent_of: 'ist Parent von',
		blocks: 'blockiert',
		duplicate_of: 'ist Duplikat von',
		relates_to: 'bezieht sich auf'
	};
	const incomingRelationLabels: Record<RelationType, string> = {
		parent_of: 'ist Kind von',
		blocks: 'wird blockiert von',
		duplicate_of: 'ist Original von',
		relates_to: 'bezieht sich auf'
	};

	async function fetchTicket() {
		try {
			isLoading = true;
			const res = await fetch(`/api/tickets/${ticketId}`);
			const result = await res.json();
			if (result.ok) {
				ticket = { ...result.data.ticket, status: result.data.status, tasks: result.data.tasks, comments: result.data.comments, relations: result.data.relations };
				if (ticket.status?.special_type === 'human_intervention') await fetchStatuses();
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
		editType = ticket.type;
		if (statuses.length === 0) fetchStatuses();
		isEditing = true;
	}

	function cancelEdit() { isEditing = false; error = ''; }

	async function saveEdit() {
		if (!ticket || !editTitle.trim()) return;
		isSaving = true; error = '';
		try {
			const res = await fetch(`/api/tickets/${ticketId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: editTitle.trim(),
					description: editDescription.trim() || null,
					assignee: editAssignee.trim() || null,
					model: editModel.trim() || null,
					status_id: editStatusId ?? ticket.status_id,
					type: editType
				})
			});
			const result = await res.json();
			if (result.ok) { await fetchTicket(); isEditing = false; }
			else error = result.error || 'Fehler beim Speichern';
		} catch { error = 'Netzwerkfehler'; }
		finally { isSaving = false; }
	}

	async function returnToAI() {
		if (!ticket || !humanAnsweredStatus) return;
		isReturning = true; error = '';
		try {
			const res = await fetch(`/api/tickets/${ticketId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status_id: humanAnsweredStatus.id })
			});
			const result = await res.json();
			if (result.ok) await fetchTicket();
			else error = result.error || 'Fehler beim Zurückgeben';
		} catch { error = 'Netzwerkfehler'; }
		finally { isReturning = false; }
	}

	async function handleDelete() {
		if (!ticket || !confirm(`Ticket "${ticket.title}" löschen?`)) return;
		isDeleting = true;
		try {
			const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) { onDeleted(); onClose(); }
			else error = result.error || 'Fehler beim Löschen';
		} catch { error = 'Netzwerkfehler'; }
		finally { isDeleting = false; }
	}

	async function openAddRelation() {
		showAddRelation = true;
		relationTargetId = null;
		relationType = 'relates_to';
		if (ticket && projectTickets.length === 0) {
			try {
				const res = await fetch(`/api/projects/${ticket.project_id}/tickets`);
				const result = await res.json();
				if (result.ok) projectTickets = result.data.filter((t: Ticket) => t.id !== ticket!.id);
			} catch {}
		}
	}

	async function addRelation() {
		if (!ticket || !relationTargetId) return;
		isAddingRelation = true; error = '';
		try {
			const res = await fetch(`/api/tickets/${ticketId}/relations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ to_ticket_id: relationTargetId, relation_type: relationType })
			});
			const result = await res.json();
			if (result.ok) { await fetchTicket(); showAddRelation = false; }
			else error = result.error || 'Fehler beim Verknüpfen';
		} catch { error = 'Netzwerkfehler'; }
		finally { isAddingRelation = false; }
	}

	async function removeRelation(relationId: number) {
		deletingRelationId = relationId;
		try {
			const res = await fetch(`/api/tickets/${ticketId}/relations/${relationId}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.ok) await fetchTicket();
		} catch {}
		finally { deletingRelationId = null; }
	}

	async function addComment() {
		if (!newCommentText.trim()) return;
		isAddingComment = true;
		const author = $page.data.session?.username || 'Unbekannt';
		try {
			const res = await fetch(`/api/tickets/${ticketId}/comments`, {
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
				ticket = ticket;
			}
		} catch {}
	}

	$: humanAnsweredStatus = statuses.find(s => s.special_type === 'human_answered') ?? null;
	// Manuelles Umschalten IN Human-Intervention/-Answered ist nicht vorgesehen —
	// das läuft ausschließlich über die Inbox bzw. den "An die KI zurückgeben"-Button.
	// Der aktuelle Status bleibt in der Liste, damit das Dropdown ihn korrekt anzeigt.
	$: editableStatuses = statuses.filter(s => !s.special_type || s.id === ticket?.status_id);
	$: isAwaitingHuman = ticket?.status?.special_type === 'human_intervention';

	$: tasksCompleted = ticket?.tasks.filter(t => t.is_completed).length ?? 0;
	$: tasksTotal = ticket?.tasks.length ?? 0;
	$: taskProgress = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

	onMount(fetchTicket);
</script>

<div class="p-6 pr-14">
	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-20 gap-4">
			<div class="relative w-10 h-10">
				<div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
					style="border-top-color: var(--primary); box-shadow: 0 0 16px var(--primary-glow);"></div>
			</div>
		</div>
	{:else if error && !ticket}
		<div class="p-4 rounded-xl border text-sm" style="background: rgba(255,34,85,0.08); border-color: rgba(255,34,85,0.4); color: var(--danger);">{error}</div>
	{:else if ticket}
		<div class="space-y-4" in:fly={{ y: 12, duration: 300, easing: quintOut }}>
			<!-- Title + badges + actions -->
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 flex-wrap mb-2">
						<span class="text-xs font-mono px-2 py-0.5 rounded" style="background: rgba(0,212,255,0.1); color: var(--primary);">#{ticket.id}</span>
						{#if ticket.status}
							<span class="badge badge-primary">{ticket.status.display_name}</span>
						{/if}
						{#if ticket.type === 'epic'}
							<span class="flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium"
								style="background: rgba(255,208,0,0.12); color: #ffd000; border: 1px solid rgba(255,208,0,0.3);">
								<Flag class="w-3 h-3" /> Epic
							</span>
						{/if}
					</div>
					<h2 class="text-xl font-bold leading-tight" style="color: var(--text);">{ticket.title}</h2>
				</div>
				<div class="flex items-center gap-2 shrink-0">
					{#if !isEditing}
						<button onclick={startEdit}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
							style="color: var(--primary); background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3);">
							<Pencil class="w-3.5 h-3.5" /> Bearbeiten
						</button>
					{/if}
					<button onclick={handleDelete} disabled={isDeleting}
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
						style="color: var(--danger); background: rgba(255,34,85,0.1); border: 1px solid rgba(255,34,85,0.3);">
						{#if isDeleting}
							<div class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<Trash2 class="w-3.5 h-3.5" />
						{/if}
						Löschen
					</button>
				</div>
			</div>

			<!-- Human Intervention Banner -->
			{#if isAwaitingHuman}
				<div class="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
					style="border: 1px solid rgba(0,212,255,0.3); background: rgba(0,212,255,0.06);"
					in:fly={{ y: -8, duration: 250 }}>
					<p class="text-sm" style="color: var(--text);">
						Dieses Ticket wartet auf deine Antwort. Beantworte die Frage der KI (z.B. per Kommentar) und gib es dann zurück.
					</p>
					<button onclick={returnToAI} disabled={isReturning || !humanAnsweredStatus}
						class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all"
						style="background: var(--primary); color: #000; box-shadow: 0 0 10px var(--primary-glow); opacity: {isReturning || !humanAnsweredStatus ? 0.5 : 1};">
						{#if isReturning}
							<div class="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<Send class="w-3.5 h-3.5" />
						{/if}
						An die KI zurückgeben
					</button>
				</div>
			{/if}

			<!-- Inline edit -->
			{#if isEditing}
				<div transition:slide={{ duration: 280, easing: cubicOut }}
					class="rounded-xl p-4 space-y-3"
					style="border: 1px solid rgba(0,212,255,0.25); background: rgba(0,212,255,0.03);">
					<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--primary);">Bearbeiten</p>
					<div>
						<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Titel *</label>
						<input type="text" bind:value={editTitle} class="input" autofocus />
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Status</label>
							<select bind:value={editStatusId} class="input">
								{#each editableStatuses as s}<option value={s.id}>{s.display_name}</option>{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-medium mb-1.5 flex items-center gap-1" style="color: var(--text-muted);">
								<User class="w-3 h-3" /> Assignee
							</label>
							<input type="text" bind:value={editAssignee} class="input" placeholder="Optional" />
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style="color: var(--text-muted);">
								<Cpu class="w-3 h-3" /> KI-Modell <span class="opacity-50">(optional)</span>
							</label>
							<input type="text" bind:value={editModel} class="input font-mono" placeholder="z.B. claude-sonnet-4-6" />
						</div>
						<div>
							<label class="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style="color: var(--text-muted);">
								<Flag class="w-3 h-3" /> Typ
							</label>
							<select bind:value={editType} class="input">
								<option value="ticket">Ticket</option>
								<option value="epic">Epic</option>
							</select>
						</div>
					</div>
					<div>
						<label class="block text-xs font-medium mb-1.5" style="color: var(--text-muted);">Beschreibung</label>
						<textarea bind:value={editDescription} class="input resize-none" rows="3" placeholder="Details…"></textarea>
					</div>
					{#if error}
						<div class="p-2 rounded text-xs" style="background: rgba(255,34,85,0.1); color: var(--danger);">{error}</div>
					{/if}
					<div class="flex justify-end gap-2">
						<button onclick={cancelEdit} class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
							style="color: var(--text-muted); background: var(--border);"><X class="w-3.5 h-3.5" /> Abbrechen</button>
						<button onclick={saveEdit} disabled={isSaving || !editTitle.trim()}
							class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
							style="background: var(--primary); color: #000; box-shadow: 0 0 10px var(--primary-glow); opacity: {isSaving || !editTitle.trim() ? 0.5 : 1};">
							{#if isSaving}<div class="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>{:else}<Check class="w-3.5 h-3.5" />{/if}
							Speichern
						</button>
					</div>
				</div>
			{/if}

			<!-- Meta -->
			<div class="flex flex-wrap items-center gap-5 py-3 text-sm" style="border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
				<div class="flex items-center gap-1.5" style="color: {ticket.assignee ? 'var(--text)' : 'var(--text-muted)'};">
					<User class="w-3.5 h-3.5 shrink-0" style="color: var(--text-muted);" />
					{ticket.assignee || 'Nicht zugewiesen'}
				</div>
				{#if ticket.model}
					<div class="flex items-center gap-1.5">
						<Cpu class="w-3.5 h-3.5 shrink-0" style="color: var(--accent);" />
						<span class="font-mono text-xs px-2 py-0.5 rounded" style="background: rgba(139,92,246,0.12); color: var(--accent); border: 1px solid rgba(139,92,246,0.25);">{ticket.model}</span>
					</div>
				{/if}
				<div class="flex items-center gap-1.5" style="color: var(--text-muted);">
					<Clock class="w-3.5 h-3.5 shrink-0" />
					{new Date(ticket.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
				</div>
			</div>

			<!-- Description -->
			{#if ticket.description}
				<div class="markdown-body text-sm leading-relaxed" style="color: var(--text);">{@html renderMarkdown(ticket.description)}</div>
			{/if}

			<!-- Tasks -->
			{#if tasksTotal > 0}
				<div class="rounded-xl overflow-hidden" style="border: 1px solid var(--border);">
					<div class="px-4 py-3 flex items-center justify-between" style="border-bottom: 1px solid var(--border);">
						<h3 class="flex items-center gap-2 text-sm font-semibold" style="color: var(--text);">
							<CheckSquare class="w-4 h-4" style="color: var(--accent);" /> Tasks
						</h3>
						<span class="text-xs" style="color: var(--text-muted);">{tasksCompleted}/{tasksTotal}</span>
					</div>
					<div class="px-4 pt-3 pb-1">
						<div class="h-1 rounded-full mb-3" style="background: var(--border);">
							<div class="h-full rounded-full transition-all duration-500" style="width: {taskProgress}%; background: {taskProgress === 100 ? 'var(--success)' : 'var(--primary)'}; box-shadow: 0 0 6px {taskProgress === 100 ? 'var(--success-glow)' : 'var(--primary-glow)'};"></div>
						</div>
					</div>
					<div class="px-4 pb-3 space-y-0.5">
						{#each ticket.tasks as task (task.id)}
							<label class="flex items-center gap-3 py-1.5 px-2 rounded-lg cursor-pointer transition-all"
								onmouseenter={(e) => e.currentTarget.style.background = 'var(--border)'}
								onmouseleave={(e) => e.currentTarget.style.background = 'transparent'}>
								<input type="checkbox" checked={task.is_completed} onchange={() => toggleTask(task)}
									class="w-4 h-4 rounded shrink-0" style="accent-color: var(--primary);" />
								<span class="text-sm {task.is_completed ? 'line-through' : ''}"
									style="color: {task.is_completed ? 'var(--text-muted)' : 'var(--text)'};">{task.title}</span>
							</label>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Relations -->
			<div class="rounded-xl overflow-hidden" style="border: 1px solid var(--border);">
				<div class="px-4 py-3 flex items-center justify-between" style="border-bottom: 1px solid var(--border);">
					<h3 class="flex items-center gap-2 text-sm font-semibold" style="color: var(--text);">
						<GitBranch class="w-4 h-4" style="color: var(--accent);" /> Verknüpfungen
						{#if ticket.relations.length > 0}<span class="text-xs font-normal" style="color: var(--text-muted);">({ticket.relations.length})</span>{/if}
					</h3>
					{#if !showAddRelation}
						<button onclick={openAddRelation}
							class="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all"
							style="color: var(--accent); background: rgba(139,92,246,0.1);">
							<Plus class="w-3 h-3" /> Hinzufügen
						</button>
					{/if}
				</div>

				{#if showAddRelation}
					<div class="px-4 py-3 space-y-2" style="border-bottom: 1px solid var(--border); background: rgba(139,92,246,0.03);" transition:slide={{ duration: 200 }}>
						<div class="grid grid-cols-2 gap-2">
							<select bind:value={relationType} class="input text-xs">
								{#each Object.entries(relationLabels) as [value, label]}<option {value}>{label}</option>{/each}
							</select>
							<select bind:value={relationTargetId} class="input text-xs">
								<option value={null}>Ticket wählen…</option>
								{#each projectTickets as t}<option value={t.id}>#{t.id} — {t.title}</option>{/each}
							</select>
						</div>
						<div class="flex justify-end gap-2">
							<button onclick={() => showAddRelation = false} class="px-3 py-1 rounded-md text-xs" style="color: var(--text-muted); background: var(--border);">Abbrechen</button>
							<button onclick={addRelation} disabled={!relationTargetId || isAddingRelation}
								class="px-3 py-1 rounded-md text-xs font-semibold" style="background: var(--accent); color: #fff; opacity: {!relationTargetId || isAddingRelation ? 0.5 : 1};">
								Verknüpfen
							</button>
						</div>
					</div>
				{/if}

				{#if ticket.relations.length === 0 && !showAddRelation}
					<div class="px-4 py-4 text-xs text-center" style="color: var(--text-muted);">Keine Verknüpfungen</div>
				{:else if ticket.relations.length > 0}
					<div class="px-4 py-2 space-y-1">
						{#each ticket.relations as rel (rel.id)}
							<div class="flex items-center justify-between gap-2 py-1.5 text-xs">
								<span style="color: var(--text-muted);">
									{ticket.title}
									<span style="color: var(--accent);">{rel.direction === 'outgoing' ? relationLabels[rel.relation_type] : incomingRelationLabels[rel.relation_type]}</span>
									<a href="/tickets/{rel.other_ticket_id}" style="color: var(--text);">#{rel.other_ticket_id} — {rel.other_ticket_title}</a>
								</span>
								<button onclick={() => removeRelation(rel.id)} disabled={deletingRelationId === rel.id}
									class="shrink-0 p-1 rounded transition-all" style="color: var(--danger); opacity: {deletingRelationId === rel.id ? 0.5 : 1};">
									<X class="w-3 h-3" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Comments -->
			<div class="rounded-xl overflow-hidden" style="border: 1px solid var(--border);">
				<div class="px-4 py-3" style="border-bottom: 1px solid var(--border);">
					<h3 class="flex items-center gap-2 text-sm font-semibold" style="color: var(--text);">
						<MessageSquare class="w-4 h-4" style="color: var(--accent);" />
						Kommentare {#if ticket.comments.length > 0}({ticket.comments.length}){/if}
					</h3>
				</div>
				{#if ticket.comments.length > 0}
					<div class="px-4 py-3 space-y-3">
						{#each ticket.comments as comment (comment.id)}
							{@const hue = [195, 270, 150, 45][comment.id % 4]}
							<div class="flex gap-3">
								<div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
									style="background: hsl({hue},70%,20%); color: hsl({hue},80%,70%); border: 1px solid hsl({hue},60%,35%);">
									{comment.author.split(' ').map((p: string) => p.charAt(0).toUpperCase()).slice(0,2).join('')}
								</div>
								<div class="flex-1 rounded-xl px-3 py-2.5" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border);">
									<div class="flex items-center gap-2 mb-1">
										<span class="text-xs font-semibold" style="color: var(--text);">{comment.author}</span>
										<span class="text-xs" style="color: var(--text-muted);">{new Date(comment.created_at).toLocaleDateString('de-DE')}</span>
									</div>
									<p class="text-sm whitespace-pre-wrap" style="color: var(--text);">{comment.comment_text}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
				<div class="px-4 py-3 space-y-2" style="border-top: 1px solid var(--border); background: rgba(255,255,255,0.02);">
					<textarea bind:value={newCommentText} class="input resize-none text-sm" rows="2" placeholder="Kommentar hinzufügen…"></textarea>
					<div class="flex justify-end">
						<button onclick={addComment} disabled={!newCommentText.trim() || isAddingComment}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
							style="background: var(--accent); color: #fff; opacity: {!newCommentText.trim() || isAddingComment ? 0.5 : 1};">
							{#if isAddingComment}<div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{:else}<MessageSquare class="w-3.5 h-3.5" />{/if}
							Kommentieren
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
