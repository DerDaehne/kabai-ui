<script lang="ts">
	// Ticket #692: aus TicketModal.svelte extrahiert, damit sowohl das
	// Bearbeiten (TicketModal) als auch das Anlegen (NewTicketSheet) dieselbe
	// Galerie/Lightbox nutzen können. Kennt nicht, ob das Ticket schon
	// existiert — Upload/Löschen laufen komplett über die Callback-Props,
	// der Aufrufer entscheidet ob sofort verknüpft oder erst "staged" wird.
	import { Upload, Image as ImageIcon, X } from 'lucide-svelte';
	import Spinner from '$components/ui/Spinner.svelte';
	import { fly } from 'svelte/transition';

	export let attachments: { id: number; filename: string }[] = [];
	export let isUploading = false;
	export let deletingId: number | null = null;
	export let onUpload: (file: File) => void = () => {};
	export let onDelete: (id: number) => void = () => {};

	let fileInputEl: HTMLInputElement;
	let lightboxId: number | null = null;

	function triggerUpload() {
		fileInputEl?.click();
	}

	function handleFileSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) onUpload(file);
		// Reset, damit dieselbe Datei nach einem Fehler erneut gewählt werden kann.
		input.value = '';
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && lightboxId !== null) {
			e.stopPropagation();
			lightboxId = null;
		}
	}

	$: lightboxAttachment = attachments.find((a) => a.id === lightboxId) ?? null;
</script>

<svelte:window on:keydown|capture={handleWindowKeydown} />

<section>
	<div class="pb-2 flex items-center justify-between">
		<h3 class="section-heading flex items-center gap-2">
			Anhänge
			{#if attachments.length > 0}<span class="text-xs font-mono normal-case tracking-normal" style="color: var(--text-muted);">{attachments.length}</span>{/if}
		</h3>
		<button type="button" onclick={triggerUpload} disabled={isUploading}
			class="btn-subtle flex items-center gap-1 text-xs px-2 py-1">
			{#if isUploading}<Spinner size={3} color="currentColor" thickness="border-2" />{:else}<Upload class="w-3 h-3" />{/if}
			Bild hochladen
		</button>
		<input bind:this={fileInputEl} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
			onchange={handleFileSelected} class="hidden" />
	</div>
	<div class="hairline"></div>
	{#if attachments.length === 0}
		<div class="py-3 text-xs" style="color: var(--text-muted);">Keine Anhänge — auch per Drag-and-drop aufs Beschreibungsfeld oder Einfügen aus der Zwischenablage (Strg+V)</div>
	{:else}
		<div class="py-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
			{#each attachments as att (att.id)}
				<div class="group relative aspect-square rounded-lg overflow-hidden" style="background: var(--color-surface-hover);">
					<button type="button" onclick={() => (lightboxId = att.id)} class="block w-full h-full" aria-label="Bild {att.filename} vergrößern">
						<img src="/api/attachments/{att.id}" alt={att.filename} class="w-full h-full object-cover" />
					</button>
					<button type="button" onclick={() => onDelete(att.id)} disabled={deletingId === att.id}
						class="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
						style="background: rgba(0,0,0,0.6); color: white;" title="Anhang löschen" aria-label="Anhang löschen">
						<X class="w-3 h-3" />
					</button>
				</div>
			{/each}
		</div>
		<p class="pb-1 text-xs flex items-center gap-1.5" style="color: var(--text-muted);">
			<ImageIcon class="w-3 h-3 shrink-0" /> KI-Agenten können diese Bilder über ihre Tools lesen.
		</p>
	{/if}
</section>

{#if lightboxAttachment}
	<div class="fixed inset-0 z-[110] flex items-center justify-center p-6" style="background: rgba(0,0,0,0.85);"
		transition:fly={{ duration: 150 }}>
		<button type="button" onclick={() => (lightboxId = null)}
			class="absolute top-4 right-4 p-2 rounded-full" style="background: rgba(255,255,255,0.1); color: white;"
			aria-label="Schließen">
			<X class="w-5 h-5" />
		</button>
		<img src="/api/attachments/{lightboxAttachment.id}" alt={lightboxAttachment.filename}
			class="max-w-full max-h-full object-contain rounded-lg" />
	</div>
{/if}
