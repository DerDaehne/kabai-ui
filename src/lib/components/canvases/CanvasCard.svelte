<script lang="ts">
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import { ChevronUp, X, Trash2, Pencil, Layers, Plus, Check } from 'lucide-svelte';
	import type { Canvas, Project } from '$lib/types';

	// Ticket #526: Canvas-Card nach Vorbild ProjectCard.svelte (#495) — Umbenennen/
	// Löschen/Projekt-Verknüpfung laufen weiterhin direkt auf der Karte.
	// Ticket #527: die Karte selbst hat jetzt eine Detailseite (Editor-
	// Vollansicht /canvases/{id}) — Klick auf die Karte navigiert dorthin,
	// außer auf Kebab-Menü/Badges/Buttons innerhalb der Karte (die stoppen
	// die Propagation selbst bzw. sind in interaktiven Unterbereichen).
	export let canvas: Canvas;
	// Alle bekannten Projekte, für Namen-Lookup der Badges und die "+"-Auswahlliste.
	export let allProjects: Project[] = [];
	export let onDelete: (id: number) => void = () => {};
	export let onRename: (id: number, name: string) => Promise<boolean> = async () => false;
	export let onLinkProject: (id: number, projectId: number) => void = () => {};
	export let onUnlinkProject: (id: number, projectId: number) => void = () => {};
	// Exklusiv-Zustand: nur eine Card zeigt ihr Kontextmenü gleichzeitig.
	export let isMenuOpen = false;
	export let onRequestOpen: (id: number) => void = () => {};
	export let onRequestClose: () => void = () => {};

	let dropButtonEl: HTMLButtonElement;
	let firstMenuButtonEl: HTMLButtonElement;
	let renameInputEl: HTMLInputElement;

	let isRenaming = false;
	let renameValue = '';
	let showProjectPicker = false;

	$: linkedProjects = canvas.project_ids
		.map((pid) => allProjects.find((p) => p.id === pid))
		.filter((p): p is Project => !!p);

	$: linkableProjects = allProjects.filter((p) => !canvas.project_ids.includes(p.id));

	function openMenu() {
		onRequestOpen(canvas.id);
	}

	function closeMenu() {
		onRequestClose();
		dropButtonEl?.focus();
	}

	function startRename() {
		renameValue = canvas.name;
		isRenaming = true;
		showProjectPicker = false;
		queueMicrotask(() => renameInputEl?.focus());
	}

	function cancelRename() {
		isRenaming = false;
		renameValue = '';
	}

	async function confirmRename() {
		const trimmed = renameValue.trim();
		if (!trimmed || trimmed === canvas.name) {
			cancelRename();
			return;
		}
		const ok = await onRename(canvas.id, trimmed);
		if (ok) isRenaming = false;
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			confirmRename();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelRename();
		}
	}

	function toggleProjectPicker() {
		showProjectPicker = !showProjectPicker;
	}

	// Ticket #527: Klick auf die Karte (aber nicht auf Kebab-Menü/Badges/
	// Buttons darin) navigiert zum Editor. Alle interaktiven Kind-Elemente
	// rufen e.stopPropagation() in ihrem eigenen onclick auf, damit dieser
	// Handler nur bei echten Klicks auf die freie Kartenfläche feuert.
	function handleCardClick() {
		if (isRenaming || isMenuOpen) return;
		goto(`/canvases/${canvas.id}`);
	}

	$: if (isMenuOpen && firstMenuButtonEl) {
		firstMenuButtonEl.focus();
	}

	function prefersReducedMotion() {
		return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	}

	function menuIn(node: HTMLElement) {
		if (prefersReducedMotion()) return fade(node, { duration: 120 });
		return {
			duration: 200,
			easing: quintOut,
			css: (t: number) => `opacity: ${t}; transform: translateY(${(1 - t) * 6}px);`
		};
	}
</script>

