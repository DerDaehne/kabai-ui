<script lang="ts">
	import Modal from './Modal.svelte';
	
	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onConfirm: () => void;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'default' | 'danger';
	}
	
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

<Modal isOpen={isOpen} onClose={onClose} title={title}>
	<div class="space-y-4">
		<p class="text-[var(--text)]">{message}</p>
		
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
</Modal>
