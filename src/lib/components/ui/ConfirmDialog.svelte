<script lang="ts">
	import SidePanel from './SidePanel.svelte';

	export let isOpen: boolean;
	export let onClose: () => void;
	export let onConfirm: () => void;
	export let title: string = 'Bestätigung erforderlich';
	export let message: string = 'Sind Sie sicher?';
	export let confirmText: string = 'Bestätigen';
	export let cancelText: string = 'Abbrechen';
	export let variant: 'default' | 'danger' = 'default';

	let btnClass = (variant === 'danger' ? 'btn btn-danger' : 'btn btn-primary');

	function handleConfirm() {
		onConfirm();
		onClose();
	}
</script>

<SidePanel open={isOpen} {onClose} size="md" ariaLabel={title}>
	<div class="p-6 space-y-4">
		<h2 class="text-lg font-bold" style="color: var(--text);">{title}</h2>
		<p style="color: var(--text);">{message}</p>

		<div class="flex justify-end gap-3">
			<button
				onclick={onClose}
				class="btn btn-ghost"
			>
				{cancelText}
			</button>
			<button
				onclick={handleConfirm}
				class={btnClass}
			>
				{confirmText}
			</button>
		</div>
	</div>
</SidePanel>