<div
	class="canvas-card card relative py-5 px-6 flex flex-col gap-3"
	class:menu-open={isMenuOpen}
	onclick={handleCardClick}
	onkeydown={(e) => { if (e.key === 'Enter' && !isRenaming && !isMenuOpen) goto(`/canvases/${canvas.id}`); }}
	role="button"
	tabindex="0"
>
	<div class="flex items-center gap-4" class:content-inert={isMenuOpen} aria-hidden={isMenuOpen}>
		<Layers class="w-5 h-5 shrink-0" style="color: var(--color-primary);" />

		<div class="min-w-0 flex-1">
			{#if isRenaming}
				<div class="flex items-center gap-2">
					<input
						bind:this={renameInputEl}
						type="text"
						bind:value={renameValue}
						onkeydown={handleRenameKeydown}
						onclick={(e) => e.stopPropagation()}
						class="input py-1 text-lg font-semibold"
						aria-label="Canvas umbenennen"
					/>
					<button type="button" class="btn-subtle p-1.5" onclick={(e) => { e.stopPropagation(); confirmRename(); }} title="Übernehmen">
						<Check class="w-4 h-4" style="color: var(--color-success);" />
					</button>
					<button type="button" class="btn-subtle p-1.5" onclick={(e) => { e.stopPropagation(); cancelRename(); }} title="Abbrechen">
						<X class="w-4 h-4" />
					</button>
				</div>
			{:else}
				<h3 class="text-lg font-semibold truncate" style="color: var(--color-text);" title={canvas.name}>
					{canvas.name}
				</h3>
			{/if}

			<div class="flex flex-wrap items-center gap-1.5 mt-2">
				{#each linkedProjects as project (project.id)}
					<span class="badge-primary gap-1">
						{project.name}
						<button
							type="button"
							class="unlink-btn"
							aria-label={`${project.name} von Canvas lösen`}
							onclick={(e) => { e.stopPropagation(); onUnlinkProject(canvas.id, project.id); }}
						>
							<X class="w-3 h-3" />
						</button>
					</span>
				{/each}

				<div class="relative">
					<button
						type="button"
						class="badge add-project-btn"
						style="border: 1px dashed var(--edge-strong); color: var(--color-text-secondary);"
						onclick={(e) => { e.stopPropagation(); toggleProjectPicker(); }}
						aria-haspopup="listbox"
						aria-expanded={showProjectPicker}
					>
						<Plus class="w-3 h-3" /> Projekt
					</button>

					{#if showProjectPicker}
						<div class="project-picker" transition:fade={{ duration: 120 }} onclick={(e) => e.stopPropagation()} role="presentation">
							{#if linkableProjects.length === 0}
								<p class="text-xs px-3 py-2" style="color: var(--color-text-secondary);">Keine weiteren Projekte.</p>
							{:else}
								{#each linkableProjects as project (project.id)}
									<button
										type="button"
										class="project-picker__item"
										onclick={() => {
											onLinkProject(canvas.id, project.id);
											showProjectPicker = false;
										}}
									>
										{project.name}
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="shrink-0 flex flex-col items-end">
			<span class="text-caption" style="color: var(--color-text-secondary);">Elemente</span>
			<span class="font-mono text-sm" style="color: var(--color-text);">{canvas.element_count}</span>
		</div>
	</div>

	{#if isMenuOpen}
		<div class="canvas-card__menu absolute inset-0 flex items-center justify-center gap-3" transition:menuIn>
			<button
				bind:this={firstMenuButtonEl}
				type="button"
				class="btn-subtle flex items-center gap-2 px-4 py-2"
				style="color: var(--color-text);"
				onclick={(e) => {
					e.stopPropagation();
					closeMenu();
					startRename();
				}}
			>
				<Pencil class="w-4 h-4" />
				Umbenennen
			</button>
			<button
				type="button"
				class="btn-subtle flex items-center gap-2 px-4 py-2"
				style="color: var(--color-danger);"
				onclick={(e) => { e.stopPropagation(); onDelete(canvas.id); }}
			>
				<Trash2 class="w-4 h-4" />
				Löschen
			</button>
		</div>
	{/if}

	{#if !isMenuOpen}
		<button
			bind:this={dropButtonEl}
			type="button"
			class="drop drop--bottom"
			aria-label="Canvas-Aktionen öffnen"
			onclick={(e) => { e.stopPropagation(); openMenu(); }}
		>
			<ChevronUp class="w-4 h-4" />
		</button>
	{:else}
		<button
			type="button"
			class="drop drop--top drop--active"
			aria-label="Aktionen schließen"
			onclick={(e) => { e.stopPropagation(); closeMenu(); }}
		>
			<X class="w-4 h-4" />
		</button>
	{/if}
</div>

<style>
	.canvas-card {
		overflow: visible;
		cursor: pointer;
	}

	.content-inert {
		pointer-events: none;
	}

	.canvas-card.menu-open {
		border-color: color-mix(in srgb, var(--color-primary) 35%, var(--edge));
	}

	.canvas-card__menu {
		background: color-mix(in srgb, var(--color-primary) 14%, transparent);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
		border-radius: var(--radius-card);
	}

	.canvas-card__menu .btn-subtle {
		background: var(--color-surface);
		border-color: color-mix(in srgb, var(--color-primary) 25%, var(--edge));
	}

	.canvas-card__menu .btn-subtle:hover {
		background: color-mix(in srgb, var(--color-surface) 90%, white 6%);
	}

	.unlink-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-left: 2px;
		opacity: 0.7;
	}

	.unlink-btn:hover {
		opacity: 1;
	}

	.add-project-btn {
		cursor: pointer;
		background: transparent;
	}

	.add-project-btn:hover {
		background: var(--color-surface-hover);
	}

	.project-picker {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 10;
		min-width: 200px;
		max-height: 220px;
		overflow-y: auto;
		background: var(--color-surface);
		border: 1px solid var(--edge-strong);
		border-radius: var(--radius-control);
		box-shadow: var(--elevation-2);
		padding: 4px;
	}

	.project-picker__item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 6px 10px;
		border-radius: var(--radius-control);
		font-size: 13px;
		color: var(--color-text);
		background: transparent;
	}

	.project-picker__item:hover {
		background: var(--color-surface-hover);
	}

	.drop {
		position: absolute;
		left: 50%;
		width: 52px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-hover);
		border: 1px solid var(--edge-strong);
		color: var(--color-text-secondary);
		cursor: pointer;
		opacity: 0;
		transform: translate(-50%, 4px);
		transition: opacity var(--duration-fast) var(--ease-soft), transform var(--duration-fast) var(--ease-soft), color var(--duration-fast) var(--ease-soft), background-color var(--duration-fast) var(--ease-soft);
	}

	.drop--bottom {
		bottom: -1px;
		border-radius: 999px 999px 0 0;
		border-bottom-color: transparent;
	}

	.drop--top {
		top: -1px;
		border-radius: 0 0 999px 999px;
		border-top-color: transparent;
		background: color-mix(in srgb, var(--color-primary) 25%, var(--color-surface-hover));
		color: var(--color-text);
	}

	.canvas-card:hover .drop--bottom,
	.canvas-card:focus-within .drop--bottom {
		opacity: 1;
		transform: translate(-50%, 0);
	}

	.drop--active {
		opacity: 1;
		transform: translate(-50%, 0);
	}

	.drop:hover {
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-surface-hover) 80%, white 4%);
	}

	.drop--top:hover {
		background: color-mix(in srgb, var(--color-primary) 32%, var(--color-surface-hover));
	}

	@media (prefers-reduced-motion: reduce) {
		.drop {
			transition: opacity var(--duration-fast) var(--ease-soft);
			transform: translate(-50%, 0);
		}
	}
</style>
